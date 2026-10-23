import { inject, track as vercelTrack } from '@vercel/analytics';
import { sources, type Source } from './sources';
type EventName =
  | 'landing_view'
  | 'view_current_bake'
  | 'view_product'
  | 'start_reservation'
  | 'reservation_completed'
  | 'waitlist_signup'
  | 'click_instagram'
  | 'click_whatsapp'
  | 'click_channel'
  | 'subscription_completed'
  | 'pickup_info_view';
function source(): Source {
  const q = new URLSearchParams(location.search)
    .get('utm_source')
    ?.toLowerCase();
  if (q && (sources as readonly string[]).includes(q)) return q as Source;
  const ref = document.referrer;
  try {
    const host = new URL(ref).hostname;
    if (/(^|\.)google\./.test(host)) return 'google';
    if (host.endsWith('instagram.com')) return 'instagram';
    if (/(^|\.)facebook\.com$/.test(host)) return 'facebook';
    if (host !== location.hostname) return 'referral';
  } catch {}
  return 'direct';
}
const acquisition = source();
// Provider-neutral hooks, first-party daily counters (event and channel only)
// and Vercel Web Analytics custom events. No personal data or cookies.
const counted = !location.pathname.startsWith('/gestio');
// Loaded from this bundle, not inline, so the strict CSP allows it. Only the
// utm_* parameters reach Vercel: /alta and /baja carry private tokens.
if (counted)
  inject({
    framework: 'astro',
    beforeSend: (event) => {
      const url = new URL(event.url);
      for (const key of [...url.searchParams.keys()])
        if (!key.startsWith('utm_')) url.searchParams.delete(key);
      return { ...event, url: url.href };
    },
  });
function track(
  name: EventName,
  properties: Record<string, string | number> = {},
) {
  window.dispatchEvent(
    new CustomEvent('molla:analytics', {
      detail: { event: name, source: acquisition, ...properties },
    }),
  );
  if (!counted) return;
  // Page views are automatic; Vercel shows the funnel steps as custom events.
  if (name !== 'landing_view')
    vercelTrack(name, { source: acquisition, ...properties });
  fetch('/api/events', {
    method: 'POST',
    keepalive: true,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event: name, source: acquisition }),
  }).catch(() => {});
}
track('landing_view');
document
  .querySelectorAll<HTMLInputElement>('input[name=source]')
  .forEach((el) => {
    el.value = acquisition;
  });
document
  .querySelectorAll<HTMLElement>('[data-event]')
  .forEach((el) =>
    el.addEventListener('click', () => track(el.dataset.event as EventName)),
  );
const observer = new IntersectionObserver(
  (entries) => {
    for (const entry of entries)
      if (entry.isIntersecting) {
        track((entry.target as HTMLElement).dataset.eventView as EventName);
        observer.unobserve(entry.target);
      }
  },
  { threshold: 0.35 },
);
document
  .querySelectorAll('[data-event-view]')
  .forEach((el) => observer.observe(el));
