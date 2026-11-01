// Emails of the automated funnel: the weekly opening and last call for
// subscribers, the follow-ups after a delivery and the baker's weekly summary.
// Same identity and helpers as the transactional emails.
import { brand, googleReviews, money, productById } from './config';
import { deliveryTowns, deliveryWindow } from './delivery';
import { routes } from './i18n';
import type { Lang, Order } from './domain';
import {
  asset,
  body,
  button,
  c,
  closing,
  details,
  display,
  esc,
  firstName,
  intro,
  layout,
  inviteUrl as personalInvite,
  inviteWhatsapp,
  pickupDay,
} from './email-templates';

export type FunnelBake = {
  id: string;
  number: string;
  pickupDate: string;
  deadline: string;
};
type Message = {
  subject: string;
  html: string;
  text: string;
  headers?: Record<string, string>;
};

const locale = (lang: Lang) => (lang === 'ca' ? 'ca-ES' : 'es-ES');
const weekday = (iso: string, lang: Lang) =>
  new Intl.DateTimeFormat(locale(lang), {
    timeZone: 'Europe/Madrid',
    weekday: 'long',
  }).format(new Date(iso));
const clock = (iso: string) =>
  new Intl.DateTimeFormat('es-ES', {
    timeZone: 'Europe/Madrid',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(iso));
const towns = (lang: Lang) => {
  const names = deliveryTowns.map((t) => t.name.replace(' de Llobregat', ''));
  return `${names.slice(0, -1).join(', ')} ${lang === 'ca' ? 'i' : 'y'} ${names.at(-1)}`;
};
// Every link back to the shop says it came from the funnel and which email.
export const shopUrl = (
  lang: Lang,
  campaign: string,
  route: keyof typeof routes = 'home',
) =>
  asset(
    `${routes[route][lang]}?utm_source=email&utm_medium=funnel&utm_campaign=${encodeURIComponent(campaign)}`,
  );
export const unsubscribeUrl = (token: string, lang: Lang) =>
  asset(`/baja?token=${token}&lang=${lang}`);
const price = (id: string) => money(productById(id)?.price ?? 0);
// One real Google review per bake, in rotation, quoted verbatim.
const quoteFor = (n: number) =>
  googleReviews.quotes[Math.abs(n) % googleReviews.quotes.length]!;
const photo = (file: string, alt: string) => `
<tr><td style="padding:0;">
  <a href="${asset('/')}" style="text-decoration:none;"><img src="${asset(`/email/${file}`)}" width="600" alt="${esc(alt)}" style="display:block;border:0;width:100%;max-width:600px;height:auto;"></a>
</td></tr>`;
const section = (html: string, padding = '20px 40px 8px') =>
  `<tr><td class="pad" style="padding:${padding};">${html}</td></tr>`;
const table = (rows: [string, string][]) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${details(rows)}</table>`;
const quoteBlock = (n: number, lang: Lang) => {
  const q = quoteFor(n);
  return section(
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;"><tr><td style="padding:20px 22px;">
      <p style="margin:0 0 8px;font-family:${body};font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:${c.orange};">★★★★★ · ${lang === 'ca' ? 'Ressenya a Google' : 'Reseña en Google'}</p>
      <p style="margin:0;font-family:${display};font-size:20px;line-height:1.3;font-weight:700;color:${c.ink};">«${esc(q.text)}»</p>
      <p style="margin:8px 0 0;font-family:${body};font-size:13px;color:${c.muted};">${esc(q.author)}</p>
    </td></tr></table>`,
  );
};
const unsubscribeLine = (url: string, lang: Lang) =>
  `<a href="${esc(url)}" style="color:${c.crumb};">${lang === 'ca' ? 'No vull rebre més avisos' : 'No quiero recibir más avisos'}</a>`;
const listHeaders = (url: string) => ({
  'List-Unsubscribe': `<${url}>${brand.contact ? `, <mailto:${brand.contact}?subject=baja>` : ''}`,
});

// ---- Weekly opening and last call -------------------------------------------

