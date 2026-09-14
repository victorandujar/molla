import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  bakeState,
  assertCapacity,
  reservationSchema,
  waitlistSchema,
} from '../src/lib/domain';
const b = {
  status: 'OPEN' as const,
  opensAt: '2026-09-14T00:00:00+02:00',
  deadline: '2026-09-17T20:00:00+02:00',
  capacity: 20,
};
const monday = Date.parse('2026-09-14T12:00:00+02:00');
test('open, upcoming, sold out, deadline and completed states', () => {
  assert.equal(bakeState(b, 0, monday), 'OPEN');
  assert.equal(bakeState(b, 20, monday), 'SOLD_OUT');
  assert.equal(bakeState(b, 0, Date.parse(b.opensAt) - 1), 'UPCOMING');
  assert.equal(bakeState(b, 0, Date.parse(b.deadline)), 'CLOSED');
  assert.equal(
    bakeState({ ...b, status: 'COMPLETED' }, 20, monday),
    'COMPLETED',
  );
  assert.equal(bakeState({ ...b, status: 'CLOSED' }, 0, monday), 'CLOSED');
});
test('last loaf allowed; no overbooking or reservation at deadline', () => {
  assert.doesNotThrow(() => assertCapacity(b, 19, 1, monday));
  assert.throws(() => assertCapacity(b, 19, 2, monday));
  assert.throws(() => assertCapacity(b, 0, 1, Date.parse(b.deadline)));
});
const input = {
  requestId: 'd7cd3ec3-04bc-4e4d-a0c7-2ebc8d0e9325',
  bakeId: 'hornada-001',
  name: 'Ana',
  email: 'ANA@example.com',
  phone: '+34 612 345 678',
  product: 'clasica',
  quantity: 1,
  pickup: 'yes',
  privacy: 'yes',
};
test('validate and normalize reservation, no unknown products or malicious quantities', () => {
  assert.equal(reservationSchema.parse(input).email, 'ana@example.com');
  for (const quantity of [-1, 0, 5, 1.5, NaN])
    assert.equal(
      reservationSchema.safeParse({ ...input, quantity }).success,
      false,
    );
  assert.equal(
    reservationSchema.safeParse({ ...input, product: 'especial' }).success,
    false,
  );
  assert.equal(
    reservationSchema.safeParse({ ...input, website: 'spam' }).success,
    false,
  );
  assert.equal(
    reservationSchema.safeParse({ ...input, privacy: '' }).success,
    false,
  );
  assert.equal(
    reservationSchema.safeParse({ ...input, phone: '---------' }).success,
    false,
  );
});
test('waitlist requires explicit consent', () => {
  assert.equal(
    waitlistSchema.safeParse({ email: 'ana@example.com' }).success,
    false,
  );
  assert.equal(
    waitlistSchema.parse({ email: 'ANA@example.com', consent: 'yes' }).email,
    'ana@example.com',
  );
});
