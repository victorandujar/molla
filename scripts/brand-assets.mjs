// Generates brand PNGs (email wordmark, site icons) with the site's display
// font, plus the static pickup map for emails from OpenStreetMap tiles.
// Run once after changing the brand or the pickup point: npm run brand
import { chromium } from '@playwright/test';
import sharp from 'sharp';
import { mkdir, readFile } from 'node:fs/promises';

const tile = '#1b3a9f';
const crumb = '#f7f1e8';
const font = await readFile(
  'node_modules/@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-standard-normal.woff2',
);
const face = `@font-face{font-family:B;src:url(data:font/woff2;base64,${font.toString('base64')}) format('woff2');font-weight:200 800;font-stretch:75% 100%}`;
// Same settings as .wordmark in src/styles/global.css.
const mark = `font-family:B;font-weight:800;font-stretch:84%;letter-spacing:-0.04em;line-height:1`;

await mkdir('public/email', { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
async function render(html, path, selector = '#x', transparent = false) {
  await page.setContent(`<style>${face}body{margin:0}</style>${html}`);
  await page.evaluate(() => document.fonts.ready);
  await page
    .locator(selector)
    .screenshot({ path, omitBackground: transparent });
}

// Email header wordmark: 3x of 120×40, cream on transparent.
await render(
  `<div id="x" style="width:360px;height:120px;display:flex;align-items:center;"><span style="${mark};font-size:112px;color:${crumb};transform:translateY(-4px)">molla.</span></div>`,
  'public/email/molla-crema.png',
  '#x',
  true,
);

// Square icon: "m." on tile blue, matching the Instagram export.
for (const [size, path] of [
  [512, 'public/icon-512.png'],
  [180, 'public/apple-touch-icon.png'],
  [48, 'public/favicon-48.png'],
]) {
  await render(
    `<div id="x" style="width:${size}px;height:${size}px;background:${tile};display:flex;align-items:center;justify-content:center;"><span style="${mark};font-size:${size * 0.62}px;color:${crumb};transform:translate(${size * 0.02}px,-${size * 0.05}px)">m.</span></div>`,
    path,
  );
}
await browser.close();

// Static map: zoom 17 tiles rendered at 1040×520 (shown at 520×260 in email).
const lat = 41.35401410971224;
const lon = 2.026792459636187;
const zoom = 17;
const width = 1040;
const height = 520;
const scale = 2 ** zoom * 256;
const px = ((lon + 180) / 360) * scale;
const rad = (lat * Math.PI) / 180;
const py =
  ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * scale;
const left = Math.round(px - width / 2);
const top = Math.round(py - height / 2);
const tiles = [];
for (let tx = Math.floor(left / 256); tx <= Math.floor((left + width) / 256); tx++)
  for (let ty = Math.floor(top / 256); ty <= Math.floor((top + height) / 256); ty++) {
    const res = await fetch(`https://tile.openstreetmap.org/${zoom}/${tx}/${ty}.png`, {
      headers: { 'User-Agent': 'molla-brand-assets/1.0 (hola@mollapa.com)' },
    });
    if (!res.ok) throw new Error(`Tile ${tx}/${ty}: ${res.status}`);
    tiles.push({
      input: Buffer.from(await res.arrayBuffer()),
      left: tx * 256 - left,
      top: ty * 256 - top,
    });
  }
const canvasW = width + 512;
const canvasH = height + 512;
// sharp crops before compositing within one pipeline, so stitch first.
const stitched = await sharp({
  create: { width: canvasW, height: canvasH, channels: 3, background: crumb },
})
  .composite(tiles.map((t) => ({ ...t, left: t.left + 256, top: t.top + 256 })))
  .png()
  .toBuffer();
const base = await sharp(stitched)
  .extract({ left: 256, top: 256, width, height })
  .modulate({ saturation: 0.35, brightness: 1.03 })
  .tint({ r: 247, g: 241, b: 232 })
  .png()
  .toBuffer();
const pin = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <ellipse cx="${width / 2}" cy="${height / 2 + 4}" rx="22" ry="8" fill="rgba(19,27,49,.25)"/>
  <path transform="translate(${width / 2 - 34} ${height / 2 - 92})" d="M34 0C15.2 0 0 15.2 0 34c0 25.5 34 58 34 58s34-32.5 34-58C68 15.2 52.8 0 34 0z" fill="${tile}" stroke="${crumb}" stroke-width="5"/>
  <circle cx="${width / 2}" cy="${height / 2 - 58}" r="12" fill="${crumb}"/>
  <rect x="${width - 330}" y="${height - 40}" width="318" height="30" rx="6" fill="rgba(247,241,232,.9)"/>
  <text x="${width - 171}" y="${height - 19}" font-family="Helvetica, Arial, sans-serif" font-size="17" fill="#545b6c" text-anchor="middle">© OpenStreetMap contributors</text>
</svg>`);
await sharp(base)
  .composite([{ input: pin }])
  .png({ compressionLevel: 9, palette: true, quality: 90 })
  .toFile('public/email/mapa-recogida.png');
console.log('Brand assets generated.');
