import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  broadcastDue,
  followupDue,
  followupKind,
  newsletterDays,
  reservationSchema,
  type Order,
} from '../src/lib/domain';
import {
  broadcastEmail,
  ownerReportEmail,
  pafixEmail,
  thanksEmail,
} from '../src/lib/email-funnel';
import { googleReviews } from '../src/lib/config';

// Saturday 7 Nov 2026 bake: opens Monday 2 Nov 20:00, closes Thursday 5 Nov
// 20:00 (Madrid, CET = UTC+1).
const saturday = {
  status: 'OPEN' as const,
  opensAt: '2026-11-02T19:00:00.000Z',
  deadline: '2026-11-05T19:00:00.000Z',
  pickupDate: '2026-11-07T11:00:00.000Z',
};
const at = (iso: string) => Date.parse(iso);

test('newsletter days default to Saturday and ignore unknown days', () => {
  assert.deepEqual(newsletterDays(undefined), [6]);
  assert.deepEqual(newsletterDays('3,6'), [3, 6]);
  assert.deepEqual(newsletterDays('1,9'), [6]);
});

test('opening email goes out right after the bake opens, last call on closing day', () => {
  // Monday 20:05, the cycle cron: opening.
  assert.equal(broadcastDue(saturday, at('2026-11-02T19:05:00Z'), [6]), 'open');
  // Tuesday 17:00, daily backup run: still the opening (within 36 h).
  assert.equal(broadcastDue(saturday, at('2026-11-03T16:00:00Z'), [6]), 'open');
  // Wednesday 17:00: nothing.
  assert.equal(broadcastDue(saturday, at('2026-11-04T16:00:00Z'), [6]), null);
  // Thursday 17:00, three hours before closing: last call.
  assert.equal(broadcastDue(saturday, at('2026-11-05T16:00:00Z'), [6]), 'last');
  // After the close, nothing.
  assert.equal(broadcastDue(saturday, at('2026-11-05T19:30:00Z'), [6]), null);
});

test('no emails for sold-out bakes or days outside the newsletter', () => {
  const now = at('2026-11-02T19:05:00Z');
  assert.equal(
    broadcastDue({ ...saturday, status: 'SOLD_OUT' }, now, [6]),
    null,
  );
  assert.equal(broadcastDue(saturday, now, [3]), null);
  const wednesday = {
    status: 'OPEN' as const,
    opensAt: '2026-11-05T19:00:00.000Z',
    deadline: '2026-11-09T19:00:00.000Z',
    pickupDate: '2026-11-11T11:00:00.000Z',
  };
  assert.equal(broadcastDue(wednesday, at('2026-11-05T19:05:00Z'), [6]), null);
  assert.equal(
    broadcastDue(wednesday, at('2026-11-05T19:05:00Z'), [3, 6]),
    'open',
  );
});

test('follow-ups: thank-you after the first order, pa fix offer after the second', () => {
  assert.equal(followupKind(1, false), 'thanks');
  assert.equal(followupKind(1, true), 'thanks');
  assert.equal(followupKind(2, false), 'pafix');
  assert.equal(followupKind(2, true), null);
  assert.equal(followupKind(3, false), null);
  const pickup = '2026-11-07T11:00:00.000Z';
  assert.equal(followupDue(pickup, at('2026-11-07T20:00:00Z')), false);
  assert.equal(followupDue(pickup, at('2026-11-08T16:00:00Z')), true);
  assert.equal(followupDue(pickup, at('2026-11-13T16:00:00Z')), false);
});

test('checkout opt-in is optional and unticked by default', () => {
  const base = {
    requestId: '11111111-1111-4111-8111-111111111111',
    bakeId: 'hornada-010',
    name: 'Ana',
    email: 'ANA@example.com',
    phone: '600 000 000',
    quantity: 1,
    pickup: 'yes',
    privacy: 'yes',
  };
  assert.equal(reservationSchema.parse(base).news, false);
  assert.equal(reservationSchema.parse({ ...base, news: 'yes' }).news, true);
  assert.equal(
    reservationSchema.safeParse({ ...base, news: 'si' }).success,
    false,
  );
});

const bake = {
  id: 'hornada-010',
  number: '010',
  ...saturday,
};
const token = '22222222-2222-4222-8222-222222222222';

test('opening email: tagged links, unsubscribe link and header, both languages', () => {
  const es = broadcastEmail('open', 'es', bake, token);
  assert.match(es.subject, /Ya puedes reservar el pan del sábado/);
  assert.match(
    es.html,
    /utm_source=email&amp;utm_medium=funnel&amp;utm_campaign=open-010/,
  );
  assert.match(
    es.html,
    /\/baja\?token=22222222-2222-4222-8222-222222222222&amp;lang=es/,
  );
  assert.match(es.html, /jueves a las 20:00/);
  assert.match(es.html, /hornada\.jpg/);
  assert.match(es.headers!['List-Unsubscribe']!, /\/baja\?token=/);
  assert.match(es.text, /utm_campaign=open-010/);
  const ca = broadcastEmail('last', 'ca', bake, token);
  assert.match(ca.subject, /Avui a les 20:00 tanco les comandes de dissabte/);
  assert.match(ca.html, /<html lang="ca">/);
  assert.match(ca.html, /utm_campaign=last-010/);
  assert.match(ca.html, /lang=ca/);
});

