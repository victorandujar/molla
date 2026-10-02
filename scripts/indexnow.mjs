const site = (process.env.PUBLIC_SITE_URL || 'https://www.mollapa.com').replace(
  /\/$/,
  '',
);
const key = '757514f9ea6889612f643c64df6eb961';
const sitemap = await fetch(`${site}/sitemap.xml`);
if (!sitemap.ok) throw new Error(`Sitemap unavailable: ${sitemap.status}`);
const xml = await sitemap.text();
const urlList = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
if (!urlList.length) throw new Error('The sitemap contains no URLs');
const response = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'content-type': 'application/json; charset=utf-8' },
  body: JSON.stringify({
    host: new URL(site).host,
    key,
    keyLocation: `${site}/${key}.txt`,
    urlList,
  }),
});
if (!response.ok)
  throw new Error(`IndexNow rejected the URLs: ${response.status}`);
console.log(`IndexNow accepted ${urlList.length} URLs from ${site}`);
