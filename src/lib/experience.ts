// «Fermenta mentre baixes»: la portada és la molla del packaging, viva; les
// 35 hores es veuen pujar en una pantalla; un tall obre el pa; la carta és un
// taulell que gira. Tot és una millora: sense JavaScript, o amb «reduir
// moviment», la pàgina queda quieta i completa.
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (t: number) => 1 - Math.pow(1 - t, 3);
const $ = <T extends Element = HTMLElement>(
  s: string,
  root: ParentNode = document,
) => root.querySelector<T>(s);
const $$ = <T extends Element = HTMLElement>(
  s: string,
  root: ParentNode = document,
) => [...root.querySelectorAll<T>(s)];

const COBALT = '#2442a4';
const PAPER = '#f6efe5';
const TIN = '#ece3d4';

type Hole = {
  p: Path2D;
  cx: number;
  cy: number;
  r: number;
  ph: number;
  s: number;
};
type Crumb = { w: number; h: number; holes: Hole[] };

// La molla del packaging, un camí per alvèol, carregada un sol cop.
let crumbPromise: Promise<Crumb | null> | null = null;
function loadCrumb(url: string) {
  crumbPromise ??= fetch(url)
    .then((r) => r.json())
    .then(
      (c: {
        w: number;
        h: number;
        holes: { d: string; cx: number; cy: number }[];
      }) => {
        const swirl = { x: 520, y: 600 };
        const far = Math.hypot(c.w, c.h) / 2;
        return {
          w: c.w,
          h: c.h,
          holes: c.holes.map((h) => ({
            p: new Path2D(h.d),
            cx: h.cx,
            cy: h.cy,
            r: Math.hypot(h.cx - swirl.x, h.cy - swirl.y) / far,
            ph: Math.random() * Math.PI * 2,
            s: 1,
          })),
        };
      },
    )
    .catch(() => null);
  return crumbPromise;
}

function fitCanvas(cv: HTMLCanvasElement) {
  const ctx = cv.getContext('2d')!;
  const d = Math.min(devicePixelRatio || 1, 2);
  const w = cv.clientWidth;
  const h = cv.clientHeight;
  cv.width = Math.round(w * d);
  cv.height = Math.round(h * d);
  ctx.setTransform(d, 0, 0, d, 0, 0);
  return { ctx, w, h };
}

function drawHole(
  ctx: CanvasRenderingContext2D,
  h: Hole,
  x: number,
  y: number,
  k: number,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(k, k);
  ctx.translate(-h.cx, -h.cy);
  ctx.fill(h.p);
  ctx.restore();
}

/* ---- 1 · La molla viva ---- */
function alive() {
  const section = $('[data-alive]');
  const cv = $<HTMLCanvasElement>('.alive-canvas', section ?? document);
  if (!section || !cv?.dataset.crumb) return;
  const tag = $('.alive-tag', section);
  let crumb: Crumb | null = null;
  let box = fitCanvas(cv);
  let k = 1;
  let ox = 0;
  let oy = 0;
  let start = performance.now();
  let visible = true;
  let leave = 0;
  const ptr = { x: 0, y: 0, on: false };

  const layout = () => {
    box = fitCanvas(cv);
    if (!crumb) return;
    k = Math.max(box.w / crumb.w, box.h / crumb.h);
    ox = (box.w - crumb.w * k) / 2;
    oy = (box.h - crumb.h * k) / 2;
  };
  const draw = (now: number) => {
    const { ctx, w, h } = box;
    ctx.fillStyle = COBALT;
    ctx.fillRect(0, 0, w, h);
    if (!crumb) return;
    ctx.fillStyle = PAPER;
    const t = (now - start) / 1000;
    const flood = 1 + Math.pow(leave, 2) * 2.4;
    const px = (ptr.x - ox) / k;
    const py = (ptr.y - oy) / k;
    for (const hole of crumb.holes) {
      const reveal = reduce ? 1 : ease(clamp((t - hole.r * 1.3) / 1.1));
      if (reveal <= 0) continue;
      const breathe = reduce ? 1 : 1 + 0.045 * Math.sin(t * 0.9 + hole.ph);
      let target = 1;
      if (ptr.on && !reduce) {
        const dd = Math.hypot(hole.cx - px, hole.cy - py) / 150;
        target = 1 + 0.75 * Math.exp(-dd * dd);
      }
      hole.s += (target - hole.s) * 0.08;
      drawHole(
        ctx,
        hole,
        ox + hole.cx * k,
        oy + hole.cy * k,
        k * reveal * breathe * hole.s * flood,
      );
    }
  };
  const loop = (now: number) => {
    if (visible) draw(now);
    requestAnimationFrame(loop);
  };

  loadCrumb(cv.dataset.crumb).then((c) => {
    crumb = c;
    layout();
    start = performance.now();
    if (reduce) draw(start);
    else requestAnimationFrame(loop);
  });
  addEventListener('resize', () => {
    layout();
    if (reduce) draw(performance.now());
  });
  new IntersectionObserver(([e]) => (visible = e!.isIntersecting)).observe(
    section,
  );
  // Quan baixes, els alvèols s'obren fins que el paper guanya.
  addEventListener(
    'scroll',
    () => {
      const r = section.getBoundingClientRect();
      leave = clamp(-r.top / r.height);
      if (tag && !reduce) tag.style.transform = `scale(${1 - leave * 0.35})`;
    },
    { passive: true },
  );
  // El dit o el ratolí premen la massa (sobre tota la portada, no només el llenç).
  const press = (e: PointerEvent) => {
    const r = cv.getBoundingClientRect();
    ptr.x = e.clientX - r.left;
    ptr.y = e.clientY - r.top;
    ptr.on = true;
  };
  section.addEventListener('pointermove', press);
  section.addEventListener('pointerdown', press);
  section.addEventListener('pointerleave', () => (ptr.on = false));
}

