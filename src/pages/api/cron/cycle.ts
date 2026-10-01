import type { APIRoute } from 'astro';
import { createHash, timingSafeEqual } from 'node:crypto';
import { json } from '../../../lib/http';
import { runWeeklyBakeCycle } from '../../../lib/store';

const digest = (value: string) => createHash('sha256').update(value).digest();

// Vercel Cron calls this with `Authorization: Bearer $CRON_SECRET`.
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
    return json(await runWeeklyBakeCycle());
  } catch (error) {
    console.error(
      'Weekly cycle failed',
      error instanceof Error ? error.message : error,
    );
    return json({ error: 'Weekly cycle failed' }, 500);
  }
};
