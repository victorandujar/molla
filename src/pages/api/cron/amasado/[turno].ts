import type { APIRoute } from 'astro';
import { createHash, timingSafeEqual } from 'node:crypto';
import { json } from '../../../../lib/http';
import { runAmasadoJob } from '../../../../lib/amasado';
const digest = (s: string) => createHash('sha256').update(s).digest();
// Hoja de amasado. Vercel Cron solo entiende UTC, así que hay dos llamadas
// por la noche (18:30 y 19:30 UTC) y dos por la mañana (5:00 y 6:00 UTC):
// una de cada par cae a la hora de Madrid que toca, en invierno y en verano.
// El trabajo mira la hora de Madrid y no envía nada dos veces; `turno` solo
// distingue las rutas en vercel.json.
export const GET: APIRoute = async ({ request }) => {
  const secret = process.env.CRON_SECRET;
  const given = request.headers.get('authorization') || '';
  if (
    !secret ||
    secret.length < 16 ||
    !timingSafeEqual(digest(given), digest(`Bearer ${secret}`))
  )
    return json({ error: 'Unauthorized' }, 401);
  try {
    return json(await runAmasadoJob());
  } catch (e) {
    console.error('Amasado job failed', e instanceof Error ? e.message : e);
    return json({ error: 'Amasado job failed' }, 500);
  }
};
