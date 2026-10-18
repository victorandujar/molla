import { randomUUID } from 'node:crypto';
import type postgres from 'postgres';
import { AppError } from './messages';
import { townById } from './delivery';
import {
  bakeState,
  cancellable,
  subscriptionAction,
  type Lang,
  type Order,
  type ReservationInput,
  type Subscription,
  type SubscriptionInput,
  type SubscriptionStatus,
} from './domain';
import {
  currentBake,
  demo,
  reserve,
  sql,
  useDemo,
  type ActiveBake,
} from './store';

const toSubscription = (r: postgres.Row): Subscription => ({
  id: r.id,
  token: r.token,
  email: r.email,
  name: r.name,
  phone: r.phone,
  lang: r.lang,
  quantity: r.quantity,
  banana: r.banana,
  delivery: r.delivery,
  town: r.town,
  address: r.address,
  frequency: r.frequency,
  status: r.status,
  skipRemaining: r.skip_remaining,
  lastBakeId: r.last_bake_id,
  source: r.source,
  createdAt: new Date(r.created_at).toISOString(),
  cancelledAt: r.cancelled_at ? new Date(r.cancelled_at).toISOString() : null,
});
const asStatus = (to: SubscriptionStatus) => to;

// A double click or a retried request must not create two subscriptions.
const recently = (sub: Subscription, input: SubscriptionInput) =>
  sub.email === input.email &&
  sub.status !== 'CANCELLED' &&
  sub.quantity === input.quantity &&
  sub.banana === input.banana &&
  sub.frequency === input.frequency &&
  Date.now() - Date.parse(sub.createdAt) < 600000;

export async function createSubscription(
  input: SubscriptionInput & { lang: Lang },
): Promise<Subscription> {
  const fresh: Subscription = {
    id: randomUUID(),
    token: randomUUID(),
    email: input.email,
    name: input.name,
    phone: input.phone,
    lang: input.lang,
    quantity: input.quantity,
    banana: input.banana,
    delivery: input.delivery,
    town: input.delivery === 'home' ? input.town : '',
    address: input.delivery === 'home' ? input.address : '',
    frequency: input.frequency,
    status: 'ACTIVE',
    skipRemaining: 0,
    lastBakeId: null,
    source: input.source,
    createdAt: new Date().toISOString(),
    cancelledAt: null,
  };
  if (useDemo())
    return demo((d) => {
      d.subscriptions ||= [];
      const prior = d.subscriptions.find((s) => recently(s, input));
      if (prior) return prior;
      d.subscriptions.push(fresh);
      return fresh;
    });
  const [prior] = await sql!`
    SELECT * FROM subscriptions WHERE email=${input.email} AND status!='CANCELLED'
      AND quantity=${input.quantity} AND banana=${input.banana} AND frequency=${input.frequency}
      AND created_at > now() - interval '10 minutes'`;
  if (prior) return toSubscription(prior);
  const [row] = await sql!`
    INSERT INTO subscriptions (id,token,email,name,phone,lang,quantity,banana,delivery,town,address,frequency,status,source)
    VALUES (${fresh.id},${fresh.token},${fresh.email},${fresh.name},${fresh.phone},${fresh.lang},${fresh.quantity},${fresh.banana},${fresh.delivery},${fresh.town},${fresh.address},${fresh.frequency},'ACTIVE',${fresh.source})
    RETURNING *`;
  return toSubscription(row!);
}

export async function subscriptionByToken(
  token: string,
): Promise<Subscription | null> {
  if (useDemo())
    return demo((d) => d.subscriptions?.find((s) => s.token === token) ?? null);
  const [row] = await sql!`SELECT * FROM subscriptions WHERE token=${token}`;
  return row ? toSubscription(row) : null;
}

