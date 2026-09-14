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
export type Order = {
  id: string;
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
