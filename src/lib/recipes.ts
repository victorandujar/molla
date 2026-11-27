// Hoja de amasado: las recetas de cada pan (por 1 pan) y el cálculo para N.
//
// Dos recetarios del obrador, cada uno con sus reglas:
//  · A, B y C (pan de poolish, integral «de Marilo» y masa madre): 575 g de
//    harina y 426 g de agua por pan, 12 g de sal; harinas Ylla, W200, T150 y
//    T80. Redondeo a 0,5 g (la levadura, a 0,1 g en báscula).
//  · Recetario v2 (20–25 nov 2026): panes con relleno sobre una masa base de
//    500 g de harina (74 %) y el pan de leche. Gramos enteros.
// Todo escala de forma lineal: se multiplica por N con los valores exactos y
// se redondea solo al final. Nada de cifras inventadas: un producto sin
// receta aquí sale como «sin fórmula definida», sin calcular.

export type Settings = {
  // Starter de masa madre (T80, 100 % de hidratación) por pan C.
  starterPerLoaf: number;
  // Levadura fresca del poolish de A y B, en % de la harina del poolish.
  poolishYeastPct: number;
};
export const defaultSettings: Settings = {
  starterPerLoaf: 105,
  poolishYeastPct: 0.375,
};

const toNumber = (v: string | undefined) =>
  v === undefined || v.trim() === '' ? NaN : Number(v.replace(',', '.'));

// AMASADO_STARTER_G y AMASADO_LEVADURA_PCT. Un valor fuera de rango no se
// usa: se avisa en el email y se calcula con el de por defecto.
export function settingsFromEnv(env: Record<string, string | undefined>) {
  const settings = { ...defaultSettings };
  const warnings: string[] = [];
  const starter = toNumber(env.AMASADO_STARTER_G);
  if (env.AMASADO_STARTER_G?.trim()) {
    if (starter >= 80 && starter <= 160) settings.starterPerLoaf = starter;
    else
      warnings.push(
        `AMASADO_STARTER_G="${env.AMASADO_STARTER_G}" no es válido (80–160 g): se usa ${defaultSettings.starterPerLoaf} g.`,
      );
  }
  const yeast = toNumber(env.AMASADO_LEVADURA_PCT);
  if (env.AMASADO_LEVADURA_PCT?.trim()) {
    if (yeast >= 0.2 && yeast <= 1) settings.poolishYeastPct = yeast;
    else
      warnings.push(
        `AMASADO_LEVADURA_PCT="${env.AMASADO_LEVADURA_PCT}" no es válido (0,2–1 %): se usa ${defaultSettings.poolishYeastPct} %.`,
      );
  }
  return { settings, warnings };
}

// ---- Ingredientes ----------------------------------------------------------

export const ingredientNames = {
  ylla: 'Ylla (harina de fuerza eco)',
  w200: 'W200 (harina blanca eco, floja)',
  t150: 'T150 (harina integral)',
  t80: 'T80 (harina semi-integral)',
  agua: 'Agua',
  sal: 'Sal',
  levadura: 'Levadura fresca',
  semilla: 'Masa madre madura (semilla)',
  poolish: 'Poolish',
  starter: 'Starter de masa madre (100 %)',
  levain: 'Levain (100 %)',
  leche: 'Leche entera',
  huevo: 'Huevo',
  mantequilla: 'Mantequilla en pomada',
  azucar: 'Azúcar',
  nueces: 'Nueces troceadas',
  naranja: 'Piel de naranja rallada (solo lo naranja)',
  aceitunas: 'Aceitunas negras sin hueso, escurridas y secas',
  romero: 'Romero fresco picado',
  pasas: 'Pasas sultanas',
  arandanos: 'Arándanos secos',
  pistachos: 'Pistachos pelados crudos',
  chocolate: 'Chocolate negro 70 % en trozos de ~1 cm',
} as const;
export type Ingredient = keyof typeof ingredientNames;
// Lo que se prepara la noche anterior y se usa entero en la masa: no se pesa
// otra vez como ingrediente en la lista total de mañana.
const prefermentos: Ingredient[] = ['poolish', 'starter', 'levain'];
// Levadura con dos decimales; todo lo demás en gramos (0,5 g o enteros).
type Rounding = 'half' | 'whole' | 'yeast';
const round = (x: number, how: Rounding) =>
  how === 'yeast'
    ? Math.round(x * 100 + 1e-9) / 100
    : how === 'half'
      ? Math.round(x * 2 + 1e-9) / 2
      : Math.round(x + 1e-9);
