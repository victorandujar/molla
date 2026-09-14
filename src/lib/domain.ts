import { z } from 'zod';
export const reservationSchema = z.object({
  requestId: z.uuid(),
  bakeId: z.string().min(1).max(80),
  name: z.string().trim().min(2, 'Escribe tu nombre.').max(100),
  email: z
    .string()
    .trim()
    .max(254)
    .pipe(z.email('Revisa tu email.'))
    .transform((v) => v.toLowerCase()),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[\d\s()-]{9,22}$/, 'Revisa tu teléfono.')
    .refine((v) => {
      const digits = v.replace(/\D/g, '');
      return digits.length >= 9 && digits.length <= 15;
    }, 'Revisa tu teléfono.'),
  quantity: z.coerce.number().int().min(1).max(4),
  product: z.literal('clasica'),
  pickup: z.literal('yes', { error: 'Confirma que podrás recoger el pan.' }),
  privacy: z.literal('yes', {
    error: 'Necesitamos tu aceptación para gestionar el pedido.',
  }),
  website: z.string().max(0).default(''),
  source: z
    .enum(['instagram', 'google', 'whatsapp', 'direct', 'referral'])
    .default('direct'),
});
export const waitlistSchema = z.object({
  email: z
    .string()
    .trim()
    .max(254)
    .pipe(z.email('Revisa tu email.'))
    .transform((v) => v.toLowerCase()),
  consent: z.literal('yes'),
  website: z.string().max(0).default(''),
  source: z
    .enum(['instagram', 'google', 'whatsapp', 'direct', 'referral'])
    .default('direct'),
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
    throw new Error(
      'Esta hornada ya no admite esa cantidad. Puedes apuntarte a la próxima.',
    );
}
// Short pickup code such as 001-K7QM: bake number plus four characters
// without look-alikes (no 0/O, 1/I/L), easy to say out loud or type.
const codeAlphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export function pickupCode(bakeNumber: string, bytes: Uint8Array) {
  const chars = Array.from(bytes.slice(0, 4), (b) => codeAlphabet[b % 31]);
  return `${bakeNumber}-${chars.join('')}`;
}
export const pickupCodePattern = /^\d{3}-[A-Z2-9]{4}$/;
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
};
