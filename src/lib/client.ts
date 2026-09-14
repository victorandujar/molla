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
// Provider-neutral hooks. No personal data, cookies, or third-party scripts.
function track(
  name: EventName,
  properties: Record<string, string | number> = {},
) {
  window.dispatchEvent(
    new CustomEvent('molla:analytics', {
      detail: { event: name, source: acquisition, ...properties },
    }),
  );
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
const form = document.querySelector<HTMLFormElement>('#reservation-form');
const money = (cents: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(
    cents / 100,
  );
const quantity = document.querySelector<HTMLInputElement>('#quantity');
const total = document.querySelector<HTMLOutputElement>('#total');
function update() {
  if (quantity && total && form) {
    const n = quantity.valueAsNumber;
    total.value = Number.isFinite(n)
      ? money(n * Number(form.dataset.price))
      : '—';
  }
}
document.querySelectorAll<HTMLButtonElement>('[data-step]').forEach((button) =>
  button.addEventListener('click', () => {
    if (!quantity) return;
    const n = quantity.valueAsNumber || 1;
    quantity.value = String(
      Math.min(
        Number(quantity.max),
        Math.max(1, n + Number(button.dataset.step)),
      ),
    );
    quantity.dispatchEvent(new Event('input', { bubbles: true }));
  }),
);
quantity?.addEventListener('input', update);
form?.addEventListener('focusin', () => track('start_reservation'), {
  once: true,
});
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
      'No se ha podido procesar la solicitud. Vuelve a intentarlo.',
    );
  }
  if (!response.ok)
    throw new Error(
      data.error || 'No se ha podido guardar. Vuelve a intentarlo.',
    );
  return data;
}
function showError(target: HTMLFormElement, error: unknown) {
  const el = target.querySelector<HTMLElement>('.form-error');
  if (!el) return;
  el.textContent =
    error instanceof Error && error.name !== 'TimeoutError'
      ? error.message
      : 'La conexión está tardando. Vuelve a intentarlo; no duplicaremos tu reserva.';
  el.hidden = false;
  el.focus();
}
form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = form.querySelector<HTMLButtonElement>('button[type=submit]')!;
  if (button.disabled) return;
  button.disabled = true;
  const label = button.textContent;
  button.textContent = 'Guardando tu reserva…';
  form.querySelector<HTMLElement>('.form-error')!.hidden = true;
  try {
    const order = await submit(form);
    form.hidden = true;
    const result = document.querySelector<HTMLElement>('#confirmation')!;
    const heading = document.createElement('h3');
    heading.textContent = order.demo
      ? 'Así será tu confirmación.'
      : 'Tu pan tiene tu nombre.';
    const intro = document.createElement('p');
    intro.textContent = order.demo
      ? 'Reserva de prueba completada. No has encargado pan ni recibirás un email.'
      : 'Reserva confirmada. Guarda estos datos para la recogida.';
    const details = document.createElement('div');
    details.className = 'confirmation-details';
    const date = new Intl.DateTimeFormat('es-ES', {
      timeZone: 'Europe/Madrid',
      dateStyle: 'full',
    }).format(new Date(order.pickupDate));
    for (const line of [
      `${order.quantity} × ${order.productName}`,
      `Total: ${money(order.total)} · Pago al recoger`,
      date,
      order.pickupWindow ||
        'Franja pendiente de confirmar antes del lanzamiento',
      order.pickupAddress || 'Punto de recogida pendiente de publicar',
    ]) {
      const row = document.createElement('div');
      row.textContent = line;
      details.append(row);
    }
    const ref = document.createElement('p');
    ref.className = 'confirmation-ref';
    ref.textContent = `Referencia: ${order.id}`;
    const save = document.createElement('button');
    save.className = 'button';
    save.type = 'button';
    save.textContent = 'Guardar o imprimir confirmación';
    save.addEventListener('click', () => window.print());
    result.replaceChildren(heading, intro, details, ref, save);
    if (order.contact) {
      const support = document.createElement('a');
      support.className = 'text-link';
      support.href = `mailto:${order.contact}?subject=${encodeURIComponent('Reserva ' + order.id)}`;
      support.textContent = 'Consultar o cambiar mi reserva ↗';
      result.append(support);
    }
    result.hidden = false;
    result.focus();
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
  button.textContent = 'Guardando…';
  waitlist.querySelector<HTMLElement>('.form-error')!.hidden = true;
  try {
    await submit(waitlist);
    waitlist.querySelector<HTMLElement>('.waitlist-success')!.hidden = false;
    button.textContent = 'Ya estás en la lista';
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
    const n = document.querySelector('[data-reserved]');
    if (n) n.textContent = String(b.reserved);
    const progress = document.querySelector('progress');
    if (progress) {
      progress.value = b.reserved;
      progress.setAttribute(
        'aria-label',
        `${b.reserved} de ${progress.max} hogazas reservadas`,
      );
    }
    if (b.state !== 'OPEN') {
      const label = document.querySelector('[data-bake-label]');
      if (label)
        label.textContent =
          b.state === 'SOLD_OUT'
            ? 'Hornada agotada'
            : b.state === 'UPCOMING'
              ? 'Próxima hornada'
              : 'Pedidos cerrados';
      const cta = document.querySelector<HTMLAnchorElement>('[data-bake-cta]');
      if (cta) {
        cta.href = '#avisame';
        cta.textContent = 'Avísame de la próxima ↗';
      }
      if (form && !form.hidden) {
        form.querySelector<HTMLButtonElement>('button[type=submit]')!.disabled =
          true;
        showError(
          form,
          new Error(
            'Esta hornada ya no admite pedidos. Apúntate al aviso de la próxima, más abajo.',
          ),
        );
      }
    } else if (quantity && b.capacity) {
      quantity.max = String(Math.min(4, b.capacity - b.reserved));
    }
  } catch {
    /* Server validates availability on every submission. */
  }
}
// Refresh only when returning to the page; the transaction is the final authority.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') void refreshBake();
});
