import { brand, money } from './config';
import type { Lang, Order } from './domain';
// Email clients ignore stylesheets and web fonts unevenly: inline styles,
// table layout, hosted PNGs and system-font fallbacks for everything.
const c = {
  tile: '#1b3a9f',
  tileDeep: '#122874',
  crumb: '#f7f1e8',
  linen: '#e8e2d5',
  ink: '#131b31',
  muted: '#545b6c',
  line: '#d9d3c7',
  orange: '#ff7a2e',
};
const display = "'Bricolage Grotesque','Arial Narrow',Arial,sans-serif";
const body = "'Instrument Sans','Helvetica Neue',Helvetica,Arial,sans-serif";
const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (ch) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        ch
      ]!,
  );
// Resolved against the site URL, which may include a base path.
const asset = (path: string) => {
  const base = brand.site || 'https://www.mollapa.com';
  return new URL(
    path.replace(/^\//, ''),
    base.endsWith('/') ? base : `${base}/`,
  ).href;
};
export const pickupDay = (iso: string, lang: Lang = 'es') => {
  const text = new Intl.DateTimeFormat(lang === 'ca' ? 'ca-ES' : 'es-ES', {
    timeZone: 'Europe/Madrid',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(iso));
  return text.charAt(0).toUpperCase() + text.slice(1);
};
const firstName = (name: string) => name.trim().split(/\s+/)[0] || name;
const langOf = (o: Order): Lang => (o.lang === 'ca' ? 'ca' : 'es');
const privacyPath = { es: '/privacidad', ca: '/privacitat' };
// Catalan dates read "dissabte, 26 de setembre"; after "el" they stay lowercase.
const onDay = (o: Order) => pickupDay(o.pickupDate, langOf(o)).toLowerCase();
const copy = {
  es: {
    footer: 'Pan de poolish por encargo',
    privacy: 'Privacidad y condiciones',
    subject: (o: Order) => `Reserva ${o.code} · Tu pan del ${onDay(o)}`,
    hello: 'Hola',
    confirmed: 'Reserva confirmada',
    heading: 'Tu pan ya tiene tu nombre',
    intro: (o: Order) =>
      `Hecho a mano, con poolish y más de 20 horas de fermentación lenta. Te esperamos el ${onDay(o)}.`,
    code: 'Código de recogida',
    codeHint: 'Dilo o enséñalo al recoger.',
    order: 'Tu pedido',
    total: 'Total',
    payLater: 'pago al recoger',
    when: 'Cuándo',
    where: 'Dónde',
    pickupNote: 'Te confirmaremos el punto exacto de recogida con tu pedido.',
    changes:
      '¿Cambios o no puedes venir? Responde a este email con tu código antes del cierre de pedidos y la hogaza pasará a otra persona.',
    changesText: (contact: string) =>
      `¿Cambios o no puedes venir? Responde a este email${contact ? ` o escribe a ${contact}` : ''} con tu código antes del cierre de pedidos.`,
    thanks: 'Gracias por reservar,',
    reminderSubject: (o: Order) =>
      `Recordatorio · Recoge tu pan el ${onDay(o)} (${o.code})`,
    reminderKicker: 'Recordatorio de recogida',
    reminderHeading: (o: Order) =>
      `${firstName(o.name)}, tu pan sale del horno el ${onDay(o)}.`,
    reminderIntro: 'Ven dentro de la franja con tu código. Se paga al recoger.',
    reminderCancel:
      '¿Al final no puedes venir? Responde a este email cuanto antes: así la hogaza no se desperdicia.',
    toPay: 'A pagar al recoger',
    waitlistSubject: 'Confirma tu aviso de nuevas hornadas',
    waitlistHeading: 'Un clic y te aviso.',
    waitlistIntro:
      'Alguien (esperamos que tú) ha pedido recibir un email cuando abra una nueva hornada de Molla. Confírmalo con el botón. Si no fuiste tú, ignora este mensaje y no te escribiremos más.',
    waitlistButton: 'Confirmar el aviso →',
    waitlistUnsubscribe: 'Darme de baja',
  },
  ca: {
    footer: 'Pa de poolish per encàrrec',
    privacy: 'Privacitat i condicions',
    subject: (o: Order) => `Reserva ${o.code} · El teu pa de ${onDay(o)}`,
    hello: 'Hola',
    confirmed: 'Reserva confirmada',
    heading: 'El teu pa ja té el teu nom',
    intro: (o: Order) =>
      `Fet a mà, amb poolish i més de 20 hores de fermentació lenta. T’esperem ${onDay(o)}.`,
    code: 'Codi de recollida',
    codeHint: 'Digues-lo o ensenya’l en recollir.',
    order: 'La teva comanda',
    total: 'Total',
    payLater: 'pagament en recollir',
    when: 'Quan',
    where: 'On',
    pickupNote:
      'Et confirmarem el punt exacte de recollida amb la teva comanda.',
    changes:
      'Canvis o no pots venir? Respon aquest correu amb el teu codi abans del tancament de comandes i el pa passarà a una altra persona.',
    changesText: (contact: string) =>
      `Canvis o no pots venir? Respon aquest correu${contact ? ` o escriu a ${contact}` : ''} amb el teu codi abans del tancament de comandes.`,
    thanks: 'Gràcies per reservar,',
    reminderSubject: (o: Order) =>
      `Recordatori · Recull el teu pa ${onDay(o)} (${o.code})`,
    reminderKicker: 'Recordatori de recollida',
    reminderHeading: (o: Order) =>
      `${firstName(o.name)}, el teu pa surt del forn ${onDay(o)}.`,
    reminderIntro:
      'Vine dins de la franja amb el teu codi. Es paga en recollir.',
    reminderCancel:
      'Al final no pots venir? Respon aquest correu com més aviat millor: així el pa no es malbarata.',
    toPay: 'A pagar en recollir',
    waitlistSubject: 'Confirma l’avís de noves fornades',
    waitlistHeading: 'Un clic i t’aviso.',
    waitlistIntro:
      'Algú (esperem que tu) ha demanat rebre un correu quan obri una nova fornada de Molla. Confirma-ho amb el botó. Si no has estat tu, ignora aquest missatge i no t’escriurem més.',
    waitlistButton: 'Confirmar l’avís →',
    waitlistUnsubscribe: 'Donar-me de baixa',
  },
};

function layout(lang: Lang, preheader: string, content: string) {
  const t = copy[lang];
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light">
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,700..800&family=Instrument+Sans:wght@400;600&display=swap" rel="stylesheet">
<title>${esc(brand.name)}</title>
<style>
  @media (max-width:620px){
    .card{border-radius:0!important}
    .pad{padding-left:24px!important;padding-right:24px!important}
    .h1{font-size:34px!important}
    .code{font-size:34px!important}
    .row td{display:block!important;width:auto!important;padding-bottom:2px!important}
  }
  a{color:${c.tile}}
</style>
</head>
<body style="margin:0;padding:0;background:${c.linen};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${c.linen};">
<tr><td align="center" style="padding:32px 12px;">
<table role="presentation" class="card" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:${c.crumb};border-radius:16px;overflow:hidden;">
<tr><td class="pad" style="background:${c.tile};padding:28px 40px;">
  <a href="${asset('/')}" style="text-decoration:none;"><img src="${asset('/email/molla-crema.png')}" width="120" height="40" alt="molla." style="display:block;border:0;width:120px;height:40px;color:${c.crumb};font-family:${display};font-size:32px;font-weight:800;"></a>
</td></tr>
${content}
<tr><td class="pad" style="background:${c.tileDeep};padding:28px 40px;font-family:${body};font-size:13px;line-height:1.6;color:${c.crumb};">
  <strong style="font-family:${display};font-size:18px;">molla.</strong><br>
  ${t.footer} · ${esc(brand.town)}<br>
  ${brand.contact ? `<a href="mailto:${esc(brand.contact)}" style="color:${c.crumb};">${esc(brand.contact)}</a> · ` : ''}<a href="${asset(privacyPath[lang])}" style="color:${c.crumb};">${t.privacy}</a>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function details(rows: [string, string][]) {
  return rows
    .map(
      ([label, value], i) =>
        `<tr class="row"><td width="120" valign="top" style="padding:12px 0;${i ? `border-top:1px solid ${c.line};` : ''}font-family:${body};font-size:13px;color:${c.muted};">${label}</td><td valign="top" style="padding:12px 0;${i ? `border-top:1px solid ${c.line};` : ''}font-family:${body};font-size:16px;line-height:1.45;color:${c.ink};">${value}</td></tr>`,
    )
    .join('');
}

function button(href: string, label: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:${c.tile};border-radius:999px;"><a href="${href}" style="display:inline-block;padding:14px 26px;font-family:${body};font-size:15px;font-weight:600;color:${c.crumb};text-decoration:none;border-radius:999px;">${label}</a></td></tr></table>`;
}

export function confirmationSubject(o: Order) {
  return copy[langOf(o)].subject(o);
}

export function confirmationText(o: Order) {
  const t = copy[langOf(o)];
  return `${t.hello} ${firstName(o.name)},

${t.heading}. ${t.confirmed}.

${t.code}: ${o.code}
${o.quantity} × ${o.productName} — ${money(o.total)} (${t.payLater})

${t.when}: ${pickupDay(o.pickupDate, langOf(o))}, ${o.pickupWindow}
${t.where}: ${o.pickupAddress}
${t.pickupNote}

${t.changesText(brand.contact)}

${t.thanks}
${brand.name}`;
}

// Code, order details and map: shared by the confirmation and the reminder.
function pickupBlock(o: Order, totalLabel: string) {
  const lang = langOf(o);
  const t = copy[lang];
  return `
<tr><td class="pad" style="padding:28px 40px 4px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border:2px dashed ${c.tile};border-radius:12px;">
    <tr><td align="center" style="padding:20px 16px;">
      <p style="margin:0 0 6px;font-family:${body};font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:${c.muted};">${t.code}</p>
      <p class="code" style="margin:0;font-family:${display};font-size:44px;line-height:1.1;font-weight:800;letter-spacing:.06em;color:${c.tile};">${esc(o.code)}</p>
      <p style="margin:6px 0 0;font-family:${body};font-size:13px;color:${c.muted};">${t.codeHint}</p>
    </td></tr>
  </table>
</td></tr>
<tr><td class="pad" style="padding:20px 40px 8px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    ${details([
      [t.order, `${o.quantity} × ${esc(o.productName)}`],
      [t.total, `<strong>${money(o.total)}</strong> · ${totalLabel}`],
      [
        t.when,
        `${esc(pickupDay(o.pickupDate, lang))}<br>${esc(o.pickupWindow)}`,
      ],
      [
        t.where,
        `${esc(o.pickupAddress)}<br><span style="font-size:13px;color:${c.muted};">${esc(t.pickupNote)}</span>`,
      ],
    ])}
  </table>
</td></tr>`;
}

function intro(kicker: string, heading: string, text: string) {
  return `
<tr><td class="pad" style="padding:44px 40px 8px;">
  <p style="margin:0 0 10px;font-family:${body};font-size:13px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:${c.tile};">${kicker}</p>
  <h1 class="h1" style="margin:0;font-family:${display};font-size:42px;line-height:1;font-weight:800;letter-spacing:-.02em;color:${c.ink};">${heading}</h1>
  <p style="margin:18px 0 0;font-family:${body};font-size:16px;line-height:1.6;color:${c.muted};">${text}</p>
</td></tr>`;
}

function closing(button: string, note: string) {
  return `
<tr><td class="pad" style="padding:20px 40px 40px;">
  ${button}
  <p style="margin:28px 0 0;font-family:${body};font-size:14px;line-height:1.6;color:${c.muted};">${note}</p>
</td></tr>`;
}

export function confirmationHtml(o: Order) {
  const lang = langOf(o);
  const t = copy[lang];
  const content =
    intro(
      t.confirmed,
      `${t.heading}, ${esc(firstName(o.name))}.`,
      esc(t.intro(o)),
    ) +
    pickupBlock(o, t.payLater) +
    closing('', t.changes);
  return layout(
    lang,
    `${t.code} ${o.code} · ${pickupDay(o.pickupDate, lang)}, ${o.pickupWindow} · ${o.pickupAddress}`,
    content,
  );
}

export function reminderSubject(o: Order) {
  return copy[langOf(o)].reminderSubject(o);
}

export function reminderText(o: Order) {
  const lang = langOf(o);
  const t = copy[lang];
  return `${t.hello} ${firstName(o.name)},

${t.reminderIntro}

${t.code}: ${o.code}
${o.quantity} × ${o.productName} — ${money(o.total)} (${t.payLater})
${t.when}: ${pickupDay(o.pickupDate, lang)}, ${o.pickupWindow}
${t.where}: ${o.pickupAddress}
${t.pickupNote}

${t.reminderCancel}

${brand.name}`;
}

export function reminderHtml(o: Order) {
  const lang = langOf(o);
  const t = copy[lang];
  const content =
    intro(t.reminderKicker, esc(t.reminderHeading(o)), t.reminderIntro) +
    pickupBlock(o, t.toPay.toLowerCase()) +
    closing('', t.reminderCancel);
  return layout(
    lang,
    `${o.code} · ${pickupDay(o.pickupDate, lang)}, ${o.pickupWindow}`,
    content,
  );
}

export function waitlistConfirmation(
  lang: Lang,
  tokens: { confirm: string; unsubscribe: string },
) {
  const t = copy[lang];
  const confirmUrl = asset(`/alta?token=${tokens.confirm}&lang=${lang}`);
  const unsubscribeUrl = asset(
    `/baja?token=${tokens.unsubscribe}&lang=${lang}`,
  );
  const content =
    intro(t.waitlistSubject, t.waitlistHeading, t.waitlistIntro) +
    closing(
      button(esc(confirmUrl), t.waitlistButton),
      `<a href="${esc(unsubscribeUrl)}" style="color:${c.muted};">${t.waitlistUnsubscribe}</a>`,
    );
  return {
    subject: t.waitlistSubject,
    html: layout(lang, t.waitlistHeading, content),
    text: `${t.waitlistHeading}\n\n${t.waitlistIntro}\n\n${confirmUrl}\n\n${t.waitlistUnsubscribe}: ${unsubscribeUrl}\n\n${brand.name}`,
  };
}

export function ownerSubject(o: Order) {
  return `Nueva reserva ${o.code}: ${o.quantity} × ${o.productName} · ${o.name}`;
}

export function ownerText(o: Order) {
  return `Nueva reserva ${o.code}

${o.quantity} × ${o.productName} — ${money(o.total)}
Nombre: ${o.name}
Email: ${o.email}
Teléfono: ${o.phone}
Recogida: ${pickupDay(o.pickupDate)}, ${o.pickupWindow}
Canal: ${o.source}
Referencia interna: ${o.id}`;
}

export function ownerHtml(o: Order) {
  const tel = o.phone.replace(/[^\d+]/g, '');
  const content = `
<tr><td class="pad" style="padding:40px 40px 8px;">
  <p style="margin:0 0 10px;font-family:${body};font-size:13px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:${c.tile};">Nueva reserva · ${esc(o.code)}</p>
  <h1 class="h1" style="margin:0;font-family:${display};font-size:38px;line-height:1.05;font-weight:800;color:${c.ink};">${o.quantity} × ${esc(o.productName)}</h1>
  <p style="margin:12px 0 0;font-family:${body};font-size:16px;color:${c.muted};">${money(o.total)} a cobrar al recoger · ${esc(pickupDay(o.pickupDate))}</p>
</td></tr>
<tr><td class="pad" style="padding:20px 40px 40px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    ${details([
      ['Nombre', esc(o.name)],
      ['Teléfono', `<a href="tel:${esc(tel)}">${esc(o.phone)}</a>`],
      ['Email', `<a href="mailto:${esc(o.email)}">${esc(o.email)}</a>`],
      ['Canal', esc(o.source)],
      ['Código', `<strong>${esc(o.code)}</strong>`],
    ])}
  </table>
</td></tr>`;
  return layout(
    'es',
    `${o.name} · ${o.quantity} hogaza(s) · ${o.code}`,
    content,
  );
}
