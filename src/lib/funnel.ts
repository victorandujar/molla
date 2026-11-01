// Data side of the automated funnel. Every email is claimed in `email_sends`
// before it goes out (and released if the provider refuses it), so repeated
// or overlapping cron runs never send the same email twice.
import { randomBytes, randomUUID } from 'node:crypto';
import { demo, sql, useDemo } from './store';
import { referralGift } from './config';
import { referralCode, type Lang, type Order } from './domain';

export type Recipient = { email: string; lang: Lang; token: string };

// Confirmed subscribers who have not ordered from this bake yet and have no
// active "pa fix" (they get their bread anyway). At most `limit` per run.
export async function claimBroadcast(
  kind: 'open' | 'last',
  bakeId: string,
  limit: number,
): Promise<Recipient[]> {
  if (useDemo()) return [];
  const rows = await sql!`
    WITH claimed AS (
      INSERT INTO email_sends (kind, ref, email)
      SELECT ${kind}, ${bakeId}, w.email FROM waitlist_subscribers w
      WHERE w.confirmed_at IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM orders o JOIN customers c ON c.id=o.customer_id
          WHERE o.bake_id=${bakeId} AND o.status!='CANCELLED' AND c.email=w.email)
        AND NOT EXISTS (
          SELECT 1 FROM subscriptions s WHERE s.email=w.email AND s.status='ACTIVE')
        AND NOT EXISTS (
          SELECT 1 FROM email_sends e WHERE e.kind=${kind} AND e.ref=${bakeId} AND e.email=w.email)
      ORDER BY w.subscribed_at
      LIMIT ${limit}
      ON CONFLICT DO NOTHING
      RETURNING email
    )
    SELECT w.email, w.lang, w.unsubscribe_token
    FROM claimed JOIN waitlist_subscribers w ON w.email=claimed.email`;
  return rows.map((r) => ({
    email: r.email as string,
    lang: r.lang === 'ca' ? 'ca' : 'es',
    token: String(r.unsubscribe_token),
  }));
}

// A refused batch goes back to the queue for the next run.
export async function releaseSends(
  kind: string,
  ref: string,
  emails: string[],
) {
  if (useDemo() || !emails.length) return;
  await sql!`DELETE FROM email_sends WHERE kind=${kind} AND ref=${ref} AND email IN ${sql!(emails)}`;
}

// One-off emails (a follow-up, the weekly report): true if this run owns it.
export async function claimOnce(kind: string, ref: string, email: string) {
  if (useDemo()) return false;
  const rows =
    await sql!`INSERT INTO email_sends (kind, ref, email) VALUES (${kind}, ${ref}, ${email}) ON CONFLICT DO NOTHING RETURNING email`;
  return rows.length > 0;
}

// Orders delivered between 20 hours and 5 days ago (not standing orders),
// with the customer's order number and whether they have a "pa fix".
export async function deliveredOrders(): Promise<
  { order: Order; number: number; subscribed: boolean }[]
> {
  if (useDemo()) return [];
  const rows = await sql!`
    SELECT o.snapshot, c.email,
      (SELECT COUNT(*) FROM orders o2 JOIN bakes b2 ON b2.id=o2.bake_id
        WHERE o2.customer_id=o.customer_id AND o2.status!='CANCELLED'
          AND b2.pickup_date <= b.pickup_date)::int AS number,
      EXISTS (SELECT 1 FROM subscriptions s
        WHERE s.email=c.email AND s.status!='CANCELLED') AS subscribed
    FROM orders o
    JOIN customers c ON c.id=o.customer_id
    JOIN bakes b ON b.id=o.bake_id
    WHERE o.status!='CANCELLED' AND o.subscription_id IS NULL
      AND b.pickup_date <= now() - interval '20 hours'
      AND b.pickup_date >= now() - interval '5 days'
    ORDER BY b.pickup_date`;
  return rows.map((r) => ({
    // The customer row holds the email used for the claim; anonymised
    // snapshots (purge) are older than the window anyway.
    order: { ...(r.snapshot as Order), email: r.email as string },
    number: r.number as number,
    subscribed: !!r.subscribed,
  }));
}

