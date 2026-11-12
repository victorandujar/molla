import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  deliveryWindow,
  eveningWindow,
  isWednesday,
  slotWindow,
  windowHours,
} from '../src/lib/delivery';
import { reservationSchema } from '../src/lib/domain';
import { isMessageKey } from '../src/lib/messages';

// 2026-11-18 is a Wednesday, 2026-11-21 a Saturday (Madrid time).
const wednesday = '2026-11-18T12:00:00+01:00';
const saturday = '2026-11-21T12:00:00+01:00';

test('the evening round only exists on Wednesdays', () => {
  assert.equal(isWednesday(wednesday), true);
  assert.equal(isWednesday(saturday), false);
  // Late on Tuesday in UTC is already Wednesday in Madrid.
  assert.equal(isWednesday('2026-11-17T23:30:00Z'), true);
  assert.equal(slotWindow('evening', wednesday), eveningWindow);
  assert.equal(slotWindow('midday', wednesday), deliveryWindow);
  assert.equal(slotWindow('evening', saturday), deliveryWindow);
  assert.equal(windowHours(eveningWindow), 'de 18 a 20 h');
  assert.ok(isMessageKey('slot'));
});

test('an order defaults to midday and accepts the evening slot', () => {
  const base = {
    requestId: crypto.randomUUID(),
    bakeId: 'bake-1',
    name: 'Ana',
    phone: '612 345 678',
    quantity: 1,
    privacy: 'yes',
    delivery: 'home',
    town: 'sant-boi',
    address: 'Carrer Major 1',
  };
  assert.equal(reservationSchema.parse(base).slot, 'midday');
  assert.equal(
    reservationSchema.parse({ ...base, slot: 'evening' }).slot,
    'evening',
  );
  assert.equal(
    reservationSchema.safeParse({ ...base, slot: 'night' }).success,
    false,
  );
});
