// Ready-to-upload ads for Meta (Instagram + Facebook) in the language of the
// printed flyers: mono labels between rules, a huge condensed headline,
// "(FIG. n)" captions, an outlined price, numbered steps and the crumb print
// with its text border. Five concepts, Catalan and Spanish, 4:5 feed and 9:16
// story. Real photos only (never the AI-composed pairing scenes).
//   npm run ads  →  exports/anuncis/*.png
import { chromium } from 'playwright';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const root = pathToFileURL(process.cwd() + '/').href;
const out = 'exports/anuncis';
const font = (pkg, file) => `${root}node_modules/${pkg}/files/${file}`;
// The largest WebP variant of a site photo (not every photo has 1600 px).
const images = await readdir('public/images');
const photo = (name) => {
  const sizes = images
    .map((f) => new RegExp(`^${name}-(\\d+)\\.webp$`).exec(f)?.[1])
    .filter(Boolean)
    .map(Number);
  if (!sizes.length) throw new Error(`No photo ${name}`);
  return `${root}public/images/${name}-${Math.max(...sizes)}.webp`;
};
const crumb = JSON.parse(await readFile('src/assets/crumb.json', 'utf8'));

// Colours of the site (src/styles/global.css).
const paper = '#f6efe5';
const cobalt = '#2442a4';
const orange = '#fe7b29';
const ink = '#121a45';

