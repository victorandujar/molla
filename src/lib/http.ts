import type { APIContext } from 'astro';
import { isDemo, launchReady } from './config';
import { rateLimit } from './store';
export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
export async function guard(ctx: APIContext) {
  if (!isDemo && !launchReady)
    return json(
      { error: 'Todavía no hemos abierto las reservas. Vuelve pronto.' },
      503,
    );
  if (ctx.request.headers.get('origin') !== ctx.url.origin)
    return json({ error: 'Solicitud no válida.' }, 403);
  if (Number(ctx.request.headers.get('content-length') || 0) > 8192)
    return json({ error: 'Solicitud demasiado larga.' }, 413);
  if (!(await rateLimit(ctx.clientAddress || 'local')))
    return json(
      {
        error:
          'Has enviado varias solicitudes. Espera diez minutos y vuelve a intentarlo.',
      },
      429,
    );
  return null;
}
export async function body(ctx: APIContext) {
  const text = await ctx.request.text();
  if (text.length > 8192) throw new Error('Solicitud demasiado larga.');
  if (ctx.request.headers.get('content-type')?.includes('application/json'))
    return JSON.parse(text);
  return Object.fromEntries(new URLSearchParams(text));
}