// Cancels the orders of a subscription that are still open (before the
// bake's deadline). Past orders and the ones already baked stay as they are.
async function cancelOpenOrders(sub: Subscription): Promise<Order[]> {
  if (useDemo()) {
    const bake = await currentBake();
    return demo((d) =>
      d.orders.filter((o) => {
        if (o.subscription?.token !== sub.token) return false;
        if (!cancellable(o, bake.deadline)) return false;
        o.status = 'CANCELLED';
        return true;
      }),
    );
  }
  const rows = await sql!`
    UPDATE orders o SET status='CANCELLED', snapshot=jsonb_set(o.snapshot,'{status}','"CANCELLED"')
    FROM bakes b
    WHERE o.bake_id=b.id AND o.subscription_id=${sub.id} AND o.status='CONFIRMED' AND b.deadline > now()
    RETURNING o.snapshot`;
  return rows.map((r) => r.snapshot as Order);
}

export type SubscriptionChange = {
  sub: Subscription;
  // Orders cancelled by this change (the open one of this week, if any).
  cancelled: Order[];
};

export async function setSubscriptionStatus(
  token: string,
  to: SubscriptionStatus,
): Promise<SubscriptionChange | null> {
  const sub = await subscriptionByToken(token);
  if (!sub) return null;
  // A cancelled subscription stays cancelled: signing up again is one click.
  if (sub.status === 'CANCELLED') return { sub, cancelled: [] };
  const cancelled = to === 'ACTIVE' ? [] : await cancelOpenOrders(sub);
  if (useDemo())
    return demo((d) => {
      const s = d.subscriptions!.find((s) => s.token === token)!;
      s.status = asStatus(to);
      if (to === 'CANCELLED') s.cancelledAt = new Date().toISOString();
      if (to !== 'ACTIVE') s.skipRemaining = 0;
      return { sub: s, cancelled };
    });
  const [row] = await sql!`
    UPDATE subscriptions SET status=${to},
      cancelled_at=CASE WHEN ${to}='CANCELLED' THEN now() ELSE cancelled_at END,
      skip_remaining=CASE WHEN ${to}='ACTIVE' THEN skip_remaining ELSE 0 END
    WHERE id=${sub.id} AND status!='CANCELLED' RETURNING *`;
  return { sub: toSubscription(row!), cancelled };
}

// "Skip": cancels this week's order if it can still be cancelled; otherwise
// the next bake is skipped when the weekly job runs.
export async function skipNext(
  token: string,
): Promise<SubscriptionChange | null> {
  const sub = await subscriptionByToken(token);
  if (!sub) return null;
  if (sub.status !== 'ACTIVE') return { sub, cancelled: [] };
  const cancelled = await cancelOpenOrders(sub);
  if (cancelled.length) return { sub, cancelled };
  if (useDemo())
    return demo((d) => {
      const s = d.subscriptions!.find((s) => s.token === token)!;
      s.skipRemaining = Math.min(s.skipRemaining + 1, 4);
      return { sub: s, cancelled };
    });
  const [row] = await sql!`
    UPDATE subscriptions SET skip_remaining=LEAST(skip_remaining+1,4)
    WHERE id=${sub.id} RETURNING *`;
  return { sub: toSubscription(row!), cancelled };
}

export async function clearSkips(token: string) {
  if (useDemo())
    return demo((d) => {
      const s = d.subscriptions?.find((s) => s.token === token);
      if (s) s.skipRemaining = 0;
    });
  await sql!`UPDATE subscriptions SET skip_remaining=0 WHERE token=${token}`;
}

// The order of this subscription still open for the active bake, if any.
export async function openOrderOf(
  sub: Subscription,
): Promise<{ order: Order; deadline: string } | null> {
  if (useDemo()) {
    const bake = await currentBake();
    return demo((d) => {
      const order = d.orders.find(
        (o) =>
          o.subscription?.token === sub.token && cancellable(o, bake.deadline),
      );
      return order ? { order, deadline: bake.deadline } : null;
    });
  }
  const [row] = await sql!`
    SELECT o.snapshot, b.deadline FROM orders o JOIN bakes b ON b.id=o.bake_id
    WHERE o.subscription_id=${sub.id} AND o.status='CONFIRMED' AND b.deadline > now()
    ORDER BY b.pickup_date LIMIT 1`;
  return row
    ? {
        order: row.snapshot as Order,
        deadline: new Date(row.deadline).toISOString(),
      }
    : null;
}