// Same facts as the site: src/lib/delivery.ts, config.ts and domain.ts.
const copy = {
  ca: {
    craft: 'Pa artesà per encàrrec',
    region: 'Baix Llobregat',
    steps: [
      ['Reserva', 'A mollapa.com. Tanca dilluns i dijous, 20 h.'],
      [
        'Entrega',
        'Gratuïta. Dimecres i dissabte, 12–14 h. Sant Boi, Sant Just, Sant Joan Despí, Sant Feliu, Santa Coloma, Sant Vicenç.',
      ],
      ['A taula', 'Pagues quan el reps, en mà.'],
    ],
    stepsShort: [
      'Reserva a mollapa.com · tanca dilluns i dijous a les 20 h',
      'Entrega gratuïta dimecres i dissabte, 12–14 h · Sant Boi, Sant Just, Sant Joan Despí, Sant Feliu, Santa Coloma i Sant Vicenç',
      'Pagues quan el reps',
    ],
    encarrec: {
      fig: '(Fig. 1) Pa de molla, tallat per la meitat',
      figRight: 'Fermentat fins a 35 h',
      pre: 'Fet a mà.',
      title: ['Pa per', 'encàrrec.'],
    },
    facil: {
      label: 'Nº 02 · Com funciona',
      title: ['Així de', 'fàcil.'],
      aside: ['Tres passes', 'sense targeta', 'ni compte'],
      fig: '(Fig. 2) Croissant i pain au chocolat',
      figRight: '2,20 € · 2,50 €',
    },
    hores: {
      border: 'Molla • Pa artesà • Fins a 35 h de fermentació • Baix Llobregat',
      fig: '(Fig. 3) La molla',
      unit: 'hores',
      title: 'De fermentació. Es nota.',
      text: 'Poolish i farina ecològica. Només fornejo el que es reserva: cada fogassa té el temps que necessita.',
    },
    obrador: {
      label: 'Nº 04 · L’obrador',
      fig: '(Fig. 4) A l’obrador, Sant Boi de Llobregat',
      figRight: 'Fet a mà',
      title: ['Fet per', 'algú del', 'barri.'],
      text: 'Pa, banana bread i brioixeria per encàrrec. Te’ls porto a casa dimecres i dissabte.',
    },
    carta: {
      label: 'Nº 05 · La carta',
      title: ['La', 'carta.'],
      items: [
        ['Pa de poolish', '750–850 g', '5,00'],
        ['Croissant', 'La unitat', '2,20'],
        ['Pain au chocolat', 'La unitat', '2,50'],
        ['Banana bread', 'Sencer · mig', '15 · 8'],
      ],
      fig: '(Fig. 5) Banana bread de gotes de xocolata',
      note: 'Entrega gratuïta dimecres i dissabte · Pagues en rebre-ho',
    },
    handle: '@molla.baixllobregat',
    phone: '649 90 79 12',
    towns: ['Sant Boi', 'Sant Just', 'Sant Joan Despí', 'Sant Feliu', 'Santa Coloma', 'Sant Vicenç'],
    porta: {
      label: 'Nº 06 · A domicili',
      title: ['Acabat', 'de fer,'],
      accent: ['a la porta', 'de casa.'],
      days: 'Dimecres i dissabte · 12–14 h',
      price: 'el pa · 750–850 g',
      pay: 'Pagues en rebre’l · Enviament gratuït',
      fig: '(Fig. 6) Dues fogasses del matí',
    },
    veins: {
      label: 'Nº 07 · Ressenyes',
      title: ['Ho diuen', 'els veïns.'],
      source: 'Ressenya a Google',
      count: '7 ressenyes a Google',
      fig: '(Fig. 7) La molla, oberta',
    },
    whatsapp: {
      label: 'Nº 08 · Per WhatsApp',
      title: ['Escriu-me.', 'Te’l porto.'],
      ask: 'Hola! Vull 1 pa i 2 croissants per dissabte 🙂',
      reply: 'Fet! Dissabte entre les 12 i les 14 h te’ls porto. Són 9,40 € i pagues en rebre’ls.',
      who: 'Víctor · Molla',
      cta: 'Escriu-me al',
      fig: '(Fig. 8) Recent sortit del forn',
    },
  },
  es: {
    craft: 'Pan artesano por encargo',
    region: 'Baix Llobregat',
    steps: [
      ['Reserva', 'En mollapa.com. Cierra lunes y jueves, 20 h.'],
      [
        'Entrega',
        'Gratis. Miércoles y sábado, 12–14 h. Sant Boi, Sant Just, Sant Joan Despí, Sant Feliu, Santa Coloma, Sant Vicenç.',
      ],
      ['A la mesa', 'Pagas al recibirlo, en mano.'],
    ],
    stepsShort: [
      'Reserva en mollapa.com · cierra lunes y jueves a las 20 h',
      'Entrega gratis miércoles y sábado, 12–14 h · Sant Boi, Sant Just, Sant Joan Despí, Sant Feliu, Santa Coloma y Sant Vicenç',
      'Pagas al recibirlo',
    ],
    encarrec: {
      fig: '(Fig. 1) Pan de miga, partido por la mitad',
      figRight: 'Fermentado hasta 35 h',
      pre: 'Hecho a mano.',
      title: ['Pan por', 'encargo.'],
    },
    facil: {
      label: 'Nº 02 · Cómo funciona',
      title: ['Así de', 'fácil.'],
      aside: ['Tres pasos', 'sin tarjeta', 'ni cuenta'],
      fig: '(Fig. 2) Croissant y pain au chocolat',
      figRight: '2,20 € · 2,50 €',
    },
    hores: {
      border:
        'Molla • Pan artesano • Hasta 35 h de fermentación • Baix Llobregat',
      fig: '(Fig. 3) La miga',
      unit: 'horas',
      title: 'De fermentación. Se nota.',
      text: 'Poolish y harina ecológica. Solo horneo lo que se reserva: cada hogaza tiene el tiempo que necesita.',
    },
    obrador: {
      label: 'Nº 04 · El obrador',
      fig: '(Fig. 4) En el obrador, Sant Boi de Llobregat',
      figRight: 'Hecho a mano',
      title: ['Hecho por', 'alguien del', 'barrio.'],
      text: 'Pan, banana bread y bollería por encargo. Te lo llevo a casa el miércoles y el sábado.',
    },
    carta: {
      label: 'Nº 05 · La carta',
      title: ['La', 'carta.'],
      items: [
        ['Pan de poolish', '750–850 g', '5,00'],
        ['Croissant', 'La unidad', '2,20'],
        ['Pain au chocolat', 'La unidad', '2,50'],
        ['Banana bread', 'Entero · mitad', '15 · 8'],
      ],
      fig: '(Fig. 5) Banana bread de pepitas de chocolate',
      note: 'Entrega gratis miércoles y sábado · Pagas al recibirlo',
    },
    handle: '@molla.baixllobregat',
    phone: '649 90 79 12',
    towns: ['Sant Boi', 'Sant Just', 'Sant Joan Despí', 'Sant Feliu', 'Santa Coloma', 'Sant Vicenç'],
    porta: {
      label: 'Nº 06 · A domicilio',
      title: ['Recién', 'hecho,'],
      accent: ['en tu', 'puerta.'],
      days: 'Miércoles y sábado · 12–14 h',
      price: 'la hogaza · 750–850 g',
      pay: 'Pagas al recibirlo · Envío gratis',
      fig: '(Fig. 6) Dos hogazas de la mañana',
    },
    veins: {
      label: 'Nº 07 · Reseñas',
      title: ['Lo dicen', 'los vecinos.'],
      source: 'Reseña en Google',
      count: '7 reseñas en Google',
      fig: '(Fig. 7) La miga, abierta',
    },
    whatsapp: {
      label: 'Nº 08 · Por WhatsApp',
      title: ['Escríbeme.', 'Te lo llevo.'],
      ask: '¡Hola! Quiero 1 pan y 2 croissants para el sábado 🙂',
      reply: '¡Hecho! El sábado entre las 12 y las 14 h te los llevo. Son 9,40 € y pagas al recibirlos.',
      who: 'Víctor · Molla',
      cta: 'Escríbeme al',
      fig: '(Fig. 8) Recién salido del horno',
    },
  },
};
// Real Google reviews, verbatim (src/lib/config.ts → googleReviews).
const reviews = [
  { text: 'TOTALMENTE ESPECTACULAR', author: 'Carlos M.' },
  { text: 'Crujiente por fuera y una buena molla por dentro.', author: 'David L.' },
];

