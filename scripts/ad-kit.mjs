// Ready-to-upload ads for Meta (Instagram + Facebook): three concepts, in
// Catalan and Spanish, as a square feed image and a 9:16 story. Real photos
// only (never the AI-composed pairing scenes)
// and the site's fonts and colours. Output: exports/anuncis/*.png
//   node scripts/ad-kit.mjs
import { chromium } from 'playwright';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const root = pathToFileURL(process.cwd() + '/').href;
const font = (pkg, file) => `${root}node_modules/${pkg}/files/${file}`;
const photo = (name) => `${root}public/images/${name}-1600.webp`;
const towns = 'Sant Boi · Sant Just · Santa Coloma';
const concepts = [
  {
    id: 'porta',
    photo: 'hands',
    ca: {
      kicker: 'Pa artesà a domicili',
      title: 'El pa del dissabte, a la teva porta.',
      line: `Dimecres i dissabte, 12–14 h · ${towns}`,
      badge: '5 € la fogassa · sense enviament',
    },
    es: {
      kicker: 'Pan artesano a domicilio',
      title: 'El pan del sábado, en tu puerta.',
      line: `Miércoles y sábado, 12–14 h · ${towns}`,
      badge: '5 € la hogaza · envío gratis',
    },
  },
  {
    id: 'molla',
    photo: 'slice',
    ca: {
      kicker: 'Poolish · farina ecològica',
      title: '35 hores de fermentació. Es nota.',
      line: `Només fornejo el que es reserva · ${towns}`,
      badge: 'Pagues en rebre’l',
    },
    es: {
      kicker: 'Poolish · harina ecológica',
      title: '35 horas de fermentación. Se nota.',
      line: `Solo horneo lo que se reserva · ${towns}`,
      badge: 'Pagas al recibirlo',
    },
  },
  {
    id: 'esmorzar',
    photo: 'pastries',
    ca: {
      kicker: 'Brioixeria feta a mà',
      title: 'Croissants i pa acabats de fer, a casa.',
      line: `Dissabte, 12–14 h · ${towns}`,
      badge: 'Pa + croissant · 7,20 €',
    },
    es: {
      kicker: 'Bollería hecha a mano',
      title: 'Croissants y pan recién hechos, en casa.',
      line: `Sábado, 12–14 h · ${towns}`,
      badge: 'Pan + croissant · 7,20 €',
    },
  },
];
const html = (c, t, w, h) => `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:Bricolage;src:url(${font('@fontsource-variable/bricolage-grotesque', 'bricolage-grotesque-latin-wght-normal.woff2')});font-weight:200 800}
@font-face{font-family:Instrument;src:url(${font('@fontsource/instrument-sans', 'instrument-sans-latin-400-normal.woff2')});font-weight:400}
@font-face{font-family:Instrument;src:url(${font('@fontsource/instrument-sans', 'instrument-sans-latin-600-normal.woff2')});font-weight:600}
*{margin:0;box-sizing:border-box}
body{width:${w}px;height:${h}px;background:#1b3a9f;color:#f7f1e8;font-family:Instrument,sans-serif;display:flex;flex-direction:column;overflow:hidden}
.photo{flex:1;background:url(${photo(c.photo)}) center/cover;position:relative}
.logo{position:absolute;top:${h > w ? 90 : 44}px;left:56px;font-family:Bricolage;font-weight:800;font-size:64px;letter-spacing:-.03em;color:#f7f1e8;text-shadow:0 2px 24px rgba(0,0,0,.35)}
.badge{position:absolute;right:48px;bottom:-34px;background:#ff7a2e;color:#131b31;font-weight:600;font-size:30px;padding:18px 30px;border-radius:999px;transform:rotate(-3deg)}
.text{padding:${h > w ? '90px 64px 200px' : '60px 56px 52px'}}
.kicker{font-weight:600;font-size:26px;letter-spacing:.1em;text-transform:uppercase;opacity:.85}
h1{font-family:Bricolage;font-weight:800;font-size:${h > w ? 96 : 76}px;line-height:.98;letter-spacing:-.03em;margin:18px 0 22px}
.line{font-size:28px;opacity:.9}
.url{margin-top:${h > w ? 40 : 22}px;font-family:Bricolage;font-weight:700;font-size:32px;color:#ff7a2e}
</style></head><body>
<div class="photo"><div class="logo">molla.</div><div class="badge">${t.badge}</div></div>
<div class="text"><p class="kicker">${t.kicker}</p><h1>${t.title}</h1><p class="line">${t.line}</p><p class="url">mollapa.com</p></div>
</body></html>`;

await mkdir('exports/anuncis', { recursive: true });
const browser = await chromium.launch();
for (const [format, w, h] of [
  ['feed', 1080, 1080],
  ['story', 1080, 1920],
]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  for (const c of concepts)
    for (const lang of ['ca', 'es']) {
      // A file page may read the local photos and fonts; about:blank may not.
      await writeFile('exports/anuncis/.tmp.html', html(c, c[lang], w, h));
      await page.goto(`${root}exports/anuncis/.tmp.html`, {
        waitUntil: 'load',
      });
      await page.evaluate(() => document.fonts.ready);
      const file = `exports/anuncis/${c.id}-${lang}-${format}.png`;
      await page.screenshot({ path: file });
      console.log(file);
    }
  await page.close();
}
await browser.close();
await rm('exports/anuncis/.tmp.html', { force: true });
