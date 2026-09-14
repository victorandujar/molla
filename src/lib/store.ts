import { randomUUID, randomBytes, createHash } from 'node:crypto';
import postgres from 'postgres';
import { bake, products, brand, isDemo } from './config';
import { AppError } from './messages';
import {
  assertCapacity,
  pickupCode,
  reminderDue,
  reminderWindowHours,
  type Lang,
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
  orders: (Order & { reminderSentAt?: string | null })[];
  waitlist: {
    email: string;
    token: string;
    confirmToken?: string;
    confirmedAt?: string | null;
    lang?: Lang;
    source: string;
    subscribedAt: string;
  }[];
  limits: Record<string, { count: number; until: number }>;
  events?: Record<string, number>;
};
// Vite may load this module once per route: the write queue lives on
// globalThis so every copy serialises its read-modify-write of the file.
const shared = globalThis as { mollaDemoQueue?: Promise<unknown> };
async function demo<T>(fn: (data: Demo) => T | Promise<T>): Promise<T> {
  if (!isDemo) throw new Error('Las reservas todavía no están abiertas.');
  const run = (shared.mollaDemoQueue ?? Promise.resolve()).then(async () => {
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
  shared.mollaDemoQueue = run.catch(() => {});
  return run;
}
const useDemo = () => !sql || isDemo;
const madridDay = (at = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(at);
export type ActiveBake = typeof bake & { reserved: number };
const reservedIn = (d: Demo, bakeId: string) =>
  d.orders
    .filter((o) => o.bakeId === bakeId && o.status !== 'CANCELLED')
    .reduce((n, o) => n + o.quantity, 0);
const demoBake = (d: Demo): ActiveBake => ({
  ...bake,
  status: d.bakeStatus || bake.status,
  reserved: reservedIn(d, bake.id),
});
const reservedSql = sql
  ? sql`COALESCE((SELECT SUM(i.quantity) FROM orders o JOIN order_items i ON i.order_id=o.id WHERE o.bake_id=b.id AND o.status!='CANCELLED'),0)::int AS reserved`
  : null;
// The database decides the active bake: the next pickup not yet completed,
// or the most recent one so the page shows "closed" until the next is created.
const activeBakeRow = (db: postgres.Sql) => db`
    SELECT b.*, ${reservedSql!}
    FROM bakes b, LATERAL (SELECT b.status!='COMPLETED' AND b.pickup_date > now() - interval '12 hours' AS upcoming) u
    ORDER BY u.upcoming DESC, CASE WHEN u.upcoming THEN b.pickup_date END ASC, b.pickup_date DESC
    LIMIT 1`;
const toBake = (b: postgres.Row): ActiveBake => ({
  id: b.id as string,
  number: b.number as string,
  status: b.status as BakeState,
  capacity: b.capacity as number,
  deadline: new Date(b.deadline).toISOString(),
  opensAt: new Date(b.opens_at).toISOString(),
  pickupDate: new Date(b.pickup_date).toISOString(),
  pickupWindow: (b.pickup_window as string | null) || brand.pickupWindow,
  reserved: b.reserved as number,
});
export async function currentBake(): Promise<ActiveBake> {
  if (useDemo()) return demo(demoBake);
  const [b] = await activeBakeRow(sql!);
  if (!b) throw new Error('La próxima hornada todavía se está preparando.');
  return toBake(b);
}
export async function listBakes(): Promise<ActiveBake[]> {
  if (useDemo()) return demo((d) => [demoBake(d)]);
  const rows =
    await sql!`SELECT b.*, ${reservedSql!} FROM bakes b ORDER BY b.pickup_date DESC LIMIT 12`;
  return rows.map(toBake);
}
export async function reserve(
  input: ReservationInput & { lang: Lang },
): Promise<Order> {
  const order: Order = {
    id: randomUUID(),
    code: '',
    requestId: input.requestId,
    bakeId: input.bakeId,
    name: input.name,
    email: input.email,
    phone: input.phone,
    quantity: input.quantity,
    product: input.product,
    productName: products[0].name,
    total: products[0].price * input.quantity,
    pickupDate: bake.pickupDate,
    pickupAddress: brand.pickupAddress,
    pickupWindow: bake.pickupWindow,
    source: input.source,
    status: 'CONFIRMED',
    createdAt: new Date().toISOString(),
    emailStatus: 'PENDING',
    lang: input.lang,
  };
  if (useDemo())
    return demo((d) => {
      const prior = d.orders.find((o) => o.requestId === input.requestId);
      if (prior) {
        if (prior.email !== input.email) throw new AppError('invalid', 400);
        return prior;
      }
      if (input.bakeId !== bake.id) throw new AppError('bakeChanged');
      assertCapacity(
        { ...bake, status: d.bakeStatus || bake.status },
        reservedIn(d, bake.id),
        input.quantity,
      );
      do order.code = pickupCode(bake.number, randomBytes(4));
      while (d.orders.some((o) => o.code === order.code));
      d.orders.push(order);
      return order;
    });
  const result = await sql!.begin(async (tx) => {
    const [b] =
      await tx`SELECT * FROM bakes WHERE id=${input.bakeId} FOR UPDATE`;
    if (!b) throw new AppError('bakeChanged');
    const [prior] =
      await tx`SELECT snapshot FROM orders WHERE request_id=${input.requestId}`;
    if (prior) {
      const previous = prior.snapshot as Order;
      if (previous.email !== input.email) throw new AppError('invalid', 400);
      return previous;
    }
    // Only the bake the page shows accepts orders, even if another is open.
    const [active] = await activeBakeRow(tx as unknown as postgres.Sql);
    if (active?.id !== b.id) throw new AppError('bakeChanged');
    const [count] =
      await tx`SELECT COALESCE(SUM(i.quantity),0)::int AS n FROM orders o JOIN order_items i ON i.order_id=o.id WHERE o.bake_id=${input.bakeId} AND o.status!='CANCELLED'`;
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
    order.pickupWindow = b.pickup_window || brand.pickupWindow;
    // The bake row is locked, so no concurrent reservation can take the same code.
    do order.code = pickupCode(b.number, randomBytes(4));
    while ((await tx`SELECT 1 FROM orders WHERE code=${order.code}`).length);
    const [p] = await tx`SELECT * FROM products WHERE id=${input.product}`;
    if (!p) throw new AppError('productUnavailable');
    if (p.price !== products[0].price) throw new AppError('priceChanged');
    order.total = p.price * input.quantity;
    order.productName = p.name;
    // An existing customer keeps their stored details: anyone can type an
    // email, so a new order must not overwrite someone else's name or phone.
    // Each order snapshot keeps the details given with that order.
    const [customer] =
      await tx`INSERT INTO customers (id,email,name,phone) VALUES (${randomUUID()},${input.email},${input.name},${input.phone}) ON CONFLICT(email) DO UPDATE SET email=customers.email RETURNING id`;
    await tx`INSERT INTO orders (id,code,request_id,bake_id,customer_id,snapshot,status) VALUES (${order.id},${order.code},${order.requestId},${input.bakeId},${customer!.id},${tx.json(order)},'CONFIRMED')`;
    await tx`INSERT INTO order_items (order_id,product_id,quantity,unit_price) VALUES (${order.id},${input.product},${input.quantity},${p.price})`;
    return order;
  });
  return result as unknown as Order;
}
export async function emailStatus(id: string, status: Order['emailStatus']) {
  if (useDemo())
    return demo((d) => {
      const o = d.orders.find((o) => o.id === id);
      if (o) o.emailStatus = status;
    });
  await sql!`UPDATE orders SET snapshot=jsonb_set(snapshot,'{emailStatus}',${sql!.json(status)}) WHERE id=${id}`;
}
export type AdminOrder = Order & { reminderSentAt: string | null };
export async function ordersForBake(bakeId: string): Promise<AdminOrder[]> {
  if (useDemo())
    return demo((d) =>
      d.orders
        .filter((o) => o.bakeId === bakeId)
        .map((o) => ({ ...o, reminderSentAt: o.reminderSentAt ?? null })),
    );
  const rows =
    await sql!`SELECT snapshot, status, reminder_sent_at FROM orders WHERE bake_id=${bakeId} ORDER BY created_at`;
  return rows.map((r) => ({
    ...(r.snapshot as Order),
    status: r.status,
    reminderSentAt: r.reminder_sent_at
      ? new Date(r.reminder_sent_at).toISOString()
      : null,
  }));
}
// Collected can be undone at the pickup point; a cancelled order stays
// cancelled because its loaves may already belong to someone else.
export async function setOrderStatus(
  id: string,
  to: 'COLLECTED' | 'CANCELLED' | 'CONFIRMED',
) {
  const from = to === 'CONFIRMED' ? 'COLLECTED' : 'CONFIRMED';
  if (useDemo())
    return demo((d) => {
      const o = d.orders.find((o) => o.id === id && o.status === from);
      if (o) o.status = to;
      return !!o;
    });
  const rows =
    await sql!`UPDATE orders SET status=${to},snapshot=jsonb_set(snapshot,'{status}',${sql!.json(to)}) WHERE id=${id} AND status=${from} RETURNING id`;
  return rows.length > 0;
}
export type WaitlistTokens = { confirm: string; unsubscribe: string };
// Returns tokens when a confirmation email should go out: a new pending
// subscriber, or one still pending an hour after the last email.
export async function joinWaitlist(
  email: string,
  source: string,
  lang: Lang,
  confirmed: boolean,
): Promise<WaitlistTokens | null> {
  const confirm = randomUUID();
  const unsubscribe = randomUUID();
  if (useDemo())
    return demo((d) => {
      const now = new Date();
      const prior = d.waitlist.find((s) => s.email === email);
      if (!prior) {
        d.waitlist.push({
          email,
          source,
          lang,
          token: unsubscribe,
          confirmToken: confirm,
          confirmedAt: confirmed ? now.toISOString() : null,
          subscribedAt: now.toISOString(),
        });
        return confirmed ? null : { confirm, unsubscribe };
      }
      if (
        prior.confirmedAt !== null ||
        Date.parse(prior.subscribedAt) > now.getTime() - 3600000
      )
        return null;
      prior.subscribedAt = now.toISOString();
      return { confirm: prior.confirmToken!, unsubscribe: prior.token };
    });
  const [row] = await sql!`
    INSERT INTO waitlist_subscribers (email,source,consent_version,unsubscribe_token,confirm_token,confirmed_at,lang)
    VALUES (${email},${source},'2026-09-15',${unsubscribe},${confirm},${confirmed ? new Date() : null},${lang})
    ON CONFLICT(email) DO UPDATE SET subscribed_at=now(), lang=EXCLUDED.lang
    WHERE waitlist_subscribers.confirmed_at IS NULL AND waitlist_subscribers.subscribed_at < now() - interval '1 hour'
    RETURNING confirm_token, unsubscribe_token, confirmed_at`;
  if (!row || row.confirmed_at) return null;
  return { confirm: row.confirm_token, unsubscribe: row.unsubscribe_token };
}
export async function confirmWaitlist(token: string) {
  if (useDemo())
    return demo((d) => {
      const s = d.waitlist.find((s) => s.confirmToken === token);
      if (s) s.confirmedAt ||= new Date().toISOString();
      return !!s;
    });
  const rows =
    await sql!`UPDATE waitlist_subscribers SET confirmed_at=COALESCE(confirmed_at, now()) WHERE confirm_token=${token} RETURNING email`;
  return rows.length > 0;
}
export async function unsubscribe(token: string) {
  if (useDemo())
    return demo((d) => {
      d.waitlist = d.waitlist.filter((s) => s.token !== token);
    });
  await sql!`DELETE FROM waitlist_subscribers WHERE unsubscribe_token=${token}`;
}
export async function waitlistCounts() {
  if (useDemo())
    return demo((d) => ({
      confirmed: d.waitlist.filter((s) => s.confirmedAt !== null).length,
      pending: d.waitlist.filter((s) => s.confirmedAt === null).length,
    }));
  const [r] =
    await sql!`SELECT COUNT(*) FILTER (WHERE confirmed_at IS NOT NULL)::int AS confirmed, COUNT(*) FILTER (WHERE confirmed_at IS NULL)::int AS pending FROM waitlist_subscribers`;
  return { confirmed: r!.confirmed as number, pending: r!.pending as number };
}
// Daily counters only: no visitor identifier, IP or cookie is stored.
export async function recordEvent(event: string, source: string) {
  const day = madridDay();
  if (useDemo())
    return demo((d) => {
      const key = `${day}|${event}|${source}`;
      d.events = { ...d.events, [key]: (d.events?.[key] || 0) + 1 };
    });
  await sql!`INSERT INTO analytics_daily (day,event,source,count) VALUES (${day},${event},${source},1) ON CONFLICT(day,event,source) DO UPDATE SET count=analytics_daily.count+1`;
}
export async function funnel(days = 28) {
  const since = madridDay(new Date(Date.now() - days * 86400000));
  if (useDemo())
    return demo((d) => {
      const totals: Record<string, number> = {};
      for (const [key, n] of Object.entries(d.events || {})) {
        const [day, event] = key.split('|');
        if (day! >= since) totals[event!] = (totals[event!] || 0) + n;
      }
      return totals;
    });
  const rows =
    await sql!`SELECT event, SUM(count)::int AS n FROM analytics_daily WHERE day >= ${since} GROUP BY event`;
  return Object.fromEntries(rows.map((r) => [r.event, r.n])) as Record<
    string,
    number
  >;
}
export async function rateLimit(scopeAndIp: string, limit = 12) {
  const key = createHash('sha256')
    .update(scopeAndIp + '|' + new Date().toISOString().slice(0, 10))
    .digest('hex');
  if (useDemo())
    return demo((d) => {
      const now = Date.now();
      const record = d.limits[key];
      const entry =
        record && record.until > now
          ? record
          : { count: 0, until: now + 600000 };
      entry.count++;
      d.limits[key] = entry;
      return entry.count <= limit;
    });
  const [r] =
    await sql!`INSERT INTO request_limits (key,count,resets_at) VALUES (${key},1,now()+interval '10 minutes') ON CONFLICT(key) DO UPDATE SET count=CASE WHEN request_limits.resets_at<now() THEN 1 ELSE request_limits.count+1 END,resets_at=CASE WHEN request_limits.resets_at<now() THEN now()+interval '10 minutes' ELSE request_limits.resets_at END RETURNING count`;
  return r!.count <= limit;
}
// Daily job helpers. Reminders are claimed before sending so two overlapping
// runs never email the same customer twice.
export async function claimReminders(): Promise<Order[]> {
  if (useDemo())
    return demo((d) =>
      d.orders.filter((o) => {
        if (o.status !== 'CONFIRMED' || o.reminderSentAt) return false;
        if (!reminderDue(o.pickupDate)) return false;
        o.reminderSentAt = new Date().toISOString();
        return true;
      }),
    );
  const rows = await sql!`
    UPDATE orders o SET reminder_sent_at=now() FROM bakes b
    WHERE o.bake_id=b.id AND o.status='CONFIRMED' AND o.reminder_sent_at IS NULL
      AND b.pickup_date > now() AND b.pickup_date <= now() + make_interval(hours => ${reminderWindowHours})
    RETURNING o.snapshot`;
  return rows.map((r) => r.snapshot as Order);
}
export async function releaseReminder(id: string) {
  if (useDemo())
    return demo((d) => {
      const o = d.orders.find((o) => o.id === id);
      if (o) o.reminderSentAt = null;
    });
  await sql!`UPDATE orders SET reminder_sent_at=NULL WHERE id=${id}`;
}
export async function unsentConfirmations(): Promise<Order[]> {
  if (useDemo()) return [];
  const rows = await sql!`
    SELECT o.snapshot FROM orders o JOIN bakes b ON b.id=o.bake_id
    WHERE o.status='CONFIRMED' AND o.snapshot->>'emailStatus' IN ('FAILED','PENDING')
      AND o.created_at < now() - interval '10 minutes' AND b.pickup_date > now()`;
  return rows.map((r) => r.snapshot as Order);
}
export async function cleanup() {
  if (useDemo()) return;
  await sql!`DELETE FROM request_limits WHERE resets_at < now() - interval '1 day'`;
  // Unconfirmed sign-ups hold an email without consent: drop them after a week.
  await sql!`DELETE FROM waitlist_subscribers WHERE confirmed_at IS NULL AND subscribed_at < now() - interval '7 days'`;
}
