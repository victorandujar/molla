import type { APIRoute } from 'astro';
import { currentBake } from '../../lib/store';
import { bakeState } from '../../lib/domain';
import {
  isDemo,
  launchReady,
  BANANA_HALVES_PER_BAKE,
  PASTRY_UNITS_PER_BAKE,
} from '../../lib/config';
import { json } from '../../lib/http';
export const GET: APIRoute = async () => {
  if (!isDemo && !launchReady) return json({ state: 'UPCOMING', reserved: 0 });
  try {
    const b = await currentBake();
    return json({
      state: bakeState(b, b.reserved),
      reserved: b.reserved,
      capacity: b.capacity,
      bananaLeft: Math.max(0, BANANA_HALVES_PER_BAKE - b.bananaReserved),
      pastryLeft: Math.max(0, PASTRY_UNITS_PER_BAKE - b.pastryReserved),
    });
  } catch {
    return json({ error: 'No podemos consultar la disponibilidad.' }, 503);
  }
};
