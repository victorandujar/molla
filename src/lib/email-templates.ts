import { brand, money } from './config';
import {
  bananaSplit,
  orderSummary,
  type Lang,
  type Order,
  type Subscription,
} from './domain';
import { townById } from './delivery';
import { routes, ui } from './i18n';
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
// Delivery orders show the street under the town; pickup orders the note.
const where = (o: Order) =>
  o.delivery?.address
    ? `${o.pickupAddress}, ${o.delivery.address}`
    : o.pickupAddress;
const copy = {
  es: {
    footer: 'Pan de poolish por encargo',
    privacy: 'Privacidad y condiciones',
    subject: (o: Order) => `Reserva ${o.code} · Tu pan del ${onDay(o)}`,
    hello: 'Hola',
    confirmed: 'Reserva confirmada',
    heading: 'Tu pan ya tiene tu nombre',
    intro: (o: Order) =>
      `Hecho a mano, con poolish y hasta 35 horas de fermentación lenta. Te esperamos el ${onDay(o)}.`,
    code: 'Código de recogida',
    codeHint: 'Dilo o enséñalo al recoger.',
    order: 'Tu pedido',
    total: 'Total',
    payLater: 'pago al recoger',
    payOnDelivery: 'pago al recibirlo',
    when: 'Cuándo',
    where: 'Dónde',
    pickupNote: 'Te confirmaremos el punto exacto de recogida con tu pedido.',
    deliveryNote:
      'Te lo llevo a casa dentro de la franja. Si necesito confirmar algo, te escribo por WhatsApp.',
    changes:
      '¿Cambios o no puedes venir? Responde a este email con tu código antes del cierre de pedidos y la hogaza pasará a otra persona.',
    changesText: (contact: string) =>
      `¿Cambios o no puedes venir? Responde a este email${contact ? ` o escribe a ${contact}` : ''} con tu código antes del cierre de pedidos.`,
    channel:
      'Si quieres enterarte de la próxima hornada, sigue el canal de WhatsApp.',
    channelButton: 'Seguir el canal →',
    cancelNote:
      '¿No vas a poder recibirlo? Cancela el pedido con un clic hasta el cierre de pedidos (el jueves a las 20:00), sin dar explicaciones.',
    cancelLink: 'Cancelar el pedido →',
    giftLabel: 'Regalo',
    giftText:
      'Por ser tu primera comanda: un cuarto de banana bread (gluten y leche) y un chutney de pimiento rojo y tomate.',
    fixCta: '¿Lo quieres cada semana? Pan fijo:',
    standingKicker: 'Pan fijo',
    standingHeading: (name: string) => `${name}, esta semana te toca pan.`,
    standingIntro:
      'Ya tienes reservado tu pan fijo del sábado. Si esa semana no lo quieres, sáltalo con un clic hasta el cierre de pedidos (el jueves anterior, a las 20:00): no pasa nada y seguirás con tu pan fijo.',
    skipLink: 'Saltar esta semana →',
    manageLink: 'Gestionar mi pan fijo: pausar o darme de baja',
    standingSubject: (o: Order) =>
      `Tu pan fijo del ${onDay(o)} · código ${o.code}`,
    welcomeSubject: 'Ya tienes tu pan fijo',
    welcomeKicker: 'Pan fijo',
    welcomeHeading: (name: string) => `Bienvenido, ${name}.`,
    welcomeIntro: (first: string) =>
      first
        ? `Tu primera entrega es el ${first}. Desde ahí, cada semana preparo tu pan sin que tengas que reservar nada.`
        : 'Esta semana la hornada ya está completa: empezarás con la próxima. Desde ahí, cada semana preparo tu pan sin que tengas que reservar nada.',
    welcomeButton: 'Gestionar mi pan fijo →',
    welcomeHow:
      'Cuando quieras, desde ese enlace puedes saltar una semana, pausarlo o darte de baja con un solo clic. Cada semana te aviso por email, y tienes hasta el jueves a las 20:00 para saltar la entrega. Pagas al recibirlo; nunca se cobra nada por adelantado.',
    plan: 'Tu pan fijo',
    frequency: 'Frecuencia',
    weekly: 'Cada sábado',
    biweekly: 'Un sábado sí y otro no',
    fullSubject: 'Esta semana no hemos podido reservar tu pan fijo',
    fullHeading: 'Esta semana, sin pan fijo.',
    fullIntro:
      'La hornada de esta semana se ha completado y no ha quedado sitio para tu pedido. No se te cobra nada y tu pan fijo sigue activo: la semana que viene lo volveremos a preparar.',
    thanks: 'Gracias por reservar,',
    reminderSubject: (o: Order) =>
      `Recordatorio · Recoge tu pan el ${onDay(o)} (${o.code})`,
    reminderKicker: 'Recordatorio de recogida',
    reminderHeading: (o: Order) =>
      `${firstName(o.name)}, tu pan sale del horno el ${onDay(o)}.`,
    reminderIntro: 'Ven dentro de la franja con tu código. Se paga al recoger.',
    reminderDelivery:
      'Te lo llevo a casa dentro de la franja. Se paga al recibirlo.',
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
      `Fet a mà, amb poolish i fins a 35 hores de fermentació lenta. T’esperem ${onDay(o)}.`,
    code: 'Codi de recollida',
    codeHint: 'Digues-lo o ensenya’l en recollir.',
    order: 'La teva comanda',
    total: 'Total',
    payLater: 'pagament en recollir',
    payOnDelivery: 'pagament en rebre’l',
    when: 'Quan',
    where: 'On',
    pickupNote:
      'Et confirmarem el punt exacte de recollida amb la teva comanda.',
    deliveryNote:
      'Te’l porto a casa dins de la franja. Si he de confirmar alguna cosa, t’escric per WhatsApp.',
    changes:
      'Canvis o no pots venir? Respon aquest correu amb el teu codi abans del tancament de comandes i el pa passarà a una altra persona.',
    changesText: (contact: string) =>
      `Canvis o no pots venir? Respon aquest correu${contact ? ` o escriu a ${contact}` : ''} amb el teu codi abans del tancament de comandes.`,
    channel:
      'Si vols assabentar-te de la propera fornada, segueix el canal de WhatsApp.',
    channelButton: 'Segueix el canal →',
    cancelNote:
      'No el podràs rebre? Cancel·la la comanda amb un clic fins al tancament de comandes (dijous a les 20:00), sense donar explicacions.',
    cancelLink: 'Cancel·lar la comanda →',
    giftLabel: 'Regal',
    giftText:
      'Per ser la teva primera comanda: un quart de banana bread (gluten i llet) i un chutney de pebrot vermell i tomàquet.',
    fixCta: 'El vols cada setmana? Pa fix:',
    standingKicker: 'Pa fix',
    standingHeading: (name: string) => `${name}, aquesta setmana et toca pa.`,
    standingIntro:
      'Ja tens reservat el teu pa fix del dissabte. Si aquella setmana no el vols, salta’l amb un clic fins al tancament de comandes (el dijous abans, a les 20:00): no passa res i continuaràs amb el teu pa fix.',
    skipLink: 'Saltar aquesta setmana →',
    manageLink: 'Gestionar el meu pa fix: pausar-lo o donar-me de baixa',
    standingSubject: (o: Order) =>
      `El teu pa fix de ${onDay(o)} · codi ${o.code}`,
    welcomeSubject: 'Ja tens el teu pa fix',
    welcomeKicker: 'Pa fix',
    welcomeHeading: (name: string) => `Benvingut, ${name}.`,
    welcomeIntro: (first: string) =>
      first
        ? `La teva primera entrega és ${first}. A partir d’aquí, cada setmana et preparo el pa sense que hagis de reservar res.`
        : 'Aquesta setmana la fornada ja està completa: començaràs amb la propera. A partir d’aquí, cada setmana et preparo el pa sense que hagis de reservar res.',
    welcomeButton: 'Gestionar el meu pa fix →',
    welcomeHow:
      'Quan vulguis, des d’aquest enllaç pots saltar una setmana, pausar-lo o donar-te de baixa amb un sol clic. Cada setmana t’aviso per correu, i tens fins dijous a les 20:00 per saltar l’entrega. Pagues en rebre’l; mai es cobra res per avançat.',
    plan: 'El teu pa fix',
    frequency: 'Freqüència',
    weekly: 'Cada dissabte',
    biweekly: 'Un dissabte sí i un altre no',
    fullSubject: 'Aquesta setmana no hem pogut reservar el teu pa fix',
    fullHeading: 'Aquesta setmana, sense pa fix.',
    fullIntro:
      'La fornada d’aquesta setmana s’ha completat i no ha quedat lloc per a la teva comanda. No se’t cobra res i el teu pa fix continua actiu: la setmana vinent el tornarem a preparar.',
    thanks: 'Gràcies per reservar,',
    reminderSubject: (o: Order) =>
      `Recordatori · Recull el teu pa ${onDay(o)} (${o.code})`,
    reminderKicker: 'Recordatori de recollida',
    reminderHeading: (o: Order) =>
      `${firstName(o.name)}, el teu pa surt del forn ${onDay(o)}.`,
    reminderIntro:
      'Vine dins de la franja amb el teu codi. Es paga en recollir.',
    reminderDelivery:
      'Te’l porto a casa dins de la franja. Es paga en rebre’l.',
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

// Private one-click links. The page that opens asks for a confirming click,
// so a mail scanner that follows the link cannot cancel anything.
export const cancelUrl = (o: Order) =>
  o.cancelToken
    ? asset(`/comanda?token=${o.cancelToken}&lang=${langOf(o)}`)
    : '';
export const manageUrl = (token: string, lang: Lang) =>
  asset(`/subscripcio?token=${token}&lang=${lang}`);

export function confirmationSubject(o: Order) {
  const t = copy[langOf(o)];
  return o.subscription ? t.standingSubject(o) : t.subject(o);
}

export function confirmationText(o: Order) {
  const t = copy[langOf(o)];
  return `${t.hello} ${firstName(o.name)},

${o.subscription ? t.standingHeading(firstName(o.name)) : `${t.heading}. ${t.confirmed}.`}

${t.code}: ${o.code}
${orderSummary(o)} — ${money(o.total)} (${o.delivery ? t.payOnDelivery : t.payLater})

${t.when}: ${pickupDay(o.pickupDate, langOf(o))}, ${o.pickupWindow}
${t.where}: ${where(o)}
${o.delivery ? t.deliveryNote : t.pickupNote}
${o.firstOrder ? `\n${t.giftLabel}: ${t.giftText}` : ''}

${
  o.subscription
    ? `${t.standingIntro}\n${t.skipLink} ${cancelUrl(o)}\n${t.manageLink}: ${manageUrl(o.subscription.token, langOf(o))}`
    : o.cancelToken
      ? `${t.cancelNote}\n${cancelUrl(o)}`
      : t.changesText(brand.contact)
}${o.subscription ? '' : `\n${t.fixCta} ${asset(routes.standing[langOf(o)])}`}
${brand.whatsappChannel ? `\n${t.channel} ${brand.whatsappChannel}\n` : ''}
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
      [t.order, esc(orderSummary(o, '\n')).replaceAll('\n', '<br>')],
      [t.total, `<strong>${money(o.total)}</strong> · ${totalLabel}`],
      [
        t.when,
        `${esc(pickupDay(o.pickupDate, lang))}<br>${esc(o.pickupWindow)}`,
      ],
      [
        t.where,
        `${esc(o.pickupAddress)}${o.delivery?.address ? `<br>${esc(o.delivery.address)}` : ''}<br><span style="font-size:13px;color:${c.muted};">${esc(o.delivery ? t.deliveryNote : t.pickupNote)}</span>`,
      ],
      ...(o.firstOrder
        ? ([[t.giftLabel, esc(t.giftText)]] as [string, string][])
        : []),
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
  const pay = o.delivery ? t.payOnDelivery : t.payLater;
  const link = (href: string, label: string) =>
    `<a href="${esc(href)}" style="color:${c.tile};font-weight:600;">${esc(label)}</a>`;
  const channel = brand.whatsappChannel
    ? button(esc(brand.whatsappChannel), t.channelButton)
    : '';
  const ending = o.subscription
    ? closing(
        button(esc(cancelUrl(o)), t.skipLink),
        `${link(manageUrl(o.subscription.token, lang), t.manageLink)}${
          brand.whatsappChannel ? `<br><br>${esc(t.channel)}` : ''
        }`,
      )
    : closing(
        channel,
        `${o.cancelToken ? `${esc(t.cancelNote)}<br>${link(cancelUrl(o), t.cancelLink)}` : t.changes}<br><br>${esc(t.fixCta)} ${link(asset(routes.standing[lang]), asset(routes.standing[lang]).replace(/^https?:\/\//, ''))}${
          brand.whatsappChannel ? `<br><br>${esc(t.channel)}` : ''
        }`,
      );
  const content =
    (o.subscription
      ? intro(
          t.standingKicker,
          esc(t.standingHeading(firstName(o.name))),
          t.standingIntro,
        )
      : intro(
          t.confirmed,
          `${t.heading}, ${esc(firstName(o.name))}.`,
          esc(t.intro(o)),
        )) +
    pickupBlock(o, pay) +
    ending;
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

${o.delivery ? t.reminderDelivery : t.reminderIntro}

${t.code}: ${o.code}
${orderSummary(o)} — ${money(o.total)} (${o.delivery ? t.payOnDelivery : t.payLater})
${t.when}: ${pickupDay(o.pickupDate, lang)}, ${o.pickupWindow}
${t.where}: ${where(o)}
${o.delivery ? t.deliveryNote : t.pickupNote}

${t.reminderCancel}

${brand.name}`;
}

export function reminderHtml(o: Order) {
  const lang = langOf(o);
  const t = copy[lang];
  const content =
    intro(
      t.reminderKicker,
      esc(t.reminderHeading(o)),
      o.delivery ? t.reminderDelivery : t.reminderIntro,
    ) +
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
  return `Nueva reserva ${o.code}: ${orderSummary(o)} · ${o.name}`;
}

export function ownerText(o: Order) {
  return `Nueva reserva ${o.code}

${orderSummary(o)} — ${money(o.total)}
Nombre: ${o.name}
Email: ${o.email}
Teléfono: ${o.phone}
${o.delivery ? 'Entrega a domicilio' : 'Recogida'}: ${pickupDay(o.pickupDate)}, ${o.pickupWindow}${
    o.delivery
      ? `
Dirección: ${where(o)}`
      : ''
  }
Canal: ${o.source}${o.firstOrder ? '\nPrimera comanda: añade el regalo (¼ de banana bread + chutney de pimiento rojo y tomate)' : ''}
Referencia interna: ${o.id}`;
}

export function ownerHtml(o: Order) {
  const tel = o.phone.replace(/[^\d+]/g, '');
  const content = `
<tr><td class="pad" style="padding:40px 40px 8px;">
  <p style="margin:0 0 10px;font-family:${body};font-size:13px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:${c.tile};">Nueva reserva · ${esc(o.code)}</p>
  <h1 class="h1" style="margin:0;font-family:${display};font-size:38px;line-height:1.05;font-weight:800;color:${c.ink};">${esc(orderSummary(o, '\n')).replaceAll('\n', '<br>')}</h1>
  <p style="margin:12px 0 0;font-family:${body};font-size:16px;color:${c.muted};">${money(o.total)} a cobrar ${o.delivery ? 'en la entrega' : 'al recoger'} · ${esc(pickupDay(o.pickupDate))}</p>
</td></tr>
<tr><td class="pad" style="padding:20px 40px 40px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    ${details([
      ['Nombre', esc(o.name)],
      ['Teléfono', `<a href="tel:${esc(tel)}">${esc(o.phone)}</a>`],
      ['Email', `<a href="mailto:${esc(o.email)}">${esc(o.email)}</a>`],
      ...(o.delivery
        ? ([['Entrega', esc(where(o))]] as [string, string][])
        : []),
      ['Canal', esc(o.source)],
      ...(o.firstOrder
        ? ([
            [
              'Regalo',
              'Primera comanda: añade ¼ de banana bread + chutney de pimiento rojo y tomate',
            ],
          ] as [string, string][])
        : []),
      ['Código', `<strong>${esc(o.code)}</strong>`],
    ])}
  </table>
</td></tr>`;
  return layout('es', `${o.name} · ${orderSummary(o)} · ${o.code}`, content);
}

// ---- Pa fix ---------------------------------------------------------------

const planRows = (sub: Subscription): [string, string][] => {
  const lang = sub.lang;
  const t = copy[lang];
  const names = ui[lang].catalog;
  const { whole, half } = bananaSplit(sub.banana);
  const items = [
    sub.quantity ? `${sub.quantity} × ${names.loaf}` : '',
    whole ? `${whole} × ${names.bananaWhole}` : '',
    half ? `${half} × ${names.bananaHalf}` : '',
  ].filter(Boolean);
  const where =
    sub.delivery === 'home'
      ? `${ui[lang].reserve.deliveryLabel(townById(sub.town)?.name ?? sub.town)}<br>${sub.address}`
      : brand.pickupLabel[lang];
  return [
    [t.plan, items.map(esc).join('<br>')],
    [t.frequency, sub.frequency === 'weekly' ? t.weekly : t.biweekly],
    [
      t.where,
      where.includes('<br>')
        ? where.split('<br>').map(esc).join('<br>')
        : esc(where),
    ],
  ];
};

// Sent when someone joins; `firstDay` is the first delivery if it was placed.
export function subscriptionWelcome(sub: Subscription, firstDay: string) {
  const t = copy[sub.lang];
  const url = manageUrl(sub.token, sub.lang);
  const content =
    intro(
      t.welcomeKicker,
      esc(t.welcomeHeading(firstName(sub.name))),
      esc(t.welcomeIntro(firstDay)),
    ) +
    `<tr><td class="pad" style="padding:20px 40px 8px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${details(planRows(sub))}</table></td></tr>` +
    closing(button(esc(url), t.welcomeButton), esc(t.welcomeHow));
  const lines = planRows(sub)
    .map(([k, v]) => `${k}: ${v.replaceAll('<br>', ' · ')}`)
    .join('\n');
  return {
    subject: t.welcomeSubject,
    html: layout(sub.lang, t.welcomeSubject, content),
    text: `${t.hello} ${firstName(sub.name)},\n\n${t.welcomeIntro(firstDay)}\n\n${lines}\n\n${t.welcomeHow}\n${url}\n\n${brand.name}`,
  };
}

// The weekly job could not place the order: no room left in this bake.
export function subscriptionFull(sub: Subscription) {
  const t = copy[sub.lang];
  const url = manageUrl(sub.token, sub.lang);
  const content =
    intro(t.welcomeKicker, esc(t.fullHeading), esc(t.fullIntro)) +
    closing(button(esc(url), t.welcomeButton), esc(t.welcomeHow));
  return {
    subject: t.fullSubject,
    html: layout(sub.lang, t.fullSubject, content),
    text: `${t.hello} ${firstName(sub.name)},\n\n${t.fullIntro}\n\n${url}\n\n${brand.name}`,
  };
}

// A short plain notice for the baker, in Spanish like the other owner emails.
export function ownerNotice(subject: string, rows: [string, string][]) {
  const content = `
<tr><td class="pad" style="padding:40px 40px 8px;">
  <h1 class="h1" style="margin:0;font-family:${display};font-size:32px;line-height:1.1;font-weight:800;color:${c.ink};">${esc(subject)}</h1>
</td></tr>
<tr><td class="pad" style="padding:20px 40px 40px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${details(rows.map(([k, v]) => [esc(k), esc(v)]))}</table>
</td></tr>`;
  return {
    subject,
    html: layout('es', subject, content),
    text: `${subject}\n\n${rows.map(([k, v]) => `${k}: ${v}`).join('\n')}`,
  };
}
