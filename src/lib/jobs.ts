import {
  claimReminders,
  cleanup,
  releaseReminder,
  runWeeklyBakeCycle,
  unsentConfirmations,
} from './store';
import {
  emailEnabled,
  sendConfirmation,
  sendReminder,
  sendSubscriptionFull,
} from './email';
import { generateSubscriptionOrders } from './subscriptions';
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
// Places the order of every active "pa fix" for the open bake and emails the
// result. Repeating it is harmless: each bake is handled once per subscription.
export async function runSubscriptionJob() {
  const r = await generateSubscriptionOrders();
  let emailed = 0;
  if (emailEnabled()) {
    for (const order of r.placed) {
      await sendConfirmation(order);
      emailed++;
      await pause(600);
    }
    for (const sub of r.full) {
      await sendSubscriptionFull(sub, r.bakeId!);
      emailed++;
      await pause(600);
    }
  } else {
    // Without email the orders still count; mark them so they are not retried.
    for (const order of r.placed) await sendConfirmation(order);
  }
  return {
    bake: r.bakeId,
    placed: r.placed.length,
    full: r.full.length,
    skipped: r.skipped,
    rested: r.rested,
    failed: r.failed,
    emailed,
  };
}
// Runs once a day (vercel.json): pickup reminders, confirmation retries and
// housekeeping. Sends one email at a time to stay within provider limits.
export async function runDailyJobs() {
  const result = {
    reminders: 0,
    reminderFailures: 0,
    retried: 0,
    cycle: await runWeeklyBakeCycle(),
    subscriptions: null as
      Awaited<ReturnType<typeof runSubscriptionJob>> | { error: true } | null,
  };
  try {
    result.subscriptions = await runSubscriptionJob();
  } catch (e) {
    console.error(
      'Subscription orders failed',
      e instanceof Error ? e.message : e,
    );
    result.subscriptions = { error: true };
  }
  if (emailEnabled()) {
    for (const order of await claimReminders()) {
      if (await sendReminder(order)) result.reminders++;
      else {
        result.reminderFailures++;
        await releaseReminder(order.id);
      }
      await pause(600);
    }
    for (const order of await unsentConfirmations()) {
      await sendConfirmation({ ...order, emailStatus: 'FAILED' }, true);
      result.retried++;
      await pause(600);
    }
  }
  await cleanup();
  return result;
}
