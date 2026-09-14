import { brand, launchReady } from '../lib/config';
import { routes, indexedRoutes } from '../lib/i18n';
const esc = (s: string) => s.replace(/[<>&"']/g, '');
export function GET() {
  const site = esc(brand.site).replace(/\/$/, '');
  const urls = launchReady
    ? indexedRoutes
        .map((key) => routes[key])
        .flatMap((r) =>
          (['ca', 'es'] as const).map(
            (lang) =>
              `<url><loc>${site}${r[lang]}</loc><changefreq>weekly</changefreq>` +
              `<xhtml:link rel="alternate" hreflang="es" href="${site}${r.es}"/>` +
              `<xhtml:link rel="alternate" hreflang="ca" href="${site}${r.ca}"/>` +
              `<xhtml:link rel="alternate" hreflang="x-default" href="${site}${r.ca}"/></url>`,
          ),
        )
        .join('')
    : '';
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${urls}</urlset>`,
    { headers: { 'Content-Type': 'application/xml' } },
  );
}