// The crumb print: cobalt dough, each alveolus a paper-coloured hole.
const crumbSvg = (cls = '') =>
  `<svg class="${cls}" viewBox="0 0 ${crumb.w} ${crumb.h}" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="${crumb.w}" height="${crumb.h}" fill="${cobalt}"/><g fill="${paper}">${crumb.holes.map((h) => `<path d="${h.d}"/>`).join('')}</g></svg>`;

const css = (f) => `
@font-face{font-family:Archivo;src:url(${font('@fontsource-variable/archivo', 'archivo-latin-wdth-normal.woff2')});font-weight:100 900;font-stretch:62% 125%}
@font-face{font-family:Bricolage;src:url(${font('@fontsource-variable/bricolage-grotesque', 'bricolage-grotesque-latin-wght-normal.woff2')});font-weight:200 800}
@font-face{font-family:Mono;src:url(${font('@fontsource/space-mono', 'space-mono-latin-400-normal.woff2')});font-weight:400}
@font-face{font-family:Mono;src:url(${font('@fontsource/space-mono', 'space-mono-latin-700-normal.woff2')});font-weight:700}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1080px;height:${f.h}px;overflow:hidden}
body{font-family:Archivo,sans-serif;-webkit-font-smoothing:antialiased;position:relative}
.paper{background:${paper};color:${cobalt}}
.cobalt{background:${cobalt};color:${paper}}
.wrap{position:absolute;inset:${f.top}px 64px ${f.bottom}px;display:flex;flex-direction:column}
.mono{font-family:Mono,monospace;text-transform:uppercase;letter-spacing:.16em;font-size:22px;line-height:1.5}
.bar{display:flex;justify-content:space-between;align-items:flex-end;gap:24px;padding-bottom:14px;border-bottom:2px solid currentColor}
.rule{border-top:2px solid currentColor}
.orange-rule{border-top:3px solid ${orange}}
.cond{font-family:Archivo;font-stretch:62%;font-weight:800;text-transform:uppercase;line-height:.93;letter-spacing:-.01em}
.word{font-family:Bricolage;font-weight:800;letter-spacing:-.055em;line-height:1}
.brico{font-family:Bricolage;font-weight:800;letter-spacing:-.035em;line-height:1}
.outline{color:transparent;-webkit-text-stroke:3px currentColor}
.photo{background-size:cover;background-position:center;position:relative}
.num{color:${orange};font-family:Mono;font-weight:700;font-size:26px}
.fill{flex:1}
`;

// ---- Concepts --------------------------------------------------------------

