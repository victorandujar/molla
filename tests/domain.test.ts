import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import {
  confirmationHtml,
  confirmationSubject,
  reminderHtml,
  reminderSubject,
  waitlistConfirmation,
} from '../src/lib/email-templates';
import { madridParts, ui } from '../src/lib/i18n';
import { WEEKLY_LOAF_PRICE_CENTS } from '../src/lib/config';
import { isMessageKey } from '../src/lib/messages';
import {
  bakeState,
  assertCapacity,
  reservationSchema,
  waitlistSchema,
  madridIso,
  pickupCode,
  pickupCodePattern,
  reminderDue,
  csvCell,
  type Order,
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

test('Madrid wall-clock times respect summer and winter offsets', () => {
  assert.equal(madridIso('2026-09-26', '12:00'), '2026-09-26T10:00:00.000Z');
  assert.equal(madridIso('2026-12-05', '12:00'), '2026-12-05T11:00:00.000Z');
  assert.equal(madridIso('2026-10-25', '20:00'), '2026-10-25T19:00:00.000Z');
  assert.equal(madridIso('2027-03-28', '20:00'), '2027-03-28T18:00:00.000Z');
  assert.throws(() => madridIso('26/09/2026'));
});

test('pickup codes are short, readable and carry the bake number', () => {
  assert.equal(pickupCode('001', new Uint8Array([0, 30, 31, 255])), '001-A9AH');
  for (let i = 0; i < 500; i++) {
    const code = pickupCode('012', randomBytes(4));
    assert.match(code, pickupCodePattern);
    assert.doesNotMatch(code.slice(4), /[01ILO]/);
  }
});
const order: Order = {
  id: 'x',
  code: '001-K7QM',
  requestId: 'r',
  bakeId: 'hornada-001',
  name: '<script>alert(1)</script> Ana',
  email: 'a@example.com',
  phone: '600000000',
  quantity: 1,
  product: 'clasica',
  productName: 'La de cada semana',
  total: WEEKLY_LOAF_PRICE_CENTS,
  pickupDate: '2026-09-26T10:00:00.000Z',
  pickupAddress: 'Punto de recogida en Sant Boi de Llobregat',
  pickupWindow: 'de 12:00 a 13:00',
  source: 'direct',
  status: 'CONFIRMED',
  createdAt: '',
  emailStatus: 'PENDING',
};
test('confirmation email escapes customer input without exposing the old pickup point', () => {
  const html = confirmationHtml(order);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /001-K7QM/);
  assert.match(
    html,
    /Te confirmaremos el punto exacto de recogida con tu pedido/,
  );
  assert.doesNotMatch(html, /Ronda de Sant Ramon|Google Maps|mapa-recogida/);
  assert.match(html, /<html lang="es">/);
});
test('emails follow the customer language; older orders stay in Spanish', () => {
  const ca = { ...order, lang: 'ca' as const };
  assert.match(confirmationSubject(ca), /El teu pa de dissabte/);
  assert.match(
    confirmationHtml(ca),
    /<html lang="ca">[\s\S]*Codi de recollida[\s\S]*\/privacitat/,
  );
  assert.match(confirmationSubject(order), /Tu pan del sábado/);
  assert.match(reminderSubject(ca), /^Recordatori/);
  const reminder = reminderHtml(order);
  assert.doesNotMatch(reminder, /<script>/);
  assert.match(reminder, /A pagar al recoger|a pagar al recoger/);
});
test('waitlist confirmation links confirm and unsubscribe in the right language', () => {
  const m = waitlistConfirmation('ca', {
    confirm: '11111111-1111-4111-8111-111111111111',
    unsubscribe: '22222222-2222-4222-8222-222222222222',
  });
  assert.match(
    m.html,
    /\/alta\?token=11111111-1111-4111-8111-111111111111&amp;lang=ca/,
  );
  assert.match(
    m.text,
    /\/baja\?token=22222222-2222-4222-8222-222222222222&lang=ca/,
  );
});
test('reminders go out only within 30 hours before pickup', () => {
  const pickup = '2026-09-26T10:00:00.000Z';
  const at = (iso: string) => Date.parse(iso);
  assert.equal(reminderDue(pickup, at('2026-09-25T16:00:00Z')), true);
  assert.equal(reminderDue(pickup, at('2026-09-24T16:00:00Z')), false);
  assert.equal(reminderDue(pickup, at('2026-09-26T10:00:01Z')), false);
});
test('CSV cells neutralise formulas without losing data', () => {
  assert.equal(csvCell('+34 612 345 678'), `"'+34 612 345 678"`);
  assert.equal(csvCell('=HYPERLINK("x")'), `"'=HYPERLINK(""x"")"`);
  assert.equal(csvCell('Ana'), '"Ana"');
  assert.equal(csvCell(undefined), '""');
});
test('schema issues map to translated messages', () => {
  const r = reservationSchema.safeParse({ ...input, phone: 'abc' });
  assert.equal(r.success, false);
  const key = r.error!.issues[0]!.message;
  assert.equal(key, 'phone');
  assert.equal(isMessageKey(key), true);
  const privacy = reservationSchema.safeParse({ ...input, privacy: '' });
  assert.equal(privacy.error!.issues[0]!.message, 'privacy');
});
test('deadline copy comes from the bake date, in Madrid time', () => {
  const deadline = '2026-09-24T18:00:00.000Z';
  assert.deepEqual(madridParts('ca', deadline), {
    weekday: 'dijous',
    day: '24',
    time: '20:00',
  });
  assert.equal(
    ui.es.bake.open(deadline),
    'Pedidos hasta el jueves 24 a las 20:00 o hasta completar la hornada.',
  );
  assert.equal(
    ui.ca.process.pickupWhen('2026-09-26T10:00:00.000Z'),
    'Dissabte',
  );
});
