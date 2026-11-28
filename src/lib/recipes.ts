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
  ylla: 'Harina Ylla (fuerza)',
  w200: 'Harina W200 (blanca floja)',
  t150: 'Harina integral T150',
  t80: 'Harina T80',
  agua: 'Agua',
  sal: 'Sal',
  levadura: 'Levadura fresca',
  semilla: 'Masa madre madura',
  poolish: 'Poolish (el de anoche)',
  starter: 'Starter (el de anoche)',
  levain: 'Levain (el de anoche)',
  leche: 'Leche entera',
  huevo: 'Huevo',
  mantequilla: 'Mantequilla en pomada',
  azucar: 'Azúcar',
  nueces: 'Nueces troceadas',
  naranja: 'Piel de naranja rallada (sin lo blanco)',
  aceitunas: 'Aceitunas negras sin hueso (bien secas)',
  romero: 'Romero fresco picado',
  pasas: 'Pasas sultanas',
  arandanos: 'Arándanos secos',
  pistachos: 'Pistachos pelados crudos',
  chocolate: 'Chocolate 70 % en trozos de ~1 cm',
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
  A: 'La de cada semana',
  B: 'Integral 60 %',
  C: 'Masa madre',
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
// Relleno por pan (28 nov 2026): aceitunas de 100 a 50 g por pan (70 g ya
// era demasiado) y el resto a la mitad en la misma proporción. El romero y
// la piel de naranja, que solo dan aroma, siguen igual.
export const fillings: Record<FillingKey, Line[]> = {
  nueces: [{ ingredient: 'nueces', perLoaf: 37.5 }],
  nueces_naranja: [
    { ingredient: 'nueces', perLoaf: 37.5 },
    { ingredient: 'naranja', perLoaf: 4 },
  ],
  olivas_romero: [
    { ingredient: 'aceitunas', perLoaf: 50 },
    { ingredient: 'romero', perLoaf: 3 },
  ],
  pasas_arandanos_pistachos: [
    { ingredient: 'pasas', perLoaf: 12.5 },
    { ingredient: 'arandanos', perLoaf: 12.5 },
    { ingredient: 'pistachos', perLoaf: 20 },
  ],
  chocolate: [{ ingredient: 'chocolate', perLoaf: 32.5 }],
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
  key: RecipeKey | 'base';
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
  id: 'poolish' | 'poolish-leche' | 'starter' | 'levain';
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
    : `${fmt(x, 2)} g (≈ ${fmt(scale01(x))} g)`;
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
    const slower = round(
      (POOLISH_PER_LOAF.flour * nPoolish * 0.4) / 100,
      'yeast',
    );
    const breads = [
      nA ? `${recipeTitles.A} (${nA})` : '',
      nB ? `${recipeTitles.B} (${nB})` : '',
    ]
      .filter(Boolean)
      .join(' e ');
    tonight.push({
      id: 'poolish',
      title: `Poolish · para ${breads}`,
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
        `Todo en un solo bote de ${fmt(units * 1.5)}–${fmt(units * 2)} L, porque sube mucho. Marca el nivel con una goma.`,
        `Disuelve la levadura en parte del agua. Hacia las 21:00–22:00; reposa ~11,5–12 h fuera de la nevera (~18 °C).${settings.poolishYeastPct === 0.375 ? ` Si solo va a reposar ~10,5 h, pon ${yeastText(slower)} de levadura.` : ''}`,
      ],
    });
  }

  // Poolish del pan de leche (recetario v2 §5).
  if (nLeche) {
    const flour = round(LECHE_POOLISH.flour * nLeche, 'whole');
    const water = round(LECHE_POOLISH.water * nLeche, 'whole');
    const yeast = round(LECHE_POOLISH.yeast * nLeche, 'yeast');
    tonight.push({
      id: 'poolish-leche',
      title: `Poolish · para el ${recipeTitles.leche} (${nLeche})`,
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
        'En otro bote. Hacia las 22:00; reposa ~12 h a ~18 °C. Mañana lo usas entero.',
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
      id: 'starter',
      title: `Starter · para ${recipeTitles.C} (${nC})`,
      n: nC,
      lines: [
        { label: ingredientNames.semilla, ingredient: 'semilla', total: base },
        { label: ingredientNames.t80, ingredient: 't80', total: flour },
        { label: ingredientNames.agua, ingredient: 'agua', total: water },
      ],
      notes: [
        `Refresco 1 : 3 : 3. Salen ${grams(round(need, 'half'))}: mañana usas ${fmt(s)} g por pan.`,
      ],
    });
  }

  // Levain de los panes con relleno: 1:5:5 con un 10 % de margen.
  if (nFilled) {
    const seed = round(10 * nFilled, 'whole');
    const flour = round(50 * nFilled, 'whole');
    const water = round(50 * nFilled, 'whole');
    tonight.push({
      id: 'levain',
      title: `Levain · para los panes con relleno (${nFilled})`,
      n: nFilled,
      lines: [
        { label: ingredientNames.semilla, ingredient: 'semilla', total: seed },
        { label: ingredientNames.t80, ingredient: 't80', total: flour },
        { label: ingredientNames.agua, ingredient: 'agua', total: water },
      ],
      notes: [
        `Refresco 1 : 5 : 5. Salen ${grams(110 * nFilled)}: mañana usas 100 g por pan (lleva un 10 % de margen).`,
        'Hacia las 22:00, a ~19 °C (10–12 h). Está listo cuando ha doblado y tiene cúpula. Tu reserva de 600 g va aparte.',
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
      notes: [],
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
      key,
      title: recipeTitles[key],
      n: count,
      flour: flourTotal,
      water: waterTotal,
      flourCalc: `${fmt(pre.flour)} del ${pre.name} + ${fmt(ylla)} Ylla + ${fmt(w200)} W200 + ${fmt(t150)} integral`,
      waterCalc: `${fmt(pre.water)} del ${pre.name} + ${fmt(water)} de la masa`,
      hydration,
      hydrationRange: [74.0, 74.2],
      integralPct: (t150 / flourTotal) * 100,
      integralLabel:
        key === 'C'
          ? `además, ${pct((pre.flour / flourTotal) * 100)} de T80 del starter`
          : '',
      mass,
      massCalc: `${fmt(flourTotal)} + ${fmt(waterTotal)} + ${fmt(salt)} sal${yeast ? ` + ${fmt(yeast, 2)} levadura` : ''}`,
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
      title: 'Panes con relleno · la masa (la misma para todos)',
      n: nFilled,
      lines,
      notes: [
        `Salen ${grams(880 * nFilled)}: divídela en ${nFilled} ${nFilled === 1 ? 'pieza' : 'piezas'} de 880 g y añade a cada una su relleno en la 3.ª serie de pliegues (o prueba en la 2.ª: reparte mejor).`,
      ],
    });
    for (const key of fillingKeys) {
      const count = n[key] || 0;
      if (!count) continue;
      const fl = scaleLines(fillings[key], count, 'half');
      const fillingPerLoaf = fillings[key].reduce((a, l) => a + l.perLoaf, 0);
      doughs.push({
        key,
        title: recipeTitles[key],
        n: count,
        lines: fl,
        notes: [`${grams(880 + fillingPerLoaf)} de masa por pan.`],
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
      key: 'base',
      title: 'Panes con relleno (la masa, sin relleno)',
      n: nFilled,
      flour: flourTotal,
      water: waterTotal,
      flourCalc: `${fmt(amountOf(lines, 'levain') / 2)} del levain + ${fmt(amountOf(lines, 'ylla'))} Ylla + ${fmt(amountOf(lines, 't150'))} integral`,
      waterCalc: `${fmt(amountOf(lines, 'levain') / 2)} del levain + ${fmt(amountOf(lines, 'agua'))} de la masa`,
      hydration: (waterTotal / flourTotal) * 100,
      hydrationRange: [73.95, 74.05],
      integralPct: (amountOf(lines, 't150') / flourTotal) * 100,
      integralLabel: '',
      mass,
      massCalc: `${fmt(flourTotal)} + ${fmt(waterTotal)} + ${fmt(salt)} sal`,
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
      title: recipeTitles.leche,
      n: nLeche,
      lines,
      notes: [
        'La mantequilla, en 3 trozos de ~23 g por pan. Cada pan, en 3 bolas de ~301 g en molde grande engrasado.',
        `Para pintar: el huevo sobrante batido con 1 cucharada de leche; al salir del horno, ${grams(10 * nLeche)} de mantequilla fundida.`,
        'Mezcla ~10:30 · 3 series de pliegues cada 30 min · formado ~30 min después · nevera de ~13:00 a 22:00–23:00 · fuera hasta las 7:00 (17–18 °C) · horno a 170 °C con ventilador, 35–40 min.',
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
      key: 'leche',
      title: recipeTitles.leche,
      n: nLeche,
      flour: flourTotal,
      water: waterTotal,
      flourCalc: `${fmt(poolish / 2)} del poolish + ${fmt(amountOf(lines, 'ylla'))} Ylla`,
      waterCalc: `agua efectiva: ${fmt(poolish / 2)} del poolish + ${fmt(leche)} de la leche (× 0,87) + ${fmt(huevo)} del huevo (× 0,75) + ${fmt(mant)} de la mantequilla (× 0,16)`,
      hydration: (waterTotal / flourTotal) * 100,
      hydrationRange: [63.5, 64.5],
      integralPct: 0,
      integralLabel: 'sin integral',
      mass,
      massCalc: 'todos los ingredientes',
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
        `NO CUADRA · ${c.title}: harina ${fmt(c.flour)} g (debería ser ${fmt(c.expectedFlour)} g) e hidratación ${pct(c.hydration)} (debería estar entre ${fmt(lo)} y ${fmt(hi)} %). No peses con estas cifras sin revisarlas.`,
      );
  }

  // Avisos del recetario que afectan a esta hornada.
  if (nFilled || nLeche)
    warnings.push(
      'En los panes con relleno y el de leche, la «harina de fuerza» del recetario es la Ylla y la «integral», la T150. Si no es así, dímelo.',
    );
  if (nLeche > 2)
    warnings.push(
      `Pan de leche × ${nLeche}: la receta solo está probada con 1 pan; con más de 2 no está probada. La levadura vale con la habitación a 17–18 °C.`,
    );
  if (nC && nFilled)
    warnings.push(
      'El starter de la Masa madre (1 : 3 : 3) y el levain de los panes con relleno (1 : 5 : 5) son recetas distintas y van por separado. Si los haces en un solo bote, dime cómo quieres juntarlos.',
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