/* ---- 2 · 35 hores: la massa puja ---- */
function ferment() {
  const section = $('[data-ferment]');
  const cv = $<HTMLCanvasElement>('[data-ferment-canvas]', section ?? document);
  const src = $<HTMLCanvasElement>('.alive-canvas')?.dataset.crumb;
  if (!section || !cv) return;
  const phases = JSON.parse(
    $('[data-ferment-phases]', section)?.textContent || '[]',
  ) as [number, string, string][];
  const scrub = $<HTMLInputElement>('[data-ferment-scrub]', section)!;
  const hoursEl = $('[data-ferment-hours]', section)!;
  const word = $('[data-ferment-word]', section)!;
  const say = $('[data-ferment-say]', section)!;
  const fig = $('[data-ferment-fig]', section)!;
  const fast = $('[data-vs-fast]', section)!;
  const me = $('[data-vs-me]', section)!;
  const meH = $('[data-vs-me-h]', section)!;
  let crumb: Crumb | null = null;
  let box = fitCanvas(cv);
  let hour = 35;
  let playing = 0;
  let played = false;
  let visible = false;

  const draw = (now = performance.now()) => {
    const { ctx, w, h } = box;
    if (!w) return;
    const f = hour / 35;
    const t = now / 1000;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = TIN;
    ctx.fillRect(0, 0, w, h);
    // La massa puja del 28 % al 92 % del motlle i fa cúpula.
    const level = h * (1 - (0.28 + 0.64 * (1 - Math.pow(1 - f, 2))));
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w + 8; x += 8) {
      const dome = Math.sin((x / w) * Math.PI) * h * 0.06 * f;
      const wob = reduce ? 0 : Math.sin(x / 38 + t * 1.4) * 3 * (0.3 + f);
      ctx.lineTo(x, level - dome + wob);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fillStyle = COBALT;
    ctx.fill();
    ctx.clip();
    if (crumb) {
      const kk = Math.max(w / crumb.w, h / crumb.h) * 1.15;
      const ox = (w - crumb.w * kk) / 2;
      const oy = h - crumb.h * kk;
      ctx.fillStyle = PAPER;
      for (const hole of crumb.holes) {
        const g = clamp((f - (0.08 + hole.r * 0.55)) / 0.35);
        if (g <= 0) continue;
        const s =
          ease(g) *
          (0.55 + 0.45 * f) *
          (reduce ? 1 : 1 + 0.03 * Math.sin(t * 1.1 + hole.ph));
        drawHole(ctx, hole, ox + hole.cx * kk, oy + hole.cy * kk, kk * s);
      }
    }
    ctx.restore();
  };
  const set = (v: number, fromInput = false) => {
    hour = clamp(v, 0, 35);
    const H = Math.round(hour);
    hoursEl.textContent = String(H).padStart(2, '0');
    fig.textContent = meH.textContent = `${H} h`;
    if (!fromInput) scrub.value = String(hour);
    scrub.style.setProperty('--fill', `${(hour / 35) * 100}%`);
    let ph = phases[0]!;
    for (const p of phases) if (hour >= p[0]) ph = p;
    if (word.textContent !== ph[1]) {
      word.textContent = ph[1];
      say.textContent = ph[2];
    }
    me.style.setProperty('--w', `${(hour / 35) * 100}%`);
    fast.style.setProperty('--w', `${(Math.min(hour, 3) / 35) * 100}%`);
    draw();
  };
  const play = () => {
    if (reduce) return set(35);
    const id = ++playing;
    const t0 = performance.now();
    const step = (now: number) => {
      if (id !== playing) return;
      const p = clamp((now - t0) / 4200);
      set(35 * (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  scrub.addEventListener('input', () => {
    playing++;
    set(parseFloat(scrub.value), true);
  });
  $('[data-ferment-replay]', section)?.addEventListener('click', () => {
    set(0);
    play();
  });
  // Arrossegar damunt la massa també mou el temps.
  let dragX: number | null = null;
  let dragH = 0;
  cv.addEventListener('pointerdown', (e) => {
    dragX = e.clientX;
    dragH = hour;
    playing++;
    cv.setPointerCapture(e.pointerId);
  });
  cv.addEventListener('pointermove', (e) => {
    if (dragX !== null) set(dragH + ((e.clientX - dragX) / box.w) * 35);
  });
  cv.addEventListener('pointerup', () => (dragX = null));
  cv.addEventListener('pointercancel', () => (dragX = null));
  addEventListener('resize', () => {
    box = fitCanvas(cv);
    draw();
  });
  const maybePlay = () => {
    if (visible && crumb && !played) {
      played = true;
      set(0);
      play();
    }
  };
  // It plays when the tin itself is well in view, not when the section edge
  // appears: on a big screen the dough used to rise before anyone saw it.
  new IntersectionObserver(
    ([e]) => {
      visible = e!.isIntersecting;
      maybePlay();
    },
    { threshold: 0.6 },
  ).observe(cv);
  const idle = (now: number) => {
    if (visible && !reduce) draw(now);
    requestAnimationFrame(idle);
  };
  // Empty tin while it waits to be seen; full (35 h) when nothing will move.
  set(reduce ? 35 : 0);
  if (src)
    loadCrumb(src).then((c) => {
      crumb = c;
      draw();
      maybePlay();
    });
  if (!reduce) requestAnimationFrame(idle);
}

/* ---- 3 · El tall ---- */
function cut() {
  const section = $('[data-cut]');
  if (!section || reduce) return;
  section.classList.add('is-live');
  const top = $('.cut-top', section)!;
  const bot = $('.cut-bot', section)!;
  const knife = $('.cut-knife', section)!;
  const photo = $('.cut-photo', section)!;
  const says = $('.cut-says', section)!;
  const update = () => {
    const r = section.getBoundingClientRect();
    const p = clamp(-r.top / (r.height - innerHeight));
    const k1 = ease(clamp(p / 0.18));
    const open = ease(clamp((p - 0.2) / 0.5));
    knife.style.transform = `scaleX(${k1})`;
    knife.style.opacity = open > 0.02 ? '0' : '1';
    top.style.transform = `translateY(${-open * 101}%)`;
    bot.style.transform = `translateY(${open * 101}%)`;
    photo.style.transform = `scale(${1.18 - open * 0.18})`;
    says.style.opacity = String(clamp((p - 0.62) / 0.18));
  };
  let ticking = false;
  addEventListener(
    'scroll',
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        update();
      });
    },
    { passive: true },
  );
  addEventListener('resize', update);
  update();
}

/* ---- 4 · El taulell: un producte cada vegada, de costat ---- */
// No scroll hijack: the page keeps going down, and the counter moves sideways
// with the arrows, the trackpad, the finger or by dragging it with the mouse.
function counter() {
  const section = $('[data-counter]');
  const track = $('[data-counter-track]', section ?? document);
  if (!section || !track) return;
  const bars = $$('.counter-progress i', section);
  const spins = $$<HTMLImageElement>('img.is-spin', track);
  const prev = $<HTMLButtonElement>('[data-counter-prev]', section);
  const next = $<HTMLButtonElement>('[data-counter-next]', section);
  const cards = $$('.bread-card', track);
  const max = () => Math.max(0, track.scrollWidth - track.clientWidth);
  const step = () => {
    const [a, b] = cards;
    return a && b ? b.offsetLeft - a.offsetLeft : track.clientWidth;
  };
  const paint = () => {
    const m = max();
    const p = m ? track.scrollLeft / m : 0;
    if (!reduce)
      spins.forEach(
        (img, i) => (img.style.transform = `rotate(${p * 220 + i * 37}deg)`),
      );
    const n = Math.round(track.scrollLeft / step());
    bars.forEach((b, i) => b.classList.toggle('on', i <= n));
    if (prev) prev.disabled = track.scrollLeft <= 4;
    if (next) next.disabled = track.scrollLeft >= m - 4;
  };
  const go = (dir: number) =>
    track.scrollBy({
      left: dir * step(),
      behavior: reduce ? 'auto' : 'smooth',
    });
  prev?.addEventListener('click', () => go(-1));
  next?.addEventListener('click', () => go(1));
  track.addEventListener('scroll', () => requestAnimationFrame(paint), {
    passive: true,
  });
  // Dragging with the mouse, like sliding a board along the counter.
  let downX: number | null = null;
  let startLeft = 0;
  let moved = false;
  track.addEventListener('pointerdown', (e) => {
    if (
      e.pointerType !== 'mouse' ||
      (e.target as Element).closest('button, a, input, label')
    )
      return;
    downX = e.clientX;
    startLeft = track.scrollLeft;
    moved = false;
    track.classList.add('is-dragging');
  });
  addEventListener('pointermove', (e) => {
    if (downX === null) return;
    const dx = e.clientX - downX;
    if (Math.abs(dx) > 4) moved = true;
    track.scrollLeft = startLeft - dx;
  });
  addEventListener('pointerup', () => {
    if (downX === null) return;
    downX = null;
    track.classList.remove('is-dragging');
    // Settle on the nearest product.
    if (moved)
      track.scrollTo({
        left: Math.round(track.scrollLeft / step()) * step(),
        behavior: reduce ? 'auto' : 'smooth',
      });
  });
  track.addEventListener(
    'click',
    (e) => {
      if (!moved) return;
      e.preventDefault();
      e.stopPropagation();
      moved = false;
    },
    true,
  );
  addEventListener('resize', paint);
  paint();
}

/* ---- Els camps de la frase fan l'amplada del que hi escrius ---- */
function fitFields() {
  const fields = $$('.sentence').flatMap((s) =>
    $$<HTMLInputElement | HTMLSelectElement>(
      'input:not([type=radio]), select',
      s,
    ),
  );
  if (!fields.length) return;
  const meter = document.createElement('span');
  meter.setAttribute('aria-hidden', 'true');
  meter.style.cssText =
    'position:absolute;left:-9999px;top:0;visibility:hidden;white-space:pre;pointer-events:none';
  document.body.append(meter);
  const fit = (el: HTMLInputElement | HTMLSelectElement) => {
    const cs = getComputedStyle(el);
    meter.style.font = cs.font;
    meter.style.letterSpacing = cs.letterSpacing;
    meter.textContent =
      el instanceof HTMLSelectElement
        ? el.options[el.selectedIndex]?.text || ''
        : el.value || el.placeholder || '';
    const extra = el instanceof HTMLSelectElement ? 0.75 : 0.35;
    el.style.width = `calc(${Math.ceil(meter.offsetWidth)}px + ${extra}em)`;
  };
  const all = () => fields.forEach(fit);
  for (const el of fields) {
    el.addEventListener('input', () => fit(el));
    el.addEventListener('change', () => fit(el));
  }
  addEventListener('resize', all);
  all();
  document.fonts?.ready.then(all);
}

/* ---- 5 · La comanda, dita com una frase ---- */
function sentence() {
  const el = $('[data-sentence]');
  const form = $<HTMLFormElement>('#reservation-form');
  const what = $('[data-sentence-what]', el ?? document);
  if (!el || !form || !what) return;
  const empty = what.textContent;
  const and = el.dataset.and ?? 'i';
  const update = () => {
    const parts: string[] = [];
    for (const line of $$('[data-line]', form)) {
      const input = $<HTMLInputElement>('input', line);
      const qty = Number(input?.value || 0);
      if (!qty) continue;
      const view = $('output', line)?.textContent?.trim();
      const name = $('.line-name', line)?.textContent?.trim() ?? '';
      parts.push(`${view || qty} × ${name}`);
    }
    what.textContent = parts.length
      ? parts.length > 1
        ? `${parts.slice(0, -1).join(', ')} ${and} ${parts.at(-1)}`
        : parts[0]!
      : empty;
  };
  const total = $('#total', form);
  if (total)
    new MutationObserver(update).observe(total, {
      childList: true,
      characterData: true,
      subtree: true,
    });
  form.addEventListener('input', update);
  form.addEventListener('change', update);
  update();
}

/* ---- La tira de la comanda: cada peça diu quantes en portes ---- */
function picker() {
  const form = $<HTMLFormElement>('#reservation-form');
  const chips = $$<HTMLElement>('[data-chip]', form ?? document);
  if (!form || !chips.length) return;
  const field = (key: string) =>
    $<HTMLInputElement>(`[name="${key === 'loaf' ? 'quantity' : key}"]`, form);
  const update = () => {
    for (const chip of chips) {
      const n = Number(field(chip.dataset.chip!)?.value || 0);
      chip.classList.toggle('has', n > 0);
      const badge = $('.chip-n', chip);
      if (badge) badge.textContent = n > 0 ? `×${n}` : '';
    }
  };
  addEventListener('molla:cart', update);
  update();
}

alive();
ferment();
cut();
counter();
sentence();
picker();
fitFields();
