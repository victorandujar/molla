import { brand, searchIndexable } from '../lib/config';
export function GET() {
  return new Response(
    searchIndexable
      ? `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /baja\nDisallow: /alta\nDisallow: /gestio\nSitemap: ${brand.site.replace(/\/$/, '')}/sitemap.xml\n`
      : 'User-agent: *\nDisallow: /\n',
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  );
}
