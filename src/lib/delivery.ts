// Home delivery on Wednesdays and Saturdays, same towns. The midday round runs
// both days; Wednesday also has an evening round for people who work at
// midday. The rest of the Baix Llobregat picks up in Sant Boi.
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
export const windowHours = (window: string) => {
  const [from, to] = window.split('–').map((t) => Number(t.split(':')[0]));
  return `de ${from} a ${to} h`;
};
export const deliveryTowns = [
  { id: 'sant-boi', name: 'Sant Boi de Llobregat' },
  { id: 'sant-just', name: 'Sant Just Desvern' },
  { id: 'sant-joan', name: 'Sant Joan Despí' },
  { id: 'sant-feliu', name: 'Sant Feliu de Llobregat' },
  { id: 'santa-coloma', name: 'Santa Coloma de Cervelló' },
  { id: 'sant-vicenc', name: 'Sant Vicenç dels Horts' },
] as const;
export type TownId = (typeof deliveryTowns)[number]['id'];
export const townById = (id: string) => deliveryTowns.find((t) => t.id === id);