const broadcastCopy = {
  es: {
    openSubject: (day: string) => `Ya puedes reservar el pan del ${day}`,
    openKicker: (n: string) => `Hornada ${n} · abierta`,
    openHeading: (day: string) => `El pan del ${day} ya tiene horno.`,
    openIntro: (close: string) =>
      `Poolish, harina ecológica y hasta 35 horas de fermentación. Horneo solo lo que se reserva, así que cuando se llena, se cierra. Pedidos hasta el ${close}.`,
    lastSubject: (day: string) =>
      `Hoy a las 20:00 cierro los pedidos del ${day}`,
    lastKicker: 'Último aviso',
    lastHeading: 'Cierro hoy a las 20:00.',
    lastIntro: (day: string) =>
      `Si quieres pan, banana bread o bollería para el ${day}, aún estás a tiempo. Después ya no puedo añadir nada a la hornada.`,
    menu: 'La carta',
    loaf: 'Hogaza de poolish · 750–850 g',
    banana: 'Banana bread · entero o medio',
    pastries: 'Croissant · Pain au chocolat',
    delivery: 'Entrega',
    deliveryText: (day: string) =>
      `${day}, ${deliveryWindow}, a domicilio en ${towns('es')}, sin coste de envío. O recogida en Sant Boi para el resto del Baix Llobregat.`,
    pay: 'Pago',
    payText: 'Al recibirlo. Cancelas con un clic hasta el cierre.',
    button: 'Reservar mi pan →',
    fix: '¿Lo quieres cada semana sin acordarte? Prueba el Pan fijo:',
    why: 'Recibes este email porque te apuntaste a los avisos de hornadas de Molla.',
  },
  ca: {
    openSubject: (day: string) => `Ja pots reservar el pa de ${day}`,
    openKicker: (n: string) => `Fornada ${n} · oberta`,
    openHeading: (day: string) => `El pa de ${day} ja té forn.`,
    openIntro: (close: string) =>
      `Poolish, farina ecològica i fins a 35 hores de fermentació. Només fornejo el que es reserva, així que quan s’omple, es tanca. Comandes fins ${close}.`,
    lastSubject: (day: string) =>
      `Avui a les 20:00 tanco les comandes de ${day}`,
    lastKicker: 'Últim avís',
    lastHeading: 'Tanco avui a les 20:00.',
    lastIntro: (day: string) =>
      `Si vols pa, banana bread o brioixeria per a ${day}, encara hi ets a temps. Després ja no puc afegir res a la fornada.`,
    menu: 'La carta',
    loaf: 'Pa de poolish · 750–850 g',
    banana: 'Banana bread · sencer o mig',
    pastries: 'Croissant · Pain au chocolat',
    delivery: 'Entrega',
    deliveryText: (day: string) =>
      `${day}, ${deliveryWindow}, a domicili a ${towns('ca')}, sense cost d’enviament. O recollida a Sant Boi per a la resta del Baix Llobregat.`,
    pay: 'Pagament',
    payText: 'En rebre’l. Cancel·les amb un clic fins al tancament.',
    button: 'Reservar el meu pa →',
    fix: 'El vols cada setmana sense haver-te’n de recordar? Prova el Pa fix:',
    why: 'Reps aquest correu perquè et vas apuntar als avisos de fornades de Molla.',
  },
};