const isCa = document.documentElement.lang === 'ca';
const form = document.querySelector<HTMLFormElement>('#reservation-form');
const money = (cents: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(
    cents / 100,
  );
// Generated here, not in the HTML, so a cached page never shares it.
const requestId = form?.querySelector<HTMLInputElement>(
  'input[name=requestId]',
);
if (requestId) requestId.value = crypto.randomUUID();

/* ---- El pedido: el formulario es la única fuente de verdad. La carta, el
   tiquet y la píldora flotante leen y escriben los mismos campos. ---- */
const quantity = document.querySelector<HTMLInputElement>('#quantity');
const banana = document.querySelector<HTMLInputElement>('#banana');
const croissant = document.querySelector<HTMLInputElement>('#croissant');
const pain = document.querySelector<HTMLInputElement>('#pain');
const total = document.querySelector<HTMLOutputElement>('#total');
const prices = {
  loaf: Number(form?.dataset.price || 0),
  whole: Number(form?.dataset.bananaWhole || 0),
  half: Number(form?.dataset.bananaHalf || 0),
  croissant: Number(form?.dataset.croissant || 0),
  pain: Number(form?.dataset.pain || 0),
};
// Buttons name the field they change: data-target, data-add or data-sub.
const fields: Record<string, HTMLInputElement | null> = {
  loaf: quantity,
  quantity,
  banana,
  croissant,
  pain,
};
const fieldOf = (b: HTMLElement) =>
  fields[b.dataset.target || b.dataset.add || b.dataset.sub || 'loaf'] ||
  quantity;
const words = isCa
  ? {
      inOrder: (n: string) => `${n} a la comanda`,
      loaves: (n: number) => `${n} ${n === 1 ? 'pa' : 'pans'}`,
      empty: 'Afegeix un pa, un banana bread o brioixeria per reservar.',
      pastryLeft: (n: number) =>
        n <= 0
          ? 'Brioixeria exhaurida aquesta setmana'
          : n === 1
            ? 'Queda 1 peça de brioixeria aquesta setmana'
            : `Queden ${n} peces de brioixeria aquesta setmana`,
      left: (h: number) =>
        h <= 0
          ? 'Exhaurit aquesta setmana'
          : h === 1
            ? 'Queda mig motlle aquesta setmana'
            : h === 2
              ? 'Queda un motlle aquesta setmana'
              : h === 3
                ? 'Queda un motlle i mig aquesta setmana'
                : `Queden ${h % 2 ? `${Math.floor(h / 2)} motlles i mig` : `${h / 2} motlles`} aquesta setmana`,
    }
  : {
      inOrder: (n: string) => `${n} en tu pedido`,
      loaves: (n: number) => `${n} ${n === 1 ? 'hogaza' : 'hogazas'}`,
      empty: 'Añade una hogaza, un banana bread o bollería para reservar.',
      pastryLeft: (n: number) =>
        n <= 0
          ? 'Bollería agotada esta semana'
          : n === 1
            ? 'Queda 1 pieza de bollería esta semana'
            : `Quedan ${n} piezas de bollería esta semana`,
      left: (h: number) =>
        h <= 0
          ? 'Agotado esta semana'
          : h === 1
            ? 'Queda medio molde esta semana'
            : h === 2
              ? 'Queda un molde esta semana'
              : h === 3
                ? 'Queda un molde y medio esta semana'
                : `Quedan ${h % 2 ? `${Math.floor(h / 2)} moldes y medio` : `${h / 2} moldes`} esta semana`,
    };
// Halves shown the way people say them: ½, 1, 1½, 2.
const halvesLabel = (h: number) =>
  h === 1 ? '½' : `${Math.floor(h / 2)}${h % 2 ? '½' : ''}`;
const read = (el: HTMLInputElement | null) =>
  Math.max(0, Math.floor(Number(el?.value) || 0));
// Croissants and pains au chocolat share the pieces left in the bake: each
// can grow only into what the other one leaves free.
const pastryLeft = () => Number(form?.dataset.pastryPool || 0);
const maxOf = (el: HTMLInputElement | null) => {
  const own = Number(el?.max || el?.dataset.max || 0);
  if (el?.dataset.pool !== 'pastry') return own;
  const other = el === croissant ? pain : croissant;
  return Math.max(0, Math.min(own, pastryLeft() - read(other)));
};
type Cart = {
  loaves: number;
  halves: number;
  croissants: number;
  pains: number;
  total: number;
};
function cart(): Cart {
  const loaves = read(quantity);
  const halves = read(banana);
  const croissants = read(croissant);
  const pains = read(pain);
  return {
    loaves,
    halves,
    croissants,
    pains,
    total:
      loaves * prices.loaf +
      Math.floor(halves / 2) * prices.whole +
      (halves % 2) * prices.half +
      croissants * prices.croissant +
      pains * prices.pain,
  };
}
// Names in the visitor's language for the pill: "2 croissants".
const pastryWords = {
  croissants: (n: number) => `${n} ${n === 1 ? 'croissant' : 'croissants'}`,
  pains: (n: number) =>
    `${n} ${n === 1 ? 'pain au chocolat' : 'pains au chocolat'}`,
};
function render(origin?: Element | null) {
  if (!form) return;
  const c = cart();
  if (total) total.value = money(c.total);
  const view = document.querySelector('#banana-view');
  if (view) view.textContent = c.halves ? halvesLabel(c.halves) : '0';
  for (const [id, n] of [
    ['#croissant-view', c.croissants],
    ['#pain-view', c.pains],
  ] as const) {
    const out = document.querySelector(id);
    if (out) out.textContent = String(n);
  }
  for (const [key, n, label] of [
    ['loaf', c.loaves, String(c.loaves)],
    ['banana', c.halves, halvesLabel(c.halves)],
    ['croissant', c.croissants, String(c.croissants)],
    ['pain', c.pains, String(c.pains)],
  ] as const) {
    const mini = document.querySelector<HTMLElement>(`[data-mini="${key}"]`);
    const main = document.querySelector<HTMLElement>(
      `[data-buy="${key}"] > [data-add]`,
    );
    if (mini) mini.hidden = n === 0;
    if (main) main.hidden = n > 0;
    const out = document.querySelector(`[data-count="${key}"]`);
    if (out) out.textContent = words.inOrder(label);
  }
  // Steppers never go past what is left in the bake.
  document
    .querySelectorAll<HTMLButtonElement>('[data-step], [data-add], [data-sub]')
    .forEach((b) => {
      const input = fieldOf(b);
      const n = read(input);
      const up = b.dataset.step === '1' || b.dataset.add !== undefined;
      const step = up ? addStep(b) : 1;
      b.disabled = up ? n + step > maxOf(input) : n <= 0;
    });
  const items = [
    c.loaves ? words.loaves(c.loaves) : '',
    c.halves ? `${halvesLabel(c.halves)} banana bread` : '',
    c.croissants ? pastryWords.croissants(c.croissants) : '',
    c.pains ? pastryWords.pains(c.pains) : '',
  ].filter(Boolean);
  // Pieces to carry home: a half banana bread is still one piece.
  const count = c.loaves + Math.ceil(c.halves / 2) + c.croissants + c.pains;
  document.querySelectorAll<HTMLElement>('[data-cart-count]').forEach((el) => {
    el.hidden = count === 0;
    el.textContent = String(count);
  });
  const pill = document.querySelector<HTMLElement>('[data-pill]');
  if (pill) {
    pill.classList.toggle('has-items', count > 0);
    const badge = pill.querySelector('[data-pill-count]');
    if (badge) badge.textContent = String(count);
    const list = pill.querySelector('[data-pill-items]');
    if (list && count) list.textContent = items.join(' · ');
    const sum = pill.querySelector<HTMLElement>('[data-pill-total]');
    if (sum) {
      sum.hidden = count === 0;
      sum.textContent = money(c.total);
    }
  }
  const empty = form.querySelector<HTMLElement>('[data-empty]');
  if (empty) empty.hidden = count > 0;
  window.dispatchEvent(
    new CustomEvent('molla:cart', { detail: { ...c, origin } }),
  );
  updatePill();
}
// The product card adds the size picked (whole = 2 halves, half = 1).
function addStep(button: HTMLElement) {
  if (button.dataset.add !== 'banana') return 1;
  if (button.dataset.halves) return Number(button.dataset.halves);
  const size = document.querySelector<HTMLInputElement>(
    'input[name=banana-size]:checked',
  );
  return Number(size?.value || 2);
}
let started = false;
function startOnce() {
  if (started) return;
  started = true;
  track('start_reservation');
}
function change(
  input: HTMLInputElement | null,
  delta: number,
  origin: Element,
) {
  if (!input) return;
  const next = Math.min(maxOf(input), Math.max(0, read(input) + delta));
  if (next === read(input)) return;
  input.value = String(next);
  if (delta > 0) startOnce();
  render(delta > 0 ? origin : null);
}
document
  .querySelectorAll<HTMLButtonElement>('[data-step]')
  .forEach((button) =>
    button.addEventListener('click', () =>
      change(fieldOf(button), Number(button.dataset.step), button),
    ),
  );
document.querySelectorAll<HTMLButtonElement>('[data-add]').forEach((button) =>
  button.addEventListener('click', () => {
    const input = fieldOf(button);
    const step = addStep(button);
    // A whole mould when only a half is left: add what remains.
    const room = maxOf(input) - read(input);
    change(input, Math.min(step, room), button);
  }),
);
document
  .querySelectorAll<HTMLButtonElement>('[data-sub]')
  .forEach((button) =>
    button.addEventListener('click', () => change(fieldOf(button), -1, button)),
  );
document
  .querySelectorAll<HTMLInputElement>('input[name=banana-size]')
  .forEach((r) => r.addEventListener('change', () => render()));
quantity?.addEventListener('input', () => render());

/* ---- Píldora flotante: aparece con el pedido (o, en el móvil, al dejar
   atrás la portada) y se aparta cuando el tiquet ya está a la vista. ---- */
const pill = document.querySelector<HTMLElement>('[data-pill]');
const seen = { hero: true, reserve: false };
function updatePill() {
  if (!pill) return;
  const hasItems = pill.classList.contains('has-items');
  const mobile = matchMedia('(max-width: 720px)').matches;
  const show = !seen.reserve && (hasItems || (mobile && !seen.hero));
  pill.classList.toggle('is-visible', show);
}
if (pill) {
  const watch = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.target.id === 'reserva') seen.reserve = e.isIntersecting;
      else seen.hero = e.isIntersecting;
    }
    updatePill();
  });
  const hero = document.querySelector('.hero');
  const reserve = document.querySelector('#reserva');
  if (hero) watch.observe(hero);
  if (reserve) watch.observe(reserve);
}
render();
form?.addEventListener('focusin', startOnce, { once: true });
async function submit(target: HTMLFormElement) {
  const response = await fetch(target.action, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(Object.fromEntries(new FormData(target))),
    signal: AbortSignal.timeout(20000),
  });
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error(
      isCa
        ? 'No s’ha pogut processar la sol·licitud. Torna-ho a provar.'
        : 'No se ha podido procesar la solicitud. Vuelve a intentarlo.',
    );
  }
  if (!response.ok)
    throw new Error(
      data.error ||
        (isCa
          ? 'No s’ha pogut desar. Torna-ho a provar.'
          : 'No se ha podido guardar. Vuelve a intentarlo.'),
    );
  return data;
}
function showError(target: HTMLFormElement, error: unknown) {
  const el = target.querySelector<HTMLElement>('.form-error');
  if (!el) return;
  el.textContent =
    error instanceof Error && error.name !== 'TimeoutError'
      ? error.message
      : isCa
        ? 'La connexió va lenta. Torna-ho a provar; no duplicarem la reserva.'
        : 'La conexión está tardando. Vuelve a intentarlo; no duplicaremos tu reserva.';
  el.hidden = false;
  el.focus();
}
// Home delivery asks for the town and street; pickup does not.
function syncDelivery(target: HTMLFormElement | null) {
  const homeFields = target?.querySelector<HTMLElement>('[data-home-fields]');
  if (!target || !homeFields) return;
  const home =
    target.querySelector<HTMLInputElement>('input[name=delivery]:checked')
      ?.value === 'home';
  homeFields.hidden = !home;
  homeFields
    .querySelectorAll<HTMLInputElement | HTMLSelectElement>('input, select')
    .forEach((el) => (el.disabled = !home));
}
const subscriptionForm =
  document.querySelector<HTMLFormElement>('#subscription-form');
