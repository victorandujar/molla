import type { BakeState } from './domain';
export const brand = {
  name: 'Molla',
  locale: 'es-ES',
  town: 'Sant Boi de Llobregat',
  region: 'Baix Llobregat',
  tagline: 'Pan de aquí. Para el sábado.',
  contact: process.env.CONTACT_EMAIL || '',
  whatsapp: (process.env.WHATSAPP_NUMBER || '').replace(/\D/g, ''),
  instagram: process.env.INSTAGRAM_URL || '',
  pickupAddress:
    process.env.PICKUP_ADDRESS || 'Ronda de Sant Ramon, Sant Boi de Llobregat',
  pickupMap:
    'https://www.google.com/maps/search/?api=1&query=41.35401410971224,2.026792459636187',
  pickupWindow: process.env.PICKUP_WINDOW || '',
  legalName: process.env.LEGAL_NAME || '',
  legalAddress: process.env.LEGAL_ADDRESS || '',
  site: process.env.PUBLIC_SITE_URL || '',
  privacyProviders: process.env.PRIVACY_PROVIDERS || '',
  privacyRetention: process.env.PRIVACY_RETENTION || '',
  privacyTransfers: process.env.PRIVACY_TRANSFERS || '',
};
export const products = [
  {
    id: 'clasica',
    name: 'La de cada semana',
    subtitle: 'Hogaza de poolish',
    price: 650,
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
  pickupDate: '2026-09-26T10:00:00+02:00',
  deadline: '2026-09-24T20:00:00+02:00',
  opensAt: '2026-09-14T00:00:00+02:00',
  capacity: 6,
  status: 'OPEN' as BakeState,
};
export const money = (cents: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(
    cents / 100,
  );
export const pickupDay = new Intl.DateTimeFormat('es-ES', {
  timeZone: 'Europe/Madrid',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
}).format(new Date(bake.pickupDate));
export const isDemo =
  import.meta.env?.DEV && process.env.LOCAL_DEMO !== 'false';
export const launchReady =
  process.env.LIVE_ORDERS === 'true' &&
  process.env.LAUNCH_REVIEWED === 'true' &&
  !!(
    process.env.DATABASE_URL &&
    brand.site.startsWith('https://') &&
    brand.pickupAddress &&
    brand.pickupWindow &&
    brand.contact &&
    brand.legalName &&
    brand.legalAddress &&
    brand.privacyProviders &&
    brand.privacyRetention &&
    brand.privacyTransfers
  );