const order: Order = {
  id: 'x',
  code: '010-K7QM',
  requestId: 'r',
  bakeId: 'hornada-010',
  name: '<b>Ana</b> Pérez',
  email: 'a@example.com',
  phone: '600000000',
  quantity: 1,
  product: 'clasica',
  productName: 'La de cada semana',
  total: 500,
  pickupDate: saturday.pickupDate,
  pickupAddress: 'Punto de recogida en Sant Boi de Llobregat',
  pickupWindow: '12:00–14:00',
  source: 'google',
  status: 'COLLECTED',
  createdAt: '',
  emailStatus: 'SENT',
};

test('thank-you email asks for a review, a neighbour and (if not subscribed) the weekly email', () => {
  const m = thanksEmail(
    order,
    'https://www.mollapa.com/alta?token=abc&lang=es',
  );
  assert.doesNotMatch(m.html, /<b>Ana/);
  assert.ok(m.html.includes(googleReviews.reviewUrl));
  assert.match(m.html, /wa\.me/);
  assert.match(m.html, /\/alta\?token=abc/);
  const subscribed = thanksEmail({ ...order, lang: 'ca' }, null);
  assert.doesNotMatch(subscribed.html, /\/alta\?token/);
  assert.match(subscribed.subject, /Què tal el pa\?/);
});

test('pa fix offer links the standing order page with its campaign', () => {
  const m = pafixEmail(order);
  assert.match(m.html, /\/es\/pan-fijo\?utm_source=email/);
  assert.match(m.html, /pafix-offer/);
  assert.match(
    pafixEmail({ ...order, lang: 'ca' }).html,
    /\/pa-fix\?utm_source=email/,
  );
});

test('weekly report adds up the funnel without personal data', () => {
  const m = ownerReportEmail({
    from: '2026-10-25',
    to: '2026-10-31',
    events: {
      landing_view: 300,
      view_current_bake: 200,
      start_reservation: 40,
      reservation_completed: 20,
    },
    bySource: [{ source: 'google', visits: 120, orders: 9 }],
    orders: 20,
    customers: 18,
    newCustomers: 7,
    revenueCents: 14250,
    bakes: [
      {
        number: '009',
        pickupDate: '2026-10-31T11:00:00.000Z',
        reserved: 10,
        capacity: 10,
      },
    ],
    subscribers: { confirmed: 55, pending: 3 },
    standing: 6,
    emails: { open: 50, thanks: 7 },
  });
  assert.match(m.subject, /20 pedidos/);
  assert.match(m.text, /Empiezan a reservar: 40 · 20%/);
  assert.match(m.text, /google: 120 visitas · 9 pedidos/);
  assert.match(m.text, /Apertura de hornada: 50/);
  assert.match(m.text, /10\/10 hogazas \(100%\)/);
});

test('invite codes: valid ones pass through, anything else is ignored', async () => {
  const { referralCode, referralPattern, giftCroissants } =
    await import('../src/lib/domain');
  const code = referralCode(new Uint8Array([0, 1, 2, 3, 4, 5]));
  assert.match(code, referralPattern);
  const base = {
    requestId: '11111111-1111-4111-8111-111111111111',
    bakeId: 'hornada-010',
    name: 'Ana',
    email: 'ana@example.com',
    phone: '600 000 000',
    quantity: 1,
    pickup: 'yes',
    privacy: 'yes',
  };
  assert.equal(
    reservationSchema.parse({ ...base, ref: ' k7qmrt ' }).ref,
    'K7QMRT',
  );
  assert.equal(reservationSchema.parse({ ...base, ref: 'K7QMR0' }).ref, '');
  assert.equal(reservationSchema.parse({ ...base, ref: '<script>' }).ref, '');
  assert.equal(reservationSchema.parse(base).ref, '');
  assert.equal(giftCroissants({ invited: true, referralGifts: 2 }), 3);
  assert.equal(giftCroissants({}), 0);
});

test('confirmation and owner emails carry the gifts and the personal invite link', async () => {
  const t = await import('../src/lib/email-templates');
  const o = {
    ...order,
    status: 'CONFIRMED' as const,
    referralCode: 'K7QMRT',
    invited: true,
    referralGifts: 1,
  };
  const html = t.confirmationHtml(o);
  assert.match(
    html,
    /\?ref=K7QMRT&amp;utm_source=referral&amp;utm_campaign=convida/,
  );
  assert.match(html, /Vienes invitado/);
  assert.match(html, /Por haber invitado a un vecino/);
  assert.match(t.confirmationText(o), /\?ref=K7QMRT/);
  assert.match(t.ownerText(o), /Regalo: 2 croissants sin cobrar/);
  assert.match(t.ownerHtml(o), /Regalo/);
  assert.doesNotMatch(t.ownerText(order), /Regalo/);
  const thanks = thanksEmail({ ...o, lang: 'ca' }, null);
  assert.match(thanks.html, /ref%3DK7QMRT/);
  assert.match(thanks.html, /croissant de regal/);
});

