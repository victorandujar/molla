import type { APIRoute } from 'astro';
import { currentBake } from '../../lib/store';
import { bakeState, publicStock } from '../../lib/domain';
import { isDemo, launchReady } from '../../lib/config';
import { json } from '../../lib/http';
// Levels and per-order limits only: how many are left is not public.
export const GET: APIRoute = async () => {
  if (!isDemo && !launchReady) return json({ state: 'UPCOMING' });
  try {
    const b = await currentBake();
    return json({ state: bakeState(b, b.reserved), ...publicStock(b) });
  } catch {
    return json({ error: 'No podemos consultar la disponibilidad.' }, 503);
  }
};
