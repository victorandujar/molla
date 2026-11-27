import type { APIRoute } from 'astro';
import { adminEnabled, sessionCookie, validSession } from '../../lib/admin';
import { listBakes } from '../../lib/store';
import { emailEnabled } from '../../lib/email';
import {
  bakeById,
  buildSheet,
  production,
  sendSheet,
  sheetRecipient,
} from '../../lib/amasado';
// La hoja de amasado de una hornada, la misma que llega por email, para
// consultarla desde el móvil. «Enviármela ahora» la manda en el momento.
const page = (body: string, status = 200) =>
  new Response(body, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow, noarchive',
    },
  });
async function target(id: string | null) {
  if (id) return bakeById(id);
  // Como el panel: la hornada pendiente de hornear y entregar.
  const bakes = await listBakes();
  const b =
    bakes.findLast(
      (b) =>
        b.status !== 'COMPLETED' &&
        Date.parse(b.pickupDate) > Date.now() - 12 * 3600000,
    ) || bakes[0];
  return b ? bakeById(b.id) : null;
}
export const GET: APIRoute = async ({ cookies, url, redirect }) => {
  if (!adminEnabled()) return new Response('Not found', { status: 404 });
  if (!validSession(cookies.get(sessionCookie)?.value))
    return redirect('/gestio', 303);
  const bake = await target(url.searchParams.get('bake'));
  if (!bake) return page('<p>No existe esa hornada.</p>', 404);
  const { email } = buildSheet(await production(bake));
  const sent = url.searchParams.get('sent');
  const to = sheetRecipient();
  const bar = `<div style="max-width:680px;margin:0 auto;padding:12px 16px;display:flex;gap:12px;flex-wrap:wrap;align-items:center;font-size:14px"><a href="/gestio?bake=${encodeURIComponent(bake.id)}" style="color:#2b2118">← Volver al panel</a><form method="post" style="margin:0"><input type="hidden" name="bake" value="${bake.id.replace(/"/g, '')}"><button type="submit" ${emailEnabled() && to ? '' : 'disabled'} style="padding:6px 12px;border-radius:6px;border:1px solid #2b2118;background:#fff;cursor:pointer">Enviármela ahora por email</button></form>${sent === '1' ? '<span>Enviada.</span>' : sent === '0' ? '<span style="color:#a12">No se ha podido enviar.</span>' : ''}</div>`;
  return page(email.html.replace(/(<body[^>]*>)/, `$1${bar}`));
};
export const POST: APIRoute = async ({ cookies, request, url, redirect }) => {
  if (!adminEnabled()) return new Response('Not found', { status: 404 });
  if (request.headers.get('origin') !== url.origin)
    return new Response('Forbidden', { status: 403 });
  if (!validSession(cookies.get(sessionCookie)?.value))
    return redirect('/gestio', 303);
  const form = await request.formData();
  const bake = await bakeById(String(form.get('bake') || ''));
  if (!bake) return page('<p>No existe esa hornada.</p>', 404);
  const to = sheetRecipient();
  let ok = false;
  if (emailEnabled() && to) {
    const { email } = buildSheet(await production(bake));
    ok = await sendSheet(to, email, `amasado-${bake.id}-panel-${Date.now()}`);
  }
  return redirect(
    `/gestio/amasado?bake=${encodeURIComponent(bake.id)}&sent=${ok ? 1 : 0}`,
    303,
  );
};