test('reward email tells the referrer their gift waits, without naming the friend', async () => {
  const { rewardEmail } = await import('../src/lib/email-funnel');
  const m = rewardEmail({ name: 'Marta Soler', lang: 'ca', code: 'K7QMRT' });
  assert.match(m.subject, /Un veí ha provat Molla gràcies a tu/);
  assert.match(m.html, /Marta, el teu proper croissant és de regal/);
  assert.match(m.html, /utm_campaign=reward/);
  assert.match(m.text, /\?ref=K7QMRT/);
});

test('weekly emails carry the personal invite link of customers only', () => {
  const withCode = broadcastEmail('open', 'ca', bake, token, 'K7QMRT');
  assert.match(withCode.html, /Convida un veí: un croissant per a cadascú/);
  assert.match(withCode.html, /ref%3DK7QMRT/);
  assert.match(withCode.text, /\?ref=K7QMRT/);
  const without = broadcastEmail('open', 'ca', bake, token);
  assert.doesNotMatch(without.html, /Convida un veí: un croissant/);
});

test('Christmas: the Wednesday bake moves to Thursday 24 and 31, still one bake open', async () => {
  const { weeklyCyclePlan } = await import('../src/lib/domain');
  const at = (iso: string) => weeklyCyclePlan(new Date(iso));
  // Thursday 17 Dec after 20:00 (CET): Saturday 19 has closed, Thursday 24 opens.
  assert.deepEqual(
    (({ pickupDate, deadline }) => ({ pickupDate, deadline }))(
      at('2026-12-17T19:30:00Z'),
    ),
    { pickupDate: '2026-12-24', deadline: '2026-12-22T19:00:00.000Z' },
  );
  // Tuesday 22 before 20:00: still Thursday 24; after 20:00, Saturday 26.
  assert.equal(at('2026-12-22T18:59:00Z').pickupDate, '2026-12-24');
  assert.equal(at('2026-12-22T19:01:00Z').pickupDate, '2026-12-26');
  // Thursday 24 after 20:00: Thursday 31 (closes Tuesday 29).
  assert.deepEqual(
    (({ pickupDate, deadline }) => ({ pickupDate, deadline }))(
      at('2026-12-24T19:30:00Z'),
    ),
    { pickupDate: '2026-12-31', deadline: '2026-12-29T19:00:00.000Z' },
  );
  assert.equal(at('2026-12-29T19:01:00Z').pickupDate, '2027-01-02');
  // January is back to Wednesday and Saturday.
  assert.equal(at('2027-01-02T19:01:00Z').pickupDate, '2027-01-06');
  // An ordinary week is unchanged.
  assert.equal(at('2026-11-05T19:01:00Z').pickupDate, '2026-11-11');
});

test('Christmas campaigns: due on their day or up to two days after, in both languages', async () => {
  const { campaigns, campaignsDue } = await import('../src/lib/campaigns');
  const { campaignEmail } = await import('../src/lib/email-funnel');
  assert.deepEqual(campaignsDue('2026-11-30'), []);
  assert.deepEqual(
    campaignsDue('2026-12-01').map((c) => c.id),
    ['nadal-2026-anunci'],
  );
  assert.deepEqual(
    campaignsDue('2026-12-03').map((c) => c.id),
    ['nadal-2026-anunci'],
  );
  assert.deepEqual(campaignsDue('2026-12-04'), []);
  assert.deepEqual(
    campaignsDue('2026-12-18').map((c) => c.bakeDate),
    ['2026-12-24'],
  );
  assert.deepEqual(
    campaignsDue('2026-12-27').map((c) => c.bakeDate),
    ['2026-12-31'],
  );
  const first = campaigns[0]!;
  const ca = campaignEmail(first, 'ca', token, 'K7QMRT');
  assert.match(ca.subject, /Aquest Nadal/);
  assert.match(ca.html, /Dijous 24/);
  assert.match(ca.html, /panettone de massa mare/);
  assert.match(ca.html, /\/nadal\?dia=24&amp;utm_source=email/);
  assert.match(ca.html, /\/nadal\?dia=31&amp;utm_source=email/);
  assert.match(ca.html, /utm_campaign=nadal-2026-anunci/);
  assert.match(ca.html, /\/baja\?token=/);
  assert.match(ca.html, /ref%3DK7QMRT/);
  assert.match(ca.headers!['List-Unsubscribe']!, /baja/);
  const es = campaignEmail(campaigns[2]!, 'es', token);
  assert.match(es.subject, /Nochevieja/);
  assert.match(es.html, /\/es\/navidad\?dia=31/);
  assert.doesNotMatch(es.html, /dia=24/);
  assert.doesNotMatch(es.html, /panettone/);
});
