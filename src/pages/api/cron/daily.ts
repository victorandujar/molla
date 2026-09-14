import type { APIRoute } from 'astro';
import { createHash, timingSafeEqual } from 'node:crypto';
import { json } from '../../../lib/http';
import { runDailyJobs } from '../../../lib/jobs';
const digest = (s: string) => createHash('sha256').update(s).digest();
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
    return json(await runDailyJobs());
  } catch (e) {
    console.error('Daily jobs failed', e instanceof Error ? e.message : e);
    return json({ error: 'Daily jobs failed' }, 500);
  }
};
