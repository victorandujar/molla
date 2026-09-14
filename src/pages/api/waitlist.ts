import type { APIRoute } from 'astro';
import { guard, body, json, langOf, error, after } from '../../lib/http';
import { waitlistSchema } from '../../lib/domain';
import { joinWaitlist } from '../../lib/store';
import { emailEnabled, sendWaitlistConfirmation } from '../../lib/email';
import { isDemo } from '../../lib/config';
import { AppError } from '../../lib/messages';
export const POST: APIRoute = async (ctx) => {
  const lang = langOf(ctx);
  try {
    const denied = await guard(ctx, 'waitlist', 6);
    if (denied) return denied;
    const r = waitlistSchema.safeParse(await body(ctx));
    if (!r.success) return error(lang, 'waitlistInvalid', 400);
    // Double opt-in: the address joins the list once its owner clicks the
    // emailed link. Without an email provider there is no way to confirm,
    // so a deployment without one keeps the previous direct sign-up.
    const confirmed = !isDemo && !emailEnabled();
    const tokens = await joinWaitlist(r.data.email, r.data.source, lang, confirmed);
    if (tokens) after(sendWaitlistConfirmation(r.data.email, lang, tokens));
    // Same answer whether the address was new, pending or already confirmed.
    return json({ ok: true, confirm: !confirmed });
  } catch (e) {
    if (e instanceof AppError) return error(lang, e.key, e.status);
    return error(lang, 'waitlistFailed', 503);
  }
};
