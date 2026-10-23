// Motion for the public pages, with anime.js. Everything here is an
// enhancement: the page is complete without it, and nothing runs when the
// visitor asks for reduced motion.
import { animate, createTimeline, onScroll, stagger, utils } from 'animejs';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = <T extends Element = HTMLElement>(
  s: string,
  root: ParentNode = document,
) => root.querySelector<T>(s);
const $$ = <T extends Element = HTMLElement>(
  s: string,
  root: ParentNode = document,
) => [...root.querySelectorAll<T>(s)];

/* ---- Cabecera: una línea fina cuando la página ya se ha movido ---- */
const header = $('[data-header]');
const onScrollHeader = () =>
  header?.toggleAttribute('data-scrolled', scrollY > 8);
addEventListener('scroll', onScrollHeader, { passive: true });
onScrollHeader();

if (!reduce) {
  crumbField();
  splitWords();
  armOnEnter('.mono-bar[data-bar], .fig-bar:not(.hero .fig-bar), [data-wipe]');
  reveals();
  parallax();
  heroPhoto();
  marquee();
  diary();
  definition();
  processScroll();
  counters();
  manifestoDrift();
  stickers();
  footerWave();
  cartFeedback();
}

/* ---- La foto de portada se queda un poco atrás al bajar ---- */
function heroPhoto() {
  const photo = $('[data-hero-photo]');
  if (!photo) return;
  animate(photo, {
    translateY: [0, 60],
    ease: 'linear',
    autoplay: onScroll({
      target: photo,
      enter: 'top top',
      leave: 'bottom top',
      sync: true,
    }),
  });
}

/* ---- Entran al verse: la regla se dibuja, la foto se abre ----
   Solo se preparan los que aún están por debajo de la pantalla. */
function below(el: Element) {
  return el.getBoundingClientRect().top > innerHeight * 0.92;
}
function armOnEnter(selector: string) {
  const items = $$(selector).filter(below);
  items.forEach((el) => el.classList.add('is-armed'));
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        io.unobserve(e.target);
        e.target.classList.add('is-in');
      }
    },
    { rootMargin: '0px 0px -10% 0px' },
  );
  items.forEach((el) => io.observe(el));
}

/* ---- Titulares: cada palabra sube desde debajo de su línea ---- */
function splitWords() {
  for (const heading of $$('[data-split]')) {
    if (!below(heading)) continue;
    let n = 0;
    const walk = (node: Node) => {
      for (const child of [...node.childNodes]) {
        if (child.nodeType === Node.TEXT_NODE) {
          const parts = child.textContent!.split(/(\s+)/);
          const frag = document.createDocumentFragment();
          for (const part of parts) {
            if (!part) continue;
            if (/^\s+$/.test(part)) {
              frag.append(part);
              continue;
            }
            const outer = document.createElement('span');
            const inner = document.createElement('span');
            outer.className = 'w';
            inner.className = 'wi';
            inner.style.setProperty('--w', String(n++));
            inner.textContent = part;
            outer.append(inner);
            frag.append(outer);
          }
          child.replaceWith(frag);
        } else if (child.nodeType === Node.ELEMENT_NODE) walk(child);
      }
    };
    walk(heading);
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e?.isIntersecting) return;
        io.disconnect();
        heading.classList.add('is-in');
      },
      { rootMargin: '0px 0px -12% 0px' },
    );
    io.observe(heading);
  }
}

/* ---- La cinta corre más o menos según el scroll, cada fila a un lado ---- */
function marquee() {
  const band = $('[data-marquee]');
  if (!band) return;
  const rows = $$('.marquee-row', band);
  let queued = false;
  const update = () => {
    queued = false;
    const top = band.getBoundingClientRect().top;
    rows.forEach((row, i) => {
      const x = top * (i % 2 ? 0.35 : -0.35) - innerWidth * 0.1;
      row.style.transform = `translate3d(${x}px, 0, 0)`;
    });
  };
  addEventListener(
    'scroll',
    () => {
      if (!queued) {
        queued = true;
        requestAnimationFrame(update);
      }
    },
    { passive: true },
  );
  update();
}

