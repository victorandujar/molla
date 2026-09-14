import { randomUUID, createHash } from 'node:crypto';
import postgres from 'postgres';
import { bake, products, brand, isDemo } from './config';
import {
  assertCapacity,
  type Order,
  type ReservationInput,
  type BakeState,
} from './domain';
const sql = process.env.DATABASE_URL
  ? postgres(process.env.DATABASE_URL, {
      max: 2,
      prepare: false,
      connect_timeout: 10,
      idle_timeout: 10,
    })
  : null;
type Demo = {
  bakeStatus?: BakeState;
  orders: Order[];
  waitlist: {
    email: string;
    token: string;
    source: string;
    subscribedAt: string;
  }[];
  limits: Record<string, { count: number; until: number }>;
};
let queue: Promise<unknown> = Promise.resolve();
async function demo<T>(fn: (data: Demo) => T | Promise<T>): Promise<T> {
  if (!isDemo) throw new Error('Las reservas todavía no están abiertas.');
  const run = queue.then(async () => {
    const { readFile, mkdir, writeFile, rename } =
      await import('node:fs/promises');
    const path = `${process.cwd()}/.data/demo.json`;
    let data: Demo;
    try {
      data = JSON.parse(await readFile(path, 'utf8'));
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
      data = { orders: [], waitlist: [], limits: {} };
    }
    const result = await fn(data);
    await mkdir(`${process.cwd()}/.data`, { recursive: true });
    await writeFile(`${path}.tmp`, JSON.stringify(data), { mode: 0o600 });
    await rename(`${path}.tmp`, path);
    return result;
  });
  queue = run.catch(() => {});
  return run;
}
export async function currentBake() {
  if (!sql || isDemo)
    return demo((d) => ({
      ...bake,
      status: d.bakeStatus || bake.status,
      reserved: d.orders
        .filter((o) => o.bakeId === bake.id && o.status !== 'CANCELLED')
        .reduce((n, o) => n + o.quantity, 0),
    }));
  const [b] =
    await sql`SELECT b.*, COALESCE((SELECT SUM(i.quantity) FROM orders o JOIN order_items i ON i.order_id=o.id WHERE o.bake_id=b.id AND o.status!='CANCELLED'),0)::int AS reserved FROM bakes b WHERE b.id=${bake.id}`;
  if (!b) throw new Error('La próxima hornada todavía se está preparando.');
  return {
    ...bake,
    status: b.status as typeof bake.status,
    capacity: b.capacity as number,
    deadline: new Date(b.deadline).toISOString(),
    opensAt: new Date(b.opens_at).toISOString(),
    pickupDate: new Date(b.pickup_date).toISOString(),
    reserved: b.reserved as number,
  };
}
export async function reserve(input: ReservationInput): Promise<Order> {
  if (input.bakeId !== bake.id)
    throw new Error('La hornada ha cambiado. Recarga la página.');
  const order: Order = {
    id: randomUUID(),
    requestId: input.requestId,
    bakeId: bake.id,
    name: input.name,
    email: input.email,
    phone: input.phone,
    quantity: input.quantity,
    product: input.product,
    productName: products[0].name,
    total: products[0].price * input.quantity,
    pickupDate: bake.pickupDate,
    pickupAddress: brand.pickupAddress,
    pickupWindow: brand.pickupWindow,
    source: input.source,
    status: 'CONFIRMED',
    createdAt: new Date().toISOString(),
    emailStatus: 'PENDING',
  };
  if (!sql || isDemo)
    return demo((d) => {
      const prior = d.orders.find((o) => o.requestId === input.requestId);
      if (prior) {
        if (prior.email !== input.email)
          throw new Error('Solicitud no válida.');
        return prior;
      }
      assertCapacity(
        { ...bake, status: d.bakeStatus || bake.status },
        d.orders
          .filter((o) => o.bakeId === bake.id && o.status !== 'CANCELLED')
          .reduce((n, o) => n + o.quantity, 0),
        input.quantity,
      );
      d.orders.push(order);
      return order;
    });
  const result = await sql.begin(async (tx) => {
    const [b] = await tx`SELECT * FROM bakes WHERE id=${bake.id} FOR UPDATE`;
    if (!b) throw new Error('Esta hornada no está abierta.');
    const [prior] =
      await tx`SELECT snapshot FROM orders WHERE request_id=${input.requestId}`;
    if (prior) {
      const previous = prior.snapshot as Order;
      if (previous.email !== input.email)
        throw new Error('Solicitud no válida.');
      return previous;
    }
    const [count] =
      await tx`SELECT COALESCE(SUM(i.quantity),0)::int AS n FROM orders o JOIN order_items i ON i.order_id=o.id WHERE o.bake_id=${bake.id} AND o.status!='CANCELLED'`;
    assertCapacity(
      {
        status: b.status,
        capacity: b.capacity,
        opensAt: new Date(b.opens_at).toISOString(),
        deadline: new Date(b.deadline).toISOString(),
      },
      count?.n || 0,
      input.quantity,
    );
    order.pickupDate = new Date(b.pickup_date).toISOString();
    const [p] = await tx`SELECT * FROM products WHERE id=${input.product}`;
    if (!p) throw new Error('Este pan no está disponible.');
    if (p.price !== products[0].price)
      throw new Error(
        'Este pan ha cambiado de precio. Contacta antes de reservar.',
      );
    order.total = p.price * input.quantity;
    order.productName = p.name;
    const [customer] =
      await tx`INSERT INTO customers (id,email,name,phone) VALUES (${randomUUID()},${input.email},${input.name},${input.phone}) ON CONFLICT(email) DO UPDATE SET name=EXCLUDED.name,phone=EXCLUDED.phone RETURNING id`;
    await tx`INSERT INTO orders (id,request_id,bake_id,customer_id,snapshot,status) VALUES (${order.id},${order.requestId},${bake.id},${customer!.id},${tx.json(order)},'CONFIRMED')`;
    await tx`INSERT INTO order_items (order_id,product_id,quantity,unit_price) VALUES (${order.id},${input.product},${input.quantity},${p.price})`;
    return order;
  });
  return result as unknown as Order;
}
export async function emailStatus(id: string, status: Order['emailStatus']) {
  if (!sql || isDemo)
    return demo((d) => {
      const o = d.orders.find((o) => o.id === id);
      if (o) o.emailStatus = status;
    });
  await sql`UPDATE orders SET snapshot=jsonb_set(snapshot,'{emailStatus}',${sql.json(status)}) WHERE id=${id}`;
}
export async function joinWaitlist(email: string, source: string) {
  const token = randomUUID();
  if (!sql || isDemo)
    return demo((d) => {
      if (!d.waitlist.some((s) => s.email === email))
        d.waitlist.push({
          email,
          source,
          token,
          subscribedAt: new Date().toISOString(),
        });
    });
  await sql`INSERT INTO waitlist_subscribers (email,source,consent_version,unsubscribe_token) VALUES (${email},${source},'2026-09-14',${token}) ON CONFLICT(email) DO NOTHING`;
}
export async function unsubscribe(token: string) {
  if (!sql || isDemo)
    return demo((d) => {
      d.waitlist = d.waitlist.filter((s) => s.token !== token);
    });
  await sql`DELETE FROM waitlist_subscribers WHERE unsubscribe_token=${token}`;
}
export async function rateLimit(ip: string) {
  const key = createHash('sha256')
    .update(ip + '|' + new Date().toISOString().slice(0, 10))
    .digest('hex');
  if (!sql || isDemo)
    return demo((d) => {
      const now = Date.now();
      const record = d.limits[key];
      const entry =
        record && record.until > now
          ? record
          : { count: 0, until: now + 600000 };
      entry.count++;
      d.limits[key] = entry;
      return entry.count <= 12;
    });
  const [r] =
    await sql`INSERT INTO request_limits (key,count,resets_at) VALUES (${key},1,now()+interval '10 minutes') ON CONFLICT(key) DO UPDATE SET count=CASE WHEN request_limits.resets_at<now() THEN 1 ELSE request_limits.count+1 END,resets_at=CASE WHEN request_limits.resets_at<now() THEN now()+interval '10 minutes' ELSE request_limits.resets_at END RETURNING count`;
  return r!.count <= 12;
}
