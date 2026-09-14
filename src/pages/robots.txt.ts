import { brand, launchReady } from '../lib/config';
export function GET() {
  return new Response(
    launchReady
      ? `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /baja\nDisallow: /alta\nDisallow: /gestio\nSitemap: ${brand.site.replace(/\/$/, '')}/sitemap.xml\n`
      : 'User-agent: *\nDisallow: /\n',
    { headers: { 'Content-Type': 'text/plain' } },
  );
}