export async function subscriptionStats() {
  if (useDemo())
    return demo((d) => {
      const active = (d.subscriptions || []).filter(
        (s) => s.status === 'ACTIVE',
      );
      return {
        active: active.length,
        paused: (d.subscriptions || []).filter((s) => s.status === 'PAUSED')
          .length,
        loaves: active.reduce((n, s) => n + s.quantity, 0),
        bananaHalves: active.reduce((n, s) => n + s.banana, 0),
      };
    });
  const [r] = await sql!`
    SELECT COUNT(*) FILTER (WHERE status='ACTIVE')::int AS active,
           COUNT(*) FILTER (WHERE status='PAUSED')::int AS paused,
           COALESCE(SUM(quantity) FILTER (WHERE status='ACTIVE'),0)::int AS loaves,
           COALESCE(SUM(banana) FILTER (WHERE status='ACTIVE'),0)::int AS banana_halves
    FROM subscriptions`;
  return {
    active: r!.active as number,
    paused: r!.paused as number,
    loaves: r!.loaves as number,
    bananaHalves: r!.banana_halves as number,
  };
}

// ---- Order cancellation by private link --------------------------------

export type OrderLink = { order: Order; deadline: string };
export async function orderByCancelToken(
  token: string,
): Promise<OrderLink | null> {
  if (useDemo()) {
    const bake = await currentBake();
    return demo((d) => {
      const order = d.orders.find((o) => o.cancelToken === token);
      return order ? { order, deadline: bake.deadline } : null;
    });
  }
  const [row] = await sql!`
    SELECT o.snapshot, o.status, b.deadline FROM orders o JOIN bakes b ON b.id=o.bake_id
    WHERE o.cancel_token=${token}`;
  return row
    ? {
        order: { ...(row.snapshot as Order), status: row.status },
        deadline: new Date(row.deadline).toISOString(),
      }
    : null;
}
export type CancelResult = 'cancelled' | 'already' | 'late' | 'missing';
export async function cancelOrder(
  token: string,
): Promise<{ result: CancelResult; order: Order | null }> {
  const link = await orderByCancelToken(token);
  if (!link) return { result: 'missing', order: null };
  const { order, deadline } = link;
  if (order.status === 'CANCELLED') return { result: 'already', order };
  if (!cancellable(order, deadline)) return { result: 'late', order };
  if (useDemo())
    return demo((d) => {
      const o = d.orders.find((o) => o.cancelToken === token)!;
      o.status = 'CANCELLED';
      return { result: 'cancelled' as const, order: o };
    });
  const rows = await sql!`
    UPDATE orders o SET status='CANCELLED', snapshot=jsonb_set(o.snapshot,'{status}','"CANCELLED"')
    FROM bakes b
    WHERE o.bake_id=b.id AND o.cancel_token=${token} AND o.status='CONFIRMED' AND b.deadline > now()
    RETURNING o.snapshot`;
  // Lost a race with the deadline or another click: report what is true now.
  if (!rows.length) return cancelOrderState(token);
  return { result: 'cancelled', order: rows[0]!.snapshot as Order };
}
async function cancelOrderState(token: string) {
  const link = await orderByCancelToken(token);
  if (!link) return { result: 'missing' as const, order: null };
  return {
    result:
      link.order.status === 'CANCELLED'
        ? ('already' as const)
        : ('late' as const),
    order: link.order,
  };
}

// ---- Weekly generation -------------------------------------------------

async function activeSubscriptions(): Promise<Subscription[]> {
  if (useDemo())
    return demo((d) =>
      (d.subscriptions || []).filter((s) => s.status === 'ACTIVE'),
    );
  const rows = await sql!`
    SELECT * FROM subscriptions WHERE status='ACTIVE' ORDER BY created_at`;
  return rows.map(toSubscription);
}
async function lastDelivery(sub: Subscription): Promise<string | null> {
  if (useDemo())
    return demo(
      (d) =>
        d.orders
          .filter(
            (o) =>
              o.subscription?.token === sub.token && o.status !== 'CANCELLED',
          )
          .map((o) => o.pickupDate)
          .sort()
          .at(-1) ?? null,
    );
  const [row] = await sql!`
    SELECT MAX(b.pickup_date) AS last FROM orders o JOIN bakes b ON b.id=o.bake_id
    WHERE o.subscription_id=${sub.id} AND o.status!='CANCELLED'`;
  return row?.last ? new Date(row.last).toISOString() : null;
}
async function markHandled(sub: Subscription, bakeId: string, skipped = false) {
  if (useDemo())
    return demo((d) => {
      const s = d.subscriptions!.find((s) => s.id === sub.id)!;
      s.lastBakeId = bakeId;
      if (skipped) s.skipRemaining = Math.max(0, s.skipRemaining - 1);
    });
  await sql!`
    UPDATE subscriptions SET last_bake_id=${bakeId},
      skip_remaining=CASE WHEN ${skipped} THEN GREATEST(skip_remaining-1,0) ELSE skip_remaining END
    WHERE id=${sub.id}`;
}

