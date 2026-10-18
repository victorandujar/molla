import { brand, isDemo } from './config';
import { emailStatus } from './store';
import { orderSummary, type Order, type Subscription } from './domain';
import { townById } from './delivery';
import {
  confirmationHtml,
  confirmationSubject,
  confirmationText,
  ownerHtml,
  ownerSubject,
  ownerNotice,
  ownerText,
  reminderHtml,
  reminderSubject,
  reminderText,
  subscriptionFull,
  subscriptionWelcome,
  waitlistConfirmation,
} from './email-templates';
import type { Lang } from './domain';
import type { WaitlistTokens } from './store';
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
export const emailEnabled = () =>
  !isDemo && !!process.env.RESEND_API_KEY && !!process.env.EMAIL_FROM;
// A retry from the daily job reuses the idempotency key, so an email the
// provider already accepted is not delivered twice.
export async function sendConfirmation(o: Order, retry = false) {
  if (o.emailStatus !== 'PENDING' && !(retry && o.emailStatus === 'FAILED'))
    return;
  if (!emailEnabled()) {
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
  if (!emailEnabled() || !brand.contact) return;
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

export async function sendReminder(o: Order) {
  if (!emailEnabled()) return false;
  try {
    return await send(
      {
        to: o.email,
        subject: reminderSubject(o),
        text: reminderText(o),
        html: reminderHtml(o),
        replyTo: brand.contact || undefined,
      },
      `reminder-${o.id}`,
    );
  } catch {
    console.error('Reminder email failed', o.id);
    return false;
  }
}
export async function sendWaitlistConfirmation(
  email: string,
  lang: Lang,
  tokens: WaitlistTokens,
) {
  if (!emailEnabled()) return;
  const message = waitlistConfirmation(lang, tokens);
  try {
    const ok = await send(
      { to: email, ...message, replyTo: brand.contact || undefined },
      `waitlist-${tokens.confirm}-${new Date().toISOString().slice(0, 13)}`,
    );
    if (!ok) console.error('Waitlist confirmation failed');
  } catch {
    console.error('Waitlist confirmation failed');
  }
}

// ---- Pa fix and cancellations ----------------------------------------------

async function sendTo(
  to: string,
  message: { subject: string; html: string; text: string },
  key: string,
  replyTo?: string,
) {
  if (!emailEnabled()) return false;
  try {
    const ok = await send({ to, ...message, replyTo }, key);
    if (!ok) console.error('Email failed', key);
    return ok;
  } catch {
    console.error('Email failed', key);
    return false;
  }
}
export const sendSubscriptionWelcome = (sub: Subscription, firstDay: string) =>
  sendTo(
    sub.email,
    subscriptionWelcome(sub, firstDay),
    `sub-welcome-${sub.id}`,
    brand.contact || undefined,
  );
export const sendSubscriptionFull = (sub: Subscription, bakeId: string) =>
  sendTo(
    sub.email,
    subscriptionFull(sub),
    `sub-full-${sub.id}-${bakeId}`,
    brand.contact || undefined,
  );
const where = (sub: Pick<Subscription, 'delivery' | 'town' | 'address'>) =>
  sub.delivery === 'home'
    ? `A domicilio · ${townById(sub.town)?.name ?? sub.town} · ${sub.address}`
    : 'Recogida en Sant Boi';
const plan = (sub: Subscription) =>
  `${sub.quantity} pan(es)${sub.banana ? ` + ${sub.banana}/2 banana bread` : ''} · ${sub.frequency === 'weekly' ? 'cada semana' : 'cada dos semanas'}`;
// The baker hears about every new subscription and every cancellation.
export async function notifyOwnerSubscription(sub: Subscription) {
  if (!brand.contact) return;
  await sendTo(
    brand.contact,
    ownerNotice(`Nuevo pan fijo: ${sub.name}`, [
      ['Pedido', plan(sub)],
      ['Entrega', where(sub)],
      ['Teléfono', sub.phone],
      ['Email', sub.email],
    ]),
    `owner-sub-${sub.id}`,
    sub.email,
  );
}
export async function notifyOwnerChange(
  sub: Subscription,
  what: 'skip' | 'pause' | 'cancel',
) {
  if (!brand.contact) return;
  const label = {
    skip: 'se salta la próxima entrega',
    pause: 'ha pausado su pan fijo',
    cancel: 'se ha dado de baja del pan fijo',
  }[what];
  await sendTo(
    brand.contact,
    ownerNotice(`Pan fijo: ${sub.name} ${label}`, [
      ['Pedido', plan(sub)],
      ['Teléfono', sub.phone],
    ]),
    `owner-sub-${sub.id}-${what}-${new Date().toISOString().slice(0, 13)}`,
    sub.email,
  );
}
export async function notifyOwnerCancellation(o: Order) {
  if (!brand.contact) return;
  await sendTo(
    brand.contact,
    ownerNotice(`Pedido cancelado ${o.code}: ${o.name}`, [
      ['Pedido', orderSummary(o)],
      ['Teléfono', o.phone],
      ...(o.subscription
        ? ([['Origen', 'Pan fijo']] as [string, string][])
        : []),
    ]),
    `owner-cancel-${o.id}`,
    o.email,
  );
}
