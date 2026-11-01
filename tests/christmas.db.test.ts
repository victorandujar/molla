// Christmas early bakes against a real PostgreSQL (empties the orders tables):
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
  'Christmas bakes open on 1 December alongside the weekly one',
  { skip },
  async () => {
    process.env.DATABASE_URL = url;
    const db = postgres(url!, { max: 1 });
    const store = await import('../src/lib/store');
    try {
      await db`TRUNCATE referrals, email_sends, order_items, orders, subscriptions, customers, bakes CASCADE`;
      await db`INSERT INTO products(id,name,price) VALUES ('clasica','La de cada semana',500) ON CONFLICT(id) DO UPDATE SET price=EXCLUDED.price`;
      // The last weekly bake before December, with the new quota of 16.
      await db`INSERT INTO bakes(id,number,pickup_date,deadline,opens_at,capacity,status,pickup_window) VALUES ('hornada-020','020','2026-11-28T11:00:00Z','2026-11-26T19:00:00Z','2026-11-23T19:00:00Z',16,'CLOSED','de 12:00 a 13:00')`;
      const bakes = async () =>
        (
          await db`SELECT id, to_char(pickup_date AT TIME ZONE 'Europe/Madrid','YYYY-MM-DD') AS day, deadline, capacity, status FROM bakes ORDER BY pickup_date`
        ).map((b) => ({
          id: b.id as string,
          day: b.day as string,
          capacity: b.capacity as number,
          status: b.status as string,
          deadline: new Date(b.deadline).toISOString(),
        }));

      // Monday 30 November, 17:00: Wednesday's bake is open, nothing early yet.
      await store.runWeeklyBakeCycle(new Date('2026-11-30T16:00:00Z'));
      assert.deepEqual(
        (await bakes()).map((b) => b.day),
        ['2026-11-28', '2026-12-02'],
      );
      // 1 December: both Christmas bakes appear, open, with 16 each.
      await store.runWeeklyBakeCycle(new Date('2026-12-01T16:00:00Z'));
      await store.runWeeklyBakeCycle(new Date('2026-12-01T19:05:00Z'));
      const dec1 = await bakes();
      assert.deepEqual(
        dec1.map((b) => b.day),
        ['2026-11-28', '2026-12-02', '2026-12-05', '2026-12-24', '2026-12-31'],
      );
      const xmas = dec1.filter((b) => b.day >= '2026-12-24');
      assert.deepEqual(
        xmas.map((b) => [b.status, b.capacity, b.deadline]),
        [
          ['OPEN', 16, '2026-12-22T19:00:00.000Z'],
          ['OPEN', 16, '2026-12-29T19:00:00.000Z'],
        ],
      );
      // A quota set on an early bake does not leak into the weekly ones.
      await db`UPDATE bakes SET capacity=40 WHERE id=${xmas[0]!.id}`;
      await store.runWeeklyBakeCycle(new Date('2026-12-03T19:30:00Z'));
      const dec9 = (await bakes()).find((b) => b.day === '2026-12-09');
      assert.equal(dec9?.capacity, 16);

      // Orders: the Christmas bake takes them on its own page; a stray old bake does not.
      // (The test runs before December: open the early bake now.)
      await db`UPDATE bakes SET opens_at=now() - interval '1 hour' WHERE id=${xmas[0]!.id}`;
      const order = (bakeId: string) =>
        store.reserve({
          requestId: randomUUID(),
          bakeId,
          name: 'Nom Prova',
          email: 'ana@example.com',
          phone: '612345678',
          quantity: 2,
          banana: 0,
          croissant: 0,
          pain: 0,
          product: 'clasica',
          pickup: 'yes',
          privacy: 'yes',
          news: false,
          ref: '',
          website: '',
          source: 'email',
          delivery: 'pickup',
          town: '',
          address: '',
          lang: 'ca',
        });
      const placed = await order(xmas[0]!.id);
      assert.equal(placed.pickupDate, '2026-12-24T11:00:00.000Z');
      await assert.rejects(order('hornada-020'), /bakeChanged|capacity/);
      assert.equal((await store.bookableBake(xmas[0]!.id))?.reserved, 2);
      assert.equal(await store.bookableBake('hornada-020'), null);

      // 17 December: the 24th becomes the bake of the week, without a duplicate.
      await store.runWeeklyBakeCycle(new Date('2026-12-17T19:30:00Z'));
      const dec17 = await bakes();
      assert.equal(dec17.filter((b) => b.day === '2026-12-24').length, 1);
      assert.equal(
        dec17.find((b) => b.day === '2026-12-24')?.deadline,
        '2026-12-22T19:00:00.000Z',
      );
    } finally {
      await db.end();
      await store.sql?.end();
    }
  },
);