export function broadcastEmail(
  kind: 'open' | 'last',
  lang: Lang,
  bake: FunnelBake,
  unsubscribeToken: string,
): Message {
  const t = broadcastCopy[lang];
  const day = pickupDay(bake.pickupDate, lang).toLowerCase();
  const dayName = weekday(bake.pickupDate, lang);
  const close = `${weekday(bake.deadline, lang)} ${lang === 'ca' ? 'a les' : 'a las'} ${clock(bake.deadline)}`;
  const campaign = `${kind}-${bake.number}`;
  const url = shopUrl(lang, campaign);
  const fixUrl = shopUrl(lang, campaign, 'standing');
  const unsub = unsubscribeUrl(unsubscribeToken, lang);
  const subject = kind === 'open' ? t.openSubject(day) : t.lastSubject(day);
  const heading = kind === 'open' ? t.openHeading(day) : t.lastHeading;
  const text = kind === 'open' ? t.openIntro(close) : t.lastIntro(day);
  const deliveryDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);
  const rows: [string, string][] = [
    [
      t.menu,
      [
        `${esc(t.loaf)} · <strong>${price('clasica')}</strong>`,
        `${esc(t.banana)} · <strong>${price('banana')}</strong> / ${price('banana-mitad')}`,
        `${esc(t.pastries)} · <strong>${price('croissant')}</strong> / ${price('pain-au-chocolat')}`,
      ].join('<br>'),
    ],
    [t.delivery, esc(t.deliveryText(deliveryDay))],
    [t.pay, esc(t.payText)],
  ];
  const content =
    (kind === 'open' ? photo('hornada.jpg', 'Molla') : '') +
    intro(
      kind === 'open' ? t.openKicker(bake.number) : t.lastKicker,
      esc(heading),
      esc(text),
    ) +
    section(button(esc(url), t.button), '24px 40px 4px') +
    section(table(rows)) +
    (kind === 'open' ? quoteBlock(Number(bake.number) || 0, lang) : '') +
    closing(
      button(esc(url), t.button),
      `${esc(t.fix)} <a href="${esc(fixUrl)}" style="color:${c.tile};font-weight:600;">${esc(routes.standing[lang])}</a><br><br><span style="font-size:12px;">${esc(t.why)}</span>`,
    );
  return {
    subject,
    html: layout(lang, text, content, unsubscribeLine(unsub, lang)),
    text: `${heading}

${text}

${t.menu}:
- ${t.loaf}: ${price('clasica')}
- ${t.banana}: ${price('banana')} / ${price('banana-mitad')}
- ${t.pastries}: ${price('croissant')} / ${price('pain-au-chocolat')}

${t.delivery}: ${t.deliveryText(deliveryDay)}
${t.pay}: ${t.payText}

${t.button} ${url}

${t.fix} ${fixUrl}

${t.why}
${lang === 'ca' ? 'Baixa' : 'Baja'}: ${unsub}

${brand.name}`,
    headers: listHeaders(unsub),
  };
}

// ---- After a delivery ---------------------------------------------------------

