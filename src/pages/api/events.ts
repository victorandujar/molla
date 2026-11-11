import type { APIRoute } from 'astro';
import { z } from 'zod';
import { isDemo, launchReady } from '../../lib/config';
import { recordEvent } from '../../lib/store';
import { sameOrigin } from '../../lib/http';
import { sources } from '../../lib/sources';
export const events = [
  'landing_view',
  'view_current_bake',
  'view_product',
  // "Reservar" on a content page (ad landing pages), before the form.
  'click_reserve',
  'start_reservation',
  // Pressing "Confirmar la reserva", and a refusal shown after it.
  'reservation_submit',
  'reservation_error',
  'reservation_completed',
  'waitlist_signup',
  'click_instagram',
  'click_whatsapp',
  // «Reservar por WhatsApp»: an order that leaves the web for the chat.
  'click_whatsapp_order',
  // First field of the order form filled in (town, address, name…).
  'form_start',
  'click_channel',
  'subscription_completed',
  'pickup_info_view',
  // Combina Molla trial: each pairing added, and bookings that keep one.
  'combo_desayuno',
  'combo_capricho',
  'combo_compartir',
  'reservation_with_combo',
] as const;
const schema = z.object({
  event: z.enum(events),
  source: z.enum(sources),
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