for (const target of [form, subscriptionForm]) {
  target
    ?.querySelectorAll('input[name=delivery]')
    .forEach((el) => el.addEventListener('change', () => syncDelivery(target)));
  syncDelivery(target);
}
form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = form.querySelector<HTMLButtonElement>('button[type=submit]')!;
  if (button.disabled) return;
  if (cart().loaves + cart().halves === 0) {
    showError(form, new Error(words.empty));
    return;
  }
  button.disabled = true;
  const label = button.textContent;
  button.textContent = isCa
    ? 'Desant la teva reserva…'
    : 'Guardando tu reserva…';
  form.querySelector<HTMLElement>('.form-error')!.hidden = true;
  try {
    const order = await submit(form);
    form.hidden = true;
    const result = document.querySelector<HTMLElement>('#confirmation')!;
    const heading = document.createElement('h3');
    heading.textContent = order.demo
      ? isCa
        ? 'Així serà la teva confirmació.'
        : 'Así será tu confirmación.'
      : isCa
        ? 'El teu pa ja té el teu nom.'
        : 'Tu pan tiene tu nombre.';
    const intro = document.createElement('p');
    intro.textContent = order.demo
      ? isCa
        ? 'Reserva de prova completada. No has encarregat pa ni rebràs cap correu.'
        : 'Reserva de prueba completada. No has encargado pan ni recibirás un email.'
      : isCa
        ? 'Reserva confirmada. Guarda aquestes dades per a la recollida.'
        : 'Reserva confirmada. Guarda estos datos para la recogida.';
    const details = document.createElement('div');
    details.className = 'confirmation-details';
    const date = new Intl.DateTimeFormat(isCa ? 'ca-ES' : 'es-ES', {
      timeZone: 'Europe/Madrid',
      dateStyle: 'full',
    }).format(new Date(order.pickupDate));
    const lines = (order.items as { quantity: number; name: string }[]).map(
      (i) => `${i.quantity} × ${i.name}`,
    );
    const home = order.delivery as { address: string } | undefined;
    for (const line of [
      lines.join(' · '),
      order.firstOrder
        ? isCa
          ? 'Regal de benvinguda: un quart de banana bread i un chutney de pebrot vermell i tomàquet.'
          : 'Regalo de bienvenida: un cuarto de banana bread y un chutney de pimiento rojo y tomate.'
        : '',
      home
        ? isCa
          ? `Total: ${money(order.total)} · Pagament en rebre’l`
          : `Total: ${money(order.total)} · Pago al recibirlo`
        : isCa
          ? `Total: ${money(order.total)} · Pagament en recollir`
          : `Total: ${money(order.total)} · Pago al recoger`,
      date,
      order.pickupWindow ||
        (isCa
          ? 'Horari de recollida confirmat amb la comanda'
          : 'Horario de recogida confirmado con el pedido'),
      home
        ? `${order.pickupAddress} · ${home.address}`
        : order.pickupAddress ||
          (isCa
            ? 'Punt de recollida a Sant Boi de Llobregat'
            : 'Punto de recogida en Sant Boi de Llobregat'),
      home
        ? isCa
          ? 'Te’l porto a casa dins de la franja.'
          : 'Te lo llevo a casa dentro de la franja.'
        : isCa
          ? 'Et confirmarem el punt exacte de recollida amb la teva comanda.'
          : 'Te confirmaremos el punto exacto de recogida con tu pedido.',
    ].filter(Boolean)) {
      const row = document.createElement('div');
      row.textContent = line;
      details.append(row);
    }
    const ref = document.createElement('p');
    ref.className = 'confirmation-ref';
    ref.textContent = `${isCa ? 'Codi de recollida' : 'Código de recogida'}: ${order.code}`;
    const save = document.createElement('button');
    save.className = 'button';
    save.type = 'button';
    save.textContent = isCa
      ? 'Desar o imprimir la confirmació'
      : 'Guardar o imprimir confirmación';
    save.addEventListener('click', () => window.print());
    result.replaceChildren(heading, intro, details, ref, save);
    if (order.contact) {
      const support = document.createElement('a');
      support.className = 'text-link';
      support.href = `mailto:${order.contact}?subject=${encodeURIComponent('Reserva ' + order.code)}`;
      support.textContent = isCa
        ? 'Consultar o canviar la reserva ↗'
        : 'Consultar o cambiar mi reserva ↗';
      result.append(support);
    }
    // Word of mouth: a ready-made message for a neighbour, tagged so the
    // visits it brings show up as their own campaign.
    if (!order.demo) {
      const invite = new URL(location.origin + location.pathname);
      invite.searchParams.set('utm_source', 'whatsapp');
      invite.searchParams.set('utm_campaign', 'vecino');
      const share = document.createElement('a');
      share.className = 'text-link';
      share.target = '_blank';
      share.rel = 'noopener noreferrer';
      share.href = `https://wa.me/?text=${encodeURIComponent(
        (isCa
          ? 'Acabo d’encarregar pa artesà de fermentació lenta per a aquesta setmana. Te’l porten a casa dimecres o dissabte a Sant Boi, Sant Just i Santa Coloma: '
          : 'Acabo de encargar pan artesano de fermentación lenta para esta semana. Te lo llevan a casa el miércoles o el sábado en Sant Boi, Sant Just y Santa Coloma: ') +
          invite.href,
      )}`;
      share.textContent = isCa
        ? 'Passa-ho a un veí per WhatsApp ↗'
        : 'Pásaselo a un vecino por WhatsApp ↗';
      result.append(share);
    }
    const fix = document.createElement('a');
    fix.className = 'text-link';
    fix.href = isCa ? '/pa-fix' : '/es/pan-fijo';
    fix.textContent = isCa
      ? 'El vols cada setmana? Pa fix →'
      : '¿Lo quieres cada semana? Pan fijo →';
    result.append(fix);
    result.hidden = false;
    result.focus();
    pill?.classList.remove('has-items', 'is-visible');
    pill?.remove();
    document
      .querySelectorAll<HTMLElement>('[data-cart-count]')
      .forEach((el) => (el.hidden = true));
    window.dispatchEvent(new CustomEvent('molla:confirmed'));
    track('reservation_completed', {
      quantity: order.quantity,
      total: order.total,
    });
    void refreshBake();
  } catch (error) {
    showError(form, error);
    button.disabled = false;
    button.textContent = label;
  }
});
const waitlist = document.querySelector<HTMLFormElement>('#waitlist-form');
waitlist?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = waitlist.querySelector<HTMLButtonElement>(
    'button[type=submit]',
  )!;
  if (button.disabled) return;
  button.disabled = true;
  const label = button.textContent;
  button.textContent = isCa ? 'Desant…' : 'Guardando…';
  waitlist.querySelector<HTMLElement>('.form-error')!.hidden = true;
  try {
    const result = await submit(waitlist);
    const success = waitlist.querySelector<HTMLElement>('.waitlist-success')!;
    if (!result.confirm) success.textContent = success.dataset.direct || '';
    success.hidden = false;
    button.textContent = isCa ? 'Ja ets a la llista' : 'Ya estás en la lista';
    track('waitlist_signup');
  } catch (error) {
    showError(waitlist, error);
    button.disabled = false;
    button.textContent = label;
  }
});
async function refreshBake() {
  try {
    const response = await fetch('/api/bake', { cache: 'no-store' });
    if (!response.ok) return;
    const b = await response.json();
    if (b.capacity)
      document
        .querySelectorAll('[data-left]')
        .forEach((n) => (n.textContent = String(b.capacity - b.reserved)));
    document
      .querySelectorAll('.loaf-meter span')
      .forEach((dot, i) => dot.classList.toggle('taken', i < b.reserved));
    if (typeof b.bananaLeft === 'number') {
      document
        .querySelectorAll<HTMLElement>('[data-banana-left]')
        .forEach((el) => {
          el.dataset.bananaLeft = String(b.bananaLeft);
          el.textContent = words.left(b.bananaLeft);
        });
      if (banana) banana.dataset.max = String(Math.min(4, b.bananaLeft));
    }
    if (typeof b.pastryLeft === 'number') {
      if (form) form.dataset.pastryPool = String(b.pastryLeft);
      document
        .querySelectorAll<HTMLElement>('[data-pastry-left]')
        .forEach((el) => {
          el.dataset.pastryLeft = String(b.pastryLeft);
          el.textContent =
            b.pastries === false
              ? isCa
                ? 'Només per a la fornada de dissabte'
                : 'Solo para la hornada del sábado'
              : words.pastryLeft(b.pastryLeft);
        });
      const ticks = document.querySelectorAll('[data-pastry-meter] span');
      ticks.forEach((tick, i) =>
        tick.classList.toggle('taken', i >= b.pastryLeft),
      );
    }
    // At zero reservations the card shows the small batch, never an empty counter.
    document
      .querySelector<HTMLElement>('[data-count-small]')
      ?.toggleAttribute('hidden', b.reserved > 0);
    document
      .querySelector<HTMLElement>('[data-count-left]')
      ?.toggleAttribute('hidden', b.reserved === 0);
    const progress = document.querySelector('progress');
    if (progress) {
      progress.hidden = b.reserved === 0;
      progress.value = b.reserved;
      progress.setAttribute(
        'aria-label',
        isCa
          ? `${b.reserved} de ${progress.max} pans reservats`
          : `${b.reserved} de ${progress.max} hogazas reservadas`,
      );
    }
    if (b.state !== 'OPEN') {
      const label = document.querySelector('[data-bake-label]');
      if (label)
        label.textContent =
          b.state === 'SOLD_OUT'
            ? isCa
              ? 'Fornada exhaurida'
              : 'Hornada agotada'
            : b.state === 'UPCOMING'
              ? isCa
                ? 'Propera fornada'
                : 'Próxima hornada'
              : isCa
                ? 'Comandes tancades'
                : 'Pedidos cerrados';
      const cta = document.querySelector<HTMLAnchorElement>('[data-bake-cta]');
      if (cta) {
        cta.href = '#avisame';
        cta.textContent = isCa
          ? 'Avisa’m de la propera ↗'
          : 'Avísame de la próxima ↗';
      }
      if (form && !form.hidden) {
        form.querySelector<HTMLButtonElement>('button[type=submit]')!.disabled =
          true;
        showError(
          form,
          new Error(
            isCa
              ? 'Aquesta fornada ja no admet comandes. Apunta’t a l’avís de la propera, més avall.'
              : 'Esta hornada ya no admite pedidos. Apúntate al aviso de la próxima, más abajo.',
          ),
        );
      }
    } else if (quantity && b.capacity) {
      quantity.max = String(Math.min(4, b.capacity - b.reserved));
    }
    // Keep the order within what is left after other people's reservations.
    for (const input of [quantity, banana, croissant, pain])
      if (input && read(input) > maxOf(input))
        input.value = String(maxOf(input));
    render();
  } catch {
    /* Server validates availability on every submission. */
  }
}
// The page may come from the CDN cache: refresh on load and when returning to
// it. The transaction remains the final authority.
if (form || document.querySelector('[data-left]')) void refreshBake();
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') void refreshBake();
});