/* ---- Diari de l'obrador: en escritorio la sección se fija y la tira de
   historias corre de lado con el scroll, con un poco de inercia; las
   barras de arriba se llenan como en los reels. En el móvil es un
   carrusel normal y solo se actualizan las barras. ---- */
function diary() {
  const section = $('[data-diary]');
  const track = section && $('[data-film]', section);
  if (!section || !track) return;
  const stories = $$('.story', track);
  const bars = $$('.diary-progress span', section);
  const index = $('[data-diary-index]', section);
  const wide = matchMedia('(min-width: 961px)');
  const n = stories.length;
  let dist = 0;
  let target = 0;
  let current = 0;
  let running = false;
  let lastIndex = -1;

  const progress = (p: number) => {
    bars.forEach((bar, i) => {
      const fill = Math.min(1, Math.max(0, p * n - i));
      bar.style.setProperty('--p', fill.toFixed(3));
    });
    const at = Math.min(n - 1, Math.floor(p * n));
    if (at !== lastIndex) {
      lastIndex = at;
      bars.forEach((bar, i) => bar.classList.toggle('is-current', i === at));
      if (index) index.textContent = String(at + 1);
    }
  };
  const measure = () => {
    if (!wide.matches) {
      section.removeAttribute('data-pinned');
      section.style.removeProperty('--dist');
      track.style.transform = '';
      stories.forEach((s) => (s.style.transform = ''));
      return;
    }
    section.setAttribute('data-pinned', '');
    const last = stories[n - 1]!;
    const pad = parseFloat(getComputedStyle(track).paddingLeft) || 0;
    dist = Math.max(0, last.offsetLeft + last.offsetWidth + pad - innerWidth);
    section.style.setProperty('--dist', `${dist}px`);
    read();
  };
  const read = () => {
    if (!wide.matches || !dist) return;
    const header = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue('--header-h'),
    );
    const top = section.getBoundingClientRect().top;
    target = Math.min(1, Math.max(0, (header - top) / dist)) * dist;
  };
  const frame = () => {
    if (!running) return;
    current += (target - current) * 0.1;
    if (Math.abs(target - current) < 0.1) current = target;
    track.style.transform = `translate3d(${-current}px, 0, 0)`;
    // The faster it moves, the more the cards lean, like a flicked reel.
    const lean = Math.max(-5, Math.min(5, (target - current) * -0.02));
    stories.forEach((s) => (s.style.transform = `skewX(${lean}deg)`));
    progress(dist ? current / dist : 0);
    requestAnimationFrame(frame);
  };
  new IntersectionObserver(([e]) => {
    const visible = !!e?.isIntersecting;
    if (visible && !running && wide.matches) {
      running = true;
      requestAnimationFrame(frame);
    } else if (!visible) running = false;
  }).observe(section);
  addEventListener('scroll', read, { passive: true });
  addEventListener('resize', measure);
  wide.addEventListener('change', () => {
    measure();
    if (wide.matches && !running) {
      running = true;
      requestAnimationFrame(frame);
    }
  });
  track.addEventListener(
    'scroll',
    () => {
      if (wide.matches) return;
      const max = track.scrollWidth - track.clientWidth;
      progress(max > 0 ? Math.min(0.999, track.scrollLeft / max) : 0);
    },
    { passive: true },
  );
  measure();
  progress(0);
}

/* ---- «molla» del diccionario: las letras caen en su sitio ---- */
function definition() {
  const word = $('.def-word');
  if (!word || !below(word)) return;
  const letters = [...word.textContent!].map((c) => {
    const span = document.createElement('span');
    span.textContent = c;
    span.style.display = 'inline-block';
    return span;
  });
  const label = document.createElement('span');
  label.className = 'visually-hidden';
  label.textContent = word.textContent;
  word.replaceChildren(label, ...letters);
  letters.forEach((l) => l.setAttribute('aria-hidden', 'true'));
  utils.set(letters, { opacity: 0, translateY: '0.6em', rotate: 12 });
  const io = new IntersectionObserver(
    ([e]) => {
      if (!e?.isIntersecting) return;
      io.disconnect();
      animate(letters, {
        opacity: 1,
        translateY: 0,
        rotate: 0,
        duration: 1300,
        delay: stagger(70),
        ease: 'outElastic(1, .75)',
      });
    },
    { threshold: 0.4 },
  );
  io.observe(word);
}

