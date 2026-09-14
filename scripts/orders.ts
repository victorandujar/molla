import postgres from 'postgres';
import { readFile, writeFile } from 'node:fs/promises';
import { csvCell, pickupCodePattern, type Order } from '../src/lib/domain';
const [command = 'summary', ...rest] = process.argv.slice(2);
const flags = Object.fromEntries(
  rest
    .filter((a) => a.startsWith('--'))
    .map((a) => a.slice(2).split('=') as [string, string?]),
);
const [arg] = rest.filter((a) => !a.startsWith('--'));
const url = process.env.DATABASE_URL;
const sql = url ? postgres(url, { max: 1 }) : null;
const writes = ['cancel', 'collected', 'purge'].includes(command);
if (url) console.log(`Base de datos: ${new URL(url).host}${new URL(url).pathname}`);
try {
  if (writes && !sql)
    throw new Error('Los cambios requieren la base de datos configurada.');
  if (writes && flags.yes === undefined)
    throw new Error(
      'Este comando modifica la base de datos. Revisa el host y repite con --yes.',
    );
  if (['cancel', 'collected'].includes(command)) {
    const ref = arg?.trim().toUpperCase() || '';
    const uuid = /^[0-9A-F-]{36}$/.test(ref);
    if (!uuid && !pickupCodePattern.test(ref))
      throw new Error('Indica el código (001-K7QM) o la referencia del pedido.');
    const status = command === 'cancel' ? 'CANCELLED' : 'COLLECTED';
    const rows =
      await sql!`UPDATE orders SET status=${status},snapshot=jsonb_set(snapshot,'{status}',${sql!.json(status)}) WHERE ${uuid ? sql!`id=${ref.toLowerCase()}` : sql!`code=${ref}`} AND status='CONFIRMED' RETURNING id`;
    console.log(
      rows.length ? 'Estado actualizado.' : 'No se encontró el pedido.',
    );
  } else if (command === 'purge') {
    // npm run orders -- purge --months=12 --yes
    // Anonymises orders whose pickup is older than N months. Totals, quantities,
    // dates and channels stay for the metrics; names and contact details go.
    const months = Number(flags.months);
    if (!Number.isInteger(months) || months < 1)
      throw new Error('Indica --months=N (mínimo 1).');
    await sql!.begin(async (tx) => {
      const orders =
        await tx`UPDATE orders o SET snapshot = o.snapshot || '{"name":"—","email":"","phone":""}'::jsonb FROM bakes b WHERE o.bake_id=b.id AND b.pickup_date < now() - make_interval(months => ${months}) AND o.snapshot->>'email' <> '' RETURNING o.customer_id`;
      // A customer with a more recent order keeps their details.
      const customers =
        await tx`UPDATE customers c SET email='anonimo-' || c.id, name='—', phone='' WHERE c.email NOT LIKE 'anonimo-%' AND NOT EXISTS (SELECT 1 FROM orders o JOIN bakes b ON b.id=o.bake_id WHERE o.customer_id=c.id AND b.pickup_date >= now() - make_interval(months => ${months})) RETURNING c.id`;
      console.log(
        `Anonimizados ${orders.length} pedidos y ${customers.length} clientes.`,
      );
    });
  } else {
    const demo = sql
      ? null
      : JSON.parse(await readFile('.data/demo.json', 'utf8'));
    const orders: Order[] = sql
      ? (await sql`SELECT snapshot FROM orders ORDER BY created_at`).map(
          (r) => r.snapshot as Order,
        )
      : demo.orders;
    const valid = orders.filter((o) => o.status !== 'CANCELLED');
    const byCustomer = new Map<string, number>();
    for (const o of valid)
      byCustomer.set(o.email, (byCustomer.get(o.email) || 0) + 1);
    if (command === 'export') {
      if (!arg)
        throw new Error(
          'Indica un archivo de salida, por ejemplo .data/pedidos.csv',
        );
      const fields = [
        'code',
        'id',
        'bakeId',
        'name',
        'email',
        'phone',
        'productName',
        'quantity',
        'total',
        'status',
        'source',
        'createdAt',
        'emailStatus',
      ] as const;
      await writeFile(
        arg,
        [
          fields.join(','),
          ...orders.map((o) => fields.map((f) => csvCell(o[f])).join(',')),
        ].join('\n'),
        { mode: 0o600 },
      );
      console.log(
        'Exportación privada guardada. Los importes están en céntimos.',
      );
    } else if (command === 'waitlist') {
      if (!arg) throw new Error('Indica un archivo JSON privado de salida.');
      // Only confirmed addresses (double opt-in) may receive announcements.
      const list = sql
        ? await sql`SELECT email,lang,source,subscribed_at,confirmed_at,unsubscribe_token FROM waitlist_subscribers WHERE confirmed_at IS NOT NULL ORDER BY confirmed_at`
        : demo.waitlist.filter(
            (s: { confirmedAt?: string | null }) => s.confirmedAt !== null,
          );
      await writeFile(arg, JSON.stringify(list, null, 2), { mode: 0o600 });
      console.log(
        `${list.length} confirmados guardados. Incluye /baja?token=TOKEN&lang=IDIOMA en cada aviso.`,
      );
    } else if (command === 'funnel') {
      const days = Number(flags.days || 28);
      const rows = sql
        ? await sql`SELECT event, source, SUM(count)::int AS n FROM analytics_daily WHERE day >= (now() AT TIME ZONE 'Europe/Madrid')::date - ${days}::int GROUP BY event, source ORDER BY event, n DESC`
        : Object.entries((demo.events || {}) as Record<string, number>).map(
            ([key, n]) => {
              const [, event, source] = key.split('|');
              return { event, source, n };
            },
          );
      const totals: Record<string, { total: number; bySource: Record<string, number> }> = {};
      for (const r of rows) {
        const e = (totals[r.event] ??= { total: 0, bySource: {} });
        e.total += r.n;
        e.bySource[r.source] = (e.bySource[r.source] || 0) + r.n;
      }
      console.log(JSON.stringify({ days, events: totals }, null, 2));
    } else {
      const perBake: Record<
        string,
        { orders: number; loaves: number; revenue: number }
      > = {};
      for (const o of valid) {
        const b = (perBake[o.bakeId] ??= { orders: 0, loaves: 0, revenue: 0 });
        b.orders++;
        b.loaves += o.quantity;
        b.revenue += o.total;
      }
      const sources: Record<string, number> = {};
      for (const o of valid) sources[o.source] = (sources[o.source] || 0) + 1;
      const waitlist = sql
        ? (
            await sql`SELECT COUNT(*) FILTER (WHERE confirmed_at IS NOT NULL)::int AS confirmed, COUNT(*) FILTER (WHERE confirmed_at IS NULL)::int AS pending FROM waitlist_subscribers`
          )[0]
        : demo.waitlist.length;
      console.log(
        JSON.stringify(
          {
            mode: sql ? 'database' : 'demo',
            weekly: perBake,
            uniqueCustomers: byCustomer.size,
            repeatRate: byCustomer.size
              ? [...byCustomer.values()].filter((n) => n > 1).length /
                byCustomer.size
              : 0,
            averageOrderCents: valid.length
              ? Math.round(
                  valid.reduce((s, o) => s + o.total, 0) / valid.length,
                )
              : 0,
            waitlist,
            sources,
            emailNeedsReview: orders.filter(
              (o) => o.emailStatus === 'FAILED' || o.emailStatus === 'PENDING',
            ).length,
          },
          null,
          2,
        ),
      );
    }
  }
} finally {
  if (sql) await sql.end();
}
