import type { BakeState } from './domain';
export const WEEKLY_LOAF_PRICE_CENTS = 500;
export const brand = {
  name: 'Molla',
  locale: 'es-ES',
  town: 'Sant Boi de Llobregat',
  region: 'Baix Llobregat',
  tagline: 'Pan de aquí. Para el sábado.',
  contact: process.env.CONTACT_EMAIL || '',
  whatsapp: (process.env.WHATSAPP_NUMBER || '').replace(/\D/g, ''),
  instagram: process.env.INSTAGRAM_URL || '',
  pickupLabel: {
    es: 'Punto de recogida en Sant Boi de Llobregat',
    ca: 'Punt de recollida a Sant Boi de Llobregat',
  },
  pickupWindow: process.env.PICKUP_WINDOW || '',
  legalName: process.env.LEGAL_NAME || '',
  legalId: process.env.LEGAL_ID || '',
  legalAddress: process.env.LEGAL_ADDRESS || '',
  site: process.env.PUBLIC_SITE_URL || '',
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
export const products = [
  {
    id: 'clasica',
    name: 'La de cada semana',
    subtitle: 'Hogaza de poolish',
    price: WEEKLY_LOAF_PRICE_CENTS,
    weight: '750–850 g',
    ingredients: 'Harina de trigo, agua, sal y levadura.',
    allergens: 'Contiene trigo (gluten).',
    image: 'crumb',
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
// A new bake is created explicitly; dates never roll forward automatically.
export const bake = {
  id: 'hornada-001',
  number: '001',
  pickupDate: '2026-09-26T12:00:00+02:00',
  deadline: '2026-09-24T20:00:00+02:00',
  opensAt: '2026-09-14T00:00:00+02:00',
  capacity: 6,
  status: 'OPEN' as BakeState,
  pickupWindow: brand.pickupWindow,
};
export const money = (cents: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(
    cents / 100,
  );
export const isDemo =
  import.meta.env?.DEV && process.env.LOCAL_DEMO !== 'false';
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