/* ---- El envoltorio del pie: la miga se abre y se hincha bajo el dedo ----
   Una burbuja invisible recorre la miga (y sigue al puntero cuando lo hay):
   los alvéolos cercanos crecen, como una masa que se aprieta y vuelve. */
function crumbField() {
  const svg = $<SVGSVGElement>('.crumb-field');
  const panel = $('[data-wrapper]');
  if (!svg || !panel) return;
  const [, , W, H] = svg.getAttribute('viewBox')!.split(' ').map(Number) as [
    number,
    number,
    number,
    number,
  ];
  const holes = $$<SVGPathElement>('.crumb-holes path', svg).map((el) => ({
    el,
    x: Number(el.dataset.x),
    y: Number(el.dataset.y),
    s: 1,
  }));
  // Slow breathing of the whole crumb around the swirl.
  animate($('.crumb-holes', svg)!, {
    scale: [1, 1.03],
    rotate: [-0.6, 0.6],
    duration: 5200,
    ease: 'inOutSine',
    alternate: true,
    loop: true,
  });

  const R = 190;
  const pointer = { x: W * 0.4, y: H * 0.5, active: false };
  const bubble = { x: pointer.x, y: pointer.y };
  let running = false;
  let t = 0;
  let last = performance.now();

  const toSvg = (cx: number, cy: number) => {
    const r = svg.getBoundingClientRect();
    const s = Math.max(r.width / W, r.height / H);
    const x = (cx - r.left - (r.width - W * s) / 2) / s;
    // The field is mirrored so the swirl sits on the right.
    return { x: W - x, y: (cy - r.top - (r.height - H * s) / 2) / s };
  };
  panel.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    Object.assign(pointer, toSvg(e.clientX, e.clientY), { active: true });
  });
  panel.addEventListener('pointerleave', () => (pointer.active = false));

  function frame(now: number) {
    if (!running) return;
    const dt = Math.min(64, now - last);
    last = now;
    t += dt / 1000;
    // Without a pointer the bubble wanders on a slow figure of eight.
    const goal = pointer.active
      ? pointer
      : {
          x: W * (0.5 + 0.34 * Math.sin(t * 0.21)),
          y: H * (0.5 + 0.3 * Math.sin(t * 0.37 + 1)),
        };
    const follow = pointer.active ? 0.18 : 0.04;
    bubble.x += (goal.x - bubble.x) * follow;
    bubble.y += (goal.y - bubble.y) * follow;
    const swell = pointer.active ? 0.34 : 0.18;
    for (const h of holes) {
      const d = Math.hypot(h.x - bubble.x, h.y - bubble.y);
      const target = d < R ? 1 + swell * (1 - d / R) ** 2 : 1;
      const next = h.s + (target - h.s) * 0.12;
      if (Math.abs(next - h.s) > 0.0008) {
        h.s = next;
        h.el.style.scale = next.toFixed(4);
      }
    }
    requestAnimationFrame(frame);
  }
  // Closed until the footer comes into view; then it opens outward.
  svg.classList.add('is-armed');
  const opener = new IntersectionObserver(
    ([e]) => {
      if (!e?.isIntersecting) return;
      opener.disconnect();
      svg.classList.add('is-open');
    },
    { threshold: 0.25 },
  );
  opener.observe(panel);
  // Only while the footer is on screen.
  new IntersectionObserver(([e]) => {
    const visible = !!e?.isIntersecting;
    if (visible && !running) {
      running = true;
      last = performance.now();
      requestAnimationFrame(frame);
    } else if (!visible) running = false;
  }).observe(panel);
}