const requestFor = (
  sub: Subscription,
  bake: Pick<ActiveBake, 'id'>,
): ReservationInput & { lang: Lang } => ({
  requestId: randomUUID(),
  bakeId: bake.id,
  name: sub.name,
  email: sub.email,
  phone: sub.phone,
  quantity: sub.quantity,
  banana: sub.banana,
  product: 'clasica',
  pickup: 'yes',
  privacy: 'yes',
  website: '',
  source: 'pafix',
  delivery: sub.delivery,
  town: sub.town,
  address: sub.address,
  lang: sub.lang,
});
const isDuplicate = (e: unknown) => (e as { code?: string })?.code === '23505';

export type PlaceResult =
  | { kind: 'placed'; order: Order }
  | { kind: 'full' }
  | { kind: 'skip' | 'rest' | 'handled' | 'inactive' }
  | { kind: 'failed' };

// Places the order of one subscription for the bake, applying the skip and
// fortnight rules. Safe to repeat: a bake is handled once per subscription.
export async function placeForSubscription(
  sub: Subscription,
  bake: ActiveBake,
): Promise<PlaceResult> {
  const action = subscriptionAction(sub, bake, await lastDelivery(sub));
  if (action === 'skip') {
    await markHandled(sub, bake.id, true);
    return { kind: 'skip' };
  }
  if (action === 'rest') {
    await markHandled(sub, bake.id);
    return { kind: 'rest' };
  }
  if (action !== 'place') return { kind: action };
  try {
    const order = await reserve(requestFor(sub, bake), {
      id: sub.id,
      token: sub.token,
    });
    await markHandled(sub, bake.id);
    return { kind: 'placed', order };
  } catch (e) {
    if (isDuplicate(e)) {
      await markHandled(sub, bake.id);
      return { kind: 'handled' };
    }
    if (
      e instanceof AppError &&
      (e.key === 'capacity' || e.key === 'bananaCapacity')
    ) {
      await markHandled(sub, bake.id);
      return { kind: 'full' };
    }
    console.error(
      'Subscription order failed',
      sub.id,
      e instanceof Error ? e.message : e,
    );
    return { kind: 'failed' };
  }
}

export type GenerationResult = {
  bakeId: string | null;
  placed: Order[];
  // Subscriptions that did not fit this bake: they are told, not charged.
  full: Subscription[];
  skipped: number;
  rested: number;
  failed: number;
};

// Called right after the weekly cycle opens a bake: subscribers get their
// bread before anyone else can take the loaves.
export async function generateSubscriptionOrders(): Promise<GenerationResult> {
  const result: GenerationResult = {
    bakeId: null,
    placed: [],
    full: [],
    skipped: 0,
    rested: 0,
    failed: 0,
  };
  let bake: ActiveBake;
  try {
    bake = await currentBake();
  } catch {
    return result;
  }
  const state = bakeState(bake, bake.reserved);
  if (state !== 'OPEN' && state !== 'SOLD_OUT') return result;
  result.bakeId = bake.id;
  for (const sub of await activeSubscriptions()) {
    const r = await placeForSubscription(sub, bake);
    if (r.kind === 'placed') result.placed.push(r.order);
    else if (r.kind === 'full') result.full.push(sub);
    else if (r.kind === 'skip') result.skipped++;
    else if (r.kind === 'rest') result.rested++;
    else if (r.kind === 'failed') result.failed++;
  }
  return result;
}

export const townName = (id: string) => townById(id)?.name ?? '';
