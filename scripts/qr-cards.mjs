// Printable A6 cards with a QR to the delivery page (and, if set, the
// WhatsApp channel). One A4 page of four identical cards per campaign.
//   npm run qr -- --campaigns=entrega,santjust --out=exports/targetes-qr.pdf
//   WHATSAPP_CHANNEL_URL=https://whatsapp.com/channel/... npm run qr
// Every campaign becomes `utm_campaign`, so Vercel Analytics shows which
// card brings visits. Scan each QR with a phone before printing.
import { readFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import QRCode from 'qrcode';
import { chromium } from '@playwright/test';

const flags = Object.fromEntries(
  process.argv
    .slice(2)
    .filter((a) => a.startsWith('--'))
    .map((a) => a.slice(2).split('=')),
);
const site = (process.env.PUBLIC_SITE_URL || 'https://www.mollapa.com').replace(
  /\/$/,
  '',
);
const channel = flags.channel ?? process.env.WHATSAPP_CHANNEL_URL ?? '';
if (
  channel &&
  !/^https:\/\/(www\.)?whatsapp\.com\/channel\/[\w-]+$/.test(channel)
)
  throw new Error('El canal debe ser un enlace https://whatsapp.com/channel/…');
const campaigns = (flags.campaigns || 'entrega,santjust,santboi')
  .split(',')
  .map((c) => c.trim())
  .filter(Boolean);
const out = flags.out || 'exports/targetes-qr.pdf';

const font = async (path) =>
  `data:font/woff2;base64,${(await readFile(path)).toString('base64')}`;
const display = await font(
  'node_modules/@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-wdth-normal.woff2',
);
const body = await font(
  'node_modules/@fontsource/instrument-sans/files/instrument-sans-latin-400-normal.woff2',
);
const bodyBold = await font(
  'node_modules/@fontsource/instrument-sans/files/instrument-sans-latin-600-normal.woff2',
);

// Dark modules on white: the most reliable combination for phone cameras.
const qr = (url) =>
  QRCode.toString(url, {
    type: 'svg',
    margin: 0,
    errorCorrectionLevel: 'M',
    color: { dark: '#0f1a4a', light: '#ffffff' },
  });
const webUrl = (campaign) =>
  `${site}/pa-a-domicili?utm_source=qr&utm_campaign=${encodeURIComponent(campaign)}`;

const card = async (campaign) => `
<section class="card">
  <p class="mark">molla<span>.</span></p>
  <h1>Pa artesà a domicili, cada dissabte.</h1>
  <p class="when">De 12 a 14 h · Sant Boi, Sant Just Desvern i Santa Coloma de Cervelló</p>
  <div class="codes">
    <figure><div class="qr">${await qr(webUrl(campaign))}</div>
      <figcaption><strong>Reserva el teu pa</strong>mollapa.com/pa-a-domicili</figcaption></figure>
    ${
      channel
        ? `<figure><div class="qr">${await qr(channel)}</div>
      <figcaption><strong>Avís cada dilluns</strong>Canal de WhatsApp</figcaption></figure>`
        : ''
    }
  </div>
  <p class="foot">Farina ecològica · fins a 35 h de fermentació · es paga en rebre’l</p>
</section>`;

const pages = await Promise.all(
  campaigns.map(
    async (c) => `<div class="sheet">${(await card(c)).repeat(4)}</div>`,
  ),
);
const html = `<!doctype html><html lang="ca"><meta charset="utf-8"><style>
@font-face{font-family:D;src:url(${display}) format('woff2');font-weight:200 800;font-stretch:75% 100%}
@font-face{font-family:B;src:url(${body}) format('woff2');font-weight:400}
@font-face{font-family:B;src:url(${bodyBold}) format('woff2');font-weight:600}
@page{size:A4;margin:0}
*{box-sizing:border-box;margin:0}
body{font-family:B,Arial,sans-serif;color:#0f1a4a}
.sheet{width:210mm;height:297mm;display:grid;grid-template:1fr 1fr/1fr 1fr;page-break-after:always;
  background:linear-gradient(#0f1a4a33,#0f1a4a33) center/0.2mm 100% no-repeat,
  linear-gradient(#0f1a4a33,#0f1a4a33) center/100% 0.2mm no-repeat}
.card{padding:9mm 8mm 7mm;display:flex;flex-direction:column;background:#f3ecdf;border:0.2mm solid #fff0}
.mark{font:800 8mm/1 D;font-stretch:86%;color:#1f3fb0;letter-spacing:-.02em}
.mark span{color:#f26a1b}
h1{font:800 6.6mm/1.05 D;font-stretch:86%;letter-spacing:-.02em;margin-top:4mm}
.when{font-size:3.1mm;line-height:1.35;margin-top:2.5mm;color:#38426b}
.codes{display:flex;gap:6mm;margin-top:auto;align-items:flex-start;justify-content:flex-start}
figure{width:38mm}
.qr{background:#fff;padding:2.4mm;border-radius:2mm;width:38mm;height:38mm}
.qr svg{width:100%;height:100%;display:block}
figcaption{font-size:2.7mm;line-height:1.3;margin-top:1.8mm;color:#38426b}
figcaption strong{display:block;font-size:3.2mm;color:#1f3fb0}
.foot{font-size:2.5mm;margin-top:4mm;color:#38426b}
</style><body>${pages.join('')}</body></html>`;

await mkdir(dirname(out), { recursive: true });
let browser;
try {
  browser = await chromium.launch();
} catch {
  // Cloud sandboxes ship Chromium outside Playwright's default cache.
  browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium',
  });
}
const page = await browser.newPage();
await page.setContent(html, { waitUntil: 'load' });
await page.pdf({ path: out, format: 'A4', printBackground: true });
await browser.close();
console.log(
  `${out}: ${campaigns.length} pàgines (${campaigns.join(', ')})${channel ? ', amb QR del canal' : ', sense QR del canal (afegeix WHATSAPP_CHANNEL_URL)'}`,
);
