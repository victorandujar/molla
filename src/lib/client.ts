type EventName =
  | 'landing_view'
  | 'view_current_bake'
  | 'view_product'
  | 'start_reservation'
  | 'reservation_completed'
  | 'waitlist_signup'
  | 'click_instagram'
  | 'click_whatsapp'
  | 'pickup_info_view';
const allowed = ['instagram', 'google', 'whatsapp', 'direct', 'referral'];
function source() {
  const q = new URLSearchParams(location.search)
    .get('utm_source')
    ?.toLowerCase();
  if (q && allowed.includes(q)) return q;
  const ref = document.referrer;
  try {
    const host = new URL(ref).hostname;
    if (/(^|\.)google\./.test(host)) return 'google';
    if (host.endsWith('instagram.com')) return 'instagram';
    if (host !== location.hostname) return 'referral';
  } catch {}
  return 'direct';
}
const acquisition = source();
// Provider-neutral hooks plus first-party daily counters (event and channel
// only). No personal data, cookies, or third-party scripts.
const counted = !location.pathname.startsWith('/gestio');
function track(
  name: EventName,
  properties: Record<string, string | number> = {},
) {
  window.dispatchEvent(
    new CustomEvent('molla:analytics', {
      detail: { event: name, source: acquisition, ...properties },
    }),
  );
  if (counted)
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
   tiquet y la píldora flotante leen y escriben los mismos dos campos. ---- */
const quantity = document.querySelector<HTMLInputElement>('#quantity');
const banana = document.querySelector<HTMLInputElement>('#banana');
const total = document.querySelector<HTMLOutputElement>('#total');
const prices = {
  loaf: Number(form?.dataset.price || 0),
  whole: Number(form?.dataset.bananaWhole || 0),
  half: Number(form?.dataset.bananaHalf || 0),
};
const words = isCa
  ? {
      inOrder: (n: string) => `${n} a la comanda`,
      loaves: (n: number) => `${n} ${n === 1 ? 'pa' : 'pans'}`,
      empty: 'Afegeix un pa o un banana bread per reservar.',
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
      empty: 'Añade una hogaza o un banana bread para reservar.',
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
const maxOf = (el: HTMLInputElement | null) =>
  Number(el?.max || el?.dataset.max || 0);
type Cart = { loaves: number; halves: number; total: number };
function cart(): Cart {
  const loaves = read(quantity);
  const halves = read(banana);
  return {
    loaves,
    halves,
    total:
      loaves * prices.loaf +
      Math.floor(halves / 2) * prices.whole +
      (halves % 2) * prices.half,
  };
}
function render(origin?: Element | null) {
  if (!form) return;
  const c = cart();
  if (total) total.value = money(c.total);
  const view = document.querySelector('#banana-view');
  if (view) view.textContent = c.halves ? halvesLabel(c.halves) : '0';
  for (const [key, n, label] of [
    ['loaf', c.loaves, String(c.loaves)],
    ['banana', c.halves, halvesLabel(c.halves)],
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
      const isBanana =
        b.dataset.target === 'banana' ||
        b.dataset.add === 'banana' ||
        b.dataset.sub === 'banana';
      const input = isBanana ? banana : quantity;
      const n = read(input);
      const up = b.dataset.step === '1' || b.dataset.add !== undefined;
      const step = up ? addStep(b) : 1;
      b.disabled = up ? n + step > maxOf(input) : n <= 0;
    });
  const items = [
    c.loaves ? words.loaves(c.loaves) : '',
    c.halves ? `${halvesLabel(c.halves)} banana bread` : '',
  ].filter(Boolean);
  // Pieces to carry home: a half banana bread is still one piece.
  const count = c.loaves + Math.ceil(c.halves / 2);
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
      change(
        button.dataset.target === 'banana' ? banana : quantity,
        Number(button.dataset.step),
        button,
      ),
    ),
  );
document.querySelectorAll<HTMLButtonElement>('[data-add]').forEach((button) =>
  button.addEventListener('click', () => {
    const input = button.dataset.add === 'banana' ? banana : quantity;
    const step = addStep(button);
    // A whole mould when only a half is left: add what remains.
    const room = maxOf(input) - read(input);
    change(input, Math.min(step, room), button);
  }),
);
document
  .querySelectorAll<HTMLButtonElement>('[data-sub]')
  .forEach((button) =>
    button.addEventListener('click', () =>
      change(button.dataset.sub === 'banana' ? banana : quantity, -1, button),
    ),
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
    for (const line of [
      lines.join(' · '),
      isCa
        ? `Total: ${money(order.total)} · Pagament en recollir`
        : `Total: ${money(order.total)} · Pago al recoger`,
      date,
      order.pickupWindow ||
        (isCa
          ? 'Dissabte · horari de recollida confirmat amb la comanda'
          : 'Sábado · horario de recogida confirmado con el pedido'),
      order.pickupAddress ||
        (isCa
          ? 'Punt de recollida a Sant Boi de Llobregat'
          : 'Punto de recogida en Sant Boi de Llobregat'),
      isCa
        ? 'Et confirmarem el punt exacte de recollida amb la teva comanda.'
        : 'Te confirmaremos el punto exacto de recogida con tu pedido.',
    ]) {
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
    for (const input of [quantity, banana])
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
