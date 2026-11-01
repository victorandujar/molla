import { createHash } from 'node:crypto';
import {
  claimReminders,
  cleanup,
  currentBake,
  releaseReminder,
  runWeeklyBakeCycle,
  unsentConfirmations,
} from './store';
import {
  emailEnabled,
  sendBatch,
  sendConfirmation,
  sendFunnel,
  sendReminder,
  sendSubscriptionFull,
} from './email';
import { generateSubscriptionOrders } from './subscriptions';
import { brand } from './config';
import {
  bakeState,
  broadcastDue,
  followupDue,
  followupKind,
  madridWeekday,
} from './domain';
import {
  claimBroadcast,
  claimCampaign,
  claimOnce,
  deliveredOrders,
  earnedRewards,
  inviteToken,
  referralCodesFor,
  releaseSends,
  weeklyFigures,
} from './funnel';
import { campaignsDue } from './campaigns';
import {
  broadcastEmail,
  campaignEmail,
  ownerReportEmail,
  pafixEmail,
  rewardEmail,
  thanksEmail,
} from './email-funnel';
import { asset } from './email-templates';
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
    funnel: null as Awaited<ReturnType<typeof runFunnelJob>> | null,
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
  // The funnel never blocks housekeeping: a failure is logged and retried
  // by the next run.
  result.funnel = await runFunnelJob({ followups: true, report: true });
  await cleanup();
  return result;
}

// ---- Automated sales funnel -----------------------------------------------------

// Emails per run, across all funnel emails. Resend's free plan allows 100 a
// day (confirmations and reminders included): raise FUNNEL_MAX_PER_RUN after
// moving to a paid plan.
const funnelLimit = () => {
  const n = Number(process.env.FUNNEL_MAX_PER_RUN);
  return Number.isInteger(n) && n > 0 ? n : 80;
};
// Idempotency keys appear in the logs when a send fails: hash the address.
const keyOf = (...parts: string[]) =>
  createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 32);
export const funnelEnabled = () =>
  emailEnabled() && process.env.FUNNEL_EMAILS !== 'false';

// Opening and last call of the bake on show, to confirmed subscribers.
async function runBroadcast(budget: number) {
  const b = await currentBake();
  const kind = broadcastDue({ ...b, status: bakeState(b, b.reserved) });
  if (!kind || budget <= 0) return { kind, sent: 0 };
  const recipients = await claimBroadcast(kind, b.id, budget);
  // Customers among them get their personal invite link in the email.
  let codes: Record<string, string> = {};
  try {
    codes = await referralCodesFor(recipients.map((r) => r.email));
  } catch (e) {
    console.error('Invite codes failed', e instanceof Error ? e.message : e);
  }
  let sent = 0;
  for (let i = 0; i < recipients.length; i += 100) {
    const chunk = recipients.slice(i, i + 100);
    const ok = await sendBatch(
      chunk.map((r) => ({
        to: r.email,
        ...broadcastEmail(kind, r.lang, b, r.token, codes[r.email]),
      })),
      `${kind}-${b.id}-${keyOf(...chunk.map((r) => r.email))}`,
    );
    if (ok) sent += chunk.length;
    else
      await releaseSends(
        kind,
        b.id,
        chunk.map((r) => r.email),
      );
  }
  return { kind, sent, bake: b.id };
}

// The day after a delivery: thank-you after a first order, the "pa fix"
// offer after a second one. Each customer gets each email once, ever.
async function runFollowups(budget: number) {
  let thanks = 0;
  let pafix = 0;
  for (const { order, number, subscribed } of await deliveredOrders()) {
    if (thanks + pafix >= budget) break;
    if (!followupDue(order.pickupDate)) continue;
    const kind = followupKind(number, subscribed);
    if (!kind || !(await claimOnce(kind, 'once', order.email))) continue;
    const lang = order.lang === 'ca' ? 'ca' : 'es';
    let message;
    if (kind === 'thanks') {
      const token = await inviteToken(order.email, lang);
      message = thanksEmail(
        order,
        token ? asset(`/alta?token=${token}&lang=${lang}`) : null,
      );
    } else message = pafixEmail(order);
    if (
      await sendFunnel(order.email, message, `${kind}-${keyOf(order.email)}`)
    ) {
      if (kind === 'thanks') thanks++;
      else pafix++;
    } else await releaseSends(kind, 'once', [order.email]);
    await pause(600);
  }
  // "Convida un veí": the referrer hears their gift is waiting.
  let reward = 0;
  for (const r of await earnedRewards()) {
    if (thanks + pafix + reward >= budget) break;
    if (!(await claimOnce('reward', r.orderId, r.email))) continue;
    if (await sendFunnel(r.email, rewardEmail(r), `reward-${keyOf(r.orderId)}`))
      reward++;
    else await releaseSends('reward', r.orderId, [r.email]);
    await pause(600);
  }
  return { thanks, pafix, reward };
}

// Seasonal campaigns due today (or missed in the last two days), in batches.
async function runCampaigns(budget: number) {
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
  }).format(new Date());
  let sent = 0;
  for (const campaign of campaignsDue(today)) {
    if (sent >= budget) break;
    const recipients = await claimCampaign(
      campaign.id,
      campaign.bakeDate,
      budget - sent,
    );
    let codes: Record<string, string> = {};
    try {
      codes = await referralCodesFor(recipients.map((r) => r.email));
    } catch (e) {
      console.error('Invite codes failed', e instanceof Error ? e.message : e);
    }
    for (let i = 0; i < recipients.length; i += 100) {
      const chunk = recipients.slice(i, i + 100);
      const ok = await sendBatch(
        chunk.map((r) => ({
          to: r.email,
          ...campaignEmail(campaign, r.lang, r.token, codes[r.email]),
        })),
        `campaign-${campaign.id}-${keyOf(...chunk.map((r) => r.email))}`,
      );
      if (ok) sent += chunk.length;
      else
        await releaseSends(
          'campaign',
          campaign.id,
          chunk.map((r) => r.email),
        );
    }
  }
  return sent;
}

// Sunday afternoon: what the week brought, in the baker's inbox.
async function runReport() {
  if (!brand.contact) return false;
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
  }).format(new Date());
  if (madridWeekday(new Date().toISOString()) !== 0) return false;
  if (!(await claimOnce('report', today, brand.contact))) return false;
  const figures = await weeklyFigures();
  if (!figures) return false;
  const ok = await sendFunnel(
    brand.contact,
    ownerReportEmail(figures),
    `report-${today}`,
  );
  if (!ok) await releaseSends('report', today, [brand.contact]);
  return ok;
}

export async function runFunnelJob(
  what: { followups?: boolean; report?: boolean } = {},
) {
  const result = {
    broadcast: null as Awaited<ReturnType<typeof runBroadcast>> | null,
    followups: null as Awaited<ReturnType<typeof runFollowups>> | null,
    campaigns: 0,
    report: false,
    error: false,
  };
  if (!funnelEnabled()) return result;
  try {
    const budget = funnelLimit();
    result.broadcast = await runBroadcast(budget);
    let left = budget - result.broadcast.sent;
    if (what.followups) {
      result.campaigns = await runCampaigns(left);
      left -= result.campaigns;
      result.followups = await runFollowups(left);
    }
    if (what.report) result.report = await runReport();
  } catch (e) {
    console.error('Funnel job failed', e instanceof Error ? e.message : e);
    result.error = true;
  }
  return result;
}
