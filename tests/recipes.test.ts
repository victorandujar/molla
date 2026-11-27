import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkOk,
  computeSheet,
  defaultSettings,
  settingsFromEnv,
  type Sheet,
  type Ingredient,
} from '../src/lib/recipes';

const dough = (sheet: Sheet, key: string) => {
  const d = sheet.doughs.find((d) => d.key === key);
  assert.ok(d, `falta la masa ${key}`);
  return Object.fromEntries(d.lines.map((l) => [l.ingredient, l.total]));
};
const pre = (sheet: Sheet, id: string) => {
  const p = sheet.tonight.find((p) => p.id === id);
  assert.ok(p, `falta ${id}`);
  return Object.fromEntries(p.lines.map((l) => [l.ingredient, l.total]));
};
const check = (sheet: Sheet, key: string) => {
  const c = sheet.checks.find((c) => c.key === key);
  assert.ok(c, `falta la comprobación ${key}`);
  return c;
};
const hyd = (h: number) => Math.round(h * 100) / 100;
const total = (list: Sheet['totalsTonight'], i: Ingredient) =>
  list.find((t) => t.ingredient === i)?.total ?? 0;

// ---- Casos de prueba del obrador (deben coincidir exactamente) ---------------

test('2 panes A', () => {
  const s = computeSheet({ clasica: 2 });
  const p = pre(s, 'poolish');
  assert.equal(p.ylla! + p.agua!, 400);
  assert.deepEqual(dough(s, 'A'), {
    poolish: 400,
    ylla: 548,
    w200: 230,
    t150: 172,
    agua: 652,
    sal: 24,
  });
  const c = check(s, 'A');
  assert.equal(c.flour, 1150);
  assert.equal(c.water, 852);
  assert.equal(hyd(c.hydration), 74.09);
});

test('1 pan B', () => {
  const s = computeSheet({ integral: 1 });
  const p = pre(s, 'poolish');
  assert.equal(p.ylla! + p.agua!, 200);
  assert.deepEqual(dough(s, 'B'), {
    poolish: 200,
    ylla: 50,
    w200: 80,
    t150: 345,
    agua: 326,
    sal: 12,
  });
  const c = check(s, 'B');
  assert.equal(c.flour, 575);
  assert.equal(c.water, 426);
  assert.equal(hyd(c.hydration), 74.09);
});

test('3 panes A + 1 pan B: un solo poolish de 800 g', () => {
  const s = computeSheet({ clasica: 3, integral: 1 });
  assert.equal(s.tonight.filter((p) => p.id === 'poolish').length, 1);
  const p = pre(s, 'poolish');
  assert.equal(p.ylla! + p.agua!, 800);
  const a = dough(s, 'A');
  assert.deepEqual(
    [a.ylla, a.w200, a.t150, a.agua, a.sal],
    [822, 345, 258, 978, 36],
  );
  const b = dough(s, 'B');
  assert.deepEqual(
    [b.ylla, b.w200, b.t150, b.agua, b.sal],
    [50, 80, 345, 326, 12],
  );
});

test('4 panes C con starter de 105 g', () => {
  const s = computeSheet({ 'masa-madre': 4 });
  const st = pre(s, 'starter');
  assert.deepEqual(st, { semilla: 60, t80: 180, agua: 180 });
  const c = dough(s, 'C');
  assert.equal(c.starter, 420);
  assert.deepEqual(
    [c.ylla, c.w200, c.t150, c.agua, c.sal],
    [1286, 460, 344, 1494, 48],
  );
  const k = check(s, 'C');
  assert.equal(k.flour, 2300);
  assert.equal(k.water, 1704);
  assert.equal(hyd(k.hydration), 74.09);
});

test('10 panes A', () => {
  const s = computeSheet({ clasica: 10 });
  assert.deepEqual(pre(s, 'poolish'), {
    ylla: 1000,
    agua: 1000,
    levadura: 3.75,
  });
  const a = dough(s, 'A');
  assert.deepEqual(
    [a.ylla, a.w200, a.t150, a.agua, a.sal],
    [2740, 1150, 860, 3260, 120],
  );
  const c = check(s, 'A');
  assert.equal(c.flour, 5750);
  assert.equal(c.water, 4260);
  assert.equal(hyd(c.hydration), 74.09);
});

