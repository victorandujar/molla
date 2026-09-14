import type { APIRoute } from 'astro';
import { guard, body, json } from '../../lib/http';
import { reservationSchema } from '../../lib/domain';
import { reserve } from '../../lib/store';
import { sendConfirmation, notifyOwner } from '../../lib/email';
import { isDemo, brand } from '../../lib/config';
export const POST: APIRoute = async (ctx) => {
  try {
    const denied = await guard(ctx);
    if (denied) return denied;
    const result = reservationSchema.safeParse(await body(ctx));
    if (!result.success)
      return json(
        { error: result.error.issues[0]?.message || 'Revisa los datos.' },
        400,
      );
    const order = await reserve(result.data);
    // Email never rolls back a confirmed order. Its outcome is retained for the owner.
    try {
      await Promise.all([sendConfirmation(order), notifyOwner(order)]);
    } catch {
      console.error('Confirmation delivery needs review', order.id);
    }
    return json(
      {
        id: order.id,
        code: order.code,
        quantity: order.quantity,
        productName: order.productName,
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
    const message = e instanceof Error ? e.message : '';
    const expected =
      message.startsWith('Esta hornada') ||
      message.startsWith('La hornada') ||
      message.startsWith('Este pan');
    return json(
      {
        error: expected
          ? message
          : 'No se ha podido procesar la reserva. Conservamos tus datos en el formulario; vuelve a intentarlo.',
      },
      expected ? 409 : 503,
    );
  }
};
