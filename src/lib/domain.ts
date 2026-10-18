import { z } from 'zod';
import { AppError, type Lang } from './messages';
import { sources } from './sources';
import { townById } from './delivery';
export type { Lang };
const lang = z.enum(['es', 'ca']).default('es');
// Who orders and where it goes: shared by one-off orders and "pa fix".
const contact = {
  name: z.string().trim().min(2, 'name').max(100, 'name'),
  email: z
    .string()
    .trim()
    .max(254)
    .pipe(z.email('email'))
    .transform((v) => v.toLowerCase()),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[\d\s()-]{9,22}$/, 'phone')
    .refine((v) => {
      const digits = v.replace(/\D/g, '');
      return digits.length >= 9 && digits.length <= 15;
    }, 'phone'),
};
// Home delivery needs a town in the zone and a street address.
const deliveryFields = {
  delivery: z.enum(['home', 'pickup']).default('pickup'),
  town: z.string().default(''),
  address: z.string().trim().max(160, 'address').default(''),
};
export const reservationSchema = z
  .object({
    requestId: z.uuid(),
    bakeId: z.string().min(1).max(80),
    ...contact,
    // Loaves of the weekly bread (0 when the order is only banana bread).
    quantity: z.coerce.number().int().min(0).max(4),
    // Banana bread counted in halves: 1 = half, 2 = whole, 3 = whole + half…
    banana: z.coerce.number().int().min(0).max(4).default(0),
    product: z.literal('clasica').default('clasica'),
    pickup: z.literal('yes', { error: 'pickup' }),
    privacy: z.literal('yes', { error: 'privacy' }),
    website: z.string().max(0).default(''),
    source: z.enum(sources).default('direct'),
    ...deliveryFields,
    lang,
  })
  .refine((o) => o.quantity + o.banana > 0, {
    message: 'empty',
    path: ['quantity'],
  })
  .refine((o) => o.delivery === 'pickup' || townById(o.town), {
    message: 'town',
    path: ['town'],
  })
  .refine((o) => o.delivery === 'pickup' || o.address.length >= 5, {
    message: 'address',
    path: ['address'],
  });
// A standing order: the same bread every week (or every other week).
export const subscriptionSchema = z
  .object({
    ...contact,
    quantity: z.coerce.number().int().min(0).max(4),
    banana: z.coerce.number().int().min(0).max(4).default(0),
    frequency: z.enum(['weekly', 'biweekly']).default('weekly'),
    ...deliveryFields,
    terms: z.literal('yes', { error: 'terms' }),
    privacy: z.literal('yes', { error: 'privacy' }),
    website: z.string().max(0).default(''),
    source: z.enum(sources).default('direct'),
    lang,
  })
  .refine((o) => o.quantity + o.banana > 0, {
    message: 'empty',
    path: ['quantity'],
  })
  .refine((o) => o.delivery === 'pickup' || townById(o.town), {
    message: 'town',
    path: ['town'],
  })
  .refine((o) => o.delivery === 'pickup' || o.address.length >= 5, {
    message: 'address',
    path: ['address'],
  });
export type SubscriptionInput = z.infer<typeof subscriptionSchema>;
export type SubscriptionStatus = 'ACTIVE' | 'PAUSED' | 'CANCELLED';
export type Subscription = {
  id: string;
  // Private link to manage it; never shown to anyone else.
  token: string;
  email: string;
  name: string;
  phone: string;
  lang: Lang;
  quantity: number;
  banana: number;
  delivery: 'home' | 'pickup';
  town: string;
  address: string;
  frequency: 'weekly' | 'biweekly';
  status: SubscriptionStatus;
  // Upcoming bakes the customer asked to skip before they exist.
  skipRemaining: number;
  // Last bake already handled, so a repeated job never doubles an order.
  lastBakeId: string | null;
  source: string;
  createdAt: string;
  cancelledAt: string | null;
};
// What the weekly job does with a subscription for a given bake.
//  inactive: paused or cancelled · handled: already done for this bake
//  skip: the customer asked to skip it · rest: the off week of a fortnightly
//  place: create the order.
export type SubscriptionAction =
  'inactive' | 'handled' | 'skip' | 'rest' | 'place';
export function subscriptionAction(
  sub: Pick<
    Subscription,
    'status' | 'frequency' | 'skipRemaining' | 'lastBakeId'
  >,
  bake: { id: string; pickupDate: string },
  // Pickup date of the subscription's latest order that was not cancelled.
  lastDelivery: string | null,
): SubscriptionAction {
  if (sub.status !== 'ACTIVE') return 'inactive';
  if (sub.lastBakeId === bake.id) return 'handled';
  if (sub.skipRemaining > 0) return 'skip';
  if (
    sub.frequency === 'biweekly' &&
    lastDelivery &&
    Date.parse(bake.pickupDate) - Date.parse(lastDelivery) < 13 * 86400000
  )
    return 'rest';
  return 'place';
}
// An order can be cancelled with its private link until the bake closes.
export const cancellable = (
  o: Pick<Order, 'status'>,
  deadline: string,
  now = Date.now(),
) => o.status === 'CONFIRMED' && now < Date.parse(deadline);
export const waitlistSchema = z.object({
  email: z
    .string()
    .trim()
    .max(254)
    .pipe(z.email('email'))
    .transform((v) => v.toLowerCase()),
  consent: z.literal('yes'),
  website: z.string().max(0).default(''),
  source: z.enum(sources).default('direct'),
  lang,
});
export type ReservationInput = z.infer<typeof reservationSchema>;
export type BakeState =
  'UPCOMING' | 'OPEN' | 'SOLD_OUT' | 'CLOSED' | 'COMPLETED';