test('20 panes B', () => {
  const s = computeSheet({ integral: 20 });
  assert.deepEqual(pre(s, 'poolish'), {
    ylla: 2000,
    agua: 2000,
    levadura: 7.5,
  });
  const b = dough(s, 'B');
  assert.deepEqual(
    [b.ylla, b.w200, b.t150, b.agua, b.sal],
    [1000, 1600, 6900, 6520, 240],
  );
  const c = check(s, 'B');
  assert.equal(c.flour, 11500);
  assert.equal(c.water, 8520);
  assert.equal(hyd(c.hydration), 74.09);
});

test('10 panes C con starter de 105 g', () => {
  const s = computeSheet({ 'masa-madre': 10 });
  assert.deepEqual(pre(s, 'starter'), {
    semilla: 150,
    t80: 450,
    agua: 450,
  });
  const c = dough(s, 'C');
  assert.equal(c.starter, 1050);
  assert.deepEqual(
    [c.ylla, c.w200, c.t150, c.agua, c.sal],
    [3215, 1150, 860, 3735, 120],
  );
  const k = check(s, 'C');
  assert.equal(k.flour, 5750);
  assert.equal(k.water, 4260);
  assert.equal(hyd(k.hydration), 74.09);
});

// ---- Recetario v2: ejemplo resuelto (§7) ---------------------------------------

test('ejemplo resuelto del recetario v2', () => {
  const s = computeSheet({
    nueces: 2,
    'nueces-naranja': 1,
    kalamata: 1,
    'pasas-pistachos': 1,
    chocolate: 1,
    'pan-de-leche': 2,
  });
  assert.deepEqual(dough(s, 'base'), {
    ylla: 2250,
    t150: 450,
    levain: 600,
    agua: 1920,
    sal: 60,
  });
  assert.deepEqual(pre(s, 'levain'), { semilla: 60, t80: 300, agua: 300 });
  assert.deepEqual(pre(s, 'poolish-leche'), {
    ylla: 200,
    agua: 200,
    levadura: 0.75,
  });
  assert.deepEqual(dough(s, 'leche'), {
    poolish: 388,
    ylla: 726,
    leche: 350,
    huevo: 90,
    mantequilla: 140,
    azucar: 90,
    sal: 18,
    levadura: 4,
  });
  // Rellenos: 3 panes con nueces (2 + 1 de naranja) = 225 g.
  const nuts = dough(s, 'nueces').nueces! + dough(s, 'nueces_naranja').nueces!;
  assert.equal(nuts, 225);
  assert.equal(dough(s, 'nueces_naranja').naranja, 4);
  assert.deepEqual(dough(s, 'olivas_romero'), { aceitunas: 100, romero: 3 });
  assert.deepEqual(dough(s, 'pasas_arandanos_pistachos'), {
    pasas: 25,
    arandanos: 25,
    pistachos: 40,
  });
  assert.deepEqual(dough(s, 'chocolate'), { chocolate: 65 });
  // Mise en place del recetario (esta noche + mañana).
  const both = (i: Ingredient) =>
    total(s.totalsTonight, i) + total(s.totalsTomorrow, i);
  assert.equal(both('ylla'), 3176);
  assert.equal(both('t150'), 450);
  assert.equal(both('t80'), 300);
  assert.equal(both('agua'), 2420);
  assert.equal(both('sal'), 78);
  assert.equal(check(s, 'base').hydration, 74);
  // 97 + 152,25 + 33,75 + 11,2 = 294,2 g de agua efectiva ÷ 460 (≈ 64 %).
  assert.equal(hyd(check(s, 'leche').hydration), 63.96);
  assert.ok(s.ok);
});

// ---- Invariantes: hidratación y harina total para cualquier N -------------------