// Lo que marcaría una báscula de 0,1 g.
export const scale01 = (x: number) => Math.round(x * 10 + 1e-9) / 10;

// ---- Recetas por pan ------------------------------------------------------

type Line = { ingredient: Ingredient; perLoaf: number };
export type RecipeKey =
  | 'A'
  | 'B'
  | 'C'
  | 'nueces'
  | 'nueces_naranja'
  | 'olivas_romero'
  | 'pasas_arandanos_pistachos'
  | 'chocolate'
  | 'leche';

// Producto del panel (config.ts) → receta. Solo coincidencias seguras: mismo
// pan y mismo nombre en la web y en el recetario.
export const productRecipe: Record<string, RecipeKey> = {
  clasica: 'A', // «La de cada semana», hogaza de poolish
  integral: 'B', // «Integral 60 %» (pan integral de Marilo)
  'masa-madre': 'C', // «Masa madre»
  nueces: 'nueces',
  'nueces-naranja': 'nueces_naranja',
  kalamata: 'olivas_romero', // «Aceitunas negras y romero»
  'pasas-pistachos': 'pasas_arandanos_pistachos',
  chocolate: 'chocolate',
  'pan-de-leche': 'leche',
};

export const recipeTitles: Record<RecipeKey, string> = {
  A: 'A · Pan normal con poolish',
  B: 'B · Pan integral «de Marilo» con poolish',
  C: 'C · Pan con masa madre',
  nueces: 'Nueces',
  nueces_naranja: 'Nueces y naranja',
  olivas_romero: 'Aceitunas negras y romero',
  pasas_arandanos_pistachos: 'Pasas, arándanos y pistachos',
  chocolate: 'Chocolate 70 %',
  leche: 'Pan de leche',
};
export const fillingKeys = [
  'nueces',
  'nueces_naranja',
  'olivas_romero',
  'pasas_arandanos_pistachos',
  'chocolate',
] as const;
export type FillingKey = (typeof fillingKeys)[number];

