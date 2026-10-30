import type { BakeState } from './domain';
export const WEEKLY_LOAF_PRICE_CENTS = 500;
// Banana bread (molde de 3 plátanos, ~140 g de harina ecológica, yogur y
// 100 g de pepitas de chocolate). Coste aproximado de ingredientes: 8 € el
// molde entero. Entero a 15 € y mitad a 8 € (la mitad lleva su corte y su
// envoltorio aparte).
export const BANANA_WHOLE_PRICE_CENTS = 1500;
export const BANANA_HALF_PRICE_CENTS = 800;
// Cupo por hornada, contado en mitades: 4 mitades = 2 moldes enteros.
export const BANANA_HALVES_PER_BAKE = 4;
// Bollería por unidades. Croissants y pains au chocolat comparten un cupo de
// piezas por hornada: el reparto entre los dos es libre.
export const CROISSANT_PRICE_CENTS = 220;
export const PAIN_AU_CHOCOLAT_PRICE_CENTS = 250;
export const PASTRY_UNITS_PER_BAKE = 48;
// Máximo de cada pieza en un mismo pedido.
export const PASTRY_MAX_PER_ORDER = 12;
export const brand = {
  name: 'Molla',
  locale: 'es-ES',
  town: 'Sant Boi de Llobregat',
  region: 'Baix Llobregat',
  tagline: 'Pan de aquí. Para el miércoles y el sábado.',
  contact: process.env.CONTACT_EMAIL || '',
  whatsapp: (process.env.WHATSAPP_NUMBER || '').replace(/\D/g, ''),
  instagram: process.env.INSTAGRAM_URL || '',
  // Only a WhatsApp channel link is accepted: it is shown to every visitor.
  whatsappChannel: /^https:\/\/(www\.)?whatsapp\.com\/channel\/[\w-]+$/.test(
    process.env.WHATSAPP_CHANNEL_URL || '',
  )
    ? process.env.WHATSAPP_CHANNEL_URL!
    : '',
  // Public Google Business Profile link (Maps listing), for `sameAs`.
  googleProfile: /^https:\/\//.test(process.env.GOOGLE_PROFILE_URL || '')
    ? process.env.GOOGLE_PROFILE_URL!
    : '',
  pickupLabel: {
    es: 'Punto de recogida en Sant Boi de Llobregat',
    ca: 'Punt de recollida a Sant Boi de Llobregat',
  },
  pickupWindow: process.env.PICKUP_WINDOW || '',
  legalName: process.env.LEGAL_NAME || '',
  legalId: process.env.LEGAL_ID || '',
  legalAddress: process.env.LEGAL_ADDRESS || '',
  site: process.env.PUBLIC_SITE_URL || '',
  googleSiteVerification: process.env.GOOGLE_SITE_VERIFICATION || '',
  bingSiteVerification: process.env.BING_SITE_VERIFICATION || '',
};
// Legal texts come from the environment; the Catalan ones fall back to Spanish.
const privacyText = (name: string) => ({
  es: process.env[name] || '',
  ca: process.env[`${name}_CA`] || process.env[name] || '',
});
export const privacy = {
  providers: privacyText('PRIVACY_PROVIDERS'),
  retention: privacyText('PRIVACY_RETENTION'),
  transfers: privacyText('PRIVACY_TRANSFERS'),
};
// The "pa fix" voucher: after 3 loaves delivered, the 4th is on the house.
// The baker hands the card with a customer's first order and applies the
// discount by hand; PA_FIX_VOUCHER=false turns the offer off.
export const standingVoucher = {
  active: process.env.PA_FIX_VOUCHER !== 'false',
};
// Google reviews shown on the home page. Update the score, the count, the
// links and the quotes here only. Quotes are verbatim from Google, in the
// language they were written (`lang`): never translate or correct them.
export const googleReviews = {
  score: '5/5',
  count: 7,
  profileUrl: 'https://share.google/OwE1uCFKRkCMsFFOa',
  reviewUrl: 'https://g.page/r/CYMY0tZs2YLiEBM/review',
  // Shown one at a time, in this order.
  quotes: [
    {
      text: 'He probado tanto el pan como el banana bread y TOTALMENTE ESPECTACULAR, toda una suerte poder contar con estos productos hoy en día en un mundo tan artificial!!! Mil gracias Victor :)',
      author: 'Carlos M.',
      // Verbatim fragment shown as the headline; `accent` goes orange.
      highlight: 'TOTALMENTE ESPECTACULAR',
      accent: 'ESPECTACULAR',
      lang: 'es',
    },
    {
      text: 'Hacen el pan espectacular, crujiente por fuera y una buena molla por dentro. Muy recomendable!!',
      author: 'David L.',
      highlight: 'crujiente por fuera y una buena molla por dentro',
      accent: 'molla',
      lang: 'es',
    },
    {
      text: 'Un pan increíble, con un sabor espectacular y una textura especial que lo hace único. Se nota la calidad en cada bocado. ¡De esos panes que dan ganas de repetir!',
      author: 'Ramiro R.',
      highlight: 'De esos panes que dan ganas de repetir',
      accent: 'repetir',
      lang: 'es',
    },
    {
      text: 'Muy recomendable! El Banana bread, de otra galaxia! Top top!',
      author: 'Guille M.',
      highlight: 'de otra galaxia',
      accent: 'galaxia',
      lang: 'es',
    },
    {
      text: 'Amé molla. Y obvio ya entra en mis favoritos para repetir. Es demasiado versátil y la compañía perfecta para muchas comidas!! […]',
      author: 'Maria Alejandra A.',
      highlight: 'la compañía perfecta para muchas comidas',
      accent: 'perfecta',
      lang: 'es',
    },
  ],
} as const;
export const products = [
  {
    id: 'clasica',
    name: 'La de cada semana',
    subtitle: 'Hogaza de poolish',
    price: WEEKLY_LOAF_PRICE_CENTS,
    weight: '750–850 g',
    ingredients: 'Harina de trigo ecológica, agua, sal y levadura.',
    allergens: 'Contiene trigo (gluten).',
    image: 'crumb',
    available: true,
  },
  {
    id: 'banana',
    name: 'Banana bread',
    subtitle: 'Molde entero',
    price: BANANA_WHOLE_PRICE_CENTS,
    weight: 'Molde entero',
    ingredients:
      'Plátano maduro, harina de trigo ecológica, yogur y pepitas de chocolate.',
    allergens: 'Contiene trigo (gluten) y leche.',
    image: 'banana',
    available: true,
  },
  {
    id: 'banana-mitad',
    name: 'Banana bread · mitad',
    subtitle: 'Medio molde',
    price: BANANA_HALF_PRICE_CENTS,
    weight: 'Medio molde',
    ingredients:
      'Plátano maduro, harina de trigo ecológica, yogur y pepitas de chocolate.',
    allergens: 'Contiene trigo (gluten) y leche.',
    image: 'banana',
    available: true,
  },
  {
    id: 'croissant',
    name: 'Croissant',
    subtitle: 'Por unidades',
    price: CROISSANT_PRICE_CENTS,
    weight: 'Unidad',
    ingredients: 'Masa laminada con mantequilla.',
    allergens: 'Contiene trigo (gluten), leche y huevo.',
    image: 'pastries',
    available: true,
  },
  {
    id: 'pain-au-chocolat',
    name: 'Pain au chocolat',
    subtitle: 'Por unidades',
    price: PAIN_AU_CHOCOLAT_PRICE_CENTS,
    weight: 'Unidad',
    ingredients: 'Masa laminada con mantequilla y barritas de chocolate.',
    allergens: 'Contiene trigo (gluten), leche y huevo.',
    image: 'pastries',
    available: true,
  },
  {
    id: 'especial',
    name: 'La que está por venir',
    subtitle: 'La especial de la semana',
    price: 800,
    weight: '750–850 g',
    ingredients:
      'La receta y los alérgenos se publicarán al abrir esta especial.',
    allergens: '',
    image: 'loaves',
    available: false,
  },
] as const;
export type ProductId = (typeof products)[number]['id'];
export const productById = (id: string) => products.find((p) => p.id === id);
// Seed/fallback bake. Production rolls subsequent dates forward automatically.
export const bake = {
  id: 'hornada-001',
  number: '001',
  pickupDate: '2026-09-26T12:00:00+02:00',
  deadline: '2026-09-24T20:00:00+02:00',
  opensAt: '2026-09-14T00:00:00+02:00',
  capacity: 10,
  status: 'OPEN' as BakeState,
  pickupWindow: brand.pickupWindow,
};
export const money = (cents: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(
    cents / 100,
  );
export const isDemo =
  import.meta.env?.DEV && process.env.LOCAL_DEMO !== 'false';

// Search visibility must never depend on whether orders, the database or the
// legal checkout flow are ready. A public production site remains useful (and
// indexable) while a bake is closed. Vercel previews stay out of search.
export const searchIndexable =
  brand.site.startsWith('https://') &&
  process.env.VERCEL_ENV !== 'preview' &&
  process.env.VERCEL_ENV !== 'development';

export const launchReady =
  process.env.LIVE_ORDERS === 'true' &&
  process.env.LAUNCH_REVIEWED === 'true' &&
  !!(
    process.env.DATABASE_URL &&
    brand.site.startsWith('https://') &&
    brand.pickupWindow &&
    brand.contact &&
    brand.legalName &&
    brand.legalAddress &&
    privacy.providers.es &&
    privacy.retention.es &&
    privacy.transfers.es
  );