// 1 · Like the cobalt flyer: crumb photo, orange headline, outlined price.
const encarrec = (t, f) => `<body class="cobalt"><div class="wrap">
  <div class="bar mono"><span>${t.craft}</span><span>${t.region}</span></div>
  <div class="photo fill" style="margin:28px -64px 0;background-image:url(${photo('crumb2')});background-position:center 40%">
    <span class="word" style="position:absolute;left:64px;bottom:34px;font-size:104px;color:${paper};text-shadow:0 2px 6px rgba(18,26,69,.45),0 6px 40px rgba(18,26,69,.55)">molla.</span>
  </div>
  <div class="bar mono" style="margin-top:22px;font-size:19px;border-bottom:3px solid ${orange}"><span>${t.encarrec.fig}</span><span>${t.encarrec.figRight}</span></div>
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-top:30px">
    <div>
      <p class="cond" style="font-size:${f.story ? 92 : 78}px;color:${paper}">${t.encarrec.pre}</p>
      <p class="cond" style="font-size:${f.story ? 180 : 168}px;color:${orange};margin-top:18px">${t.encarrec.title.join('<br>')}</p>
    </div>
    <div style="text-align:right;margin-top:6px;flex:none">
      <p class="brico outline" style="font-size:${f.story ? 180 : 196}px;-webkit-text-stroke:3px ${paper};letter-spacing:-.06em">5€</p>
      <p class="mono" style="margin-top:8px">750–850 g</p>
    </div>
  </div>
  <div class="rule mono" style="margin-top:30px;padding-top:18px;font-size:19px;opacity:.95">
    ${t.stepsShort.map((s, i) => `<p style="display:flex;gap:16px"><span>0${i + 1}</span><span>·</span><span>${s}</span></p>`).join('')}
  </div>
</div></body>`;

// 2 · Like the paper flyer: «Així de fàcil», three steps, photo band.
const facil = (t, f) => `<body class="paper"><div class="wrap">
  <div class="bar mono"><span>${t.facil.label}</span><span>mollapa.com</span></div>
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-top:30px">
    <p class="cond" style="font-size:${f.story ? 236 : 210}px">${t.facil.title.join('<br>')}</p>
    <p class="mono" style="text-align:right;font-size:28px;line-height:1.75;margin-top:24px">${t.facil.aside.join('<br>')}</p>
  </div>
  <div style="margin-top:34px">
    ${t.steps
      .map(
        (
          [h, d],
          i,
        ) => `<div class="rule" style="display:grid;grid-template-columns:80px 1fr 400px;align-items:center;padding:${f.story ? 30 : 20}px 0">
      <span class="num">0${i + 1}</span>
      <span class="brico" style="font-size:${f.story ? 88 : 80}px">${h}</span>
      <span class="mono" style="font-size:19px;letter-spacing:.12em">${d}</span>
    </div>`,
      )
      .join('')}
    <div class="rule"></div>
  </div>
  <div class="photo fill" style="margin:30px -64px 0;background-image:url(${photo('pastries')});background-position:center 55%"></div>
  <div class="bar mono" style="border:0;padding:18px 0 0;font-size:19px"><span>${t.facil.fig}</span><strong>${t.facil.figRight}</strong></div>
  <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:26px">
    <span class="word" style="font-size:76px">molla.</span>
    <span class="mono" style="font-size:18px">${t.handle} · mollapa.com</span>
  </div>
</div></body>`;

