import type { APIContext } from 'astro';
import type { z } from 'zod';
import { waitUntil } from '@vercel/functions';
import { isDemo, launchReady } from './config';
import { rateLimit } from './store';
import {
  AppError,
  isMessageKey,
  messages,
  type Lang,
  type MessageKey,
} from './messages';
export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
// Forms post to `/api/...?lang=ca` so even the earliest errors are translated.
export const langOf = (ctx: APIContext): Lang =>
  ctx.url.searchParams.get('lang') === 'ca' ? 'ca' : 'es';
export const error = (lang: Lang, key: MessageKey, status: number) =>
  json({ error: messages[lang][key] }, status);
// Astro throws when the adapter cannot tell the address (e.g. local handlers).
export function clientIp(ctx: Pick<APIContext, 'clientAddress' | 'request'>) {
  try {
    return ctx.clientAddress || 'unknown';
  } catch {
    return ctx.request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  }
}
export const sameOrigin = (ctx: APIContext) =>
  ctx.request.headers.get('origin') === ctx.url.origin;
export async function guard(ctx: APIContext, scope: string, limit = 12) {
  const lang = langOf(ctx);
  if (!isDemo && !launchReady) return error(lang, 'closed', 503);
  if (!sameOrigin(ctx)) return error(lang, 'origin', 403);
  if (Number(ctx.request.headers.get('content-length') || 0) > 8192)
    return error(lang, 'tooLarge', 413);
  if (!(await rateLimit(`${scope}|${clientIp(ctx)}`, limit)))
    return error(lang, 'rateLimited', 429);
  return null;
}
export async function body(ctx: APIContext) {
  const text = await ctx.request.text();
  if (text.length > 8192) throw new AppError('tooLarge', 413);
  if (!ctx.request.headers.get('content-type')?.includes('application/json'))
    return Object.fromEntries(new URLSearchParams(text));
  try {
    return JSON.parse(text);
  } catch {
    throw new AppError('invalid', 400);
  }
}
// Schemas use message keys as issue messages.
export const issue = (e: z.ZodError, fallback: MessageKey): MessageKey => {
  const key = e.issues[0]?.message || '';
  return isMessageKey(key) ? key : fallback;
};
// Work that must not delay the response (emails). Vercel keeps the function
// alive until it settles; locally the promise simply runs on.
export const after = (task: Promise<unknown>) =>
  waitUntil(task.catch((e) => console.error('Background task failed', e)));
