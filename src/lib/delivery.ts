// Home delivery on Wednesdays and Saturdays, same towns. The midday round runs
// both days; Wednesday also has an evening round for people who work at
// midday. Towns outside the zone pick up in Sant Boi.
// Shared by the page, the schemas and the emails: change zones only here.
export const deliveryWindow = '12:00–14:00';
export const eveningWindow = '18:00–20:00';
export const deliverySlots = ['midday', 'evening'] as const;
export type DeliverySlot = (typeof deliverySlots)[number];
// True when a pickup date (ISO) falls on a Wednesday in Madrid.
export const isWednesday = (iso: string) =>
  new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Madrid',
    weekday: 'short',
  }).format(new Date(iso)) === 'Wed';
// The window a home delivery goes out in. Evening only exists on Wednesdays.
export const slotWindow = (slot: DeliverySlot, pickupDate: string) =>
  slot === 'evening' && isWednesday(pickupDate)
    ? eveningWindow
    : deliveryWindow;
// "12:00–14:00" reads "de 12 a 14 h" in copy.
// English keeps the clock: "12:00–14:00".
export const windowHours = (window: string, lang?: 'ca' | 'es' | 'en') => {
  if (lang === 'en') return window;
  const [from, to] = window.split('–').map((t) => Number(t.split(':')[0]));
  return `de ${from} a ${to} h`;
};
// Three zones by distance from Santa Coloma de Cervelló. They only order the
// list on the delivery page: every town has the same days, slots and price.
// Ids are stored with orders and subscriptions: never rename one.
export const deliveryZones = [1, 2, 3] as const;
export type DeliveryZone = (typeof deliveryZones)[number];
export const deliveryTowns = [
  { id: 'santa-coloma', name: 'Santa Coloma de Cervelló', zone: 1 },
  { id: 'sant-boi', name: 'Sant Boi de Llobregat', zone: 1 },
  { id: 'torrelles', name: 'Torrelles de Llobregat', zone: 1 },
  { id: 'sant-vicenc', name: 'Sant Vicenç dels Horts', zone: 1 },
  { id: 'sant-climent', name: 'Sant Climent de Llobregat', zone: 1 },
  { id: 'cervello', name: 'Cervelló', zone: 1 },
  { id: 'la-palma', name: 'La Palma de Cervelló', zone: 1 },
  { id: 'sant-joan', name: 'Sant Joan Despí', zone: 2 },
  { id: 'sant-feliu', name: 'Sant Feliu de Llobregat', zone: 2 },
  { id: 'molins', name: 'Molins de Rei', zone: 2 },
  { id: 'palleja', name: 'Pallejà', zone: 2 },
  { id: 'viladecans', name: 'Viladecans', zone: 2 },
  { id: 'gava', name: 'Gavà', zone: 2 },
  { id: 'corbera', name: 'Corbera de Llobregat', zone: 2 },
  { id: 'vallirana', name: 'Vallirana', zone: 2 },
  { id: 'cornella', name: 'Cornellà de Llobregat', zone: 3 },
  { id: 'esplugues', name: 'Esplugues de Llobregat', zone: 3 },
  { id: 'sant-just', name: 'Sant Just Desvern', zone: 3 },
  { id: 'el-prat', name: 'El Prat de Llobregat', zone: 3 },
  { id: 'el-papiol', name: 'El Papiol', zone: 3 },
  { id: 'begues', name: 'Begues', zone: 3 },
  { id: 'sant-andreu', name: 'Sant Andreu de la Barca', zone: 3 },
] as const satisfies readonly {
  id: string;
  name: string;
  zone: DeliveryZone;
}[];
export const townsInZone = (zone: DeliveryZone) =>
  deliveryTowns.filter((t) => t.zone === zone);
// The whole area in one phrase, for copy that can't list 22 towns.
export const deliveryArea = {
  es: `${deliveryTowns.length} poblaciones del Baix Llobregat`,
  ca: `${deliveryTowns.length} poblacions del Baix Llobregat`,
  en: `${deliveryTowns.length} towns in the Baix Llobregat`,
} as const;
export type TownId = (typeof deliveryTowns)[number]['id'];
export const townById = (id: string) => deliveryTowns.find((t) => t.id === id);
