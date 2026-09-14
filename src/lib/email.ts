import { brand, isDemo, money } from './config';
import { emailStatus } from './store';
import type { Order } from './domain';
const day = (iso: string) =>
  new Intl.DateTimeFormat('es-ES', {
    timeZone: 'Europe/Madrid',
    dateStyle: 'full',
  }).format(new Date(iso));
export function confirmationText(o: Order) {
  return `Hola ${o.name},\n\nTu reserva en ${brand.name} está confirmada.\nReferencia: ${o.id}\n${o.quantity} × ${o.productName} — ${money(o.total)}\nRecogida: ${day(o.pickupDate)}\n${o.pickupWindow}\n${o.pickupAddress}\n${brand.pickupMap}\nPago al recoger.\n\nSi necesitas cambiar o cancelar la reserva, escribe a ${brand.contact} con tu referencia.\nGracias por reservar tu pan.`;
}
export function ownerText(o: Order) {
  return `Nueva reserva\n\n${o.quantity} × ${o.productName} — ${money(o.total)}\nNombre: ${o.name}\nEmail: ${o.email}\nTeléfono: ${o.phone}\nRecogida: ${day(o.pickupDate)}, ${o.pickupWindow}\nCanal: ${o.source}\nReferencia: ${o.id}`;
}
async function send(
  payload: { to: string; subject: string; text: string; replyTo?: string },
  key: string,
) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    signal: AbortSignal.timeout(8000),
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': key,
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to: [payload.to],
      subject: payload.subject,
      text: payload.text,
      reply_to: payload.replyTo,
    }),
  });
  return response.ok;
}
const enabled = () =>
  !isDemo && !!process.env.RESEND_API_KEY && !!process.env.EMAIL_FROM;
export async function sendConfirmation(o: Order) {
  if (o.emailStatus !== 'PENDING') return;
  if (!enabled()) {
    await emailStatus(o.id, 'DISABLED');
    return;
  }
  try {
    const ok = await send(
      {
        to: o.email,
        subject: `Tu pan del sábado · ${brand.name}`,
        text: confirmationText(o),
        replyTo: brand.contact || undefined,
      },
      `reservation-${o.id}`,
    );
    await emailStatus(o.id, ok ? 'SENT' : 'FAILED');
  } catch {
    await emailStatus(o.id, 'FAILED');
  }
}
// The baker gets every new order in their inbox; failure never affects the order.
export async function notifyOwner(o: Order) {
  if (!enabled() || !brand.contact) return;
  try {
    await send(
      {
        to: brand.contact,
        subject: `Nueva reserva: ${o.quantity} × ${o.productName} · ${o.name}`,
        text: ownerText(o),
        replyTo: o.email,
      },
      `owner-${o.id}`,
    );
  } catch {
    console.error('Owner notification failed', o.id);
  }
}
