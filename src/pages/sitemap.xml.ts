import { brand, launchReady } from '../lib/config';
export function GET() {
  const site = brand.site.replace(/[<>&"']/g, '');
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${launchReady ? `<url><loc>${site.replace(/\/$/, '')}/</loc></url>` : ''}</urlset>`,
    { headers: { 'Content-Type': 'application/xml' } },
  );
}