// A y B: 200 g de poolish (100 Ylla + 100 agua) más la masa.
const POOLISH_PER_LOAF = { flour: 100, water: 100 };
const doughA: Line[] = [
  { ingredient: 'poolish', perLoaf: 200 },
  { ingredient: 'ylla', perLoaf: 274 },
  { ingredient: 'w200', perLoaf: 115 },
  { ingredient: 't150', perLoaf: 86 },
  { ingredient: 'agua', perLoaf: 326 },
  { ingredient: 'sal', perLoaf: 12 },
];
const doughB: Line[] = [
  { ingredient: 'poolish', perLoaf: 200 },
  { ingredient: 'ylla', perLoaf: 50 },
  { ingredient: 'w200', perLoaf: 80 },
  { ingredient: 't150', perLoaf: 345 },
  { ingredient: 'agua', perLoaf: 326 },
  { ingredient: 'sal', perLoaf: 12 },
];
// C: la harina y el agua del starter se restan de Ylla y del agua de la masa.
const doughC = (s: number): Line[] => [
  { ingredient: 'starter', perLoaf: s },
  { ingredient: 'ylla', perLoaf: 374 - s / 2 },
  { ingredient: 'w200', perLoaf: 115 },
  { ingredient: 't150', perLoaf: 86 },
  { ingredient: 'agua', perLoaf: 426 - s / 2 },
  { ingredient: 'sal', perLoaf: 12 },
];
// Recetario v2 §2: masa base de los panes con relleno (880 g por pan).
const doughBase: Line[] = [
  { ingredient: 'ylla', perLoaf: 375 },
  { ingredient: 't150', perLoaf: 75 },
  { ingredient: 'levain', perLoaf: 100 },
  { ingredient: 'agua', perLoaf: 320 },
  { ingredient: 'sal', perLoaf: 10 },
];
// Recetario v2 §3: relleno por pan. Lo que la masa admite: no aumentarlo.
export const fillings: Record<FillingKey, Line[]> = {
  nueces: [{ ingredient: 'nueces', perLoaf: 75 }],
  nueces_naranja: [
    { ingredient: 'nueces', perLoaf: 75 },
    { ingredient: 'naranja', perLoaf: 4 },
  ],
  olivas_romero: [
    { ingredient: 'aceitunas', perLoaf: 100 },
    { ingredient: 'romero', perLoaf: 3 },
  ],
  pasas_arandanos_pistachos: [
    { ingredient: 'pasas', perLoaf: 25 },
    { ingredient: 'arandanos', perLoaf: 25 },
    { ingredient: 'pistachos', perLoaf: 40 },
  ],
  chocolate: [{ ingredient: 'chocolate', perLoaf: 65 }],
};
// Recetario v2 §4: pan de leche. El poolish (100 + 100 + 0,375 g) rinde 194 g.
const doughLeche: Line[] = [
  { ingredient: 'poolish', perLoaf: 194 },
  { ingredient: 'ylla', perLoaf: 363 },
  { ingredient: 'leche', perLoaf: 175 },
  { ingredient: 'huevo', perLoaf: 45 },
  { ingredient: 'mantequilla', perLoaf: 70 },
  { ingredient: 'azucar', perLoaf: 45 },
  { ingredient: 'sal', perLoaf: 9 },
  { ingredient: 'levadura', perLoaf: 2 },
];
const LECHE_POOLISH = { flour: 100, water: 100, yeast: 0.375, yield: 194 };

// ---- Resultado ---------------------------------------------------------------

export type Amount = {
  ingredient: Ingredient;
  label: string;
  perLoaf: number;
  total: number;
};
export type Dough = {
  key: RecipeKey | 'base';
  title: string;
  n: number;
  lines: Amount[];
  notes: string[];
};
export type Check = {
  title: string;
  n: number;
  flour: number;
  water: number;
  // Lo que suma cada uno, para que se vea la cuenta.
  flourCalc: string;
  waterCalc: string;
  hydration: number;
  hydrationRange: [number, number];
  integralPct: number;
  integralLabel: string;
  mass: number;
  massCalc: string;
  perLoaf: number;
  expectedFlour: number;
  ok: boolean;
};
export type Preferment = {
  title: string;
  n: number;
  lines: { label: string; ingredient: Ingredient; total: number }[];
  notes: string[];
};
export type Sheet = {
  settings: Settings;
  counts: { key: RecipeKey; n: number }[];
  uncalculated: { product: string; name: string; n: number }[];
  tonight: Preferment[];
  doughs: Dough[];
  checks: Check[];
  // Lo que se pesa: esta noche (prefermentos) y mañana (masas y rellenos).
  totalsTonight: { ingredient: Ingredient; total: number }[];
  totalsTomorrow: { ingredient: Ingredient; total: number }[];
  warnings: string[];
  ok: boolean;
};

// Hidratación (a dos decimales) dentro del rango y harina total exacta.
export const checkOk = (
  c: Pick<Check, 'hydration' | 'hydrationRange' | 'flour' | 'expectedFlour'>,
) => {
  const hyd = Math.round(c.hydration * 100) / 100;
  const [lo, hi] = c.hydrationRange;
  return hyd >= lo && hyd <= hi && Math.abs(c.flour - c.expectedFlour) < 0.01;
};
export const fmt = (x: number, maxDecimals = 1) =>
  new Intl.NumberFormat('es-ES', {
    maximumFractionDigits: maxDecimals,
    useGrouping: 'always',
  } as Intl.NumberFormatOptions).format(x);