const followCopy = {
  es: {
    thanksSubject: '¿Qué tal el pan?',
    thanksKicker: 'Gracias por tu primer pedido',
    thanksHeading: (name: string) => `${name}, ¿qué tal el pan?`,
    thanksIntro:
      'Espero que lo hayas disfrutado. Soy un obrador muy pequeño, sin tienda ni publicidad: lo que más me ayuda a seguir es que otras personas del barrio sepan que existo.',
    reviewH: '30 segundos que me ayudan muchísimo',
    reviewP:
      'Si te ha gustado, una reseña en Google hace que los vecinos me encuentren cuando buscan pan artesano.',
    reviewButton: 'Dejar una reseña →',
    shareH: 'Pásaselo a un vecino',
    shareP:
      'Si conoces a alguien en Sant Boi, Sant Just o Santa Coloma a quien le guste el buen pan, mándale el enlace.',
    shareLink: 'Enviar por WhatsApp ↗',
    shareGift:
      'Si conoces a alguien en Sant Boi, Sant Just o Santa Coloma a quien le guste el buen pan, mándale tu invitación: con su primer pedido tendrá un croissant de regalo, y tú otro en tu siguiente pedido.',
    shareText:
      'He probado el pan de Molla, un obrador de Sant Boi: fermentación lenta y te lo llevan a casa. Mira: ',
    newsH: '¿Te aviso cada semana?',
    newsP:
      'Un email cuando abra la hornada del sábado y otro el día que cierro. Nada más. Te das de baja con un clic.',
    newsButton: 'Sí, avísame →',
    fix: 'Y si lo quieres cada semana sin reservar, existe el Pan fijo:',
    once: 'Es el único email que te envío sobre este pedido.',
    fixSubject: '¿Te guardo el pan cada semana?',
    fixKicker: 'Pan fijo',
    fixHeading: (name: string) => `${name}, ¿te lo guardo cada semana?`,
    fixIntro:
      'Ya es tu segundo pedido, así que te propongo algo: con el Pan fijo eliges tu pan una vez y cada semana te lo preparo sin que tengas que reservar ni acordarte del cierre.',
    fixPoints: [
      'Cada semana o una sí y otra no.',
      'Saltas una semana, pausas o te das de baja con un clic.',
      'Pagas al recibirlo. Nunca se cobra nada por adelantado.',
      'Tu pan va primero: se reserva antes de que abra la hornada.',
    ],
    fixButton: 'Quiero mi pan fijo →',
    fixOnce: 'Solo te escribo esto una vez. Gracias por repetir.',
  },
  ca: {
    thanksSubject: 'Què tal el pa?',
    thanksKicker: 'Gràcies per la teva primera comanda',
    thanksHeading: (name: string) => `${name}, què tal el pa?`,
    thanksIntro:
      'Espero que l’hagis gaudit. Soc un obrador molt petit, sense botiga ni publicitat: el que més m’ajuda a continuar és que altres persones del barri sàpiguen que existeixo.',
    reviewH: '30 segons que m’ajuden moltíssim',
    reviewP:
      'Si t’ha agradat, una ressenya a Google fa que els veïns em trobin quan busquen pa artesà.',
    reviewButton: 'Deixar una ressenya →',
    shareH: 'Passa-ho a un veí',
    shareP:
      'Si coneixes algú a Sant Boi, Sant Just o Santa Coloma a qui li agradi el bon pa, envia-li l’enllaç.',
    shareLink: 'Enviar per WhatsApp ↗',
    shareGift:
      'Si coneixes algú a Sant Boi, Sant Just o Santa Coloma a qui li agradi el bon pa, envia-li la teva invitació: amb la primera comanda tindrà un croissant de regal, i tu un altre a la teva propera comanda.',
    shareText:
      'He provat el pa de Molla, un obrador de Sant Boi: fermentació lenta i te’l porten a casa. Mira: ',
    newsH: 'T’aviso cada setmana?',
    newsP:
      'Un correu quan obri la fornada del dissabte i un altre el dia que tanco. Res més. Et dones de baixa amb un clic.',
    newsButton: 'Sí, avisa’m →',
    fix: 'I si el vols cada setmana sense reservar, hi ha el Pa fix:',
    once: 'És l’únic correu que t’envio sobre aquesta comanda.',
    fixSubject: 'Et guardo el pa cada setmana?',
    fixKicker: 'Pa fix',
    fixHeading: (name: string) => `${name}, te’l guardo cada setmana?`,
    fixIntro:
      'Ja és la teva segona comanda, així que et proposo una cosa: amb el Pa fix tries el teu pa un cop i cada setmana te’l preparo sense que hagis de reservar ni recordar-te del tancament.',
    fixPoints: [
      'Cada setmana o una sí i una no.',
      'Saltes una setmana, el pauses o et dones de baixa amb un clic.',
      'Pagues en rebre’l. Mai es cobra res per avançat.',
      'El teu pa va primer: es reserva abans que obri la fornada.',
    ],
    fixButton: 'Vull el meu pa fix →',
    fixOnce: 'Només t’escric això un cop. Gràcies per repetir.',
  },
};
const langOf = (o: Order): Lang => (o.lang === 'ca' ? 'ca' : 'es');
const subhead = (title: string, text: string) =>
  `<h2 style="margin:0 0 6px;font-family:${display};font-size:22px;line-height:1.15;font-weight:800;color:${c.ink};">${esc(title)}</h2><p style="margin:0 0 14px;font-family:${body};font-size:15px;line-height:1.6;color:${c.muted};">${esc(text)}</p>`;
const link = (href: string, label: string) =>
  `<a href="${esc(href)}" style="font-family:${body};font-size:15px;font-weight:600;color:${c.tile};">${esc(label)}</a>`;

// The day after a customer's first order: review, a neighbour, weekly email.
// `inviteUrl` is a double opt-in link, absent if they already subscribed.
export function thanksEmail(o: Order, inviteUrl: string | null): Message {
  const lang = langOf(o);
  const t = followCopy[lang];
  const name = firstName(o.name);
  // A personal invite link (gift croissant for both) when the order has one.
  const share = o.referralCode
    ? inviteWhatsapp(o.referralCode, lang)
    : `https://wa.me/?text=${encodeURIComponent(
        t.shareText +
          asset(`${routes.home[lang]}?utm_source=whatsapp&utm_campaign=vecino`),
      )}`;
  const shareP = o.referralCode ? t.shareGift : t.shareP;
  const fixUrl = shopUrl(lang, 'thanks', 'standing');
  const content =
    photo('miga.jpg', lang === 'ca' ? 'La molla del pa' : 'La miga del pan') +
    intro(t.thanksKicker, esc(t.thanksHeading(name)), esc(t.thanksIntro)) +
    section(
      subhead(t.reviewH, t.reviewP) +
        button(esc(googleReviews.reviewUrl), t.reviewButton),
      '28px 40px 8px',
    ) +
    section(
      subhead(t.shareH, shareP) + link(share, t.shareLink),
      '28px 40px 8px',
    ) +
    (inviteUrl
      ? section(
          subhead(t.newsH, t.newsP) + button(esc(inviteUrl), t.newsButton),
          '28px 40px 8px',
        )
      : '') +
    closing(
      '',
      `${esc(t.fix)} ${link(fixUrl, routes.standing[lang])}<br><br><span style="font-size:12px;">${esc(t.once)}</span>`,
    );
  return {
    subject: t.thanksSubject,
    html: layout(lang, t.reviewP, content),
    text: `${t.thanksHeading(name)}

${t.thanksIntro}

${t.reviewH}. ${t.reviewP}
${googleReviews.reviewUrl}

${t.shareH}. ${shareP}
${share}
${inviteUrl ? `\n${t.newsH} ${t.newsP}\n${inviteUrl}\n` : ''}
${t.fix} ${fixUrl}

${t.once}
${brand.name}`,
  };
}

