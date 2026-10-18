import type { APIRoute } from 'astro';
import { guard, body, json, langOf, error, issue, after } from '../../lib/http';
import { subscriptionSchema } from '../../lib/domain';
import { currentBake } from '../../lib/store';
import {
  createSubscription,
  placeForSubscription,
} from '../../lib/subscriptions';
import {
  notifyOwnerSubscription,
  sendConfirmation,
  sendSubscriptionWelcome,
} from '../../lib/email';
import { pickupDay, manageUrl } from '../../lib/email-templates';
import { isDemo } from '../../lib/config';
import { AppError } from '../../lib/messages';
import type { Order } from '../../lib/domain';

// Joining a "pa fix": the first order is placed right away when the open
// bake has room, so the customer knows what happens this Saturday.
export const POST: APIRoute = async (ctx) => {
  const lang = langOf(ctx);
  try {
    const denied = await guard(ctx, 'subscription');
    if (denied) return denied;
    const result = subscriptionSchema.safeParse(await body(ctx));
    if (!result.success)
      return error(lang, issue(result.error, 'invalid'), 400);
    const sub = await createSubscription({ ...result.data, lang });
    let first: Order | null = null;
    try {
      const placed = await placeForSubscription(sub, await currentBake());
      if (placed.kind === 'placed') first = placed.order;
    } catch {
      /* No open bake yet: the weekly job places the first order. */
    }
    const firstDay = first
      ? pickupDay(first.pickupDate, lang).toLowerCase()
      : '';
    after(
      Promise.all([
        sendSubscriptionWelcome(sub, firstDay),
        first ? sendConfirmation(first) : null,
        notifyOwnerSubscription(sub),
      ]),
    );
    return json(
      {
        manage: manageUrl(sub.token, lang).replace(/^https?:\/\/[^/]+/, ''),
        firstDay,
        firstWindow: first?.pickupWindow ?? '',
        firstCode: first?.code ?? '',
        total: first?.total ?? 0,
        demo: isDemo,
      },
      201,
    );
  } catch (e) {
    if (e instanceof AppError) return error(lang, e.key, e.status);
    console.error('Subscription failed', e instanceof Error ? e.message : e);
    return error(lang, 'reservationFailed', 503);
  }
};