export const grams = (x: number, ingredient?: Ingredient) =>
  ingredient === 'levadura' ? yeastText(x) : `${fmt(x)} g`;
// Levadura con sus dos decimales y, si hace falta, lo que marca la báscula.
export const yeastText = (x: number) =>
  scale01(x) === x
    ? `${fmt(x, 2)} g`
    : `${fmt(x, 2)} g (báscula de 0,1 g: ${fmt(scale01(x))} g)`;
const pct = (x: number) => `${fmt(x, 2)} %`;

const scaleLines = (lines: Line[], n: number, how: Rounding): Amount[] =>
  lines.map((l) => ({
    ingredient: l.ingredient,
    label: ingredientNames[l.ingredient],
    perLoaf: round(l.perLoaf, l.ingredient === 'levadura' ? 'yeast' : how),
    total: round(l.perLoaf * n, l.ingredient === 'levadura' ? 'yeast' : how),
  }));
const amountOf = (lines: Amount[], i: Ingredient) =>
  lines.filter((l) => l.ingredient === i).reduce((s, l) => s + l.total, 0);

// counts: producto del panel → panes. names: nombre de cada producto.
export function computeSheet(
  counts: Record<string, number>,
  names: Record<string, string> = {},
  settings: Settings = defaultSettings,
  extraWarnings: string[] = [],
): Sheet {
  const n: Partial<Record<RecipeKey, number>> = {};
  const uncalculated: Sheet['uncalculated'] = [];
  for (const [product, qty] of Object.entries(counts)) {
    if (!(qty > 0)) continue;
    const key = productRecipe[product];
    if (key) n[key] = (n[key] || 0) + qty;
    else
      uncalculated.push({ product, name: names[product] || product, n: qty });
  }
  const nA = n.A || 0;
  const nB = n.B || 0;
  const nC = n.C || 0;
  const nLeche = n.leche || 0;
  const nFilled = fillingKeys.reduce((s, k) => s + (n[k] || 0), 0);
  const s = settings.starterPerLoaf;
  const warnings = [...extraWarnings];
  const tonight: Preferment[] = [];
  const doughs: Dough[] = [];
  const checks: Check[] = [];

  // Poolish de A y B, juntos en un solo recipiente.
  const nPoolish = nA + nB;
  if (nPoolish) {
    const flour = round(POOLISH_PER_LOAF.flour * nPoolish, 'half');
    const water = round(POOLISH_PER_LOAF.water * nPoolish, 'half');
    const yeast = round(
      (POOLISH_PER_LOAF.flour * nPoolish * settings.poolishYeastPct) / 100,
      'yeast',
    );
    const mass = flour + water;
    const units = Math.max(1, Math.ceil(mass / 600));
    tonight.push({
      title: `Poolish de A y B (${nPoolish} ${nPoolish === 1 ? 'pan' : 'panes'}: A ${nA} + B ${nB})`,
      n: nPoolish,
      lines: [
        { label: ingredientNames.ylla, ingredient: 'ylla', total: flour },
        { label: ingredientNames.agua, ingredient: 'agua', total: water },
        {
          label: ingredientNames.levadura,
          ingredient: 'levadura',
          total: yeast,
        },
      ],
      notes: [
        `Cálculo: Ylla 100 g × ${nPoolish} = ${grams(flour)}; agua 100 g × ${nPoolish} = ${grams(water)}; levadura ${fmt(settings.poolishYeastPct, 3)} % de ${grams(flour)} = ${fmt(yeast, 2)} g.`,
        `Salen ${grams(mass)} de poolish: 200 g por pan (A ${nA} × 200 = ${grams(nA * 200)}; B ${nB} × 200 = ${grams(nB * 200)}).`,
        `Disuelve la levadura en parte del agua. Levadura al ${fmt(settings.poolishYeastPct, 3)} %: para ~11,5–12 h fuera de la nevera a ~18 °C (si va a reposar ~10,5 h, usa el 0,4 %).`,
        `Un solo recipiente amplio: unos ${fmt(units * 1.5)}–${fmt(units * 2)} L (1,5–2 L por cada ~600 g de poolish; sube y puede rebosar). Marca el nivel inicial con una goma elástica.`,
        'Hazlo esta noche, hacia las 21:00–22:00.',
      ],
    });
  }

  // Poolish del pan de leche (recetario v2 §5).
  if (nLeche) {
    const flour = round(LECHE_POOLISH.flour * nLeche, 'whole');
    const water = round(LECHE_POOLISH.water * nLeche, 'whole');
    const yeast = round(LECHE_POOLISH.yeast * nLeche, 'yeast');
    tonight.push({
      title: `Poolish del pan de leche (${nLeche} ${nLeche === 1 ? 'pan' : 'panes'})`,
      n: nLeche,
      lines: [
        { label: ingredientNames.ylla, ingredient: 'ylla', total: flour },
        { label: ingredientNames.agua, ingredient: 'agua', total: water },
        {
          label: ingredientNames.levadura,
          ingredient: 'levadura',
          total: yeast,
        },
      ],
      notes: [
        `Cálculo: harina de fuerza 100 g × ${nLeche} = ${grams(flour)}; agua 100 g × ${nLeche} = ${grams(water)}; levadura 0,375 g × ${nLeche} = ${fmt(yeast, 2)} g.`,
        `Rinde ~${grams(LECHE_POOLISH.yield * nLeche)} (194 g por pan) y se usa entero en la masa.`,
        '~12 h a ~18 °C: prepáralo hacia las 22:00.',
      ],
    });
  }

  // Starter del pan C: refresco 1:3:3 hasta sumar s × N.
  if (nC) {
    const need = s * nC;
    const base = round(need / 7, 'half');
    const flour = round((need * 3) / 7, 'half');
    const water = round((need * 3) / 7, 'half');
    tonight.push({
      title: `Starter para C (${nC} ${nC === 1 ? 'pan' : 'panes'} × ${fmt(s)} g = ${grams(round(need, 'half'))})`,
      n: nC,
      lines: [
        { label: ingredientNames.semilla, ingredient: 'semilla', total: base },
        { label: ingredientNames.t80, ingredient: 't80', total: flour },
        { label: ingredientNames.agua, ingredient: 'agua', total: water },
      ],
      notes: [
        `Refresco 1 : 3 : 3 (base : T80 : agua) hasta ${grams(round(need, 'half'))}: base = ${fmt(need)} ÷ 7 = ${grams(base)}; T80 y agua = ${fmt(need)} × 3 ÷ 7 = ${grams(flour)} cada una.`,
        `En la masa van ${fmt(s)} g por pan (${fmt(s / 2)} g de T80 + ${fmt(s / 2)} g de agua).`,
      ],
    });
  }

  // Levain de los panes con relleno: 1:5:5 con un 10 % de margen.
  if (nFilled) {
    const seed = round(10 * nFilled, 'whole');
    const flour = round(50 * nFilled, 'whole');
    const water = round(50 * nFilled, 'whole');
    tonight.push({
      title: `Levain para los panes con relleno (${nFilled} ${nFilled === 1 ? 'pan' : 'panes'})`,
      n: nFilled,
      lines: [
        { label: ingredientNames.semilla, ingredient: 'semilla', total: seed },
        { label: ingredientNames.t80, ingredient: 't80', total: flour },
        { label: ingredientNames.agua, ingredient: 'agua', total: water },
      ],
      notes: [
        `Hacen falta 100 g × ${nFilled} = ${grams(100 * nFilled)}; se prepara un 10 % más: ${grams(110 * nFilled)}.`,
        `Refresco 1 : 5 : 5: semilla 10 g × ${nFilled} = ${grams(seed)}; T80 50 g × ${nFilled} = ${grams(flour)}; agua 50 g × ${nFilled} = ${grams(water)}.`,
        'A ~19 °C, 10–12 h: aliméntalo hacia las 22:00. Úsalo cuando haya doblado y tenga cúpula. Tu reserva de 600 g va aparte.',
      ],
    });
  }

  // Masas A, B y C, cada una por separado.
  const abc: [RecipeKey, number, Line[]][] = [
    ['A', nA, doughA],
    ['B', nB, doughB],
    ['C', nC, doughC(s)],
  ];
  for (const [key, count, recipe] of abc) {
    if (!count) continue;
    const lines = scaleLines(recipe, count, 'half');
    doughs.push({
      key,
      title: recipeTitles[key],
      n: count,
      lines,
      notes:
        key === 'C'
          ? [
              `Ylla = 374 − ${fmt(s)} ÷ 2 = ${fmt(374 - s / 2)} g por pan; agua = 426 − ${fmt(s)} ÷ 2 = ${fmt(426 - s / 2)} g por pan.`,
            ]
          : [],
    });
    // Comprobación con los gramos redondeados (los que pesas).
    const pre =
      key === 'C'
        ? {
            flour: amountOf(lines, 'starter') / 2,
            water: amountOf(lines, 'starter') / 2,
            name: 'starter',
          }
        : {
            flour: POOLISH_PER_LOAF.flour * count,
            water: POOLISH_PER_LOAF.water * count,
            name: 'poolish',
          };
    const ylla = amountOf(lines, 'ylla');
    const w200 = amountOf(lines, 'w200');
    const t150 = amountOf(lines, 't150');
    const water = amountOf(lines, 'agua');
    const salt = amountOf(lines, 'sal');
    const flourTotal = pre.flour + ylla + w200 + t150;
    const waterTotal = pre.water + water;
    const yeast =
      key === 'C'
        ? 0
        : round((pre.flour * settings.poolishYeastPct) / 100, 'yeast');
    const mass = flourTotal + waterTotal + salt + yeast;
    const hydration = (waterTotal / flourTotal) * 100;
    checks.push({
      title: recipeTitles[key],
      n: count,
      flour: flourTotal,
      water: waterTotal,
      flourCalc: `${fmt(pre.flour)} (${key === 'C' ? 'T80 del starter' : 'Ylla del poolish'}) + ${fmt(ylla)} Ylla + ${fmt(w200)} W200 + ${fmt(t150)} T150`,
      waterCalc: `${fmt(pre.water)} (${pre.name}) + ${fmt(water)} (masa)`,
      hydration,
      hydrationRange: [74.0, 74.2],
      integralPct: (t150 / flourTotal) * 100,
      integralLabel:
        key === 'C'
          ? `T150 ${fmt(t150)} ÷ ${fmt(flourTotal)} (además, T80 del starter: ${pct((pre.flour / flourTotal) * 100)})`
          : `T150 ${fmt(t150)} ÷ ${fmt(flourTotal)}`,
      mass,
      massCalc: `${fmt(flourTotal)} harina + ${fmt(waterTotal)} agua + ${fmt(salt)} sal${yeast ? ` + ${fmt(yeast, 2)} levadura` : ''}`,
      perLoaf: mass / count,
      expectedFlour: 575 * count,
      ok: false,
    });
  }

  // Panes con relleno: masa base × N total y relleno de cada uno.
  if (nFilled) {
    const lines = scaleLines(doughBase, nFilled, 'whole');
    doughs.push({
      key: 'base',
      title: `Masa base de los panes con relleno (${nFilled} ${nFilled === 1 ? 'pan' : 'panes'})`,
      n: nFilled,
      lines,
      notes: [
        `Masa base: 880 g por pan × ${nFilled} = ${grams(880 * nFilled)}. Después se divide: 880 g de masa base para cada pan.`,
        'Relleno en la tercera serie de pliegues (para la próxima, prueba en la segunda: reparte mejor). Nada de amasado largo: reposos y pliegues.',
      ],
    });
    for (const key of fillingKeys) {
      const count = n[key] || 0;
      if (!count) continue;
      const fl = scaleLines(fillings[key], count, 'whole');
      const fillingPerLoaf = fillings[key].reduce((a, l) => a + l.perLoaf, 0);
      doughs.push({
        key,
        title: `Relleno · ${recipeTitles[key]} (${count} ${count === 1 ? 'pan' : 'panes'})`,
        n: count,
        lines: fl,
        notes: [
          `Masa cruda por pan: 880 + ${fmt(fillingPerLoaf)} = ${grams(880 + fillingPerLoaf)}.`,
        ],
      });
    }
    const flourTotal =
      amountOf(lines, 'levain') / 2 +
      amountOf(lines, 'ylla') +
      amountOf(lines, 't150');
    const waterTotal = amountOf(lines, 'levain') / 2 + amountOf(lines, 'agua');
    const salt = amountOf(lines, 'sal');
    const mass = flourTotal + waterTotal + salt;
    checks.push({
      title: 'Masa base de los panes con relleno (sin contar el relleno)',
      n: nFilled,
      flour: flourTotal,
      water: waterTotal,
      flourCalc: `${fmt(amountOf(lines, 'levain') / 2)} (T80 del levain) + ${fmt(amountOf(lines, 'ylla'))} fuerza + ${fmt(amountOf(lines, 't150'))} integral`,
      waterCalc: `${fmt(amountOf(lines, 'levain') / 2)} (levain) + ${fmt(amountOf(lines, 'agua'))} (masa)`,
      hydration: (waterTotal / flourTotal) * 100,
      hydrationRange: [73.95, 74.05],
      integralPct: (amountOf(lines, 't150') / flourTotal) * 100,
      integralLabel: `integral ${fmt(amountOf(lines, 't150'))} ÷ ${fmt(flourTotal)}`,
      mass,
      massCalc: `${fmt(flourTotal)} harina + ${fmt(waterTotal)} agua + ${fmt(salt)} sal`,
      perLoaf: mass / nFilled,
      expectedFlour: 500 * nFilled,
      ok: false,
    });
  }

  // Pan de leche.
  if (nLeche) {
    const lines = scaleLines(doughLeche, nLeche, 'whole');
    const mass = lines.reduce((a, l) => a + l.total, 0);
    doughs.push({
      key: 'leche',
      title: `${recipeTitles.leche} (${nLeche} ${nLeche === 1 ? 'pan' : 'panes'})`,
      n: nLeche,
      lines,
      notes: [
        `Masa cruda: ${grams(903)} por pan × ${nLeche} = ${grams(mass)}. Cada pan, en 3 bolas de ~301 g, en molde grande (≥ 1,5 L) engrasado.`,
        `Mantequilla en 3 trozos de ~23 g por pan. Para pintar, por pan: el huevo sobrante batido con 1 cucharada de leche; 10 g de mantequilla fundida al salir del horno (${grams(10 * nLeche)} en total).`,
        'Horario: mezcla ~10:30; pliegues 3 series cada 30 min; formado ~30 min después (no más de 45); nevera de ~13:00 a 22:00–23:00; fuera hasta las 7:00 a 17–18 °C; horno 170 °C con ventilador, 35–40 min (interior 92–94 °C).',
      ],
    });
    // Agua efectiva: leche × 0,87, huevo × 0,75, mantequilla × 0,16.
    const poolish = amountOf(lines, 'poolish');
    const flourTotal = poolish / 2 + amountOf(lines, 'ylla');
    const leche = amountOf(lines, 'leche') * 0.87;
    const huevo = amountOf(lines, 'huevo') * 0.75;
    const mant = amountOf(lines, 'mantequilla') * 0.16;
    const waterTotal = poolish / 2 + leche + huevo + mant;
    checks.push({
      title: recipeTitles.leche,
      n: nLeche,
      flour: flourTotal,
      water: waterTotal,
      flourCalc: `${fmt(poolish / 2)} (del poolish) + ${fmt(amountOf(lines, 'ylla'))} fuerza`,
      waterCalc: `agua efectiva: ${fmt(poolish / 2)} (poolish) + ${fmt(leche)} (leche × 0,87) + ${fmt(huevo)} (huevo × 0,75) + ${fmt(mant)} (mantequilla × 0,16)`,
      hydration: (waterTotal / flourTotal) * 100,
      hydrationRange: [63.5, 64.5],
      integralPct: 0,
      integralLabel: 'sin integral',
      mass,
      massCalc: lines.map((l) => fmt(l.total, 2)).join(' + '),
      perLoaf: mass / nLeche,
      expectedFlour: 460 * nLeche,
      ok: false,
    });
  }

  for (const c of checks) {
    const [lo, hi] = c.hydrationRange;
    c.ok = checkOk(c);
    if (!c.ok)
      warnings.unshift(
        `NO CUADRA · ${c.title}: harina ${fmt(c.flour)} g (debería ser ${fmt(c.expectedFlour)} g), hidratación ${pct(c.hydration)} (debería estar entre ${fmt(lo)} y ${fmt(hi)} %). No peses con estas cifras sin revisarlas.`,
      );
  }

  // Avisos del recetario que afectan a esta hornada.
  if (nFilled)
    warnings.push(
      'Gramos de relleno: son los de referencia del recetario v2. Bajaste un poco el relleno en las últimas hornadas y no se apuntó cuánto: corrígelo si hace falta (§9.1).',
    );
  if (nFilled || nLeche)
    warnings.push(
      'En el recetario v2, «harina de fuerza» se ha tomado como Ylla e «integral» como T150 (§9.2). Si no es así, dímelo.',
    );
  if (nLeche > 2)
    warnings.push(
      `Pan de leche × ${nLeche}: la receta está validada solo con 1 pan; más de 2 no está probado (§9.5). La levadura vale con la habitación a 17–18 °C.`,
    );
  if (nC && nFilled)
    warnings.push(
      'El starter de C (1:3:3, sin margen) y el levain de los panes con relleno (1:5:5, +10 %) vienen de recetarios distintos y se dan por separado. Si los haces en un solo bote, confírmame cómo quieres unificarlos.',
    );

  // Lo que se pesa: esta noche y mañana, sumado por ingrediente.
  const sum = (items: { ingredient: Ingredient; total: number }[]) => {
    const totals = new Map<Ingredient, number>();
    for (const i of items)
      totals.set(i.ingredient, (totals.get(i.ingredient) || 0) + i.total);
    const order = Object.keys(ingredientNames) as Ingredient[];
    return [...totals]
      .sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]))
      .map(([ingredient, total]) => ({
        ingredient,
        total: round(total, ingredient === 'levadura' ? 'yeast' : 'half'),
      }));
  };
  const counted = (Object.keys(recipeTitles) as RecipeKey[])
    .filter((k) => n[k])
    .map((k) => ({ key: k, n: n[k]! }));
  return {
    settings,
    counts: counted,
    uncalculated,
    tonight,
    doughs,
    checks,
    totalsTonight: sum(tonight.flatMap((p) => p.lines)),
    totalsTomorrow: sum(
      doughs
        .flatMap((d) => d.lines)
        .filter((l) => !prefermentos.includes(l.ingredient)),
    ),
    warnings,
    ok: checks.every((c) => c.ok),
  };
}

// Panes que se calculan (A, B, C, rellenos y leche).
export const loavesIn = (sheet: Sheet) =>
  sheet.counts.reduce((a, c) => a + c.n, 0);
export const groupCounts = (sheet: Sheet) => {
  const get = (k: RecipeKey) => sheet.counts.find((c) => c.key === k)?.n || 0;
  return {
    A: get('A'),
    B: get('B'),
    C: get('C'),
    relleno: fillingKeys.reduce((a, k) => a + get(k), 0),
    leche: get('leche'),
  };
};
