import type { APIRoute } from 'astro';
import { guard, body, json } from '../../lib/http';
import { waitlistSchema } from '../../lib/domain';
import { joinWaitlist } from '../../lib/store';
export const POST: APIRoute = async (ctx) => {
  try {
    const denied = await guard(ctx);
    if (denied) return denied;
    const r = waitlistSchema.safeParse(await body(ctx));
    if (!r.success)
      return json({ error: 'Revisa el email y acepta recibir el aviso.' }, 400);
    await joinWaitlist(r.data.email, r.data.source);
    return json({ ok: true });
  } catch {
    return json(
      { error: 'No se ha podido guardar tu aviso. Inténtalo de nuevo.' },
      503,
    );
  }
};
