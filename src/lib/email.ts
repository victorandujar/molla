import { brand, isDemo, money } from './config';
import { emailStatus } from './store';
import type { Order } from './domain';
export function confirmationText(o: Order) {
  return `Hola ${o.name},\n\nTu reserva en ${brand.name} está confirmada.\nReferencia: ${o.id}\n${o.quantity} × ${o.productName} — ${money(o.total)}\nRecogida: ${new Intl.DateTimeFormat('es-ES', { timeZone: 'Europe/Madrid', dateStyle: 'full' }).format(new Date(o.pickupDate))}\n${o.pickupWindow}\n${o.pickupAddress}\nPago al recoger.\n\nSi necesitas cambiar o cancelar la reserva, escribe a ${brand.contact} con tu referencia.\nGracias por reservar tu pan.`;
}
export async function sendConfirmation(o: Order) {
  if (o.emailStatus !== 'PENDING') return;
  if (isDemo || !process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    await emailStatus(o.id, 'DISABLED');
    return;
  }
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      signal: AbortSignal.timeout(8000),
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `reservation-${o.id}`,
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: [o.email],
        subject: `Tu pan del sábado · ${brand.name}`,
        text: confirmationText(o),
      }),
    });
    await emailStatus(o.id, response.ok ? 'SENT' : 'FAILED');
  } catch {
    await emailStatus(o.id, 'FAILED');
  }
}
