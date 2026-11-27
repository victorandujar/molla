import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeSheet } from '../src/lib/recipes';
import { dayName, sheetEmail } from '../src/lib/amasado-email';
import {
  addDays,
  countChanges,
  madridClock,
  sendDays,
} from '../src/lib/amasado';

const meta = {
  bakeNumber: '045',
  kneadDate: '2026-12-01',
  bakeDate: '2026-12-02',
  doubtful: [],
};

test('asunto: día de amasado y panes por tipo', () => {
  const s = computeSheet({ clasica: 3, integral: 1, 'masa-madre': 2 });
  assert.equal(
    sheetEmail(s, meta).subject,
    'molla. · Amasado martes 1 dic · 6 panes (A: 3 · B: 1 · C: 2)',
  );
  const extra = computeSheet({ clasica: 1, nueces: 2, 'pan-de-leche': 1 });
  assert.equal(
    sheetEmail(extra, meta).subject,
    'molla. · Amasado martes 1 dic · 4 panes (A: 1 · B: 0 · C: 0 · relleno: 2 · leche: 1)',
  );
});

test('el email lleva los bloques, lo no calculado y los pedidos dudosos', () => {
  const s = computeSheet(
    { clasica: 2, 'masa-madre': 4, banana: 1 },
    { banana: 'Banana bread' },
  );
  const { text, html } = sheetEmail(s, {
    ...meta,
    doubtful: [
      { code: '045-ABCD', reason: 'Pedido sin productos', items: '—' },
    ],
  });
  for (const title of [
    '1 · RESUMEN',
    '2 · POOLISH DE ESTA NOCHE',
    '3 · STARTER Y LEVAIN DE ESTA NOCHE',
    '4 · MASA',
    '5 · COMPROBACIÓN',
    '6 · RECORDATORIOS',
    '7 · PEDIDOS DUDOSOS',
  ])
    assert.ok(text.includes(title), title);
  assert.ok(text.includes('Sin fórmula definida (no calculado)'));
  assert.ok(text.includes('Banana bread · 1'));
  assert.ok(text.includes('045-ABCD'));
  assert.ok(text.includes('goma elástica'));
  assert.ok(text.includes('1.286 g'));
  assert.ok(text.includes('74,09 %'));
  assert.ok(html.includes('Starter para C'));
  // Sin panes C ni rellenos no hay bloque de starter.
  const onlyA = sheetEmail(computeSheet({ clasica: 1 }), meta).text;
  assert.ok(!onlyA.includes('STARTER'));
  assert.ok(!onlyA.includes('PEDIDOS DUDOSOS'));
});

test('los nombres de producto se escapan en el HTML', () => {
  const s = computeSheet({ raro: 1 }, { raro: '<b>pan</b>' });
  assert.ok(sheetEmail(s, meta).html.includes('&lt;b&gt;pan&lt;/b&gt;'));
});

test('hora de Madrid en invierno y en verano', () => {
  // 18:30 UTC: 19:30 en invierno (todavía no), 20:30 en verano.
  assert.deepEqual(madridClock(new Date('2026-11-30T18:30:00Z')), {
    date: '2026-11-30',
    time: '19:30',
    weekday: 1,
  });
  assert.equal(madridClock(new Date('2026-11-30T19:30:00Z')).time, '20:30');
  assert.equal(madridClock(new Date('2026-06-01T18:30:00Z')).time, '20:30');
  assert.equal(
    madridClock(new Date('2026-06-01T22:30:00Z')).date,
    '2026-06-02',
  );
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(dayName('2026-12-04'), 'viernes 4 dic');
});

test('días de envío configurables', () => {
  assert.equal(sendDays(''), null);
  assert.equal(sendDays(undefined), null);
  assert.deepEqual(sendDays('lunes,jueves'), [1, 4]);
  assert.deepEqual(sendDays('Lunes, Miércoles'), [1, 3]);
  assert.equal(sendDays('nunca'), null);
});

test('cambios entre la hoja de la noche y la de la mañana', () => {
  assert.deepEqual(
    countChanges(
      { clasica: 3, nueces: 1 },
      { clasica: 2, integral: 1, nueces: 1 },
      { integral: 'Integral 60 %' },
    ),
    ['La de cada semana: 3 → 2 (-1)', 'Integral 60 %: 0 → 1 (+1)'],
  );
  assert.deepEqual(countChanges({ clasica: 1 }, { clasica: 1 }, {}), []);
});