// 3 · The crumb print with its text border and a paper card: «35 h».
const hores = (t, f) => {
  // The frame of the crumb print, inset like the printed wrapping paper.
  const inset = { x: 70, y: f.story ? 150 : 70 };
  const w = 1080 - 2 * inset.x;
  const h = f.h - 2 * inset.y;
  const line = `• ${Array(6).fill(t.hores.border).join(' • ')}`;
  const edge = (style) =>
    `<div class="edge" style="${style}"><span>${line}</span></div>`;
  return `<body class="paper">
  ${crumbSvg('field')}
  <style>
    .field{position:absolute;left:${inset.x}px;top:${inset.y}px;width:${w}px;height:${h}px}
    .frame{position:absolute;left:${inset.x - 22}px;top:${inset.y - 22}px;width:${w + 44}px;height:${h + 44}px;border:2px solid ${cobalt}}
    .edge{position:absolute;overflow:hidden;display:flex;justify-content:flex-start;align-items:center;height:30px;font-family:Mono;font-weight:700;font-size:14px;letter-spacing:.2em;text-transform:uppercase;white-space:nowrap;color:${cobalt}}
  </style>
  <div class="frame"></div>
  ${edge(`left:${inset.x}px;width:${w}px;top:${inset.y - 56}px`)}
  ${edge(`left:${inset.x}px;width:${w}px;top:${inset.y + h + 26}px`)}
  ${edge(`left:${inset.x - 56 - h / 2 + 15}px;top:${inset.y + h / 2 - 15}px;width:${h}px;transform:rotate(-90deg)`)}
  ${edge(`left:${inset.x + w + 26 - h / 2 + 15}px;top:${inset.y + h / 2 - 15}px;width:${h}px;transform:rotate(90deg)`)}
  <div style="position:absolute;left:140px;right:140px;top:50%;transform:translateY(-50%);background:${paper};color:${cobalt};padding:44px 52px 48px;box-shadow:0 0 0 2px ${cobalt}">
    <div class="bar mono" style="font-size:19px"><span>${t.hores.fig}</span><span>Poolish</span></div>
    <div style="display:flex;align-items:flex-end;gap:22px;margin-top:22px">
      <span class="cond" style="font-size:330px;line-height:.78">35</span>
      <span class="cond outline" style="font-size:150px;line-height:.8;-webkit-text-stroke:3px ${cobalt}">${t.hores.unit}</span>
    </div>
    <p class="brico" style="font-size:62px;margin-top:26px;color:${ink}">${t.hores.title}</p>
    <p style="font-size:27px;line-height:1.4;margin-top:18px;color:${ink};opacity:.85">${t.hores.text}</p>
    <div class="orange-rule" style="margin-top:28px;padding-top:18px;display:flex;justify-content:space-between;align-items:center">
      <span class="word" style="font-size:58px">molla.</span>
      <span class="mono" style="font-size:20px;font-weight:700;color:${orange}">mollapa.com</span>
    </div>
  </div>
</body>`;
};

// 4 · The person behind the bread.
const obrador = (t, f) => `<body class="cobalt">
  <div class="photo" style="position:absolute;inset:0;background-image:url(${photo('maker')});background-position:60% 30%"></div>
  <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(15,29,85,.55) 0%,rgba(15,29,85,0) 22%,rgba(15,29,85,0) 40%,rgba(15,29,85,.92) 70%)"></div>
  <div class="wrap">
    <div class="bar mono"><span>${t.obrador.label}</span><span>${t.region}</span></div>
    <div class="fill"></div>
    <div class="bar mono" style="font-size:19px;border-bottom:3px solid ${orange}"><span>${t.obrador.fig}</span><span>${t.obrador.figRight}</span></div>
    <p class="cond" style="font-size:${f.story ? 190 : 160}px;margin-top:28px;color:${paper}">${t.obrador.title.slice(0, -1).join('<br>')}<br><span style="color:${orange}">${t.obrador.title.at(-1)}</span></p>
    <p style="font-size:30px;line-height:1.4;margin-top:24px;max-width:820px;color:${paper}">${t.obrador.text}</p>
    <div class="rule" style="margin-top:28px;padding-top:18px;display:flex;justify-content:space-between;align-items:center">
      <span class="word" style="font-size:66px;color:${paper}">molla.</span>
      <span class="mono" style="font-size:20px">mollapa.com</span>
    </div>
  </div>
</body>`;

