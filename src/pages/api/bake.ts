import type { APIRoute } from 'astro';
import { bookableBake, currentBake } from '../../lib/store';
import { bakeState, publicStock } from '../../lib/domain';
import { isDemo, launchReady } from '../../lib/config';
import { json } from '../../lib/http';
// Levels and per-order limits only: how many are left is not public.
// `?bake=ID` asks for an early bake (Christmas page); otherwise the weekly one.
export const GET: APIRoute = async ({ url }) => {
  if (!isDemo && !launchReady) return json({ state: 'UPCOMING' });
  try {
    const id = url.searchParams.get('bake');
    const b = (id && (await bookableBake(id))) || (await currentBake());
    return json({ state: bakeState(b, b.reserved), ...publicStock(b) });
  } catch {
    return json({ error: 'No podemos consultar la disponibilidad.' }, 503);
  }
};
