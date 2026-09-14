import type { APIRoute } from 'astro';
import { guard, body, json, langOf, error, issue, after } from '../../lib/http';
import { reservationSchema } from '../../lib/domain';
import { reserve } from '../../lib/store';
import { sendConfirmation, notifyOwner } from '../../lib/email';
import { isDemo, brand } from '../../lib/config';
import { AppError } from '../../lib/messages';
import { ui } from '../../lib/i18n';
export const POST: APIRoute = async (ctx) => {
  const lang = langOf(ctx);
  try {
    const denied = await guard(ctx, 'reservation');
    if (denied) return denied;
    const result = reservationSchema.safeParse(await body(ctx));
    if (!result.success)
      return error(lang, issue(result.error, 'invalid'), 400);
    const order = await reserve({ ...result.data, lang });
    // Emails go out after the response; they never roll back a confirmed
    // order, and the daily job retries a failed confirmation.
    after(Promise.all([sendConfirmation(order), notifyOwner(order)]));
    return json(
      {
        id: order.id,
        code: order.code,
        quantity: order.quantity,
        productName: ui[lang].loaf.name,
        total: order.total,
        pickupDate: order.pickupDate,
        pickupAddress: order.pickupAddress,
        pickupWindow: order.pickupWindow,
        contact: brand.contact,
        demo: isDemo,
      },
      201,
    );
  } catch (e) {
    if (e instanceof AppError) return error(lang, e.key, e.status);
    console.error('Reservation failed', e instanceof Error ? e.message : e);
    return error(lang, 'reservationFailed', 503);
  }
};