// A buyer who ticked "tell me every week" at checkout: they typed this email
// to place an order, so they join the list confirmed. Unsubscribing works
// like any other subscriber.
export async function optInFromOrder(
  email: string,
  source: string,
  lang: Lang,
) {
  if (useDemo())
    return demo((d) => {
      const prior = d.waitlist.find((s) => s.email === email);
      const now = new Date().toISOString();
      if (prior) prior.confirmedAt ||= now;
      else
        d.waitlist.push({
          email,
          source,
          lang,
          token: randomUUID(),
          confirmToken: randomUUID(),
          confirmedAt: now,
          subscribedAt: now,
        });
    });
  await sql!`
    INSERT INTO waitlist_subscribers (email,source,consent_version,unsubscribe_token,confirm_token,confirmed_at,lang)
    VALUES (${email},${source},'checkout-2026-11',${randomUUID()},${randomUUID()},now(),${lang})
    ON CONFLICT(email) DO UPDATE SET confirmed_at=COALESCE(waitlist_subscribers.confirmed_at, now()), lang=EXCLUDED.lang`;
}

// Double opt-in link for the thank-you email: a pending row whose confirm
// token the email carries. Null if the customer is already subscribed.
// Unconfirmed rows are deleted after 7 days by the daily cleanup.
export async function inviteToken(
  email: string,
  lang: Lang,
): Promise<string | null> {
  if (useDemo()) return null;
  const [row] = await sql!`
    INSERT INTO waitlist_subscribers (email,source,consent_version,unsubscribe_token,confirm_token,confirmed_at,lang)
    VALUES (${email},'email','invite-2026-11',${randomUUID()},${randomUUID()},NULL,${lang})
    ON CONFLICT(email) DO UPDATE SET subscribed_at=CASE WHEN waitlist_subscribers.confirmed_at IS NULL THEN now() ELSE waitlist_subscribers.subscribed_at END
    RETURNING confirm_token, confirmed_at`;
  if (!row || row.confirmed_at) return null;
  return String(row.confirm_token);
}

