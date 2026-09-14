import { defineMiddleware } from 'astro:middleware';
// Public pages are the same for everyone: the CDN serves them for a minute
// and revalidates in the background, so a traffic spike does not reach the
// database. Availability is refreshed by the page from /api/bake.
const cacheable = new Set([
  '/',
  '/es',
  '/es/',
  '/recollida',
  '/es/recogida',
  '/privacidad',
  '/privacitat',
  '/robots.txt',
  '/sitemap.xml',
]);
const csp = [
  "default-src 'self'",
  // Vercel's toolbar only on Preview deployments.
  `script-src 'self'${process.env.VERCEL_ENV === 'preview' ? ' https://vercel.live' : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');
export const onRequest = defineMiddleware(async (ctx, next) => {
  const response = await next();
  const shared =
    !import.meta.env.DEV &&
    ctx.request.method === 'GET' &&
    response.status === 200 &&
    cacheable.has(ctx.url.pathname) &&
    !response.headers.has('set-cookie');
  response.headers.set(
    'Cache-Control',
    shared
      ? 'public, max-age=0, s-maxage=60, stale-while-revalidate=600'
      : 'no-store',
  );
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()',
  );
  // Dev relies on inline scripts injected by Vite.
  if (!import.meta.env.DEV)
    response.headers.set('Content-Security-Policy', csp);
  return response;
});
