import type { APIRoute } from 'astro';
import { z } from 'zod';
import { isDemo, launchReady } from '../../lib/config';
import { recordEvent } from '../../lib/store';
import { sameOrigin } from '../../lib/http';
export const events = [
  'landing_view',
  'view_current_bake',
  'view_product',
  'start_reservation',
  'reservation_completed',
  'waitlist_signup',
  'click_instagram',
  'click_whatsapp',
  'pickup_info_view',
] as const;
const schema = z.object({
  event: z.enum(events),
  source: z.enum(['instagram', 'google', 'whatsapp', 'direct', 'referral']),
});
const done = () => new Response(null, { status: 204 });
// Cookie-free funnel counters: event name, channel and day. Nothing else.
export const POST: APIRoute = async (ctx) => {
  if ((!isDemo && !launchReady) || !sameOrigin(ctx)) return done();
  try {
    const text = await ctx.request.text();
    if (text.length > 200) return done();
    const r = schema.safeParse(JSON.parse(text));
    if (r.success) await recordEvent(r.data.event, r.data.source);
  } catch {
    /* Measurement never affects the visitor. */
  }
  return done();
};