/* ---- Aparecen al entrar en pantalla (solo lo que aún no se ha visto) ---- */
function reveals() {
  const items = $$('[data-reveal]').filter(
    (el) => el.getBoundingClientRect().top > innerHeight * 0.92,
  );
  utils.set(items, { opacity: 0, translateY: 36 });
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        io.unobserve(e.target);
        const i =
          Number((e.target as HTMLElement).style.getPropertyValue('--i')) || 0;
        animate(e.target, {
          opacity: 1,
          translateY: 0,
          duration: 1100,
          delay: i * 90,
          ease: 'outExpo',
        });
      }
    },
    { rootMargin: '0px 0px -12% 0px' },
  );
  items.forEach((el) => io.observe(el));
}

/* ---- Fotos superpuestas que se desplazan a otra velocidad ---- */
function parallax() {
  for (const el of $$('[data-parallax]')) {
    const f = Number(el.dataset.parallax) || 0;
    animate(el, {
      translateY: [-f * 260, f * 260],
      ease: 'linear',
      autoplay: onScroll({
        target: el,
        enter: 'bottom top',
        leave: 'top bottom',
        sync: true,
      }),
    });
  }
}

/* ---- 4 · 35 horas: el contador avanza y la miga se abre con el scroll ---- */
function processScroll() {
  const grid = $('[data-process]');
  const counter = $('[data-hours]');
  if (!grid || !counter) return;
  const hours = { h: 0 };
  const show = () => (counter.textContent = String(Math.round(hours.h)));
  grid.setAttribute('data-live', '');
  createTimeline({
    defaults: { ease: 'linear' },
    autoplay: onScroll({
      target: grid,
      // From the grid's top at mid-screen to its bottom at mid-screen.
      enter: 'center top',
      leave: 'center bottom',
      sync: 0.6,
    }),
  })
    .add(hours, { h: [0, 35], duration: 760, onUpdate: show }, 220)
    // Hold at 35 h while the oven and pickup steps are read.
    .add(hours, { h: 35, duration: 520 }, 980);

  // The step in the middle of the screen is the one being read.
  const steps = $$('.step', grid);
  const photos = $$('[data-step-photo]', grid);
  photos[0]?.classList.add('is-active');
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries)
        if (e.isIntersecting) {
          steps.forEach((s) =>
            s.toggleAttribute('data-active', s === e.target),
          );
          // The large photo follows the step being read.
          const index = steps.indexOf(e.target as HTMLElement);
          photos.forEach((p, i) =>
            p.classList.toggle('is-active', i === index),
          );
        }
    },
    { rootMargin: '-45% 0px -45% 0px' },
  );
  steps.forEach((s) => io.observe(s));
  steps[0]?.setAttribute('data-active', '');
}

/* ---- Cifras del manifiesto que cuentan al aparecer ---- */
function counters() {
  for (const el of $$('[data-countup]')) {
    const match = /^(\d+)(.*)$/.exec(el.textContent!.trim());
    if (!match) continue;
    const end = Number(match[1]);
    const suffix = match[2];
    // "0 mejorantes" cuenta hacia atrás: de muchos a ninguno.
    const value = { n: end === 0 ? 24 : 0 };
    el.textContent = `${value.n}${suffix}`;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e?.isIntersecting) return;
        io.disconnect();
        animate(value, {
          n: end,
          duration: 1800,
          ease: 'outExpo',
          modifier: Math.round,
          onUpdate: () => (el.textContent = `${Math.round(value.n)}${suffix}`),
        });
      },
      { threshold: 0.6 },
    );
    io.observe(el);
  }
}

function manifestoDrift() {
  const photo = $('[data-drift]');
  if (!photo) return;
  animate(photo, {
    translateY: ['-6%', '6%'],
    scale: [1.12, 1],
    ease: 'linear',
    autoplay: onScroll({
      target: photo.parentElement!,
      enter: 'bottom top',
      leave: 'top bottom',
      sync: true,
    }),
  });
}

/* ---- Los stickers giran al pasar el ratón ---- */
function stickers() {
  for (const s of $$('[data-sticker]')) {
    if (s.classList.contains('ticket-stamp')) continue;
    s.addEventListener('pointerenter', () =>
      animate(s, {
        rotate: [0, 360],
        scale: [1, 1.08, 1],
        duration: 1100,
        ease: 'outElastic(1, .7)',
      }),
    );
  }
}