// The day after a customer's second order, if they have no "pa fix" yet.
export function pafixEmail(o: Order): Message {
  const lang = langOf(o);
  const t = followCopy[lang];
  const name = firstName(o.name);
  const url = shopUrl(lang, 'pafix-offer', 'standing');
  const points = t.fixPoints
    .map(
      (p) =>
        `<tr><td valign="top" style="padding:6px 10px 6px 0;font-family:${display};font-size:18px;font-weight:800;color:${c.orange};">✳</td><td style="padding:6px 0;font-family:${body};font-size:16px;line-height:1.5;color:${c.ink};">${esc(p)}</td></tr>`,
    )
    .join('');
  const content =
    intro(t.fixKicker, esc(t.fixHeading(name)), esc(t.fixIntro)) +
    section(
      `<table role="presentation" cellpadding="0" cellspacing="0">${points}</table>`,
    ) +
    closing(button(esc(url), t.fixButton), esc(t.fixOnce));
  return {
    subject: t.fixSubject,
    html: layout(lang, t.fixIntro, content),
    text: `${t.fixHeading(name)}

${t.fixIntro}

${t.fixPoints.map((p) => `- ${p}`).join('\n')}

${t.fixButton} ${url}

${t.fixOnce}
${brand.name}`,
  };
}

// ---- Weekly summary for the baker ----------------------------------------------

export type WeeklyReport = {
  from: string;
  to: string;
  events: Record<string, number>;
  bySource: { source: string; visits: number; orders: number }[];
  orders: number;
  customers: number;
  newCustomers: number;
  revenueCents: number;
  bakes: {
    number: string;
    pickupDate: string;
    reserved: number;
    capacity: number;
  }[];
  subscribers: { confirmed: number; pending: number };
  standing: number;
  // New customers whose first order came through a friend's invite.
  referred?: number;
  emails: Record<string, number>;
};

const pct = (a: number, b: number) =>
  b ? `${Math.round((a / b) * 100)}%` : '—';

