import type { APIRoute } from 'astro';
import { createHash, timingSafeEqual } from 'node:crypto';
import { json } from '../../../lib/http';
import { runWeeklyBakeCycle } from '../../../lib/store';
import { runSubscriptionJob } from '../../../lib/jobs';

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
    const cycle = await runWeeklyBakeCycle();
    // Subscribers get their loaves right after the bake opens.
    let subscriptions: unknown = null;
    try {
      subscriptions = await runSubscriptionJob();
    } catch (error) {
      // The bake exists either way; the daily job repeats this step.
      console.error(
        'Subscription orders failed',
        error instanceof Error ? error.message : error,
      );
      subscriptions = { error: true };
    }
    return json({ ...cycle, subscriptions });
  } catch (error) {
    console.error(
      'Weekly cycle failed',
      error instanceof Error ? error.message : error,
    );
    return json({ error: 'Weekly cycle failed' }, 500);
  }
};
