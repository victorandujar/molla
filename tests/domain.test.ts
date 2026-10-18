import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import {
  confirmationHtml,
  confirmationSubject,
  confirmationText,
  reminderHtml,
  reminderSubject,
  subscriptionFull,
  subscriptionWelcome,
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
  subscriptionSchema,
  subscriptionAction,
  cancellable,
  madridIso,
  pickupCode,
  pickupCodePattern,
  reminderDue,
  weeklyCyclePlan,
  csvCell,
  bananaSplit,
  orderSummary,
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
test('accept known acquisition channels only', () => {
  assert.equal(
    reservationSchema.parse({ ...input, source: 'qr' }).source,
    'qr',
  );
  assert.equal(
    reservationSchema.safeParse({ ...input, source: 'tiktok' }).success,
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

test('weekly cycle opens Sunday for the next Saturday and closes Thursday at 20:00 Madrid time', () => {
  assert.deepEqual(weeklyCyclePlan(new Date('2026-09-26T22:05:00Z')), {
    today: '2026-09-27',
    weekday: 0,
    shouldEnsureBake: true,
    pickupDate: '2026-10-03',
    pickupAt: '2026-10-03T10:00:00.000Z',
    deadline: '2026-10-01T18:00:00.000Z',
  });
  const thursday = weeklyCyclePlan(new Date('2026-12-03T12:00:00Z'));
  assert.equal(thursday.pickupDate, '2026-12-05');
  assert.equal(thursday.deadline, '2026-12-03T19:00:00.000Z');
  assert.equal(thursday.shouldEnsureBake, true);
  assert.equal(
    weeklyCyclePlan(new Date('2026-12-04T12:00:00Z')).shouldEnsureBake,
    false,
  );
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
  assert.match(html, /hasta 35 horas de fermentación lenta/);
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
  assert.match(confirmationHtml(ca), /fins a 35 hores de fermentació lenta/);
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
  assert.equal(ui.ca.process.steps[1]!.time, 'Fins a 35 h');
  assert.equal(ui.es.process.steps[1]!.time, 'Hasta 35 h');
});

test('banana bread goes by halves and an order needs at least one piece', () => {
  assert.deepEqual(bananaSplit(1), { whole: 0, half: 1 });
  assert.deepEqual(bananaSplit(3), { whole: 1, half: 1 });
  assert.deepEqual(bananaSplit(4), { whole: 2, half: 0 });
  const base = { ...input, quantity: 0 };
  assert.equal(reservationSchema.safeParse(base).success, false);
  assert.equal(
    reservationSchema.safeParse({ ...base, banana: 1 }).success,
    true,
  );
  assert.equal(
    reservationSchema.safeParse({ ...base, banana: 5 }).success,
    false,
  );
  assert.equal(
    reservationSchema.safeParse({ ...base, banana: 1.5 }).success,
    false,
  );
});
test('order summaries list every line; older orders keep their single line', () => {
  const legacy = {
    quantity: 2,
    product: 'clasica',
    productName: 'La de cada semana',
    total: 1000,
  } as Order;
  assert.equal(orderSummary(legacy), '2 × La de cada semana');
  const mixed = {
    ...legacy,
    items: [
      {
        product: 'clasica',
        name: 'La de cada semana',
        quantity: 2,
        unitPrice: 500,
      },
      {
        product: 'banana-mitad',
        name: 'Medio banana bread',
        quantity: 1,
        unitPrice: 800,
      },
    ],
  } as Order;
  assert.equal(
    orderSummary(mixed),
    '2 × La de cada semana · 1 × Medio banana bread',
  );
});
test('home delivery needs a town in the zone and an address; pickup needs neither', () => {
  const home = { ...input, delivery: 'home', town: 'sant-just' };
  assert.equal(
    reservationSchema.safeParse({ ...home, address: 'Carrer Major 1, 2n' })
      .success,
    true,
  );
  const noAddress = reservationSchema.safeParse(home);
  assert.equal(noAddress.success, false);
  assert.equal(noAddress.error?.issues[0]?.message, 'address');
  const outside = reservationSchema.safeParse({
    ...home,
    town: 'cornella',
    address: 'Carrer Major 1',
  });
  assert.equal(outside.error?.issues[0]?.message, 'town');
  assert.equal(isMessageKey('town') && isMessageKey('address'), true);
  assert.equal(reservationSchema.parse(input).delivery, 'pickup');
});
test('delivery emails show the address and payment on delivery', () => {
  const delivered: Order = {
    ...order,
    pickupAddress: ui.es.reserve.deliveryLabel('Sant Just Desvern'),
    pickupWindow: '12:00–14:00',
    delivery: { town: 'Sant Just Desvern', address: 'Carrer <b>Major</b> 1' },
  };
  const html = confirmationHtml(delivered);
  assert.match(html, /Entrega a domicilio en Sant Just Desvern/);
  assert.match(html, /Carrer &lt;b&gt;Major&lt;\/b&gt; 1/);
  assert.match(html, /pago al recibirlo/);
  assert.doesNotMatch(html, /punto exacto de recogida/);
  assert.match(reminderHtml(delivered), /Te lo llevo a casa/);
});
const pafix = {
  name: 'Ana',
  email: 'ana@example.com',
  phone: '612345678',
  quantity: 2,
  terms: 'yes',
  privacy: 'yes',
};
test('pa fix needs terms, a quantity and, for home delivery, a town and address', () => {
  const ok = subscriptionSchema.parse(pafix);
  assert.deepEqual(
    [ok.frequency, ok.delivery, ok.banana],
    ['weekly', 'pickup', 0],
  );
  for (const bad of [
    { terms: '' },
    { privacy: '' },
    { quantity: 0 },
    { quantity: 5 },
    { frequency: 'daily' },
    { website: 'x' },
    { delivery: 'home', town: 'sant-just' },
    { delivery: 'home', address: 'Carrer Major 1', town: 'cornella' },
  ])
    assert.equal(
      subscriptionSchema.safeParse({ ...pafix, ...bad }).success,
      false,
      JSON.stringify(bad),
    );
  assert.equal(
    subscriptionSchema.safeParse({ ...pafix, quantity: 0, banana: 2 }).success,
    true,
  );
  assert.equal(
    subscriptionSchema.safeParse({
      ...pafix,
      delivery: 'home',
      town: 'sant-just',
      address: 'Carrer Major 1',
    }).success,
    true,
  );
});
test('the weekly job places, skips or rests each subscription once per bake', () => {
  const bake = { id: 'hornada-010', pickupDate: '2026-10-24T10:00:00.000Z' };
  const sub = {
    status: 'ACTIVE' as const,
    frequency: 'weekly' as const,
    skipRemaining: 0,
    lastBakeId: null,
  };
  assert.equal(subscriptionAction(sub, bake, null), 'place');
  assert.equal(
    subscriptionAction({ ...sub, status: 'PAUSED' }, bake, null),
    'inactive',
  );
  assert.equal(
    subscriptionAction({ ...sub, status: 'CANCELLED' }, bake, null),
    'inactive',
  );
  assert.equal(
    subscriptionAction({ ...sub, lastBakeId: bake.id }, bake, null),
    'handled',
  );
  assert.equal(
    subscriptionAction({ ...sub, skipRemaining: 1 }, bake, null),
    'skip',
  );
  // Weekly keeps going whatever the last delivery; fortnightly rests after one.
  assert.equal(
    subscriptionAction(sub, bake, '2026-10-17T10:00:00.000Z'),
    'place',
  );
  const fortnight = { ...sub, frequency: 'biweekly' as const };
  assert.equal(
    subscriptionAction(fortnight, bake, '2026-10-17T10:00:00.000Z'),
    'rest',
  );
  assert.equal(
    subscriptionAction(fortnight, bake, '2026-10-10T10:00:00.000Z'),
    'place',
  );
  assert.equal(subscriptionAction(fortnight, bake, null), 'place');
});
test('an order is cancellable with its link only until the bake closes', () => {
  const deadline = '2026-10-22T18:00:00.000Z';
  const before = Date.parse(deadline) - 1000;
  assert.equal(cancellable({ status: 'CONFIRMED' }, deadline, before), true);
  assert.equal(
    cancellable({ status: 'CONFIRMED' }, deadline, Date.parse(deadline)),
    false,
  );
  assert.equal(cancellable({ status: 'CANCELLED' }, deadline, before), false);
  assert.equal(cancellable({ status: 'COLLECTED' }, deadline, before), false);
});
test('pa fix and cancellation emails carry one-click private links', () => {
  const token = '11111111-1111-4111-8111-111111111111';
  const manage = '22222222-2222-4222-8222-222222222222';
  const regular = { ...order, cancelToken: token, lang: 'ca' as const };
  const html = confirmationHtml(regular);
  assert.match(html, new RegExp(`/comanda\\?token=${token}&amp;lang=ca`));
  assert.match(html, /Cancel·lar la comanda/);
  assert.doesNotMatch(confirmationHtml(order), /\/comanda\?token/);
  const standing = { ...regular, subscription: { token: manage } };
  const standingHtml = confirmationHtml(standing);
  assert.match(standingHtml, /Saltar aquesta setmana/);
  assert.match(
    standingHtml,
    new RegExp(`/subscripcio\\?token=${manage}&amp;lang=ca`),
  );
  assert.match(confirmationSubject(standing), /El teu pa fix/);
  assert.match(
    confirmationText(standing),
    new RegExp(`/comanda\\?token=${token}`),
  );
  const sub = {
    id: 's',
    token: manage,
    email: 'a@example.com',
    name: '<b>Ana</b> Prueba',
    phone: '600000000',
    lang: 'es' as const,
    quantity: 2,
    banana: 3,
    delivery: 'home' as const,
    town: 'sant-just',
    address: 'Carrer <i>Major</i> 1',
    frequency: 'biweekly' as const,
    status: 'ACTIVE' as const,
    skipRemaining: 0,
    lastBakeId: null,
    source: 'direct',
    createdAt: '',
    cancelledAt: null,
  };
  const welcome = subscriptionWelcome(sub, 'sábado, 24 de octubre');
  assert.match(welcome.html, /sábado, 24 de octubre/);
  assert.match(welcome.html, /2 × La de cada semana/);
  assert.match(welcome.html, /1 × Banana bread entero/);
  assert.match(welcome.html, /Un sábado sí y otro no/);
  assert.match(welcome.html, /Sant Just Desvern/);
  assert.doesNotMatch(welcome.html, /<b>Ana|<i>Major/);
  assert.match(
    welcome.text,
    new RegExp(`/subscripcio\\?token=${manage}&lang=es`),
  );
  assert.match(subscriptionWelcome(sub, '').html, /empezarás con la próxima/);
  assert.match(subscriptionFull(sub).html, /no ha quedado sitio/);
});