test('A, B y C: 74,0–74,2 % y 575 g de harina por pan, de 1 a 60 panes', () => {
  for (const starter of [105, 110, 115, 120])
    for (let n = 1; n <= 60; n++) {
      const s = computeSheet(
        { clasica: n, integral: n, 'masa-madre': n },
        {},
        { ...defaultSettings, starterPerLoaf: starter },
      );
      for (const title of ['A', 'B', 'C']) {
        const c = check(s, title);
        assert.ok(
          hyd(c.hydration) >= 74.0 && hyd(c.hydration) <= 74.2,
          `${title} ×${n} (starter ${starter}): ${c.hydration}`,
        );
        assert.equal(c.flour, 575 * n, `${title} ×${n}: harina ${c.flour}`);
        assert.equal(c.water, 426 * n);
        assert.ok(c.ok);
      }
      assert.ok(s.ok);
    }
});

test('panes con relleno y pan de leche cuadran para cualquier N', () => {
  for (let n = 1; n <= 40; n++) {
    const s = computeSheet({ nueces: n, chocolate: n, 'pan-de-leche': n });
    const base = check(s, 'base');
    assert.equal(base.flour, 500 * 2 * n);
    assert.equal(base.water, 370 * 2 * n);
    assert.equal(base.hydration, 74);
    assert.equal(check(s, 'leche').flour, 460 * n);
    assert.ok(s.ok);
  }
});

test('escala lineal: 20 panes son 20 veces 1 pan', () => {
  const one = computeSheet({ clasica: 1, integral: 1, 'masa-madre': 1 });
  const many = computeSheet({ clasica: 20, integral: 20, 'masa-madre': 20 });
  for (const key of ['A', 'B', 'C']) {
    const a = dough(one, key);
    const b = dough(many, key);
    for (const k of Object.keys(a))
      assert.equal(b[k], a[k]! * 20, `${key}.${k}`);
  }
});

test('la comprobación falla si la hidratación o la harina no cuadran', () => {
  const c = check(computeSheet({ clasica: 3 }), 'A');
  assert.ok(checkOk(c));
  assert.equal(checkOk({ ...c, flour: c.flour - 1 }), false);
  assert.equal(checkOk({ ...c, hydration: 73.98 }), false);
  assert.equal(checkOk({ ...c, hydration: 74.21 }), false);
  assert.ok(checkOk({ ...c, hydration: 74.0 }));
  assert.ok(checkOk({ ...c, hydration: 74.2 }));
});

// ---- Productos sin fórmula y parámetros ----------------------------------------

test('productos sin fórmula o desconocidos no se calculan', () => {
  const s = computeSheet(
    { clasica: 1, banana: 2, croissant: 6, 'pan-raro': 1 },
    { banana: 'Banana bread', croissant: 'Croissant' },
  );
  assert.deepEqual(
    s.uncalculated.map((u) => [u.product, u.name, u.n]),
    [
      ['banana', 'Banana bread', 2],
      ['croissant', 'Croissant', 6],
      ['pan-raro', 'pan-raro', 1],
    ],
  );
  assert.deepEqual(s.counts, [{ key: 'A', n: 1 }]);
});

test('parámetros: starter y levadura, con valores fuera de rango avisados', () => {
  const ok = settingsFromEnv({
    AMASADO_STARTER_G: '110',
    AMASADO_LEVADURA_PCT: '0,4',
  });
  assert.deepEqual(ok.settings, { starterPerLoaf: 110, poolishYeastPct: 0.4 });
  assert.deepEqual(ok.warnings, []);
  const bad = settingsFromEnv({ AMASADO_STARTER_G: '500' });
  assert.equal(bad.settings.starterPerLoaf, 105);
  assert.equal(bad.warnings.length, 1);
  const s = computeSheet({ clasica: 10 }, {}, ok.settings);
  assert.equal(pre(s, 'poolish').levadura, 4);
  const c = computeSheet({ 'masa-madre': 2 }, {}, ok.settings);
  assert.equal(dough(c, 'C').ylla, 638); // (374 − 55) × 2
  assert.equal(dough(c, 'C').agua, 742); // (426 − 55) × 2
});