/* ---- «molla.» del pie: las letras saltan una tras otra ---- */
function footerWave() {
  const mark = $('[data-wave]');
  if (!mark) return;
  const letters = $$('.wave-letter', mark);
  const wave = () =>
    animate(letters, {
      translateY: [0, '-0.14em', 0],
      duration: 900,
      delay: stagger(70),
      ease: 'inOutQuad',
    });
  mark.addEventListener('pointerenter', wave);
  const io = new IntersectionObserver(
    ([e]) => {
      if (e?.isIntersecting) {
        io.disconnect();
        utils.set(letters, { translateY: '0.5em', opacity: 0 });
        animate(letters, {
          translateY: 0,
          opacity: 1,
          duration: 1200,
          delay: stagger(80),
          ease: 'outElastic(1, .8)',
        });
      }
    },
    { threshold: 0.4 },
  );
  io.observe(mark);
}

/* ---- El pedido responde: una bolita vuela hasta el contador ---- */
function cartFeedback() {
  const money = (cents: number) =>
    new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(cents / 100);
  let last = 0;
  const total = $('#total');
  const pillTotal = $('[data-pill-total]');
  addEventListener('molla:cart', (event) => {
    const { total: cents, origin } = (event as CustomEvent).detail as {
      total: number;
      origin?: Element | null;
    };
    // The totals count to the new amount instead of jumping.
    const value = { c: last };
    animate(value, {
      c: cents,
      duration: 600,
      ease: 'outExpo',
      onUpdate: () => {
        const text = money(Math.round(value.c));
        if (total) total.textContent = text;
        if (pillTotal) pillTotal.textContent = text;
      },
    });
    if (total && cents !== last)
      animate(total, { scale: [1, 1.08, 1], duration: 500, ease: 'outQuad' });
    last = cents;
    if (!origin) return;
    // Fly to the floating order if it is (or is about to be) visible,
    // otherwise to the counter on the header button.
    requestAnimationFrame(() => {
      const pill = $('[data-pill]');
      const target = pill?.classList.contains('is-visible')
        ? $('[data-pill-count]', pill)
        : $('[data-cart-count]');
      if (!target) return;
      const from = origin.getBoundingClientRect();
      const to = target.getBoundingClientRect();
      const dot = document.createElement('span');
      dot.className = 'fly-dot';
      dot.style.left = `${from.left + from.width / 2}px`;
      dot.style.top = `${from.top + from.height / 2}px`;
      document.body.append(dot);
      const dx = to.left + to.width / 2 - (from.left + from.width / 2);
      const dy = to.top + to.height / 2 - (from.top + from.height / 2);
      const peak = Math.min(dy, 0) - 90;
      animate(dot, {
        translateX: { to: dx, ease: 'inOutSine', duration: 720 },
        translateY: [
          { to: peak, ease: 'outQuad', duration: 300 },
          { to: dy, ease: 'inQuad', duration: 420 },
        ],
        scale: { to: 0.6, duration: 720 },
        onComplete: () => {
          dot.remove();
          animate(target, {
            scale: [1, 1.45, 1],
            duration: 650,
            ease: 'outElastic(1, .5)',
          });
        },
      });
    });
  });

  // Reservation confirmed: the sticker is stamped on the ticket.
  addEventListener('molla:confirmed', () => {
    const stamp = $('.ticket-stamp');
    const ticket = $('.ticket');
    if (!stamp || !ticket) return;
    stamp.classList.add('stamped');
    createTimeline()
      .add(stamp, {
        opacity: [0, 1],
        scale: [2.6, 1],
        rotate: ['-70deg', '-12deg'],
        duration: 650,
        ease: 'inQuart',
      })
      .add(ticket, {
        translateY: [0, 6, 0],
        rotate: [0, -0.6, 0],
        duration: 500,
        ease: 'outElastic(1, .5)',
      });
  });
}
