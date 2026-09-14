import postgres from 'postgres';
import { readFile, writeFile } from 'node:fs/promises';
import type { Order } from '../src/lib/domain';
const [command = 'summary', arg] = process.argv.slice(2);
const sql = process.env.DATABASE_URL
  ? postgres(process.env.DATABASE_URL, { max: 1 })
  : null;
try {
  if (['cancel', 'collected'].includes(command)) {
    if (!sql)
      throw new Error(
        'Los cambios de estado requieren la base de datos configurada.',
      );
    if (!arg || !/^[0-9a-f-]{36}$/i.test(arg))
      throw new Error('Indica una referencia de pedido válida.');
    const status = command === 'cancel' ? 'CANCELLED' : 'COLLECTED';
    const rows =
      await sql`UPDATE orders SET status=${status},snapshot=jsonb_set(snapshot,'{status}',${sql.json(status)}) WHERE id=${arg} AND status='CONFIRMED' RETURNING id`;
    console.log(
      rows.length ? 'Estado actualizado.' : 'No se encontró el pedido.',
    );
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
      const cell = (v: unknown) =>
        '"' +
        String(v ?? '')
          .replace(/^[=+@-]/, "'")
          .replaceAll('"', '""') +
        '"';
      const fields = [
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
          ...orders.map((o) => fields.map((f) => cell(o[f])).join(',')),
        ].join('\n'),
        { mode: 0o600 },
      );
      console.log(
        'Exportación privada guardada. Los importes están en céntimos.',
      );
    } else if (command === 'waitlist') {
      if (!arg) throw new Error('Indica un archivo JSON privado de salida.');
      const list = sql
        ? await sql`SELECT email,source,subscribed_at,unsubscribe_token FROM waitlist_subscribers`
        : demo.waitlist;
      await writeFile(arg, JSON.stringify(list, null, 2), { mode: 0o600 });
      console.log(
        'Lista privada guardada. Incluye enlace /baja?token=TOKEN en cada aviso.',
      );
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
        ? (await sql`SELECT COUNT(*)::int AS n FROM waitlist_subscribers`)[0]!.n
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
