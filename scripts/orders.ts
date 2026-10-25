import postgres from 'postgres';
import { readFile, writeFile } from 'node:fs/promises';
import {
  csvCell,
  orderSummary,
  pickupCodePattern,
  type Order,
} from '../src/lib/domain';
const [command = 'summary', ...rest] = process.argv.slice(2);
const flags = Object.fromEntries(
  rest
    .filter((a) => a.startsWith('--'))
    .map((a) => a.slice(2).split('=') as [string, string?]),
);
const [arg] = rest.filter((a) => !a.startsWith('--'));
const url = process.env.DATABASE_URL;
const sql = url ? postgres(url, { max: 1 }) : null;
const writes = [
  'cancel',
  'collected',
  'purge',
  'subcancel',
  'subpause',
  'subresume',
].includes(command);
if (url)
  console.log(`Base de datos: ${new URL(url).host}${new URL(url).pathname}`);
try {
  if (writes && !sql)
    throw new Error('Los cambios requieren la base de datos configurada.');
  if (writes && !('yes' in flags))
    throw new Error(
      'Este comando modifica la base de datos. Revisa el host y repite con --yes.',
    );
  if (['cancel', 'collected'].includes(command)) {
    const ref = arg?.trim().toUpperCase() || '';
    const uuid = /^[0-9A-F-]{36}$/.test(ref);
    if (!uuid && !pickupCodePattern.test(ref))
      throw new Error(
        'Indica el código (001-K7QM) o la referencia del pedido.',
      );
    const status = command === 'cancel' ? 'CANCELLED' : 'COLLECTED';
    const rows =
      await sql!`UPDATE orders SET status=${status},snapshot=jsonb_set(snapshot,'{status}',${sql!.json(status)}) WHERE ${uuid ? sql!`id=${ref.toLowerCase()}` : sql!`code=${ref}`} AND status='CONFIRMED' RETURNING id`;
    console.log(
      rows.length ? 'Estado actualizado.' : 'No se encontró el pedido.',
    );
  } else if (command === 'purge') {
    // npm run orders -- purge --months=12 --yes
    // Anonymises orders whose pickup is older than N months. Totals, quantities,
    // dates, channels and delivery towns stay for the metrics; names, contact
    // details and street addresses go.
    const months = Number(flags.months);
    if (!Number.isInteger(months) || months < 1)
      throw new Error('Indica --months=N (mínimo 1).');
    await sql!.begin(async (tx) => {
      const orders =
        await tx`UPDATE orders o SET snapshot = (o.snapshot || '{"name":"—","email":"","phone":""}'::jsonb) #- '{delivery,address}' FROM bakes b WHERE o.bake_id=b.id AND b.pickup_date < now() - make_interval(months => ${months}) AND o.snapshot->>'email' <> '' RETURNING o.customer_id`;
      // A customer with a more recent order keeps their details.
      const customers =
        await tx`UPDATE customers c SET email='anonimo-' || c.id, name='—', phone='' WHERE c.email NOT LIKE 'anonimo-%' AND NOT EXISTS (SELECT 1 FROM orders o JOIN bakes b ON b.id=o.bake_id WHERE o.customer_id=c.id AND b.pickup_date >= now() - make_interval(months => ${months})) RETURNING c.id`;
      // Cancelled "pa fix" subscriptions past the same period lose their details.
      const subs =
        await tx`UPDATE subscriptions SET name='—', email='anonimo-' || id, phone='', address='' WHERE status='CANCELLED' AND cancelled_at < now() - make_interval(months => ${months}) AND email NOT LIKE 'anonimo-%' RETURNING id`;
      console.log(
        `Anonimizados ${orders.length} pedidos, ${customers.length} clientes y ${subs.length} altas de pan fijo.`,
      );
    });
  } else if (command === 'subs') {
    // npm run orders -- subs
    if (!sql) throw new Error('Los pan fijo requieren la base de datos.');
    const rows =
      await sql`SELECT email,name,phone,quantity,banana,frequency,delivery,town,status,skip_remaining,created_at FROM subscriptions ORDER BY status, created_at`;
    console.log(JSON.stringify(rows, null, 2));
  } else if (['subcancel', 'subpause', 'subresume'].includes(command)) {
    // npm run orders -- subcancel ana@example.com --yes   (also subpause, subresume)
    const email = arg?.trim().toLowerCase() || '';
    if (!email.includes('@'))
      throw new Error('Indica el email del suscriptor.');
    const to = {
      subcancel: 'CANCELLED',
      subpause: 'PAUSED',
      subresume: 'ACTIVE',
    }[command as 'subcancel' | 'subpause' | 'subresume'];
    await sql!.begin(async (tx) => {
      const subs =
        await tx`UPDATE subscriptions SET status=${to}, cancelled_at=CASE WHEN ${to}='CANCELLED' THEN now() ELSE cancelled_at END, skip_remaining=CASE WHEN ${to}='ACTIVE' THEN skip_remaining ELSE 0 END WHERE email=${email} AND status!='CANCELLED' RETURNING id`;
      // The open order of this week goes too, unless the bake is already closed.
      const orders =
        to === 'ACTIVE' || !subs.length
          ? []
          : await tx`UPDATE orders o SET status='CANCELLED', snapshot=jsonb_set(o.snapshot,'{status}','"CANCELLED"') FROM bakes b WHERE o.bake_id=b.id AND b.deadline > now() AND o.status='CONFIRMED' AND o.subscription_id IN ${tx(subs.map((x) => x.id))} RETURNING o.id`;
      console.log(
        `${subs.length} altas de pan fijo → ${to}; ${orders.length} pedidos abiertos cancelados.`,
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
          [...fields, 'items', 'deliveryTown', 'deliveryAddress'].join(','),
          ...orders.map((o) =>
            [
              ...fields.map((f) => o[f]),
              // Every line, e.g. "1 × La de cada semana · 3 × Croissant".
              orderSummary(o),
              o.delivery?.town,
              o.delivery?.address,
            ]
              .map(csvCell)
              .join(','),
          ),
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
      const totals: Record<
        string,
        { total: number; bySource: Record<string, number> }
      > = {};
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
