import { brand, money } from './config';
import type { Order } from './domain';
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
  return new URL(path.replace(/^\//, ''), base.endsWith('/') ? base : `${base}/`).href;
};
export const pickupDay = (iso: string) => {
  const text = new Intl.DateTimeFormat('es-ES', {
    timeZone: 'Europe/Madrid',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(iso));
  return text.charAt(0).toUpperCase() + text.slice(1);
};
const firstName = (name: string) => name.trim().split(/\s+/)[0] || name;

function layout(preheader: string, content: string) {
  return `<!doctype html>
<html lang="es">
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
  Pan de poolish por encargo · ${esc(brand.town)}<br>
  ${brand.contact ? `<a href="mailto:${esc(brand.contact)}" style="color:${c.crumb};">${esc(brand.contact)}</a> · ` : ''}<a href="${asset('/privacidad')}" style="color:${c.crumb};">Privacidad y condiciones</a>
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
  return `Reserva ${o.code} · Tu pan del ${pickupDay(o.pickupDate).toLowerCase()}`;
}

export function confirmationText(o: Order) {
  return `Hola ${firstName(o.name)},

Tu pan ya tiene tu nombre. Reserva confirmada.

Código de recogida: ${o.code}
${o.quantity} × ${o.productName} — ${money(o.total)} (pago al recoger)

Cuándo: ${pickupDay(o.pickupDate)}, ${o.pickupWindow}
Dónde: ${o.pickupAddress}
Cómo llegar: ${brand.pickupMap}

¿Cambios o no puedes venir? Responde a este email o escribe a ${brand.contact} con tu código antes del cierre de pedidos.

Gracias por reservar,
${brand.name}`;
}

export function confirmationHtml(o: Order) {
  const map = brand.pickupMap;
  const content = `
<tr><td class="pad" style="padding:44px 40px 8px;">
  <p style="margin:0 0 10px;font-family:${body};font-size:13px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:${c.tile};">Reserva confirmada</p>
  <h1 class="h1" style="margin:0;font-family:${display};font-size:42px;line-height:1;font-weight:800;letter-spacing:-.02em;color:${c.ink};">Tu pan ya tiene tu nombre, ${esc(firstName(o.name))}.</h1>
  <p style="margin:18px 0 0;font-family:${body};font-size:16px;line-height:1.6;color:${c.muted};">Hecho a mano, con poolish y más de 20 horas de fermentación lenta. Te esperamos el ${esc(pickupDay(o.pickupDate).toLowerCase())}.</p>
</td></tr>
<tr><td class="pad" style="padding:28px 40px 4px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border:2px dashed ${c.tile};border-radius:12px;">
    <tr><td align="center" style="padding:20px 16px;">
      <p style="margin:0 0 6px;font-family:${body};font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:${c.muted};">Código de recogida</p>
      <p class="code" style="margin:0;font-family:${display};font-size:44px;line-height:1.1;font-weight:800;letter-spacing:.06em;color:${c.tile};">${esc(o.code)}</p>
      <p style="margin:6px 0 0;font-family:${body};font-size:13px;color:${c.muted};">Dilo o enséñalo al recoger.</p>
    </td></tr>
  </table>
</td></tr>
<tr><td class="pad" style="padding:20px 40px 8px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    ${details([
      ['Tu pedido', `${o.quantity} × ${esc(o.productName)}`],
      ['Total', `<strong>${money(o.total)}</strong> · pago al recoger`],
      ['Cuándo', `${esc(pickupDay(o.pickupDate))}<br>${esc(o.pickupWindow)}`],
      ['Dónde', esc(o.pickupAddress)],
    ])}
  </table>
</td></tr>
<tr><td class="pad" style="padding:16px 40px 0;">
  <a href="${esc(map)}" style="display:block;text-decoration:none;"><img src="${asset('/email/mapa-recogida.png')}" width="520" alt="Mapa del punto de recogida: ${esc(o.pickupAddress)}. Abrir en Google Maps" style="display:block;width:100%;max-width:520px;height:auto;border:0;border-radius:12px;"></a>
</td></tr>
<tr><td class="pad" style="padding:20px 40px 40px;">
  ${button(esc(map), 'Cómo llegar en Google Maps →')}
  <p style="margin:28px 0 0;font-family:${body};font-size:14px;line-height:1.6;color:${c.muted};">¿Cambios o no puedes venir? Responde a este email con tu código antes del cierre de pedidos y la hogaza pasará a otra persona.</p>
</td></tr>`;
  return layout(
    `Código ${o.code} · ${pickupDay(o.pickupDate)}, ${o.pickupWindow} · ${o.pickupAddress}`,
    content,
  );
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
  return layout(`${o.name} · ${o.quantity} hogaza(s) · ${o.code}`, content);
}