// ---- Pa fix: join a standing order --------------------------------------
if (subscriptionForm) {
  const sub = subscriptionForm;
  const total = sub.querySelector<HTMLOutputElement>('#sub-total');
  // Price of one delivery, in the same halves logic as the order form.
  const perDelivery = () => {
    const value = (name: string) =>
      Number(
        sub.querySelector<HTMLSelectElement>(`[name=${name}]`)?.value || 0,
      );
    const halves = value('banana');
    const cents =
      value('quantity') * Number(sub.dataset.loaf) +
      Math.floor(halves / 2) * Number(sub.dataset.whole) +
      (halves % 2) * Number(sub.dataset.half);
    if (total) total.textContent = money(cents);
  };
  sub
    .querySelectorAll('select[name=quantity], select[name=banana]')
    .forEach((el) => el.addEventListener('change', perDelivery));
  perDelivery();
  sub.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = sub.querySelector<HTMLButtonElement>('button[type=submit]')!;
    if (button.disabled) return;
    button.disabled = true;
    const label = button.textContent;
    button.textContent = isCa ? 'Desant…' : 'Guardando…';
    sub.querySelector<HTMLElement>('.form-error')!.hidden = true;
    try {
      const data = await submit(sub);
      const result = document.querySelector<HTMLElement>(
        '#subscription-result',
      )!;
      const first = result.querySelector<HTMLElement>('[data-first]')!;
      first.textContent = data.firstDay
        ? isCa
          ? `La teva primera entrega: ${data.firstDay}${data.firstWindow ? `, ${data.firstWindow}` : ''}.`
          : `Tu primera entrega: ${data.firstDay}${data.firstWindow ? `, ${data.firstWindow}` : ''}.`
        : isCa
          ? 'Aquesta setmana la fornada és plena: començaràs la setmana vinent.'
          : 'Esta semana la hornada está completa: empezarás la semana que viene.';
      result.querySelector<HTMLAnchorElement>('[data-manage]')!.href =
        data.manage;
      sub.hidden = true;
      result.hidden = false;
      result.focus();
      track('subscription_completed', { total: data.total });
    } catch (error) {
      showError(sub, error);
      button.disabled = false;
      button.textContent = label;
    }
  });
}
