// Runs against a real PostgreSQL only when TEST_DATABASE_URL points to a
// database with the migrations applied (it empties the orders tables):
//   TEST_DATABASE_URL=postgres://… npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import postgres from 'postgres';

const url = process.env.TEST_DATABASE_URL;
const skip = url
  ? false
  : 'Define TEST_DATABASE_URL para probar con PostgreSQL';
const day = 86400000;

test(
  'pa fix against PostgreSQL: weekly job, cancellation links and skips',
  { skip },
  async () => {
    process.env.DATABASE_URL = url;
    const db = postgres(url!, { max: 1 });
    const subs = await import('../src/lib/subscriptions');
    const store = await import('../src/lib/store');
    try {
      await db`TRUNCATE order_items, orders, subscriptions, customers, bakes CASCADE`;
      await db`INSERT INTO products(id,name,price) VALUES ('clasica','La de cada semana',500),('banana','Banana bread',1500),('banana-mitad','Banana bread · mitad',800) ON CONFLICT(id) DO UPDATE SET price=EXCLUDED.price`;
      const iso = (ms: number) => new Date(Date.now() + ms).toISOString();
      const addBake = (
        id: string,
        number: string,
        pickupInDays: number,
        capacity = 5,
      ) =>
        db`INSERT INTO bakes(id,number,pickup_date,deadline,opens_at,capacity,status) VALUES (${id},${number},${iso(pickupInDays * day)},${iso(pickupInDays * day - 2 * day)},${iso(-day)},${capacity},'OPEN')`;
      await addBake('hornada-010', '010', 5);
      const input = (over: object) => ({
        name: 'Ana Prueba',
        email: 'ana@example.com',
        phone: '612345678',
        quantity: 2,
        banana: 0,
        frequency: 'weekly' as const,
        delivery: 'home' as const,
        town: 'sant-just',
        address: 'Carrer Major 1, 2n',
        terms: 'yes' as const,
        privacy: 'yes' as const,
        website: '',
        source: 'direct' as const,
        lang: 'ca' as const,
        ...over,
      });
      const a = await subs.createSubscription(input({}));
      await new Promise((r) => setTimeout(r, 5));
      const b = await subs.createSubscription(
        input({
          email: 'bea@example.com',
          quantity: 1,
          frequency: 'biweekly',
          delivery: 'pickup',
        }),
      );
      await new Promise((r) => setTimeout(r, 5));
      const c = await subs.createSubscription(
        input({ email: 'cesc@example.com', quantity: 3, delivery: 'pickup' }),
      );
      // A repeated request does not create a second subscription.
      assert.equal((await subs.createSubscription(input({}))).id, a.id);

      // Week 1: capacity 5 → 2 + 1 fit, the 3 loaves of the third do not.
      let r = await subs.generateSubscriptionOrders();
      assert.equal(r.bakeId, 'hornada-010');
      assert.equal(r.placed.length, 2);
      assert.deepEqual(
        r.full.map((s) => s.email),
        ['cesc@example.com'],
      );
      const first = r.placed.find((o) => o.email === 'ana@example.com')!;
      assert.equal(first.delivery?.town, 'Sant Just Desvern');
      assert.equal(first.subscription?.token, a.token);
      assert.ok(first.cancelToken);
      // Running the job again changes nothing.
      r = await subs.generateSubscriptionOrders();
      assert.equal(r.placed.length, 0);
      assert.equal(r.full.length, 0);
      assert.equal((await db`SELECT count(*)::int AS n FROM orders`)[0]!.n, 2);

      // One-click cancellation by link, once.
      const link = await subs.orderByCancelToken(first.cancelToken!);
      assert.equal(link?.order.status, 'CONFIRMED');
      assert.equal(
        (await subs.cancelOrder(first.cancelToken!)).result,
        'cancelled',
      );
      assert.equal(
        (await subs.cancelOrder(first.cancelToken!)).result,
        'already',
      );
      assert.equal(
        (await subs.cancelOrder('00000000-0000-4000-8000-000000000000')).result,
        'missing',
      );
      const [row] =
        await db`SELECT status, snapshot->>'status' AS snap FROM orders WHERE id=${first.id}`;
      assert.deepEqual([row!.status, row!.snap], ['CANCELLED', 'CANCELLED']);

      // Skipping with an open order cancels it; with none it skips the next bake.
      const openB = await subs.openOrderOf(b);
      assert.ok(openB);
      assert.equal((await subs.skipNext(b.token))!.cancelled.length, 1);
      assert.equal((await subs.skipNext(b.token))!.sub.skipRemaining, 1);
      await subs.clearSkips(b.token);
      assert.equal((await subs.subscriptionByToken(b.token))!.skipRemaining, 0);

      // After the deadline nothing can be cancelled with the link any more.
      const second = (await subs.generateSubscriptionOrders()).placed;
      assert.equal(second.length, 0);
      await db`UPDATE bakes SET deadline=${iso(-1000)} WHERE id='hornada-010'`;
      const still = (
        await db`SELECT snapshot->>'cancelToken' AS t FROM orders WHERE status='CONFIRMED' LIMIT 1`
      )[0];
      if (still) assert.equal((await subs.cancelOrder(still.t)).result, 'late');

      // Week 2: the new bake becomes the active one.
      await db`UPDATE bakes SET status='COMPLETED' WHERE id='hornada-010'`;
      await addBake('hornada-011', '011', 12, 6);
      r = await subs.generateSubscriptionOrders();
      assert.equal(r.bakeId, 'hornada-011');
      const emails = r.placed.map((o) => o.email).sort();
      // Ana (weekly) and Cesc (did not fit last week) get bread; Bea's last
      // delivery was cancelled, so her fortnight is due as well.
      assert.deepEqual(emails, [
        'ana@example.com',
        'bea@example.com',
        'cesc@example.com',
      ]);

      // Pausing and cancelling stop the weekly orders and cancel the open one.
      const paused = await subs.setSubscriptionStatus(a.token, 'PAUSED');
      assert.equal(paused!.cancelled.length, 1);
      await subs.setSubscriptionStatus(a.token, 'ACTIVE');
      const gone = await subs.setSubscriptionStatus(c.token, 'CANCELLED');
      assert.equal(gone!.sub.status, 'CANCELLED');
      assert.ok(gone!.sub.cancelledAt);
      assert.equal(
        (await subs.setSubscriptionStatus(c.token, 'ACTIVE'))!.sub.status,
        'CANCELLED',
      );
      const stats = await subs.subscriptionStats();
      assert.deepEqual([stats.active, stats.paused], [2, 0]);
    } finally {
      await db.end();
      void store;
    }
  },
);