// 5 · The menu, with leader dots and prices.
const carta = (t, f) => `<body class="paper"><div class="wrap">
  <div class="bar mono"><span>${t.carta.label}</span><span>mollapa.com</span></div>
  <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:30px">
    <p class="cond" style="font-size:${f.story ? 236 : 200}px">${t.carta.title.join('<br>')}</p>
    <p class="brico outline" style="font-size:150px;-webkit-text-stroke:3px ${orange};letter-spacing:-.06em;margin-bottom:-6px">€</p>
  </div>
  <div style="margin-top:30px">
    ${t.carta.items
      .map(
        ([
          name,
          detail,
          price,
        ]) => `<div class="rule" style="display:flex;align-items:baseline;gap:18px;padding:${f.story ? 30 : 20}px 0">
      <span class="brico" style="font-size:${f.story ? 58 : 52}px;white-space:nowrap">${name}</span>
      <span class="mono" style="font-size:18px;white-space:nowrap">${detail}</span>
      <span style="flex:1;border-bottom:3px dotted ${cobalt};opacity:.5;transform:translateY(-8px)"></span>
      <span class="brico" style="font-size:${f.story ? 58 : 52}px;color:${orange};white-space:nowrap">${price} €</span>
    </div>`,
      )
      .join('')}
    <div class="rule"></div>
  </div>
  <div class="photo fill" style="margin:30px -64px 0;background-image:url(${photo('bananaDetail')})"></div>
  <div class="bar mono" style="border:0;padding:18px 0 0;font-size:19px"><span>${t.carta.fig}</span></div>
  <div style="margin-top:18px;border:3px solid ${orange};padding:16px 22px" class="mono"><span style="font-size:19px">${t.carta.note}</span></div>
  <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:24px">
    <span class="word" style="font-size:76px">molla.</span>
    <span class="mono" style="font-size:18px">${t.handle}</span>
  </div>
</div></body>`;

// 6 · The benefit first: fresh bread at the door, the price and the towns.
const porta = (t, f) => `<body class="cobalt"><div class="wrap">
  <div class="bar mono"><span>${t.porta.label}</span><span>${t.region}</span></div>
  <p class="cond" style="font-size:${f.story ? 170 : 150}px;margin-top:30px;color:${paper}">${t.porta.title.join('<br>')}</p>
  <p class="cond" style="font-size:${f.story ? 170 : 150}px;color:${orange}">${t.porta.accent.join('<br>')}</p>
  <div class="photo fill" style="margin:30px -64px 0;background-image:url(${photo('loaves')});background-position:center 45%">
    <div style="position:absolute;right:64px;bottom:30px;background:${paper};color:${cobalt};padding:16px 26px 18px;text-align:right">
      <p class="brico" style="font-size:118px;letter-spacing:-.06em">5 €</p>
      <p class="mono" style="font-size:18px;margin-top:4px">${t.porta.price}</p>
    </div>
  </div>
  <div class="bar mono" style="margin-top:20px;font-size:19px;border-bottom:3px solid ${orange}"><span>${t.porta.fig}</span><span>${t.porta.days}</span></div>
  <p class="mono" style="margin-top:20px;font-size:21px;line-height:1.7">${t.towns.join(' · ')}</p>
  <div class="rule" style="margin-top:20px;padding-top:18px;display:flex;justify-content:space-between;align-items:center">
    <span class="word" style="font-size:66px;color:${paper}">molla.</span>
    <span class="mono" style="font-size:19px;text-align:right">${t.porta.pay}</span>
  </div>
</div></body>`;

// 7 · Social proof: 5/5 on Google and two real reviews over the crumb.
const veins = (t, f) => `<body class="paper"><div class="wrap">
  <div class="bar mono"><span>${t.veins.label}</span><span>mollapa.com</span></div>
  <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:30px">
    <p class="cond" style="font-size:${f.story ? 170 : 150}px">${t.veins.title.join('<br>')}</p>
    <div style="text-align:right;flex:none">
      <p class="brico outline" style="font-size:150px;-webkit-text-stroke:3px ${orange};letter-spacing:-.06em">5/5</p>
      <p style="font-size:40px;letter-spacing:.08em;color:${orange};margin-top:-6px">★★★★★</p>
    </div>
  </div>
  <div class="photo fill" style="margin:30px -64px 0;background-image:url(${photo('crumb')});background-position:center 60%">
    <div style="position:absolute;left:64px;right:64px;bottom:34px;display:grid;gap:16px">
      ${reviews
        .map(
          (r) => `<div style="background:${paper};color:${ink};padding:20px 26px;box-shadow:0 0 0 2px ${cobalt}">
        <p class="brico" style="font-size:${f.story ? 50 : 44}px;color:${cobalt}">“${r.text}”</p>
        <p class="mono" style="font-size:17px;margin-top:10px">${r.author} · ${t.veins.source}</p>
      </div>`,
        )
        .join('')}
    </div>
  </div>
  <div class="bar mono" style="border:0;padding:18px 0 0;font-size:19px"><span>${t.veins.fig}</span><strong>${t.veins.count}</strong></div>
  <div class="orange-rule" style="margin-top:18px;padding-top:16px;display:flex;justify-content:space-between;align-items:center">
    <span class="word" style="font-size:72px">molla.</span>
    <span class="mono" style="font-size:18px">${t.handle} · mollapa.com</span>
  </div>
</div></body>`;