const madridDay = (at: Date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(at);

// Figures for the baker's weekly summary, without personal data.
export async function weeklyFigures(days = 7) {
  const now = new Date();
  const from = madridDay(new Date(now.getTime() - days * 86400000));
  const to = madridDay(new Date(now.getTime() - 86400000));
  if (useDemo()) return null;
  const events = await sql!`
    SELECT event, source, SUM(count)::int AS n FROM analytics_daily
    WHERE day >= ${from} AND day <= ${to} GROUP BY event, source`;
  const [sales] = await sql!`
    SELECT COUNT(*)::int AS orders, COUNT(DISTINCT o.customer_id)::int AS customers,
      COALESCE(SUM((o.snapshot->>'total')::int),0)::int AS revenue,
      COUNT(DISTINCT o.customer_id) FILTER (WHERE NOT EXISTS (
        SELECT 1 FROM orders p WHERE p.customer_id=o.customer_id AND p.status!='CANCELLED'
          AND p.created_at < ${from}::date))::int AS new_customers
    FROM orders o
    WHERE o.status!='CANCELLED' AND o.created_at >= ${from}::date
      AND o.created_at < ${to}::date + 1`;
  const bySource = await sql!`
    SELECT o.snapshot->>'source' AS source, COUNT(*)::int AS n FROM orders o
    WHERE o.status!='CANCELLED' AND o.created_at >= ${from}::date
      AND o.created_at < ${to}::date + 1
    GROUP BY 1`;
  const bakes = await sql!`
    SELECT b.number, b.pickup_date, b.capacity,
      COALESCE((SELECT SUM(i.quantity) FROM orders o JOIN order_items i ON i.order_id=o.id
        WHERE o.bake_id=b.id AND o.status!='CANCELLED' AND i.product_id='clasica'),0)::int AS reserved
    FROM bakes b WHERE b.pickup_date >= ${from}::date - 1 AND b.pickup_date < now() + interval '7 days'
    ORDER BY b.pickup_date`;
  const [lists] = await sql!`
    SELECT
      (SELECT COUNT(*) FROM waitlist_subscribers WHERE confirmed_at IS NOT NULL)::int AS confirmed,
      (SELECT COUNT(*) FROM waitlist_subscribers WHERE confirmed_at IS NULL)::int AS pending,
      (SELECT COUNT(*) FROM subscriptions WHERE status='ACTIVE')::int AS standing`;
  const [refs] = await sql!`
    SELECT COUNT(*)::int AS n FROM referrals
    WHERE created_at >= ${from}::date AND created_at < ${to}::date + 1`;
  const sends = await sql!`
    SELECT kind, COUNT(*)::int AS n FROM email_sends
    WHERE sent_at >= ${from}::date GROUP BY kind`;
  const totals: Record<string, number> = {};
  const visits: Record<string, number> = {};
  for (const r of events) {
    totals[r.event] = (totals[r.event] || 0) + (r.n as number);
    if (r.event === 'landing_view')
      visits[r.source] = (visits[r.source] || 0) + (r.n as number);
  }
  const orders = Object.fromEntries(bySource.map((r) => [r.source, r.n]));
  const channels = [
    ...new Set([...Object.keys(visits), ...Object.keys(orders)]),
  ]
    .map((source) => ({
      source,
      visits: visits[source] || 0,
      orders: (orders[source] as number) || 0,
    }))
    .sort((a, b) => b.orders - a.orders || b.visits - a.visits);
  return {
    from,
    to,
    events: totals,
    bySource: channels,
    orders: sales!.orders as number,
    customers: sales!.customers as number,
    newCustomers: sales!.new_customers as number,
    revenueCents: sales!.revenue as number,
    bakes: bakes.map((b) => ({
      number: b.number as string,
      pickupDate: new Date(b.pickup_date).toISOString(),
      reserved: b.reserved as number,
      capacity: b.capacity as number,
    })),
    subscribers: {
      confirmed: lists!.confirmed as number,
      pending: lists!.pending as number,
    },
    standing: lists!.standing as number,
    referred: refs!.n as number,
    emails: Object.fromEntries(sends.map((r) => [r.kind, r.n])) as Record<
      string,
      number
    >,
  };
}

// Funnel emails sent in the last `days` days, by kind, for /gestio.
export async function funnelEmailCounts(days = 28) {
  if (useDemo()) return {} as Record<string, number>;
  const rows = await sql!`
    SELECT kind, COUNT(*)::int AS n FROM email_sends
    WHERE sent_at >= now() - make_interval(days => ${days}) GROUP BY kind`;
  return Object.fromEntries(rows.map((r) => [r.kind, r.n])) as Record<
    string,
    number
  >;
}

// Referrers whose friend's first order was delivered between 20 hours and
// 10 days ago and whose gift is still waiting: they hear about it once.
export async function earnedRewards(): Promise<
  { orderId: string; email: string; name: string; lang: Lang; code: string }[]
> {
  if (useDemo()) return [];
  const rows = await sql!`
    SELECT r.order_id, c.email, c.name, c.referral_code,
      (SELECT o.snapshot->>'lang' FROM orders o WHERE o.customer_id=c.id
        ORDER BY o.created_at DESC LIMIT 1) AS lang
    FROM referrals r
    JOIN customers c ON c.id=r.referrer_id
    JOIN orders f ON f.id=r.order_id JOIN bakes fb ON fb.id=f.bake_id
    WHERE f.status!='CANCELLED' AND r.reward_order_id IS NULL
      AND c.referral_code IS NOT NULL
      AND fb.pickup_date <= now() - interval '20 hours'
      AND fb.pickup_date >= now() - interval '10 days'`;
  return rows.map((r) => ({
    orderId: String(r.order_id),
    email: r.email as string,
    name: r.name as string,
    lang: r.lang === 'ca' ? 'ca' : 'es',
    code: r.referral_code as string,
  }));
}

// "Convida un veí" in the weekly emails: the invite code of every recipient
// who is already a customer, created now for those who ordered before the
// programme existed (their code would otherwise wait for their next order).
export async function referralCodesFor(
  emails: string[],
): Promise<Record<string, string>> {
  if (useDemo() || !emails.length || !referralGift.active) return {};
  const missing =
    await sql!`SELECT id FROM customers WHERE email IN ${sql!(emails)} AND referral_code IS NULL`;
  for (const c of missing) {
    let done = false;
    while (!done) {
      const candidate = referralCode(randomBytes(6));
      const rows =
        await sql!`UPDATE customers SET referral_code=${candidate} WHERE id=${c.id} AND referral_code IS NULL AND NOT EXISTS (SELECT 1 FROM customers WHERE referral_code=${candidate}) RETURNING id`;
      const [still] =
        await sql!`SELECT referral_code FROM customers WHERE id=${c.id}`;
      done = rows.length > 0 || !!still?.referral_code;
    }
  }
  const rows =
    await sql!`SELECT email, referral_code FROM customers WHERE email IN ${sql!(emails)} AND referral_code IS NOT NULL`;
  return Object.fromEntries(
    rows.map((r) => [r.email as string, r.referral_code as string]),
  );
}
