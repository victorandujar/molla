// Generates brand PNGs (email wordmark and site icons) with the site's display
// font. Run after changing the brand: npm run brand
import { chromium } from '@playwright/test';
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
console.log('Brand assets generated.');
