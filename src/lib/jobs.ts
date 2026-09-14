import {
  claimReminders,
  cleanup,
  releaseReminder,
  unsentConfirmations,
} from './store';
import { emailEnabled, sendConfirmation, sendReminder } from './email';
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
// Runs once a day (vercel.json): pickup reminders, confirmation retries and
// housekeeping. Sends one email at a time to stay within provider limits.
export async function runDailyJobs() {
  const result = { reminders: 0, reminderFailures: 0, retried: 0 };
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
