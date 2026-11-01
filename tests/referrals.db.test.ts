// "Convida un veí" against a real PostgreSQL (empties the orders tables):
//   TEST_DATABASE_URL=postgres://… npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import postgres from 'postgres';

const url = process.env.TEST_DATABASE_URL;
const skip = url
  ? false
  : 'Define TEST_DATABASE_URL para probar con PostgreSQL';

test(
  'invite links: gift for the friend, then for the referrer once delivered',
  { skip },
  async () => {
    process.env.DATABASE_URL = url;
    const db = postgres(url!, { max: 1 });
    const store = await import('../src/lib/store');
    const funnel = await import('../src/lib/funnel');
    const { weeklyCyclePlan } = await import('../src/lib/domain');
    try {
      await db`TRUNCATE referrals, email_sends, order_items, orders, subscriptions, customers, bakes CASCADE`;
      const plan = weeklyCyclePlan();
      await db`INSERT INTO bakes(id,number,pickup_date,deadline,opens_at,capacity,status) VALUES ('hornada-030','030',${plan.pickupAt},${plan.deadline},${new Date(Date.now() - 3600000)},20,'OPEN')`;
      const bake = await store.currentBake();
      assert.equal(bake.id, 'hornada-030');
      const reserve = (email: string, ref = '') =>
        store.reserve({
          requestId: randomUUID(),
          bakeId: bake.id,
          name: 'Nom Prova',
          email,
          phone: '612345678',
          quantity: 1,
          banana: 0,
          croissant: 0,
          pain: 0,
          product: 'clasica',
          pickup: 'yes',
          privacy: 'yes',
          news: false,
          ref,
          website: '',
          source: 'direct',
          delivery: 'pickup',
          town: '',
          address: '',
          lang: 'ca',
        });
      const ana = await reserve('ana@example.com');
      assert.match(ana.referralCode!, /^[A-HJKMNP-Z2-9]{6}$/);
      assert.ok(!ana.invited);
      // Her code stays the same on her next order.
      assert.equal(
        (await reserve('ana@example.com')).referralCode,
        ana.referralCode,
      );
      // A friend's first order through Ana's link carries the gift.
      const bea = await reserve('bea@example.com', ana.referralCode);
      assert.equal(bea.invited, true);
      assert.notEqual(bea.referralCode, ana.referralCode);
      // Not on a second order, nor with your own code, nor for existing customers.
      assert.ok(!(await reserve('bea@example.com', ana.referralCode)).invited);
      assert.ok(!(await reserve('ana@example.com', ana.referralCode)).invited);
      // Until Bea's order is delivered Ana earns nothing.
      assert.ok(!(await reserve('ana@example.com')).referralGifts);
      assert.deepEqual(await funnel.earnedRewards(), []);
      // Bea's bake was delivered a day ago: Ana is told, then her next order carries the gift.
      await db`UPDATE bakes SET pickup_date=now() - interval '1 day', status='COMPLETED' WHERE id='hornada-030'`;
      await db`INSERT INTO bakes(id,number,pickup_date,deadline,opens_at,capacity,status) VALUES ('hornada-031','031',${plan.pickupAt},${plan.deadline},${new Date(Date.now() - 3600000)},20,'OPEN')`;
      const rewards = await funnel.earnedRewards();
      assert.deepEqual(
        rewards.map((r) => [r.email, r.code, r.lang]),
        [['ana@example.com', ana.referralCode, 'ca']],
      );
      const next = await store.reserve({
        requestId: randomUUID(),
        bakeId: 'hornada-031',
        name: 'Ana',
        email: 'ana@example.com',
        phone: '612345678',
        quantity: 1,
        banana: 0,
        croissant: 0,
        pain: 0,
        product: 'clasica',
        pickup: 'yes',
        privacy: 'yes',
        news: false,
        ref: '',
        website: '',
        source: 'direct',
        delivery: 'pickup',
        town: '',
        address: '',
        lang: 'ca',
      });
      assert.equal(next.referralGifts, 1);
      assert.deepEqual(await funnel.earnedRewards(), []);
      // Cancelling that order frees the gift for the following one.
      await store.setOrderStatus(next.id, 'CANCELLED');
      const again = await store.reserve({
        requestId: randomUUID(),
        bakeId: 'hornada-031',
        name: 'Ana',
        email: 'ana@example.com',
        phone: '612345678',
        quantity: 1,
        banana: 0,
        croissant: 0,
        pain: 0,
        product: 'clasica',
        pickup: 'yes',
        privacy: 'yes',
        news: false,
        ref: '',
        website: '',
        source: 'direct',
        delivery: 'pickup',
        town: '',
        address: '',
        lang: 'ca',
      });
      assert.equal(again.referralGifts, 1);
    } finally {
      await db.end();
      await store.sql?.end();
    }
  },
);
