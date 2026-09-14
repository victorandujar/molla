import { brand, isDemo } from './config';
import { emailStatus } from './store';
import type { Order } from './domain';
import {
  confirmationHtml,
  confirmationSubject,
  confirmationText,
  ownerHtml,
  ownerSubject,
  ownerText,
} from './email-templates';
async function send(
  payload: {
    to: string;
    subject: string;
    text: string;
    html: string;
    replyTo?: string;
  },
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
      html: payload.html,
      reply_to: payload.replyTo,
    }),
  });
  // Logged without personal data so a delivery problem is visible in Vercel logs.
  if (!response.ok)
    console.error(`Email rejected (${response.status}) for ${key}`);
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
        subject: confirmationSubject(o),
        text: confirmationText(o),
        html: confirmationHtml(o),
        replyTo: brand.contact || undefined,
      },
      `reservation-${o.id}`,
    );
    await emailStatus(o.id, ok ? 'SENT' : 'FAILED');
  } catch {
    console.error('Confirmation email failed', o.id);
    await emailStatus(o.id, 'FAILED');
  }
}
// The baker gets every new order in their inbox; failure never affects the order.
export async function notifyOwner(o: Order) {
  if (!enabled() || !brand.contact) return;
  try {
    const ok = await send(
      {
        to: brand.contact,
        subject: ownerSubject(o),
        text: ownerText(o),
        html: ownerHtml(o),
        replyTo: o.email,
      },
      `owner-${o.id}`,
    );
    if (!ok) console.error('Owner notification failed', o.id);
  } catch {
    console.error('Owner notification failed', o.id);
  }
}