// 8 · For the click-to-WhatsApp campaign: a sample order chat over the baker.
const whatsapp = (t, f) => `<body class="cobalt">
  <div class="photo" style="position:absolute;inset:0;background-image:url(${photo('smell')});background-position:62% 25%"></div>
  <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(15,29,85,.6) 0%,rgba(15,29,85,.05) 24%,rgba(15,29,85,.15) 40%,rgba(15,29,85,.94) 66%)"></div>
  <div class="wrap">
    <div class="bar mono"><span>${t.whatsapp.label}</span><span>${t.region}</span></div>
    <div class="fill"></div>
    <div style="display:grid;gap:14px;margin-bottom:28px">
      <p style="justify-self:end;max-width:720px;background:${paper};color:${ink};font-size:${f.story ? 34 : 31}px;line-height:1.35;padding:18px 24px;border-radius:22px 22px 4px 22px">${t.whatsapp.ask}</p>
      <div style="justify-self:start;max-width:780px;background:${orange};color:${ink};padding:18px 24px;border-radius:22px 22px 22px 4px">
        <p class="mono" style="font-size:16px;font-weight:700">${t.whatsapp.who}</p>
        <p style="font-size:${f.story ? 34 : 31}px;line-height:1.35;margin-top:6px">${t.whatsapp.reply}</p>
      </div>
    </div>
    <div class="bar mono" style="font-size:19px;border-bottom:3px solid ${orange}"><span>${t.whatsapp.fig}</span><span>${t.porta.days}</span></div>
    <p class="cond" style="font-size:${f.story ? 168 : 146}px;margin-top:24px;color:${paper}">${t.whatsapp.title[0]}<br><span style="color:${orange}">${t.whatsapp.title[1]}</span></p>
    <div class="rule" style="margin-top:24px;padding-top:18px;display:flex;justify-content:space-between;align-items:center">
      <span class="word" style="font-size:66px;color:${paper}">molla.</span>
      <span class="mono" style="font-size:21px;text-align:right">${t.whatsapp.cta}<br><strong style="font-size:30px;color:${orange}">${t.phone}</strong></span>
    </div>
  </div>
</body>`;

const concepts = { encarrec, facil, hores, obrador, carta, porta, veins, whatsapp };
// Stories: Instagram covers the top and bottom bands with its own UI, so
// they carry only the crumb print, never text.
const bands = (f) =>
  `<div style="position:absolute;left:0;right:0;top:0;height:${f.top - 60}px;overflow:hidden">${crumbSvg('band')}</div>
  <div style="position:absolute;left:0;right:0;bottom:0;height:${f.bottom - 80}px;overflow:hidden">${crumbSvg('band')}</div>
  <style>.band{width:100%;height:100%;display:block}</style>`;
const withBands = ['encarrec', 'facil', 'carta', 'porta', 'veins'];
// Stories keep the top ~250 px and bottom ~300 px clear of Instagram's UI.
const formats = {
  feed: { w: 1080, h: 1350, top: 64, bottom: 60, story: false },
  story: { w: 1080, h: 1920, top: 220, bottom: 300, story: true },
};

await mkdir(out, { recursive: true });
const browser = await chromium.launch();
for (const [name, f] of Object.entries(formats)) {
  const page = await browser.newPage({ viewport: { width: f.w, height: f.h } });
  for (const [id, render] of Object.entries(concepts))
    for (const lang of ['ca', 'es']) {
      let page_ = render(copy[lang], f);
      if (f.story && withBands.includes(id))
        page_ = page_.replace('</body>', `${bands(f)}</body>`);
      const html = `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><style>${css(f)}</style></head>${page_}</html>`;
      // A file page may read the local photos and fonts; about:blank may not.
      await writeFile(`${out}/.tmp.html`, html);
      await page.goto(`${root}${out}/.tmp.html`, { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      const file = `${out}/${id}-${lang}-${name}.png`;
      await page.screenshot({ path: file });
      console.log(file);
    }
  await page.close();
}
await browser.close();
await rm(`${out}/.tmp.html`, { force: true });