export function ownerReportEmail(r: WeeklyReport): Message {
  const e = (k: string) => r.events[k] || 0;
  const subject = `Molla · semana ${r.from} → ${r.to}: ${r.orders} pedidos, ${money(r.revenueCents)}`;
  const funnelRows: [string, string][] = [
    ['Visitas (páginas)', String(e('landing_view'))],
    ['Ven la hornada', String(e('view_current_bake'))],
    [
      'Empiezan a reservar',
      `${e('start_reservation')} · ${pct(e('start_reservation'), e('view_current_bake'))}`,
    ],
    [
      'Reservan',
      `${e('reservation_completed')} · ${pct(e('reservation_completed'), e('start_reservation'))} de los que empiezan`,
    ],
    ['Se apuntan al aviso', String(e('waitlist_signup'))],
  ];
  const salesRows: [string, string][] = [
    ['Pedidos', String(r.orders)],
    ['Clientes', `${r.customers} · ${r.newCustomers} nuevos`],
    ['Importe reservado', money(r.revenueCents)],
    ['Nuevos por invitación', String(r.referred || 0)],
    ['Pan fijo activos', String(r.standing)],
    [
      'Lista de avisos',
      `${r.subscribers.confirmed} confirmados · ${r.subscribers.pending} pendientes`,
    ],
    ...r.bakes.map(
      (b) =>
        [
          `Hornada ${b.number}`,
          `${pickupDay(b.pickupDate)} · ${b.reserved}/${b.capacity} hogazas (${pct(b.reserved, b.capacity)})`,
        ] as [string, string],
    ),
  ];
  const channelRows: [string, string][] = r.bySource.length
    ? r.bySource.map((s) => [
        s.source,
        `${s.visits} visitas · ${s.orders} pedidos`,
      ])
    : [['—', 'Sin datos']];
  const kinds: Record<string, string> = {
    open: 'Apertura de hornada',
    last: 'Último aviso',
    thanks: 'Gracias + reseña',
    pafix: 'Oferta pan fijo',
    reward: 'Regalo por invitar',
  };
  const emailRows: [string, string][] = Object.keys(kinds).map((k) => [
    kinds[k]!,
    String(r.emails[k] || 0),
  ]);
  const block = (title: string, rows: [string, string][]) =>
    section(
      `<h2 style="margin:0 0 4px;font-family:${display};font-size:20px;font-weight:800;color:${c.ink};">${esc(title)}</h2>${table(rows.map(([k, v]) => [esc(k), esc(v)]))}`,
      '24px 40px 4px',
    );
  const content =
    intro(
      'Resumen semanal',
      esc(`${r.orders} pedidos · ${money(r.revenueCents)}`),
      esc(`Del ${r.from} al ${r.to}. Lo que ha hecho el embudo sin ti.`),
    ) +
    block('Ventas', salesRows) +
    block('Embudo de la web', funnelRows) +
    block('Por canal', channelRows) +
    block('Emails automáticos enviados', emailRows) +
    section(
      `<p style="margin:0;font-family:${body};font-size:13px;line-height:1.6;color:${c.muted};">Las visitas cuentan recargas; los visitantes únicos están en Vercel Analytics. Detalle en ${link(asset('/gestio'), '/gestio')}.</p>`,
      '20px 40px 36px',
    );
  const lines = (rows: [string, string][]) =>
    rows.map(([k, v]) => `${k}: ${v}`).join('\n');
  return {
    subject,
    html: layout('es', subject, content),
    text: `${subject}

VENTAS
${lines(salesRows)}

EMBUDO
${lines(funnelRows)}

POR CANAL
${lines(channelRows)}

EMAILS AUTOMÁTICOS
${lines(emailRows)}`,
  };
}

// ---- "Convida un veí" -------------------------------------------------------

const rewardCopy = {
  es: {
    subject: 'Un vecino ha probado Molla gracias a ti',
    kicker: 'Convida un veí',
    heading: (name: string) => `${name}, tu próximo croissant es de regalo.`,
    intro:
      'Alguien a quien invitaste acaba de recibir su primer pedido. Gracias por recomendarme: en tu próximo pedido te llevas un croissant de regalo, sin hacer nada.',
    button: 'Reservar mi próximo pedido →',
    again:
      '¿Conoces a alguien más? Cada vecino que pruebe Molla con tu enlace es otro croissant:',
    share: 'Enviar la invitación por WhatsApp ↗',
  },
  ca: {
    subject: 'Un veí ha provat Molla gràcies a tu',
    kicker: 'Convida un veí',
    heading: (name: string) => `${name}, el teu proper croissant és de regal.`,
    intro:
      'Algú a qui vas convidar acaba de rebre la seva primera comanda. Gràcies per recomanar-me: a la teva propera comanda t’emportes un croissant de regal, sense fer res.',
    button: 'Reservar la meva propera comanda →',
    again:
      'Coneixes algú més? Cada veí que provi Molla amb el teu enllaç és un altre croissant:',
    share: 'Enviar la invitació per WhatsApp ↗',
  },
};

// The day after a friend's first order is delivered: the referrer's gift.
export function rewardEmail(r: {
  name: string;
  lang: Lang;
  code: string;
}): Message {
  const t = rewardCopy[r.lang];
  const url = shopUrl(r.lang, 'reward');
  const content =
    intro(t.kicker, esc(t.heading(firstName(r.name))), esc(t.intro)) +
    closing(
      button(esc(url), t.button),
      `${esc(t.again)}<br>${link(inviteWhatsapp(r.code, r.lang), t.share)}<br><span style="font-size:13px;">${esc(personalInvite(r.code, r.lang).replace(/^https?:\/\//, ''))}</span>`,
    );
  return {
    subject: t.subject,
    html: layout(r.lang, t.intro, content),
    text: `${t.heading(firstName(r.name))}

${t.intro}

${t.button} ${url}

${t.again} ${personalInvite(r.code, r.lang)}

${brand.name}`,
  };
}