export function bakeState(
  b: { status: BakeState; opensAt: string; deadline: string; capacity: number },
  reserved: number,
  now = Date.now(),
): BakeState {
  if (b.status === 'COMPLETED') return 'COMPLETED';
  if (b.status === 'CLOSED' || now >= Date.parse(b.deadline)) return 'CLOSED';
  if (b.status === 'UPCOMING' || now < Date.parse(b.opensAt)) return 'UPCOMING';
  if (b.status === 'SOLD_OUT' || reserved >= b.capacity) return 'SOLD_OUT';
  return 'OPEN';
}
// Converts a Madrid wall-clock date and time to an instant, handling CET/CEST.
export function madridIso(date: string, time = '00:00') {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time))
    throw new Error('Usa fechas AAAA-MM-DD y horas HH:MM.');
  const guess = Date.parse(`${date}T${time}:00Z`);
  const offset = (at: number) => {
    const name = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Madrid',
      timeZoneName: 'longOffset',
    })
      .formatToParts(at)
      .find((p) => p.type === 'timeZoneName')!.value;
    const [, sign, h, m] = /GMT([+-])(\d{2}):(\d{2})/.exec(name) || [];
    return sign ? (sign === '-' ? -1 : 1) * (+h! * 60 + +m!) * 60000 : 0;
  };
  const instant = guess - offset(guess - offset(guess));
  return new Date(instant).toISOString();
}

const madridDate = (at: Date) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(at);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)!.value;
  return `${value('year')}-${value('month')}-${value('day')}`;
};
const addCalendarDays = (date: string, days: number) =>
  new Date(Date.parse(`${date}T12:00:00Z`) + days * 86400000)
    .toISOString()
    .slice(0, 10);

// The weekly cycle follows Madrid's calendar, not the cron server's UTC day.
// Sunday through Thursday ensure the coming Saturday exists; Friday and
// Saturday never create a last-minute bake.
export function weeklyCyclePlan(now = new Date(), pickupTime = '12:00') {
  const today = madridDate(now);
  const weekday = new Date(`${today}T12:00:00Z`).getUTCDay();
  const pickupDate = addCalendarDays(today, (6 - weekday + 7) % 7);
  return {
    today,
    weekday,
    shouldEnsureBake: weekday <= 4,
    pickupDate,
    pickupAt: madridIso(pickupDate, pickupTime),
    deadline: madridIso(addCalendarDays(pickupDate, -2), '20:00'),
  };
}
export function assertCapacity(
  b: Parameters<typeof bakeState>[0],
  reserved: number,
  quantity: number,
  now = Date.now(),
) {
  if (
    bakeState(b, reserved, now) !== 'OPEN' ||
    reserved + quantity > b.capacity
  )
    throw new AppError('capacity');
}
// Short pickup code such as 001-K7QM: bake number plus four characters
// without look-alikes (no 0/O, 1/I/L), easy to say out loud or type.
const codeAlphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export function pickupCode(bakeNumber: string, bytes: Uint8Array) {
  const chars = Array.from(bytes.slice(0, 4), (b) => codeAlphabet[b % 31]);
  return `${bakeNumber}-${chars.join('')}`;
}
export const pickupCodePattern = /^\d{3}-[A-Z2-9]{4}$/;
// Halves of banana bread become whole moulds plus, at most, one half.
export const bananaSplit = (halves: number) => ({
  whole: Math.floor(halves / 2),
  half: halves % 2,
});
export type OrderItem = {
  product: string;
  name: string;
  quantity: number;
  unitPrice: number;
};
export type Order = {
  id: string;
  code: string;
  requestId: string;
  bakeId: string;
  name: string;
  email: string;
  phone: string;
  quantity: number;
  product: string;
  productName: string;
  total: number;
  pickupDate: string;
  pickupAddress: string;
  pickupWindow: string;
  source: string;
  status: 'CONFIRMED' | 'COLLECTED' | 'CANCELLED';
  createdAt: string;
  emailStatus: 'PENDING' | 'SENT' | 'FAILED' | 'DISABLED';
  // Absent on orders created before emails were translated.
  lang?: Lang;
  // Home delivery; absent on pickup orders. The purge removes `address`.
  delivery?: { town: string; address?: string };
  // First order of this customer: the baker adds the welcome gift.
  firstOrder?: boolean;
  // Private one-click cancellation link; absent on orders made before it existed.
  cancelToken?: string;
  // Set on orders the weekly job placed for a "pa fix": token manages it.
  subscription?: { token: string };
  // Absent on orders created before banana bread could be ordered online:
  // those are `quantity` loaves of `productName`.
  items?: OrderItem[];
};
export const orderItems = (o: Order): OrderItem[] =>
  o.items?.length
    ? o.items
    : [
        {
          product: o.product,
          name: o.productName,
          quantity: o.quantity,
          unitPrice: o.quantity ? Math.round(o.total / o.quantity) : o.total,
        },
      ];
// "2 × La de cada semana · 1 × Banana bread": one line for subjects and lists.
export const orderSummary = (o: Order, separator = ' · ') =>
  orderItems(o)
    .map((i) => `${i.quantity} × ${i.name}`)
    .join(separator);
// The daily job reminds customers whose pickup falls within the next 30 hours.
export const reminderWindowHours = 30;
export const reminderDue = (pickupIso: string, now = Date.now()) => {
  const left = Date.parse(pickupIso) - now;
  return left > 0 && left <= reminderWindowHours * 3600000;
};
// Spreadsheet apps run cells starting with these characters as formulas.
export const csvCell = (v: unknown) => {
  const text = String(v ?? '');
  return (
    '"' +
    (/^[=+\-@\t\r]/.test(text) ? `'${text}` : text).replaceAll('"', '""') +
    '"'
  );
};
