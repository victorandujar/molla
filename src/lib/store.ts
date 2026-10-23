import { randomUUID, randomBytes, createHash } from 'node:crypto';
import postgres from 'postgres';
import {
  bake,
  brand,
  isDemo,
  productById,
  welcomeGift,
  BANANA_HALVES_PER_BAKE,
  PASTRY_UNITS_PER_BAKE,
} from './config';
import { ui } from './i18n';
import { deliveryWindow, townById } from './delivery';
import { AppError } from './messages';
import {
  assertCapacity,
  bananaSplit,
  madridIso,
  madridWeekday,
  pastryBake,
  pickupCode,
  reminderDue,
  reminderWindowHours,
  weeklyCyclePlan,
  type Lang,
  type Order,
  type OrderItem,
  type ReservationInput,
  type Subscription,
  type BakeState,
} from './domain';
// Exported for subscriptions.ts, which shares this connection and the demo file.
export const sql = process.env.DATABASE_URL
  ? postgres(process.env.DATABASE_URL, {
      max: 2,
      prepare: false,
      connect_timeout: 10,
      idle_timeout: 10,
    })
  : null;
export type Demo = {
  bakeStatus?: BakeState;
  // Tests only: the weekday of the demo bake (3 = Wednesday, 6 = Saturday)
  // instead of whichever is open now.
  bakeDay?: number;
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
  subscriptions?: Subscription[];
};
// Vite may load this module once per route: the write queue lives on
// globalThis so every copy serialises its read-modify-write of the file.
const shared = globalThis as { mollaDemoQueue?: Promise<unknown> };
export async function demo<T>(fn: (data: Demo) => T | Promise<T>): Promise<T> {
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
export const useDemo = () => !sql || isDemo;
const madridDay = (at = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(at);
// `reserved` counts loaves (the bake's capacity); banana bread has its own
// smaller quota, counted in halves, and pastries share one quota of pieces.
export type ActiveBake = typeof bake & {
  reserved: number;
  bananaReserved: number;
  pastryReserved: number;
};
const pastryIds = ['croissant', 'pain-au-chocolat'];
const halvesOf = (i: Pick<OrderItem, 'product' | 'quantity'>) =>
  i.product === 'banana'
    ? i.quantity * 2
    : i.product === 'banana-mitad'
      ? i.quantity
      : 0;
const liveOrders = (d: Demo, bakeId: string) =>
  d.orders.filter((o) => o.bakeId === bakeId && o.status !== 'CANCELLED');
const reservedIn = (d: Demo, bakeId: string) =>
  liveOrders(d, bakeId).reduce((n, o) => n + o.quantity, 0);
const bananaIn = (d: Demo, bakeId: string) =>
  liveOrders(d, bakeId).reduce(
    (n, o) => n + (o.items || []).reduce((m, i) => m + halvesOf(i), 0),
    0,
  );
const pastryIn = (d: Demo, bakeId: string) =>
  liveOrders(d, bakeId).reduce(
    (n, o) =>
      n +
      (o.items || [])
        .filter((i) => pastryIds.includes(i.product))
        .reduce((m, i) => m + i.quantity, 0),
    0,
  );
// The local demo always shows the next bake still taking orders (of the
// requested weekday, when a test asks for one).
const demoDates = (d: Pick<Demo, 'bakeDay'>) => {
  let plan = weeklyCyclePlan();
  while (d.bakeDay !== undefined && madridWeekday(plan.pickupAt) !== d.bakeDay)
    plan = weeklyCyclePlan(new Date(Date.parse(plan.deadline) + 60000));
  return {
    pickupDate: plan.pickupAt,
    deadline: plan.deadline,
    // Open since today, even when a test asks for a later bake day.
    opensAt: madridIso(weeklyCyclePlan().today, '00:00'),
  };
};
const demoBake = (d: Demo): ActiveBake => ({
  ...bake,
  ...demoDates(d),
  status: d.bakeStatus || bake.status,
  reserved: reservedIn(d, bake.id),
  bananaReserved: bananaIn(d, bake.id),
  pastryReserved: pastryIn(d, bake.id),
});
const reservedSql = sql
  ? sql`COALESCE((SELECT SUM(i.quantity) FROM orders o JOIN order_items i ON i.order_id=o.id WHERE o.bake_id=b.id AND o.status!='CANCELLED' AND i.product_id='clasica'),0)::int AS reserved,
        COALESCE((SELECT SUM(CASE i.product_id WHEN 'banana' THEN i.quantity*2 WHEN 'banana-mitad' THEN i.quantity ELSE 0 END) FROM orders o JOIN order_items i ON i.order_id=o.id WHERE o.bake_id=b.id AND o.status!='CANCELLED'),0)::int AS banana_reserved,
        COALESCE((SELECT SUM(i.quantity) FROM orders o JOIN order_items i ON i.order_id=o.id WHERE o.bake_id=b.id AND o.status!='CANCELLED' AND i.product_id IN ('croissant','pain-au-chocolat')),0)::int AS pastry_reserved`
  : null;
// The database decides the active bake: the next pickup still taking orders
// (once Thursday's close passes, that is the following week's), else the next
// pickup not yet completed, or the most recent one so the page shows "closed"
// until the next is created.
const activeBakeRow = (db: postgres.Sql) => db`
    SELECT b.*, ${reservedSql!}
    FROM bakes b, LATERAL (SELECT b.status!='COMPLETED' AND b.pickup_date > now() - interval '12 hours' AS upcoming) u
    ORDER BY u.upcoming DESC, (u.upcoming AND b.deadline > now()) DESC, CASE WHEN u.upcoming THEN b.pickup_date END ASC, b.pickup_date DESC
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
  bananaReserved: (b.banana_reserved as number) || 0,
  pastryReserved: (b.pastry_reserved as number) || 0,
});
export async function currentBake(): Promise<ActiveBake> {
  if (useDemo()) return demo(demoBake);
  let [b] = await activeBakeRow(sql!);
  // Past a close with no next bake yet (the cron has not run, or failed), or
  // an earlier bake day due that does not exist yet: open it now so nobody
  // lands on a closed shop or on the wrong day.
  const due = weeklyCyclePlan().pickupDate;
  if (
    !b ||
    new Date(b.deadline).getTime() <= Date.now() ||
    madridDay(new Date(b.pickup_date)) > due
  ) {
    try {
      await runWeeklyBakeCycle();
      [b] = await activeBakeRow(sql!);
    } catch (e) {
      console.error(
        'Opening the next bake failed',
        e instanceof Error ? e.message : e,
      );
    }
  }
  if (!b) throw new Error('La próxima hornada todavía se está preparando.');
  return toBake(b);
}
export async function listBakes(): Promise<ActiveBake[]> {
  if (useDemo()) return demo((d) => [demoBake(d)]);
  const rows =
    await sql!`SELECT b.*, ${reservedSql!} FROM bakes b ORDER BY b.pickup_date DESC LIMIT 12`;
  return rows.map(toBake);
}
// Lines of an order, priced from the catalog and named in the buyer's language.
function itemsFor(input: ReservationInput, lang: Lang): OrderItem[] {
  const names = ui[lang].catalog;
  const { whole, half } = bananaSplit(input.banana);
  const lines: [string, number, string][] = [
    ['clasica', input.quantity, names.loaf],
    ['banana', whole, names.bananaWhole],
    ['banana-mitad', half, names.bananaHalf],
    ['croissant', input.croissant, names.croissant],
    ['pain-au-chocolat', input.pain, names.pain],
  ];
  return lines
    .filter(([, quantity]) => quantity > 0)
    .map(([product, quantity, name]) => ({
      product,
      name,
      quantity,
      unitPrice: productById(product)!.price,
    }));
}
const assertBanana = (reserved: number, halves: number) => {
  if (halves > 0 && reserved + halves > BANANA_HALVES_PER_BAKE)
    throw new AppError('bananaCapacity');
};
const assertPastry = (pickupIso: string, reserved: number, units: number) => {
  if (units > 0 && !pastryBake(pickupIso)) throw new AppError('pastryDay');
  if (units > 0 && reserved + units > PASTRY_UNITS_PER_BAKE)
    throw new AppError('pastryCapacity');
};
export async function reserve(
  input: ReservationInput & { lang: Lang },
  // Set when the weekly job places the order of a "pa fix".
  standing?: { id: string; token: string },
): Promise<Order> {
  const items = itemsFor(input, input.lang);
  const town = input.delivery === 'home' ? townById(input.town) : undefined;
  const order: Order = {
    id: randomUUID(),
    code: '',
    requestId: input.requestId,
    bakeId: input.bakeId,
    name: input.name,
    email: input.email,
    phone: input.phone,
    quantity: input.quantity,
    product: items[0]!.product,
    productName: items[0]!.name,
    total: items.reduce((n, i) => n + i.unitPrice * i.quantity, 0),
    items,
    pickupDate: bake.pickupDate,
    pickupAddress: town
      ? ui[input.lang].reserve.deliveryLabel(town.name)
      : brand.pickupLabel[input.lang],
    pickupWindow: town ? deliveryWindow : bake.pickupWindow,
    delivery: town ? { town: town.name, address: input.address } : undefined,
    cancelToken: randomUUID(),
    subscription: standing ? { token: standing.token } : undefined,
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
      order.pickupDate = demoDates(d).pickupDate;
      assertCapacity(
        { ...bake, ...demoDates(d), status: d.bakeStatus || bake.status },
        reservedIn(d, bake.id),
        input.quantity,
      );
      assertBanana(bananaIn(d, bake.id), input.banana);
      assertPastry(
        order.pickupDate,
        pastryIn(d, bake.id),
        input.croissant + input.pain,
      );
      order.firstOrder =
        welcomeGift.active &&
        !d.orders.some(
          (o) => o.email === input.email && o.status !== 'CANCELLED',
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
      await tx`SELECT COALESCE(SUM(i.quantity) FILTER (WHERE i.product_id='clasica'),0)::int AS n,
        COALESCE(SUM(CASE i.product_id WHEN 'banana' THEN i.quantity*2 WHEN 'banana-mitad' THEN i.quantity ELSE 0 END),0)::int AS banana,
        COALESCE(SUM(i.quantity) FILTER (WHERE i.product_id IN ('croissant','pain-au-chocolat')),0)::int AS pastry
        FROM orders o JOIN order_items i ON i.order_id=o.id WHERE o.bake_id=${input.bakeId} AND o.status!='CANCELLED'`;
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
    assertBanana(count?.banana || 0, input.banana);
    assertPastry(
      new Date(b.pickup_date).toISOString(),
      count?.pastry || 0,
      input.croissant + input.pain,
    );
    const [seen] =
      await tx`SELECT 1 FROM orders o JOIN customers c ON c.id=o.customer_id WHERE c.email=${input.email} AND o.status!='CANCELLED' LIMIT 1`;
    order.firstOrder = welcomeGift.active && !seen;
    order.pickupDate = new Date(b.pickup_date).toISOString();
    if (!town) order.pickupWindow = b.pickup_window || brand.pickupWindow;
    // The bake row is locked, so no concurrent reservation can take the same code.
    do order.code = pickupCode(b.number, randomBytes(4));
    while ((await tx`SELECT 1 FROM orders WHERE code=${order.code}`).length);
    // The catalog in the database must agree with the price on the page.
    const ids = items.map((i) => i.product);
    const rows =
      await tx`SELECT id, price FROM products WHERE id IN ${tx(ids)}`;
    for (const item of items) {
      const p = rows.find((r) => r.id === item.product);
      if (!p) throw new AppError('productUnavailable');
      if (p.price !== item.unitPrice) throw new AppError('priceChanged');
    }
    // An existing customer keeps their stored details: anyone can type an
    // email, so a new order must not overwrite someone else's name or phone.
    // Each order snapshot keeps the details given with that order.
    const [customer] =
      await tx`INSERT INTO customers (id,email,name,phone) VALUES (${randomUUID()},${input.email},${input.name},${input.phone}) ON CONFLICT(email) DO UPDATE SET email=customers.email RETURNING id`;
    await tx`INSERT INTO orders (id,code,request_id,bake_id,customer_id,snapshot,status,subscription_id,cancel_token) VALUES (${order.id},${order.code},${order.requestId},${input.bakeId},${customer!.id},${tx.json(order)},'CONFIRMED',${standing?.id ?? null},${order.cancelToken!})`;
    for (const item of items)
      await tx`INSERT INTO order_items (order_id,product_id,quantity,unit_price) VALUES (${order.id},${item.product},${item.quantity},${item.unitPrice})`;
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

const madridClock = (at: Date) =>
  new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Madrid',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(at);

export type WeeklyCycleResult = {
  closed: number;
  completed: number;
  created: string | null;
  active: string | null;
};

// Reconciles the weekly lifecycle. An advisory transaction lock and the
// pickup-date lookup make repeated/overlapping cron calls harmless.
export async function runWeeklyBakeCycle(
  now = new Date(),
): Promise<WeeklyCycleResult> {
  if (useDemo())
    return { closed: 0, completed: 0, created: null, active: null };

  return sql!.begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(hashtext('molla-weekly-bake-cycle'))`;
    const closed = await tx`
      UPDATE bakes SET status='CLOSED'
      WHERE deadline <= ${now} AND status IN ('UPCOMING','OPEN','SOLD_OUT')
      RETURNING id`;

    const initialPlan = weeklyCyclePlan(now);
    const startOfToday = madridIso(initialPlan.today, '00:00');
    const completed = await tx`
      UPDATE bakes SET status='COMPLETED'
      WHERE pickup_date < ${startOfToday} AND status!='COMPLETED'
      RETURNING id`;

    const [existing] = await tx`
      SELECT id,status FROM bakes
      WHERE (pickup_date AT TIME ZONE 'Europe/Madrid')::date=${initialPlan.pickupDate}::date
      ORDER BY pickup_date LIMIT 1`;
    if (existing) {
      if (existing.status === 'UPCOMING')
        await tx`UPDATE bakes SET status='OPEN',opens_at=LEAST(opens_at,${now}) WHERE id=${existing.id}`;
      return {
        closed: closed.length,
        completed: completed.length,
        created: null,
        active: existing.id as string,
      };
    }

    const [latest] =
      await tx`SELECT number,capacity,pickup_date,pickup_window FROM bakes ORDER BY pickup_date DESC LIMIT 1`;
    const pickupTime = latest?.pickup_date
      ? madridClock(new Date(latest.pickup_date))
      : madridClock(new Date(bake.pickupDate));
    const plan = weeklyCyclePlan(now, pickupTime);
    const number = String(Number(latest?.number || 0) + 1).padStart(3, '0');
    const id = `hornada-${number}`;
    await tx`
      INSERT INTO bakes(id,number,pickup_date,deadline,opens_at,capacity,status,pickup_window)
      VALUES(
        ${id},${number},${plan.pickupAt},${plan.deadline},${now},
        ${Number(latest?.capacity || bake.capacity)},'OPEN',
        ${(latest?.pickup_window as string | null) || brand.pickupWindow || null}
      )`;
    return {
      closed: closed.length,
      completed: completed.length,
      created: id,
      active: id,
    };
  }) as Promise<WeeklyCycleResult>;
}
