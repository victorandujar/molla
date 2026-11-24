import { bake, brand, money, productById, type ExtraBreadId } from './config';
import { deliveryWindow, eveningWindow, windowHours } from './delivery';
import { localeOf, type Lang } from './messages';
export type { Lang };

// "Pa fix" days: the bake day, when its orders close, and the frequency line.
export const standingWords = {
  es: {
    day: { wed: 'miércoles', sat: 'sábado' },
    closes: { wed: 'el lunes anterior', sat: 'el jueves anterior' },
    until: { wed: 'el lunes', sat: 'el jueves' },
  },
  ca: {
    day: { wed: 'dimecres', sat: 'dissabte' },
    closes: { wed: 'el dilluns abans', sat: 'el dijous abans' },
    until: { wed: 'dilluns', sat: 'dijous' },
  },
  en: {
    day: { wed: 'Wednesday', sat: 'Saturday' },
    closes: { wed: 'the Monday before', sat: 'the Thursday before' },
    until: { wed: 'Monday', sat: 'Thursday' },
  },
} as const;
export const standingFrequency = (
  lang: Lang,
  frequency: 'weekly' | 'biweekly',
  day: 'wed' | 'sat',
) => {
  const d = standingWords[lang].day[day];
  if (lang === 'en')
    return frequency === 'weekly' ? `Every ${d}` : `Every other ${d}`;
  if (frequency === 'weekly') return `Cada ${d}`;
  return lang === 'ca' ? `Un ${d} sí i un altre no` : `Un ${d} sí y otro no`;
};

// Pages that exist in both languages. Keys are shared, paths are localised.
export const routes = {
  home: { ca: '/', es: '/es/', en: '/en/' },
  pickup: { ca: '/recollida', es: '/es/recogida', en: '/en/pickup' },
  delivery: {
    ca: '/pa-a-domicili',
    es: '/es/pan-a-domicilio',
    en: '/en/bread-delivery',
  },
  standing: { ca: '/pa-fix', es: '/es/pan-fijo', en: '/en/weekly-bread' },
  poolish: { ca: '/poolish', es: '/es/poolish', en: '/en/poolish' },
  privacy: { ca: '/privacitat', es: '/privacidad', en: '/en/privacy' },
} as const;
// Christmas order page (not in the sitemap).
export const xmasRoutes = {
  ca: '/nadal',
  es: '/es/navidad',
  en: '/en/christmas',
};
// Pages listed in the sitemap; the privacy page is noindex.
export const indexedRoutes = [
  'home',
  'delivery',
  'standing',
  'pickup',
  'poolish',
] as const;
export type RouteKey = keyof typeof routes;

export const dayFormat = (lang: Lang, iso = bake.pickupDate) =>
  new Intl.DateTimeFormat(localeOf(lang), {
    timeZone: 'Europe/Madrid',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(iso));

// Parts of a Madrid date for sentences such as "hasta el jueves 24 a las 20:00".
export const madridParts = (lang: Lang, iso: string) => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat(localeOf(lang), {
      timeZone: 'Europe/Madrid',
      weekday: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(new Date(iso))
      .map((p) => [p.type, p.value]),
  );
  return {
    weekday: parts.weekday as string,
    day: parts.day as string,
    time: `${parts.hour}:${parts.minute}`,
  };
};
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// Towns outside the delivery zone that pick up in Sant Boi.
const areaTowns = 'Cornellà, Molins de Rei o Viladecans';
// "12:00–14:00" reads "de 12 a 14 h" in copy.
const [fromH, toH] = deliveryWindow
  .split('–')
  .map((t) => String(Number(t.split(':')[0])));
// Shown in the hero so the price is visible before scrolling.
const loafPrice = money(productById('clasica')!.price);
const hours = {
  es: `de ${fromH}\u00a0a\u00a0${toH}\u00a0h`,
  ca: `de ${fromH}\u00a0a\u00a0${toH}\u00a0h`,
  en: deliveryWindow.replace('–', '\u2013'),
};
// Wednesday's second round, for people who work at midday.
const evening = windowHours(eveningWindow);
const eveningEn = windowHours(eveningWindow, 'en');

export const ui = {
  es: {
    skip: 'Ir al contenido',
    demo: 'Vista de prueba · Los pedidos de esta versión no son reales.',
    home: `${brand.name}, inicio`,
    nav: {
      process: 'El proceso',
      pickup: 'Recogida',
      delivery: 'A domicilio',
      standing: 'Pan fijo',
      faq: 'Preguntas',
      order: 'Reservar',
    },
    switchLabel: 'Català',
    switchAria: 'Llegeix aquesta pàgina en català',
    footer: {
      line: 'Pan artesanal de fermentación lenta, por encargo.',
      area: `Pan a domicilio los miércoles ${hours.es} o ${evening} y los sábados ${hours.es} en Sant Boi, Sant Just Desvern, Sant Joan Despí, Sant Feliu de Llobregat, Santa Coloma de Cervelló y Sant Vicenç dels Horts · Recogida en Sant Boi de Llobregat`,
      privacy: 'Privacidad y condiciones',
      write: 'Escríbeme ↗',
      channel: 'Canal de WhatsApp',
    },
    meta: {
      title: `Panadería artesana en Sant Boi · Masa madre · ${brand.name}`,
      description: `Pan de masa madre y poolish con harina ecológica, hecho a mano en Sant Boi. Te lo llevo a casa miércoles y sábado. Desde ${loafPrice}, pagas al recibirlo.`,
      ogAlt: 'Hogazas de corteza tostada recién cortadas',
    },
    xmas: {
      label: 'Navidad',
      lead: 'Ya puedes reservar para el ',
      week: 'Hornada de esta semana',
    },
    status: {
      OPEN: 'Reservas abiertas',
      SOLD_OUT: 'Hornada agotada',
      CLOSED: 'Pedidos cerrados',
      UPCOMING: 'Próxima hornada',
      COMPLETED: 'Esta hornada ya salió del horno',
    },
    hero: {
      h1a: 'Pan artesano, recién hecho,',
      h1b: 'en tu puerta',
      sub: `Cada miércoles y cada sábado ${hours.es}, y los miércoles también ${evening}, a domicilio en Sant Boi, Sant Just Desvern, Sant Joan Despí, Sant Feliu, Santa Coloma y Sant Vicenç.`,
      short: `Lo horneo esa misma mañana y te lo llevo a casa o a la oficina, cada miércoles y sábado ${hours.es} (el miércoles, también ${evening}). Pan desde ${loafPrice}, envío gratis y pagas al recibirlo.`,
      kicker: 'Panadería de barrio · Baix Llobregat',
      keywords: [
        'Harinas ecológicas',
        'Poolish',
        'Hasta 35 h de fermentación',
        'Hecho a mano',
        'A domicilio miércoles y sábado',
        'Baix Llobregat',
      ],
      order: 'Reservar hogaza',
      notify: 'Avísame cuando abra',
      how: 'Cómo lo hago',
      photos: [
        'Hogaza redonda recién horneada, con el corte abierto, sobre papel de horno',
        'Una hogaza partida por la mitad entre las manos, con la miga abierta',
      ],
      values: [
        ['Harinas ecológicas', 'De cultivo ecológico, sin mejorantes.'],
        ['Hasta 35 horas', 'De fermentación lenta con poolish.'],
        ['Hornada pequeña', 'Pocas hogazas, hechas de una en una.'],
        [
          'A domicilio',
          `Miércoles y sábados ${hours.es}; miércoles también ${evening}. En Sant Boi, Sant Just, Sant Joan Despí, Sant Feliu, Santa Coloma y Sant Vicenç.`,
        ],
      ],
      nextBake: 'Próxima hornada',
      ribbon: [
        'Molla',
        'Pa artesà',
        'Fins a 35 h de fermentació',
        'Baix Llobregat',
      ],
      // Price and terms sit by the button; the proof line adds who and where.
      // Under the hero button: where it goes, where to pick it up, how you pay.
      terms: `Envío gratis a Sant Boi, Sant Just, Sant Joan Despí, Sant Feliu, Santa Coloma y Sant Vicenç, o lo recoges ${brand.pickupPlace.es} · Pagas al recibirlo`,
      proof: ['Hecho a mano en Sant Boi'],
      // Next to the button: who makes it and what people say.
      trust: (score: string, count: number) =>
        `${score} en Google (${count} reseñas) · Lo hago yo, Víctor, en Sant Boi`,
      when: (wed: boolean) =>
        wed
          ? `Te lo llevo ${hours.es} o ${evening}`
          : `Te lo llevo ${hours.es}`,
      scroll: 'Desliza',
      hands: 'Las manos de mi madre',
      sealTop: 'hasta',
      sealBottom: 'de fermentación',
    },
    baker: {
      line: 'Soy Víctor. Hago el pan en Sant Boi, hogaza a hogaza, y te lo llevo yo.',
      photo:
        'Víctor, el panadero, sostiene una hogaza recién horneada y sonríe',
      reviews: 'Ver las reseñas',
    },
    film: {
      label: 'La cocina, en fotos',
      items: [
        [
          'proof',
          'La masa',
          'Fermenta despacio, sin prisa.',
          'Dos masas de pan reposando sobre la encimera',
        ],
        [
          'hands',
          'A mano',
          'Pliegues, formado y corte, uno a uno.',
          'Mano que corta una hogaza de corteza oscura con un cuchillo de pan',
        ],
        [
          'smell',
          'Huele',
          'El primer gesto al sacarlo del horno.',
          'El panadero huele una hogaza recién horneada',
        ],
        [
          'cut',
          'Corteza',
          'Oscura y crujiente; la miga, húmeda.',
          'Hogaza recién cortada, con la corteza tostada y la miga a la vista',
        ],
        [
          'slices',
          'Hasta 35 h',
          'De fermentación: ahí está el sabor.',
          'Rebanadas de pan con miga alveolada sobre una tabla',
        ],
      ] as [string, string, string, string][],
    },
    catalog: {
      kicker: 'La carta',
      h2b: 'Hecha sin prisa.',
      details: 'Ingredientes y alérgenos',
      loaf: 'La de cada semana',
      sourdough: 'Masa madre',
      wholegrain: 'Integral 60 %',
      bananaWhole: 'Banana bread entero',
      bananaHalf: 'Medio banana bread',
      add: 'Añadir al pedido',
      inOrder: (n: string) => `${n} en tu pedido`,
      remove: 'Quitar uno',
      whole: 'Entero',
      half: 'Mitad',
      size: 'Tamaño',
      each: 'cada una',
      closed: 'Se reserva cuando abra la hornada',
      // Never a count: nothing while there is plenty, then «few left», then «sold out».
      stock: {
        bread: { ok: '', low: 'Quedan pocas hogazas', out: 'Hornada agotada' },
        banana: {
          ok: '',
          low: 'Queda poco banana bread',
          out: 'Agotado esta semana',
        },
        pastry: {
          ok: '',
          low: 'Queda poca bollería',
          out: 'Bollería agotada esta semana',
        },
      },
      pill: 'Tu pedido',
      pillCta: 'Reservar',
      pillDone: 'Terminar →',
      loaves: (n: number) => `${n} ${n === 1 ? 'hogaza' : 'hogazas'}`,
      banana: (halves: number) =>
        halves === 1 ? '½ banana bread' : `${halves / 2} banana bread`,
      croissant: 'Croissant',
      pain: 'Pain au chocolat',
      croissants: (n: number) => `${n} ${n === 1 ? 'croissant' : 'croissants'}`,
      pains: (n: number) =>
        `${n} ${n === 1 ? 'pain au chocolat' : 'pains au chocolat'}`,
    },
    bake: {
      number: 'Hornada',
      test: ' (prueba)',
      open: (deadline: string) => {
        const d = madridParts('es', deadline);
        return `Pedidos hasta el ${d.weekday} ${d.day} a las ${d.time} o hasta completar la hornada.`;
      },
      dateSoon: 'Fecha por confirmar',
      closesIn: 'Cierra en',
      upcoming: 'Anunciaré la fecha al abrir reservas.',
      closed: 'Esta semana ya no acepto pedidos. Te aviso de la próxima.',
      unavailable:
        'No puedo consultar el cupo ahora. Recarga la página antes de reservar.',
      ctaOpen: (weekday: string) => `Reservar mi pan del ${weekday}`,
      // One tap: a loaf goes into the order and the form opens at delivery.
      ctaQuick: (price: string) => `Reservar 1 hogaza · ${price}`,
      ctaMenu: 'Ver toda la carta',
      ctaClosed: 'Avísame de la próxima',
    },
    loaf: {
      kicker: 'La hogaza',
      name: 'La de cada semana',
      alt: 'Dos hogazas artesanas con greñas abiertas sobre una tabla de madera',
      altSlice:
        'Media hogaza sostenida en la mano, con la miga alveolada a la vista',
      fermentation: 'Fermentación',
      pitch:
        'Corteza que cruje, miga tierna y aguanta varios días. Harina ecológica, agua, sal y levadura',
      fermentationValue: 'Poolish y hasta 35 horas de fermentación lenta',
      ingredients: 'Ingredientes',
      ingredientsValue:
        'Harina de trigo ecológica, agua, sal y levadura. Nada más.',
      allergens: 'Alérgenos',
      allergensValue:
        'Contiene trigo (gluten). Si tienes otra alergia, pregúntame antes de reservar.',
      keeps: 'Aguanta',
      keepsValue:
        'Varios días envuelta en un paño. Se congela bien en rebanadas.',
      order: 'Reservar esta hogaza',
      notify: 'Quiero enterarme',
    },
    banana: {
      kicker: 'También horneo',
      h2a: 'Banana bread',
      h2b: 'de chocolate.',
      p: 'Tres plátanos muy maduros por molde, harina ecológica, yogur y una bolsa entera de pepitas de chocolate. Corteza dorada, miga húmeda y tierna.',
      short:
        'Hecho con plátano maduro, harina ecológica, yogur y 100 g de pepitas de chocolate por molde.',
      ingredientsValue:
        'Plátano maduro, harina de trigo ecológica, yogur y pepitas de chocolate.',
      allergensValue: 'Contiene trigo (gluten) y leche. Pregúntame por trazas.',
      note: 'Entero o la mitad. Con tu hogaza o solo.',
      alt: 'Banana bread con pepitas de chocolate sobre una tabla de madera',
      altDetail:
        'Detalle de la corteza del banana bread con pepitas de chocolate',
      ask: 'Pedir banana bread',
      notify: 'Avísame cuando haya',
    },
    // La carta de pan: cada pan en su tarjeta, con su foto.
    breads: {
      kicker: 'El pan',
      h3: 'Nueve panes, una hornada.',
      intro:
        'Elige uno o combínalos: salen del mismo horno el miércoles y el sábado.',
      from: 'desde',
      unit: 'La hogaza',
      items: {
        loaf: 'Con poolish, una masa previa que fermenta toda la noche, y hasta 35 h de fermentación: más sabor y aguanta tierno más días. Suave, miga abierta y corteza que cruje.',
        sourdough: 'Fermentada con masa madre.',
        wholegrain: 'Con un 60 % de harina integral.',
      },
      photos: {
        loaf: 'Media hogaza clásica en la mano, con la miga abierta a la vista',
        sourdough:
          'Dos mitades de pan de masa madre apiladas, con la miga alveolada',
        wholegrain:
          'Dos mitades de pan integral apiladas sobre una tabla, miga tostada y apretada',
        sourdoughLoaf:
          'Hogaza de masa madre vista desde arriba, con el greñado abierto y dorado',
      },
      details: {
        sourdough:
          'Harina de trigo de fuerza, harina integral, masa madre, agua y sal.',
        wholegrain:
          'Harina integral, levadura, agua, harina de trigo de fuerza y sal.',
      },
      // Panes con relleno y pan de leche (config.ts, `extraBreads`).
      extraKicker: 'Con relleno',
      extraH4: 'Seis más, mismo horno.',
      extraIntro:
        'La misma hogaza con olivas, nueces, chocolate o fruta seca. Y un pan de leche tierno para el desayuno.',
      extra: {
        kalamata: {
          name: 'Aceitunas negras y romero',
          text: 'Aceitunas negras y romero en la masa. Para el aperitivo o con un buen aceite.',
          alt: 'Dos mitades de pan con aceitunas negras y romero repartidos por la miga',
          ingredients:
            'Harina de trigo, agua, sal y masa madre, con aceitunas negras y romero.',
        },
        nueces: {
          name: 'Nueces',
          text: 'Nueces en toda la miga. Con queso, de lujo.',
          alt: 'Dos mitades de pan con trozos de nuez en la miga',
          ingredients: 'Harina de trigo, agua, sal y masa madre, con nueces.',
        },
        'nueces-naranja': {
          name: 'Nueces y naranja',
          text: 'Nueces y un toque de naranja. Perfecto para desayunar.',
          alt: 'Dos mitades de pan con nueces y naranja, miga alveolada',
          ingredients:
            'Harina de trigo, agua, sal y masa madre, con nueces y naranja.',
        },
        chocolate: {
          name: 'Chocolate',
          text: 'Vetas de chocolate fundido dentro de la miga.',
          alt: 'Dos mitades de pan con vetas de chocolate en la miga',
          ingredients:
            'Harina de trigo, agua, sal y masa madre, con chocolate.',
        },
        'pasas-pistachos': {
          name: 'Pasas, arándanos y pistachos',
          text: 'Pasas, arándanos y pistachos en cada rebanada.',
          alt: 'Dos mitades de pan con pasas, arándanos rojos y pistachos verdes en la miga',
          ingredients:
            'Harina de trigo, agua, sal y masa madre, con pasas, arándanos y pistachos.',
        },
        'pan-de-leche': {
          name: 'Pan de leche',
          text: 'Con poolish. Miga tierna y esponjosa, y una pieza grande: casi 1 kg de masa.',
          alt: 'Dos mitades de pan de leche con la miga blanca y esponjosa',
          ingredients:
            'Harina de trigo, poolish, leche, mantequilla, azúcar, huevo y sal.',
        },
      } satisfies Record<
        ExtraBreadId,
        { name: string; text: string; alt: string; ingredients: string }
      >,
      extraAllergens:
        'Nueces y pistachos: frutos de cáscara. El chocolate puede contener leche y soja. El pan de leche lleva leche y huevo.',
      allergens:
        'Contienen trigo (gluten). Si tienes otra alergia, pregúntame antes de reservar.',
      add: 'Añadir',
      less: (name: string) => `Quitar ${name}`,
      more: (name: string) => `Añadir ${name}`,
    },
    pastry: {
      kicker: 'Bollería',
      tag: 'Por unidades',
      short: 'Masa laminada con mantequilla, a mano.',
      unit: 'La unidad',
      croissantText: 'Capas que crujen y miga de panal.',
      painText: 'La misma masa, con dos barritas de chocolate dentro.',
      ingredients:
        'Masa laminada con mantequilla. El pain au chocolat lleva chocolate.',
      allergens:
        'Contiene trigo (gluten), leche y huevo. Pregúntame por trazas antes de reservar.',
      alt: 'Un pain au chocolat y un croissant dorados sobre una tabla de madera, con luz de tarde',
      add: 'Añadir',
      less: (name: string) => `Quitar un ${name}`,
      more: (name: string) => `Añadir un ${name}`,
      notify: 'Avísame cuando haya',
    },
    why: {
      kicker: 'Por qué yo',
      bar: 'Y no el horno de al lado',
      h2a: 'Por qué yo',
      h2b: 'y no el horno.',
      stats: [
        ['35 h', 'de fermentación lenta'],
        ['0 €', 'de envío, hasta tu puerta'],
        ['0', 'colas ni “ya se ha acabado”'],
      ],
    },
    xp: {
      nav: { how: 'Cómo lo hago', menu: 'La carta' },
      order: {
        kicker: 'Nº 04 · El pedido',
        bar: 'Sin tarjeta ni cuenta',
        home: 'Tráemelo a casa',
        pickup: 'Lo recojo yo',
        homeAt: 'en',
        street: 'en',
        slot: 'a',
        name: 'Me llamo',
        phone: 'y mi móvil es el',
        email: 'Si quieres el tiquet por correo:',
        total: 'Total · pagas al recibirlo',
        notify: 'Avísame de la próxima hornada:',
        pick: 'Añade:',
        pickupAt: (window: string) =>
          ` ${brand.pickupPlace.es}, en Sant Boi${window ? ` (${window})` : ''}`,
        lede: (day: string, wed: boolean) =>
          `Este pedido es para el ${day}. Te lo llevo a casa ${wed ? `${hours.es} o ${evening}` : hours.es}, o lo recoges ${brand.pickupPlace.es}. Envío gratis y pagas al recibirlo. Horneo cada miércoles y sábado, y cada hornada se reserva por separado.`,
      },
      hint: 'Toca la masa',
      ferment: {
        label: 'Hasta 35 horas de fermentación',
        kicker: 'Nº 02 · 35 horas',
        what: 'El poolish es una masa previa (harina, agua y una pizca de levadura) que fermenta despacio toda la noche. Por eso el pan sabe más, la miga sale más abierta y aguanta tierno más días.',
        bar: 'Arrastra el tiempo',
        lead: 'Mi pan fermenta hasta',
        drag: '← Arrastra →',
        slider: 'Horas de fermentación',
        compare: 'Tiempo de fermentación, comparado',
        fast: 'Pan con prisa',
        fastValue: '< 3 h',
        me: 'Molla',
        replay: '↺ Otra vez',
        fig: '(Fig. 2) La miga, mientras fermenta',
        phases: [
          [
            0,
            'Poolish',
            'harina, agua y una pizca de levadura. Toda la noche.',
          ],
          [14, 'Pliegues', 'a mano, sin máquinas.'],
          [16, 'Forma', 'pan a pan, uno a uno.'],
          [17, 'Frío', 'otra noche entera. Aquí no hay prisa.'],
          [33, 'Horno', 'corteza oscura, que cruje.'],
          [35, 'Listo', 'huele a pan.'],
        ] as [number, string, string][],
      },
      cut: {
        label: 'La miga, por dentro',
        word: ['Ábre', 'lo'] as [string, string],
        says: 'Esto es la miga.',
        fig: '(Fig. 3) La de cada semana, abierta',
        scroll: 'Sigue bajando',
      },
      counter: {
        bar: 'El mostrador',
        hint: 'Desliza →',
        prev: 'Producto anterior',
        next: 'Producto siguiente',
      },
      sentence: {
        hi: 'Hola Víctor, quiero',
        for: 'para el',
        empty: 'una hogaza',
        and: 'y',
      },
    },
    reviews: {
      kicker: 'Nº — Reseñas',
      fig: '(Fig. 7)',
      count: (n: number) => `${n} reseñas en Google`,
      source: 'Reseña de Google',
      all: (n: number) => `Ver las ${n} reseñas en Google`,
      leave: 'Deja la tuya',
      newTab: '(se abre en una pestaña nueva)',
      label: 'Reseñas de Google',
      prev: 'Reseña anterior',
      next: 'Reseña siguiente',
    },
    fix: {
      kicker: 'Pan fijo',
      bar: 'Cada semana, sin pensarlo',
      h2a: 'Tu pan cada semana.',
      h2b: 'Sin pensarlo.',
      voucher:
        'Solo para el Pan fijo: cuando te haya entregado 3 panes, el 4.º corre de mi cuenta.',
      cta: 'Apúntate al Pan fijo',
      facts: (price: string) => [
        `Miércoles o sábado ${hours.es}`,
        `${price} la hogaza · sin envío`,
        'Saltas o cancelas con un clic',
      ],
    },
    organic: {
      kicker: 'Harina',
      h2a: 'Harinas ecológicas,',
      h2b: 'y tiempo.',
      p: 'Todo el pan y el banana bread se hacen con harinas de cultivo ecológico. Una buena harina no necesita mejorantes: con agua, sal, poco levadura y mucho tiempo es suficiente.',
      items: [
        ['100 %', 'harinas ecológicas'],
        ['0', 'mejorantes ni aditivos'],
        ['35 h', 'de fermentación'],
      ],
    },
    process: {
      h2a: 'La mayor parte del trabajo',
      h2b: 'es esperar.',
      hours: 'horas de fermentación',
      intro:
        'El poolish es una masa previa, líquida, que fermenta despacio durante la noche. Le da a la hogaza una miga más abierta, una corteza más fina y un sabor que no se consigue con prisa.',
      more: 'Qué es el poolish, en detalle',
      closeWhen: (deadline: string) => {
        const d = madridParts('es', deadline);
        return `Hasta el ${d.weekday}, ${d.time}`;
      },
      pickupWhen: (pickup: string) =>
        capital(madridParts('es', pickup).weekday),
      steps: [
        {
          when: 'Hasta el cierre, 20:00',
          title: 'Reservas',
          text: 'Cierro pedidos y sé exactamente cuántas hogazas hacer. Ni una de más.',
        },
        {
          when: 'Después del cierre',
          title: 'Fermentación lenta',
          time: 'Hasta 35 h',
          text: 'Poolish, amasado con pliegues a mano, formado y una larga fermentación en frío. Sin prisa: ahí nacen el sabor, el aroma y la miga.',
        },
        {
          when: 'La mañana de la entrega',
          title: 'Horno',
          text: 'Corteza oscura que cruje, miga abierta y húmeda.',
        },
        {
          when: 'Miércoles o sábado',
          title: 'A tu casa',
          text: `Te lo llevo ${hours.es} (el miércoles, también ${evening}) a Sant Boi, Sant Just, Sant Joan Despí, Sant Feliu, Santa Coloma o Sant Vicenç, o lo recoges en Sant Boi. Pagas al recibirlo.`,
        },
      ],
    },
    maker: {
      kicker: 'Quién hace el pan',
      h2: 'Pocas hogazas, hechas de una en una.',
      p1: 'Hago pan artesanal por encargo para gente de todo el Baix Llobregat. Cada semana horneo solo lo que se ha reservado: así cada hogaza tiene su tiempo y no se tira nada.',
      p2: 'Sin mejorantes ni atajos. Harina ecológica, agua, sal, un poco de levadura y una noche entera de paciencia.',
      altPerson: 'El panadero sostiene una hogaza recién horneada y sonríe',
      altDough: 'Dos masas formadas reposando en sus cestas de fermentación',
    },
    reserve: {
      kicker: 'Pedido para la próxima hornada',
      h2: 'Reserva tu pedido.',
      bananaQty: 'Banana bread',
      bananaHint: 'Por mitades: ½, 1, 1½ o 2',
      bananaLess: 'Quitar media pieza de banana bread',
      bananaMore: 'Añadir media pieza de banana bread',
      bananaNone: 'Sin banana bread',
      emptyOrder: 'Añade una hogaza, un banana bread o bollería para reservar.',
      quickPick: '¿Empezamos por aquí?',
      quickLoaf: (price: string) => `1 hogaza · ${price}`,
      totalLabel: 'Total a pagar al recibirlo',
      pickup: 'Entrega',
      where: 'Dónde',
      pickupLocation: `A domicilio, ${hours.es} · miércoles también ${evening}`,
      pickupDetails:
        'Sant Boi, Sant Just Desvern, Sant Joan Despí, Sant Feliu de Llobregat, Santa Coloma de Cervelló y Sant Vicenç dels Horts. ¿Otro municipio? Lo recoges en Sant Boi.',
      pickupInfo: 'Zonas y horario de reparto',
      deliveryH: '2 · ¿Cómo te llega?',
      deliveryHome: (wed: boolean) =>
        wed ? 'A domicilio · mediodía o tarde' : `A domicilio · ${hours.es}`,
      slotH: '¿A qué hora te lo llevo?',
      slotMidday: `Mediodía · ${hours.es}`,
      slotEvening: `Tarde · ${evening}`,
      slotEveningHint: 'Si a mediodía no estás en casa',
      deliveryHomeHint:
        'Sant Boi, Sant Just Desvern, Sant Joan Despí, Sant Feliu de Llobregat, Santa Coloma de Cervelló y Sant Vicenç dels Horts',
      deliveryPickup: 'Lo recojo en Sant Boi',
      deliveryPickupHint:
        'Resto del Baix Llobregat. Delante del Mercat de la Muntanyeta.',
      town: 'Municipio',
      townPick: 'Elige tu municipio',
      address: 'Dirección de entrega',
      notes: 'Si no estás (opcional)',
      notesPlaceholder:
        'Déjalo en portería, en recepción, a la vecina del 2.º…',
      addressPlaceholder: 'Calle, número, piso y puerta (casa o trabajo)',
      deliveryLabel: (town: string) => `Entrega a domicilio en ${town}`,
      pay: 'Pago',
      payValue: 'Al recibirlo o recogerlo. Sin tarjeta ni cuenta.',
      question: 'Tengo una pregunta ↗',
      yourOrder: 'Tu pedido',
      step1: '1 · Qué quieres',
      step3: '3 · Tus datos',
      moreProducts: '+ Añadir otro producto',
      notesToggle: '+ Añadir una nota para la entrega',
      submitTotal: (total: string) => `Confirmar reserva · ${total}`,
      demoIntro:
        'Modo de prueba: usa datos ficticios. No se envían emails ni se encarga pan.',
      qty: 'Hogazas',
      qtyMax: 'Hasta 4 por pedido',
      less: 'Quitar una hogaza',
      more: 'Añadir una hogaza',
      name: 'Tu nombre',
      email: 'Email (opcional)',
      emailHint: 'Si no lo pones, te confirmo el pedido por WhatsApp.',
      phone: 'Móvil o WhatsApp',
      honey: 'Deja este campo vacío',
      demoCheck: 'Entiendo que estoy probando una reserva ficticia.',
      pickupCheck: (day: string, window: string, wed = false) =>
        `Te lo entrego el ${day}: en la dirección que pongas ${wed ? `${hours.es} o ${evening}, según la franja que elijas,` : hours.es} si eliges entrega a domicilio, o delante del Mercat de la Muntanyeta, en Sant Boi de Llobregat${window ? ` (${window})` : ''}.`,
      privacyA: 'He leído la',
      privacyNote: 'Al reservar aceptas la',
      privacyLink: 'privacidad y las condiciones',
      referralNote:
        '🎁 Vienes invitado por un vecino: con tu primer pedido, un croissant de regalo.',
      newsCheck:
        'Opcional: avísame por email cuando abra cada hornada del sábado (como mucho dos emails por semana; baja con un clic).',
      submitDemo: 'Probar reserva',
      submit: 'Confirmar reserva',
      footnote:
        'Pagas al recibirlo. Cancelas con un clic hasta el cierre. Sin compromiso.',
      whatsappCta: 'Reservar por WhatsApp',
      // Secondary: a text link under the main button, not a second button.
      whatsappAlt: '¿Prefieres pedirlo por WhatsApp?',
      whatsappText: (day: string) =>
        `¡Hola! Quiero reservar pan para el ${day}. Me gustaría: `,
      noscript: 'Activa JavaScript para ver la confirmación en esta página.',
      noscriptMail: 'También puedes escribirme para reservar.',
      closedH3: 'Esta semana ya no quedan hogazas.',
      closedP:
        'Te aviso en cuanto abra la próxima hornada: por WhatsApp o por email.',
      notify: 'Avísame',
    },
    faq: {
      h2: 'Preguntas',
      items: [
        [
          '¿Es pan de masa madre?',
          'Hay de los dos. La de cada semana es de poolish: una masa previa de harina, agua y muy poca levadura que fermenta durante la noche, con hasta 35 horas de fermentación en total; sabor suave y nada ácido. Si prefieres masa madre, la hogaza de masa madre también está en la carta.',
        ],
        [
          '¿Qué lleva la hogaza?',
          'Harina de trigo ecológica, agua, sal y levadura. Contiene gluten. Si tienes otra alergia, pregúntame antes de reservar: en el espacio de elaboración se trabaja con otras harinas.',
        ],
        [
          '¿Dónde se recoge?',
          `Delante del Mercat de la Muntanyeta, en Sant Boi de Llobregat. Es la opción si vives en otro municipio del Baix Llobregat, como ${areaTowns}.`,
        ],
        [
          '¿Hacéis entrega a domicilio?',
          `Sí, los miércoles ${hours.es} o ${evening} y los sábados ${hours.es} en Sant Boi de Llobregat, Sant Just Desvern, Sant Joan Despí, Sant Feliu de Llobregat, Santa Coloma de Cervelló y Sant Vicenç dels Horts, sin coste de envío. Al reservar eliges «A domicilio», la franja si es miércoles, y escribes tu dirección. Pagas al recibirlo.`,
        ],
        [
          '¿Lleváis pan a Sant Just Desvern?',
          `Sí. Cada miércoles y cada sábado reparto en Sant Just Desvern ${hours.es} (el miércoles, también ${evening}), igual que en Sant Boi, Sant Joan Despí, Sant Feliu de Llobregat, Santa Coloma de Cervelló y Sant Vicenç dels Horts. Reserva antes del cierre de pedidos: el lunes para el miércoles y el jueves para el sábado, a las 20:00.`,
        ],
        [
          '¿Y si no voy a estar?',
          'Responde al email de confirmación o escríbeme cuanto antes con el código de tu reserva. El día antes te llega un recordatorio. Si aún estamos a tiempo, libero tu pedido para otra persona.',
        ],
      ],
    },
    waitlist: {
      h2: '¿Te aviso de la próxima hornada?',
      p: 'Un mensaje cuando abra reservas, y nada más.',
      whatsapp: 'Avísame por WhatsApp',
      whatsappText:
        '¡Hola Víctor! Avísame cuando abras la próxima hornada, por favor.',
      channelCta: 'Unirme al canal de WhatsApp',
      emailAlt: '¿Prefieres un email?',
      label: 'Tu email',
      button: 'Avísame',
      honey: 'Deja vacío',
      consentA: 'Quiero recibir avisos de hornadas y acepto la',
      consentLink: 'política de privacidad',
      channel: 'O sigue el canal de WhatsApp: un aviso por hornada, sin chat.',
      disabled: 'Los avisos se activarán al anunciar la primera hornada.',
      demo: 'Modo de prueba: no recibirás emails.',
      success:
        'Casi está: te he enviado un email para confirmar el aviso. Si no lo ves, mira en spam.',
      successDirect:
        'Ya estás en la lista. Te escribiré cuando abra la próxima hornada.',
      poster: 'Hogaza partida por la mitad, con la miga abierta a contraluz',
    },
    mobile: {
      label: 'Reserva rápida',
      loaf: 'Hogaza',
      order: 'Reservar',
      notify: 'Avísame',
    },
    ed: {
      bar: 'Pan artesano por encargo',
      fig: '(Fig. 1) Pan de miga, partido por la mitad',
      ferment: 'Fermentado hasta 35 h',
      diary: 'Diario del obrador',
      swipe: 'Desliza',
      menuBar: 'Del horno a tu mesa',
      processBar: 'Dos hornadas por semana',
      flourBar: 'Sin mejorantes',
      makerBar: 'Baix Llobregat',
      reserveBar: 'Sin tarjeta ni cuenta',
      faqBar: 'Lo que más me preguntan',
      waitBar: 'Un aviso por hornada',
      fig2: '(Fig. 2) La de cada semana, recién salida del horno',
      fig3: '(Fig. 3) Banana bread de pepitas de chocolate',
      fig4: '(Fig. 6) Quien hace el pan',
      fig5: '(Fig. 4) Croissant y pain au chocolat',
      defWord: 'molla',
      defGram: 'f. (cat.)',
      defText: 'La miga: la parte tierna de dentro del pan.',
      whole: 'Entero',
      half: 'La mitad',
    },
    breadcrumbHome: 'Inicio',
  },
  ca: {
    skip: 'Vés al contingut',
    demo: 'Vista de prova · Les comandes d’aquesta versió no són reals.',
    home: `${brand.name}, inici`,
    nav: {
      process: 'El procés',
      pickup: 'Recollida',
      delivery: 'A domicili',
      standing: 'Pa fix',
      faq: 'Preguntes',
      order: 'Reservar',
    },
    switchLabel: 'Castellano',
    switchAria: 'Lee esta página en castellano',
    footer: {
      line: 'Pa artesà de fermentació lenta, per encàrrec.',
      area: `Pa a domicili els dimecres ${hours.ca} o ${evening} i els dissabtes ${hours.ca} a Sant Boi, Sant Just Desvern, Sant Joan Despí, Sant Feliu de Llobregat, Santa Coloma de Cervelló i Sant Vicenç dels Horts · Recollida a Sant Boi de Llobregat`,
      privacy: 'Privacitat i condicions',
      write: 'Escriu-me ↗',
      channel: 'Canal de WhatsApp',
    },
    meta: {
      title: `Fleca artesana a Sant Boi · Pa de massa mare · ${brand.name}`,
      description: `Pa de massa mare i poolish amb farina ecològica, fet a mà a Sant Boi. Te’l porto a casa dimecres i dissabte. Des de ${loafPrice}, pagues en rebre’l.`,
      ogAlt: 'Pans de crosta torrada acabats de tallar',
    },
    xmas: {
      label: 'Nadal',
      lead: 'Ja pots reservar per a ',
      week: 'Fornada d’aquesta setmana',
    },
    status: {
      OPEN: 'Reserves obertes',
      SOLD_OUT: 'Fornada exhaurida',
      CLOSED: 'Comandes tancades',
      UPCOMING: 'Propera fornada',
      COMPLETED: 'Aquesta fornada ja ha sortit del forn',
    },
    hero: {
      h1a: 'Pa artesà, acabat de fer,',
      h1b: 'a la porta de casa',
      sub: `Cada dimecres i cada dissabte ${hours.ca}, i els dimecres també ${evening}, a domicili a Sant Boi, Sant Just Desvern, Sant Joan Despí, Sant Feliu, Santa Coloma i Sant Vicenç.`,
      short: `El faig aquell mateix matí i te’l porto a casa o a la feina, cada dimecres i dissabte ${hours.ca} (el dimecres, també ${evening}). Pa des de ${loafPrice}, enviament gratis i pagues en rebre’l.`,
      kicker: 'Fleca de barri · Baix Llobregat',
      keywords: [
        'Farines ecològiques',
        'Poolish',
        'Fins a 35 h de fermentació',
        'Fet a mà',
        'A domicili dimecres i dissabte',
        'Baix Llobregat',
      ],
      order: 'Reservar pa',
      notify: 'Avisa’m quan obri',
      how: 'Com el faig',
      photos: [
        'Pa rodó acabat de coure, amb el tall obert, sobre paper de forn',
        'Un pa partit per la meitat entre les mans, amb la molla oberta',
      ],
      values: [
        ['Farines ecològiques', 'De cultiu ecològic, sense milloradors.'],
        ['Fins a 35 hores', 'De fermentació lenta amb poolish.'],
        ['Fornada petita', 'Pocs pans, fets d’un en un.'],
        [
          'A domicili',
          `Dimecres i dissabtes ${hours.ca}; dimecres també ${evening}. A Sant Boi, Sant Just, Sant Joan Despí, Sant Feliu, Santa Coloma i Sant Vicenç.`,
        ],
      ],
      nextBake: 'Propera fornada',
      ribbon: [
        'Molla',
        'Pa artesà',
        'Fins a 35 h de fermentació',
        'Baix Llobregat',
      ],
      terms: `Enviament gratis a Sant Boi, Sant Just, Sant Joan Despí, Sant Feliu, Santa Coloma i Sant Vicenç, o el reculls ${brand.pickupPlace.ca} · Pagues en rebre’l`,
      proof: ['Fet a mà a Sant Boi'],
      trust: (score: string, count: number) =>
        `${score} a Google (${count} ressenyes) · El faig jo, el Víctor, a Sant Boi`,
      when: (wed: boolean) =>
        wed ? `Te’l porto ${hours.ca} o ${evening}` : `Te’l porto ${hours.ca}`,
      scroll: 'Llisca',
      hands: 'Les mans de la meva mare',
      sealTop: 'fins a',
      sealBottom: 'de fermentació',
    },
    baker: {
      line: 'Sóc el Víctor. Faig el pa a Sant Boi, d’un en un, i te’l porto jo.',
      photo: 'El Víctor, el forner, sosté un pa acabat de coure i somriu',
      reviews: 'Veure les ressenyes',
    },
    film: {
      label: 'La cuina, en fotos',
      items: [
        [
          'proof',
          'La massa',
          'Fermenta a poc a poc, sense pressa.',
          'Dues masses de pa reposant sobre el taulell',
        ],
        [
          'hands',
          'A mà',
          'Plecs, formació i tall, un a un.',
          'Mà que talla un pa de crosta fosca amb un ganivet de pa',
        ],
        [
          'smell',
          'Fa olor',
          'El primer gest en treure’l del forn.',
          'El forner ensuma un pa acabat de coure',
        ],
        [
          'cut',
          'Crosta',
          'Fosca i cruixent; la molla, humida.',
          'Pa acabat de tallar, amb la crosta torrada i la molla a la vista',
        ],
        [
          'slices',
          'Fins a 35 h',
          'De fermentació: aquí hi ha el gust.',
          'Llesques de pa amb molla alveolada sobre una taula',
        ],
      ] as [string, string, string, string][],
    },
    catalog: {
      kicker: 'La carta',
      h2b: 'Feta sense pressa.',
      details: 'Ingredients i al·lèrgens',
      loaf: 'El de cada setmana',
      sourdough: 'Massa mare',
      wholegrain: 'Integral 60 %',
      bananaWhole: 'Banana bread sencer',
      bananaHalf: 'Mig banana bread',
      add: 'Afegir a la comanda',
      inOrder: (n: string) => `${n} a la comanda`,
      remove: 'Treure’n un',
      whole: 'Sencer',
      half: 'Meitat',
      size: 'Mida',
      each: 'cadascun',
      closed: 'Es reserva quan obri la fornada',
      stock: {
        bread: { ok: '', low: 'Queden pocs pans', out: 'Fornada exhaurida' },
        banana: {
          ok: '',
          low: 'Queda poc banana bread',
          out: 'Exhaurit aquesta setmana',
        },
        pastry: {
          ok: '',
          low: 'Queda poca brioixeria',
          out: 'Brioixeria exhaurida aquesta setmana',
        },
      },
      pill: 'La teva comanda',
      pillCta: 'Reservar',
      pillDone: 'Acabar →',
      loaves: (n: number) => `${n} ${n === 1 ? 'pa' : 'pans'}`,
      banana: (halves: number) =>
        halves === 1 ? '½ banana bread' : `${halves / 2} banana bread`,
      croissant: 'Croissant',
      pain: 'Pain au chocolat',
      croissants: (n: number) => `${n} ${n === 1 ? 'croissant' : 'croissants'}`,
      pains: (n: number) =>
        `${n} ${n === 1 ? 'pain au chocolat' : 'pains au chocolat'}`,
    },
    bake: {
      number: 'Fornada',
      test: ' (prova)',
      open: (deadline: string) => {
        const d = madridParts('ca', deadline);
        return `Comandes fins ${d.weekday} ${d.day} a les ${d.time} o fins que s’acabi la fornada.`;
      },
      dateSoon: 'Data per confirmar',
      closesIn: 'Tanca en',
      upcoming: 'Anunciaré la data quan obri reserves.',
      closed: 'Aquesta setmana ja no accepto comandes. T’aviso de la propera.',
      unavailable:
        'Ara no puc consultar la disponibilitat. Recarrega la pàgina abans de reservar.',
      ctaOpen: (weekday: string) => `Reservar el meu pa del ${weekday}`,
      ctaQuick: (price: string) => `Reservar 1 pa · ${price}`,
      ctaMenu: 'Veure tota la carta',
      ctaClosed: 'Avisa’m de la propera',
    },
    loaf: {
      kicker: 'El pa',
      name: 'El de cada setmana',
      alt: 'Dos pans artesans amb els talls oberts sobre una taula de fusta',
      altSlice: 'Mig pa sostingut a la mà, amb la molla alveolada a la vista',
      fermentation: 'Fermentació',
      pitch:
        'Crosta que cruix, molla tendra i aguanta uns quants dies. Farina ecològica, aigua, sal i llevat',
      fermentationValue: 'Poolish i fins a 35 hores de fermentació lenta',
      ingredients: 'Ingredients',
      ingredientsValue:
        'Farina de blat ecològica, aigua, sal i llevat. Res més.',
      allergens: 'Al·lèrgens',
      allergensValue:
        'Conté blat (gluten). Si tens una altra al·lèrgia, pregunta’m abans de reservar.',
      keeps: 'Aguanta',
      keepsValue:
        'Uns quants dies embolicat amb un drap. Es congela bé a llesques.',
      order: 'Reservar aquest pa',
      notify: 'Vull assabentar-me’n',
    },
    banana: {
      kicker: 'També cuino',
      h2a: 'Banana bread',
      h2b: 'de xocolata.',
      p: 'Tres plàtans ben madurs per motlle, farina ecològica, iogurt i una bossa sencera de xips de xocolata. Crosta daurada, molla humida i tendra.',
      short:
        'Fet amb plàtan madur, farina ecològica, iogurt i 100 g de xips de xocolata per motlle.',
      ingredientsValue:
        'Plàtan madur, farina de blat ecològica, iogurt i xips de xocolata.',
      allergensValue: 'Conté blat (gluten) i llet. Pregunta’m per traces.',
      note: 'Sencer o la meitat. Amb el teu pa o sol.',
      alt: 'Banana bread amb xips de xocolata sobre una taula de fusta',
      altDetail: 'Detall de la crosta del banana bread amb xips de xocolata',
      ask: 'Demanar banana bread',
      notify: 'Avisa’m quan n’hi hagi',
    },
    breads: {
      kicker: 'El pa',
      h3: 'Nou pans, una fornada.',
      intro:
        'Tria’n un o combina’ls: surten del mateix forn el dimecres i el dissabte.',
      from: 'des de',
      unit: 'El pa',
      items: {
        loaf: 'Amb poolish, una massa prèvia que fermenta tota la nit, i fins a 35 h de fermentació: més gust i es manté tendre més dies. Suau, molla oberta i crosta que cruix.',
        sourdough: 'Fermentat amb massa mare.',
        wholegrain: 'Amb un 60 % de farina integral.',
      },
      photos: {
        loaf: 'Mig pa clàssic a la mà, amb la molla oberta a la vista',
        sourdough:
          'Dues meitats de pa de massa mare apilades, amb la molla alveolada',
        wholegrain:
          'Dues meitats de pa integral apilades sobre una taula, molla torrada i atapeïda',
        sourdoughLoaf:
          'Pa de massa mare vist des de dalt, amb el tall obert i daurat',
      },
      details: {
        sourdough:
          'Farina de blat de força, farina integral, massa mare, aigua i sal.',
        wholegrain:
          'Farina integral, llevat, aigua, farina de blat de força i sal.',
      },
      // Pans amb farciment i pa de llet (config.ts, `extraBreads`).
      extraKicker: 'Amb farciment',
      extraH4: 'Sis més, el mateix forn.',
      extraIntro:
        'El mateix pa amb olives, nous, xocolata o fruita seca. I un pa de llet tendre per esmorzar.',
      extra: {
        kalamata: {
          name: 'Olives negres i romaní',
          text: 'Olives negres i romaní a la massa. Per a l’aperitiu o amb un bon oli.',
          alt: 'Dues meitats de pa amb olives negres i romaní repartits per la molla',
          ingredients:
            'Farina de blat, aigua, sal i massa mare, amb olives negres i romaní.',
        },
        nueces: {
          name: 'Nous',
          text: 'Nous per tota la molla. Amb formatge, de luxe.',
          alt: 'Dues meitats de pa amb trossos de nou a la molla',
          ingredients: 'Farina de blat, aigua, sal i massa mare, amb nous.',
        },
        'nueces-naranja': {
          name: 'Nous i taronja',
          text: 'Nous i un toc de taronja. Perfecte per esmorzar.',
          alt: 'Dues meitats de pa amb nous i taronja, molla alveolada',
          ingredients:
            'Farina de blat, aigua, sal i massa mare, amb nous i taronja.',
        },
        chocolate: {
          name: 'Xocolata',
          text: 'Vetes de xocolata fosa dins de la molla.',
          alt: 'Dues meitats de pa amb vetes de xocolata a la molla',
          ingredients: 'Farina de blat, aigua, sal i massa mare, amb xocolata.',
        },
        'pasas-pistachos': {
          name: 'Panses, nabius i festucs',
          text: 'Panses, nabius i festucs a cada llesca.',
          alt: 'Dues meitats de pa amb panses, nabius vermells i festucs verds a la molla',
          ingredients:
            'Farina de blat, aigua, sal i massa mare, amb panses, nabius i festucs.',
        },
        'pan-de-leche': {
          name: 'Pa de llet',
          text: 'Amb poolish. Molla tendra i esponjosa, i una peça grossa: gairebé 1 kg de massa.',
          alt: 'Dues meitats de pa de llet amb la molla blanca i esponjosa',
          ingredients:
            'Farina de blat, poolish, llet, mantega, sucre, ou i sal.',
        },
      } satisfies Record<
        ExtraBreadId,
        { name: string; text: string; alt: string; ingredients: string }
      >,
      extraAllergens:
        'Nous i festucs: fruits de closca. La xocolata pot contenir llet i soja. El pa de llet porta llet i ou.',
      allergens:
        'Contenen blat (gluten). Si tens una altra al·lèrgia, pregunta’m abans de reservar.',
      add: 'Afegir',
      less: (name: string) => `Treure ${name}`,
      more: (name: string) => `Afegir ${name}`,
    },
    pastry: {
      kicker: 'Brioixeria',
      tag: 'Per unitats',
      short: 'Massa fullada amb mantega, a mà.',
      unit: 'La unitat',
      croissantText: 'Capes que cruixen i molla de bresca.',
      painText: 'La mateixa massa, amb dues barretes de xocolata a dins.',
      ingredients:
        'Massa fullada amb mantega. El pain au chocolat porta xocolata.',
      allergens:
        'Conté blat (gluten), llet i ou. Pregunta’m per traces abans de reservar.',
      alt: 'Un pain au chocolat i un croissant daurats sobre una taula de fusta, amb llum de tarda',
      add: 'Afegir',
      less: (name: string) => `Treure un ${name}`,
      more: (name: string) => `Afegir un ${name}`,
      notify: 'Avisa’m quan n’hi hagi',
    },
    why: {
      kicker: 'Per què jo',
      bar: 'I no el forn del costat',
      h2a: 'Per què jo',
      h2b: 'i no el forn.',
      stats: [
        ['35 h', 'de fermentació lenta'],
        ['0 €', 'd’enviament, fins a la porta'],
        ['0', 'cues ni “ja s’ha acabat”'],
      ],
    },
    xp: {
      nav: { how: 'Com el faig', menu: 'La carta' },
      order: {
        kicker: 'Nº 04 · La comanda',
        bar: 'Sense targeta ni compte',
        home: 'Porta-me’l a casa',
        pickup: 'El recullo jo',
        homeAt: 'a',
        street: 'a',
        slot: 'al',
        name: 'Em dic',
        phone: 'i el meu mòbil és el',
        email: 'Si vols el tiquet per correu:',
        total: 'Total · pagues en rebre’l',
        notify: 'Avisa’m de la propera fornada:',
        pick: 'Afegeix:',
        pickupAt: (window: string) =>
          ` ${brand.pickupPlace.ca}, a Sant Boi${window ? ` (${window})` : ''}`,
        lede: (day: string, wed: boolean) =>
          `Aquesta comanda és per al ${day}. Te’l porto a casa ${wed ? `${hours.ca} o ${evening}` : hours.ca}, o el reculls ${brand.pickupPlace.ca}. Enviament gratis i pagues en rebre’l. Fornejo cada dimecres i dissabte, i cada fornada es reserva per separat.`,
      },
      hint: 'Toca la massa',
      ferment: {
        label: 'Fins a 35 hores de fermentació',
        kicker: 'Nº 02 · 35 hores',
        what: 'El poolish és una massa prèvia (farina, aigua i una mica de llevat) que fermenta a poc a poc tota la nit. Per això el pa té més gust, la molla surt més oberta i es manté tendre més dies.',
        bar: 'Arrossega el temps',
        lead: 'El meu pa fermenta fins a',
        drag: '← Arrossega →',
        slider: 'Hores de fermentació',
        compare: 'Temps de fermentació, comparat',
        fast: 'Pa de pressa',
        fastValue: '< 3 h',
        me: 'Molla',
        replay: '↺ Un altre cop',
        fig: '(Fig. 2) La molla, mentre fermenta',
        phases: [
          [0, 'Poolish', 'farina, aigua i un pessic de llevat. Tota la nit.'],
          [14, 'Plecs', 'a mà, sense màquines.'],
          [16, 'Forma', 'pa a pa, un a un.'],
          [17, 'Fred', 'una altra nit sencera. Aquí no hi ha pressa.'],
          [33, 'Forn', 'crosta fosca, que cruix.'],
          [35, 'Llest', 'fa olor de pa.'],
        ] as [number, string, string][],
      },
      cut: {
        label: 'La molla, per dins',
        word: ['Obre’', 'l'] as [string, string],
        says: 'Això és la molla.',
        fig: '(Fig. 3) El de cada setmana, obert',
        scroll: 'Continua baixant',
      },
      counter: {
        bar: 'El taulell',
        hint: 'Llisca →',
        prev: 'Producte anterior',
        next: 'Producte següent',
      },
      sentence: {
        hi: 'Hola Víctor, vull',
        for: 'per al',
        empty: 'un pa',
        and: 'i',
      },
    },
    reviews: {
      kicker: 'Nº — Ressenyes',
      fig: '(Fig. 7)',
      count: (n: number) => `${n} ressenyes a Google`,
      source: 'Ressenya de Google',
      all: (n: number) => `Veure les ${n} ressenyes a Google`,
      leave: 'Deixa’n una',
      newTab: '(s’obre en una pestanya nova)',
      label: 'Ressenyes de Google',
      prev: 'Ressenya anterior',
      next: 'Ressenya següent',
    },
    fix: {
      kicker: 'Pa fix',
      bar: 'Cada setmana, sense pensar-hi',
      h2a: 'El teu pa cada setmana.',
      h2b: 'Sense pensar-hi.',
      voucher:
        'Només per al Pa fix: quan t’hagi entregat 3 pans, el 4t va de part meva.',
      cta: 'Apunta’t al Pa fix',
      facts: (price: string) => [
        `Dimecres o dissabte ${hours.ca}`,
        `${price} el pa · sense enviament`,
        'Saltes o cancel·les amb un clic',
      ],
    },
    organic: {
      kicker: 'Farina',
      h2a: 'Farines ecològiques,',
      h2b: 'i temps.',
      p: 'Tot el pa i el banana bread es fan amb farines de cultiu ecològic. Una bona farina no necessita milloradors: amb aigua, sal, poc llevat i molt de temps n’hi ha prou.',
      items: [
        ['100 %', 'farines ecològiques'],
        ['0', 'milloradors ni additius'],
        ['35 h', 'de fermentació'],
      ],
    },
    process: {
      h2a: 'La major part de la feina',
      h2b: 'és esperar.',
      hours: 'hores de fermentació',
      intro:
        'El poolish és una massa prèvia, líquida, que fermenta a poc a poc durant la nit. Dona al pa una molla més oberta, una crosta més fina i un gust que no s’aconsegueix amb pressa.',
      more: 'Què és el poolish, en detall',
      closeWhen: (deadline: string) => {
        const d = madridParts('ca', deadline);
        return `Fins ${d.weekday}, ${d.time}`;
      },
      pickupWhen: (pickup: string) =>
        capital(madridParts('ca', pickup).weekday),
      steps: [
        {
          when: 'Fins al tancament, 20:00',
          title: 'Reserves',
          text: 'Tanco comandes i sé exactament quants pans he de fer. Ni un de més.',
        },
        {
          when: 'Després del tancament',
          title: 'Fermentació lenta',
          time: 'Fins a 35 h',
          text: 'Poolish, pastat amb plecs a mà, formació i una llarga fermentació en fred. Sense presses: aquí neixen el gust, l’aroma i la molla.',
        },
        {
          when: 'El matí de l’entrega',
          title: 'Forn',
          text: 'Crosta fosca que cruix, molla oberta i humida.',
        },
        {
          when: 'Dimecres o dissabte',
          title: 'A casa teva',
          text: `Te’l porto ${hours.ca} (el dimecres, també ${evening}) a Sant Boi, Sant Just, Sant Joan Despí, Sant Feliu, Santa Coloma o Sant Vicenç, o el reculls a Sant Boi. Pagues en rebre’l.`,
        },
      ],
    },
    maker: {
      kicker: 'Qui fa el pa',
      h2: 'Pocs pans, fets d’un en un.',
      p1: 'Faig pa artesà per encàrrec per a gent de tot el Baix Llobregat. Cada setmana només cou el que s’ha reservat: així cada pa té el seu temps i no es llença res.',
      p2: 'Sense milloradors ni dreceres. Farina ecològica, aigua, sal, una mica de llevat i una nit sencera de paciència.',
      altPerson: 'El forner sosté un pa acabat de coure i somriu',
      altDough:
        'Dues masses formades reposant als seus cistells de fermentació',
    },
    reserve: {
      kicker: 'Comanda per a la propera fornada',
      h2: 'Reserva la teva comanda.',
      bananaQty: 'Banana bread',
      bananaHint: 'Per meitats: ½, 1, 1½ o 2',
      bananaLess: 'Treure mitja peça de banana bread',
      bananaMore: 'Afegir mitja peça de banana bread',
      bananaNone: 'Sense banana bread',
      emptyOrder: 'Afegeix un pa, un banana bread o brioixeria per reservar.',
      quickPick: 'Comencem per aquí?',
      quickLoaf: (price: string) => `1 pa · ${price}`,
      totalLabel: 'Total a pagar a l’entrega',
      pickup: 'Entrega',
      where: 'On',
      pickupLocation: `A domicili, ${hours.ca} · dimecres també ${evening}`,
      pickupDetails:
        'Sant Boi, Sant Just Desvern, Sant Joan Despí, Sant Feliu de Llobregat, Santa Coloma de Cervelló i Sant Vicenç dels Horts. Un altre municipi? El reculls a Sant Boi.',
      pickupInfo: 'Zones i horari de repartiment',
      deliveryH: '2 · Com t’arriba?',
      deliveryHome: (wed: boolean) =>
        wed ? 'A domicili · migdia o tarda' : `A domicili · ${hours.ca}`,
      slotH: 'A quina hora te’l porto?',
      slotMidday: `Migdia · ${hours.ca}`,
      slotEvening: `Tarda · ${evening}`,
      slotEveningHint: 'Si al migdia no ets a casa',
      deliveryHomeHint:
        'Sant Boi, Sant Just Desvern, Sant Joan Despí, Sant Feliu de Llobregat, Santa Coloma de Cervelló i Sant Vicenç dels Horts',
      deliveryPickup: 'El recullo a Sant Boi',
      deliveryPickupHint:
        'Resta del Baix Llobregat. Davant del Mercat de la Muntanyeta.',
      town: 'Municipi',
      townPick: 'Tria el teu municipi',
      address: 'Adreça d’entrega',
      notes: 'Si no hi ets (opcional)',
      notesPlaceholder: 'Deixa’l a consergeria, a recepció, a la veïna del 2n…',
      addressPlaceholder: 'Carrer, número, pis i porta (casa o feina)',
      deliveryLabel: (town: string) => `Entrega a domicili a ${town}`,
      pay: 'Pagament',
      payValue: 'En rebre o recollir la comanda. Sense targeta ni compte.',
      question: 'Tinc una pregunta ↗',
      yourOrder: 'La teva comanda',
      step1: '1 · Què vols',
      step3: '3 · Les teves dades',
      moreProducts: '+ Afegir un altre producte',
      notesToggle: '+ Afegir una nota per a l’entrega',
      submitTotal: (total: string) => `Confirmar la reserva · ${total}`,
      demoIntro:
        'Mode de prova: fes servir dades fictícies. No s’envien correus ni s’encarrega pa.',
      qty: 'Pans',
      qtyMax: 'Fins a 4 per comanda',
      less: 'Treure un pa',
      more: 'Afegir un pa',
      name: 'El teu nom',
      email: 'Correu electrònic (opcional)',
      emailHint: 'Si no el poses, et confirmo la comanda per WhatsApp.',
      phone: 'Mòbil o WhatsApp',
      honey: 'Deixa aquest camp buit',
      demoCheck: 'Entenc que estic provant una reserva fictícia.',
      pickupCheck: (day: string, window: string, wed = false) =>
        `Te l’entrego ${day}: a l’adreça que posis ${wed ? `${hours.ca} o ${evening}, segons la franja que triïs,` : hours.ca} si tries entrega a domicili, o davant del Mercat de la Muntanyeta, a Sant Boi de Llobregat${window ? ` (${window})` : ''}.`,
      privacyA: 'He llegit la',
      privacyNote: 'En reservar acceptes la',
      privacyLink: 'privacitat i les condicions',
      referralNote:
        '🎁 Vens convidat per un veí: amb la primera comanda, un croissant de regal.',
      newsCheck:
        'Opcional: avisa’m per correu quan obri cada fornada del dissabte (com a molt dos correus per setmana; baixa amb un clic).',
      submitDemo: 'Provar la reserva',
      submit: 'Confirmar la reserva',
      footnote:
        'Pagues a l’entrega. Cancel·les amb un clic fins al tancament. Sense compromís.',
      whatsappCta: 'Reservar per WhatsApp',
      whatsappAlt: 'Prefereixes demanar-lo per WhatsApp?',
      whatsappText: (day: string) =>
        `Hola! Voldria reservar pa per al ${day}. M’agradaria: `,
      noscript: 'Activa JavaScript per veure la confirmació en aquesta pàgina.',
      noscriptMail: 'També em pots escriure per reservar.',
      closedH3: 'Aquesta setmana ja no queden pans.',
      closedP:
        'T’aviso quan obri la propera fornada: per WhatsApp o per correu.',
      notify: 'Avisa’m',
    },
    faq: {
      h2: 'Preguntes',
      items: [
        [
          'És pa de massa mare?',
          'N’hi ha de tots dos. El de cada setmana és de poolish: una massa prèvia de farina, aigua i molt poc llevat que fermenta durant la nit, amb fins a 35 hores de fermentació en total; sabor suau i gens àcid. Si prefereixes massa mare, el pa de massa mare també és a la carta.',
        ],
        [
          'Què porta el pa?',
          'Farina de blat ecològica, aigua, sal i llevat. Conté gluten. Si tens una altra al·lèrgia, pregunta’m abans de reservar: a l’espai d’elaboració es treballa amb altres farines.',
        ],
        [
          'On es recull?',
          `Davant del Mercat de la Muntanyeta, a Sant Boi de Llobregat. És l’opció si vius en un altre municipi del Baix Llobregat, com ${areaTowns}.`,
        ],
        [
          'Feu entrega a domicili?',
          `Sí, els dimecres ${hours.ca} o ${evening} i els dissabtes ${hours.ca} a Sant Boi de Llobregat, Sant Just Desvern, Sant Joan Despí, Sant Feliu de Llobregat, Santa Coloma de Cervelló i Sant Vicenç dels Horts, sense cost d’enviament. En reservar tries «A domicili», la franja si és dimecres, i escrius la teva adreça. Pagues en rebre’l.`,
        ],
        [
          'Porteu pa a Sant Just Desvern?',
          `Sí. Cada dimecres i cada dissabte reparteixo a Sant Just Desvern ${hours.ca} (el dimecres, també ${evening}), igual que a Sant Boi, Sant Joan Despí, Sant Feliu de Llobregat, Santa Coloma de Cervelló i Sant Vicenç dels Horts. Reserva abans del tancament de comandes: dilluns per al dimecres i dijous per al dissabte, a les 20:00.`,
        ],
        [
          'I si no hi seré?',
          'Respon el correu de confirmació o escriu-me com més aviat millor amb el codi de la reserva. El dia abans t’arriba un recordatori. Si encara som a temps, allibero la teva comanda per a una altra persona.',
        ],
      ],
    },
    waitlist: {
      h2: 'T’aviso de la propera fornada?',
      p: 'Un missatge quan obri reserves, i res més.',
      whatsapp: 'Avisa’m per WhatsApp',
      whatsappText:
        'Hola Víctor! Avisa’m quan obris la propera fornada, si us plau.',
      channelCta: 'Unir-me al canal de WhatsApp',
      emailAlt: 'Prefereixes un correu?',
      label: 'El teu correu',
      button: 'Avisa’m',
      honey: 'Deixa-ho buit',
      consentA: 'Vull rebre avisos de fornades i accepto la',
      consentLink: 'política de privacitat',
      channel:
        'O segueix el canal de WhatsApp: un avís per fornada, sense xat.',
      disabled: 'Els avisos s’activaran quan s’anunciï la primera fornada.',
      demo: 'Mode de prova: no rebràs correus.',
      success:
        'Gairebé fet: t’he enviat un correu per confirmar l’avís. Si no el veus, mira al correu brossa.',
      successDirect:
        'Ja ets a la llista. T’escriuré quan obri la propera fornada.',
      poster: 'Pa partit per la meitat, amb la molla oberta a contrallum',
    },
    mobile: {
      label: 'Reserva ràpida',
      loaf: 'Pa',
      order: 'Reservar',
      notify: 'Avisa’m',
    },
    ed: {
      bar: 'Pa artesà per encàrrec',
      fig: '(Fig. 1) Pa de molla, tallat per la meitat',
      ferment: 'Fermentat fins a 35 h',
      diary: 'Diari de l’obrador',
      swipe: 'Llisca',
      menuBar: 'Del forn a la taula',
      processBar: 'Dues fornades per setmana',
      flourBar: 'Sense milloradors',
      makerBar: 'Baix Llobregat',
      reserveBar: 'Sense targeta ni compte',
      faqBar: 'El que més em pregunteu',
      waitBar: 'Un avís per fornada',
      fig2: '(Fig. 2) El de cada setmana, acabat de sortir del forn',
      fig3: '(Fig. 3) Banana bread de gotes de xocolata',
      fig4: '(Fig. 6) Qui fa el pa',
      fig5: '(Fig. 4) Croissant i pain au chocolat',
      defWord: 'molla',
      defGram: 'f.',
      defText: 'La part tova de dins del pa.',
      whole: 'Sencer',
      half: 'La meitat',
    },
    breadcrumbHome: 'Inici',
  },
  en: {
    skip: 'Skip to content',
    demo: 'Test version · Orders on this version are not real.',
    home: `${brand.name}, home`,
    nav: {
      process: 'The process',
      pickup: 'Pickup',
      delivery: 'Home delivery',
      standing: 'Weekly bread',
      faq: 'Questions',
      order: 'Order',
    },
    switchLabel: 'English',
    switchAria: 'Read this page in English',
    footer: {
      line: 'Slow-fermented artisan bread, made to order.',
      area: `Bread delivered on Wednesdays ${hours.en} or ${eveningEn} and Saturdays ${hours.en} in Sant Boi, Sant Just Desvern, Sant Joan Despí, Sant Feliu de Llobregat, Santa Coloma de Cervelló and Sant Vicenç dels Horts · Pickup in Sant Boi de Llobregat`,
      privacy: 'Privacy and terms',
      write: 'Write to me ↗',
      channel: 'WhatsApp channel',
    },
    meta: {
      title: `Artisan bakery in Sant Boi · Sourdough · ${brand.name}`,
      description: `Sourdough and poolish bread made by hand with organic flour in Sant Boi. Delivered to your door on Wednesdays and Saturdays. From ${loafPrice}, pay on delivery.`,
      ogAlt: 'Freshly sliced loaves with a toasted crust',
    },
    xmas: {
      label: 'Christmas',
      lead: 'You can now order for ',
      week: 'This week’s bake',
    },
    status: {
      OPEN: 'Orders open',
      SOLD_OUT: 'Bake sold out',
      CLOSED: 'Orders closed',
      UPCOMING: 'Next bake',
      COMPLETED: 'This bake is already out of the oven',
    },
    hero: {
      h1a: 'Artisan bread, freshly baked,',
      h1b: 'at your door',
      sub: `Every Wednesday and Saturday ${hours.en}, and on Wednesdays also ${eveningEn}, delivered to Sant Boi, Sant Just Desvern, Sant Joan Despí, Sant Feliu, Santa Coloma and Sant Vicenç.`,
      short: `I bake it that same morning and bring it to your home or office, every Wednesday and Saturday ${hours.en} (on Wednesdays, also ${eveningEn}). Bread from ${loafPrice}, free delivery and you pay when it arrives.`,
      kicker: 'Neighbourhood bakery · Baix Llobregat',
      keywords: [
        'Organic flour',
        'Poolish',
        'Up to 35 h of fermentation',
        'Handmade',
        'Delivered Wednesday and Saturday',
        'Baix Llobregat',
      ],
      order: 'Order a loaf',
      notify: 'Tell me when it opens',
      how: 'How I make it',
      photos: [
        'Round loaf fresh from the oven, with its score open, on baking paper',
        'A loaf broken in half between two hands, with an open crumb',
      ],
      values: [
        ['Organic flour', 'Organically grown, no improvers.'],
        ['Up to 35 hours', 'Of slow fermentation with poolish.'],
        ['Small bake', 'Few loaves, made one at a time.'],
        [
          'Home delivery',
          `Wednesdays and Saturdays ${hours.en}; Wednesdays also ${eveningEn}. In Sant Boi, Sant Just, Sant Joan Despí, Sant Feliu, Santa Coloma and Sant Vicenç.`,
        ],
      ],
      nextBake: 'Next bake',
      ribbon: [
        'Molla',
        'Pa artesà',
        'Fins a 35 h de fermentació',
        'Baix Llobregat',
      ],
      terms: `Free delivery to Sant Boi, Sant Just, Sant Joan Despí, Sant Feliu, Santa Coloma and Sant Vicenç, or pick it up ${brand.pickupPlace.en} · Pay on delivery`,
      proof: ['Handmade in Sant Boi'],
      trust: (score: string, count: number) =>
        `${score} on Google (${count} reviews) · Made by me, Víctor, in Sant Boi`,
      when: (wed: boolean) =>
        wed ? `Delivered ${hours.en} or ${eveningEn}` : `Delivered ${hours.en}`,
      scroll: 'Scroll',
      hands: 'My mother’s hands',
      sealTop: 'up to',
      sealBottom: 'of fermentation',
    },
    baker: {
      line: 'I’m Víctor. I make the bread in Sant Boi, loaf by loaf, and I deliver it myself.',
      photo: 'Víctor, the baker, holds a freshly baked loaf and smiles',
      reviews: 'See the reviews',
    },
    film: {
      label: 'The kitchen, in photos',
      items: [
        [
          'proof',
          'The dough',
          'It ferments slowly, no rush.',
          'Two bread doughs resting on the counter',
        ],
        [
          'hands',
          'By hand',
          'Folds, shaping and scoring, one by one.',
          'A hand cutting a dark-crusted loaf with a bread knife',
        ],
        [
          'smell',
          'Smell it',
          'The first thing I do when it comes out of the oven.',
          'The baker smells a freshly baked loaf',
        ],
        [
          'cut',
          'Crust',
          'Dark and crunchy; the crumb, moist.',
          'Freshly cut loaf, with a toasted crust and the crumb on show',
        ],
        [
          'slices',
          'Up to 35 h',
          'Of fermentation: that’s where the flavour is.',
          'Slices of bread with an airy crumb on a board',
        ],
      ] as [string, string, string, string][],
    },
    catalog: {
      kicker: 'The menu',
      h2b: 'Made without hurry.',
      details: 'Ingredients and allergens',
      loaf: 'The weekly loaf',
      sourdough: 'Sourdough',
      wholegrain: 'Wholegrain 60 %',
      bananaWhole: 'Whole banana bread',
      bananaHalf: 'Half banana bread',
      add: 'Add to order',
      inOrder: (n: string) => `${n} in your order`,
      remove: 'Remove one',
      whole: 'Whole',
      half: 'Half',
      size: 'Size',
      each: 'each',
      closed: 'Orders open with the next bake',
      stock: {
        bread: { ok: '', low: 'Few loaves left', out: 'Bake sold out' },
        banana: {
          ok: '',
          low: 'Little banana bread left',
          out: 'Sold out this week',
        },
        pastry: {
          ok: '',
          low: 'Few pastries left',
          out: 'Pastries sold out this week',
        },
      },
      pill: 'Your order',
      pillCta: 'Order',
      pillDone: 'Finish →',
      loaves: (n: number) => `${n} ${n === 1 ? 'loaf' : 'loaves'}`,
      banana: (halves: number) =>
        halves === 1 ? '½ banana bread' : `${halves / 2} banana bread`,
      croissant: 'Croissant',
      pain: 'Pain au chocolat',
      croissants: (n: number) => `${n} ${n === 1 ? 'croissant' : 'croissants'}`,
      pains: (n: number) =>
        `${n} ${n === 1 ? 'pain au chocolat' : 'pains au chocolat'}`,
    },
    bake: {
      number: 'Bake',
      test: ' (test)',
      open: (deadline: string) => {
        const d = madridParts('en', deadline);
        return `Orders until ${d.weekday} ${d.day} at ${d.time} or until the bake is full.`;
      },
      dateSoon: 'Date to be confirmed',
      closesIn: 'Closes in',
      upcoming: 'I’ll announce the date when orders open.',
      closed:
        'I’m not taking more orders this week. I’ll let you know about the next one.',
      unavailable:
        'I can’t check availability right now. Reload the page before ordering.',
      ctaOpen: (weekday: string) => `Order my bread for ${weekday}`,
      ctaQuick: (price: string) => `Order 1 loaf · ${price}`,
      ctaMenu: 'See the whole menu',
      ctaClosed: 'Tell me about the next one',
    },
    loaf: {
      kicker: 'The loaf',
      name: 'The weekly loaf',
      alt: 'Two artisan loaves with open scores on a wooden board',
      altSlice: 'Half a loaf held in the hand, with its airy crumb on show',
      fermentation: 'Fermentation',
      pitch:
        'A crust that crackles, a soft crumb and it keeps for days. Organic flour, water, salt and yeast',
      fermentationValue: 'Poolish and up to 35 hours of slow fermentation',
      ingredients: 'Ingredients',
      ingredientsValue:
        'Organic wheat flour, water, salt and yeast. Nothing else.',
      allergens: 'Allergens',
      allergensValue:
        'Contains wheat (gluten). If you have another allergy, ask me before ordering.',
      keeps: 'Keeps',
      keepsValue: 'Several days wrapped in a cloth. It freezes well in slices.',
      order: 'Order this loaf',
      notify: 'Keep me posted',
    },
    banana: {
      kicker: 'I also bake',
      h2a: 'Chocolate chip',
      h2b: 'banana bread.',
      p: 'Three very ripe bananas per tin, organic flour, yoghurt and a whole bag of chocolate chips. Golden crust, moist and tender crumb.',
      short:
        'Made with ripe banana, organic flour, yoghurt and 100 g of chocolate chips per tin.',
      ingredientsValue:
        'Ripe banana, organic wheat flour, yoghurt and chocolate chips.',
      allergensValue: 'Contains wheat (gluten) and milk. Ask me about traces.',
      note: 'Whole or half. With your loaf or on its own.',
      alt: 'Chocolate chip banana bread on a wooden board',
      altDetail: 'Close-up of the banana bread crust with chocolate chips',
      ask: 'Order banana bread',
      notify: 'Tell me when there is some',
    },
    breads: {
      kicker: 'The bread',
      h3: 'Nine breads, one bake.',
      intro:
        'Pick one or mix them: they come out of the same oven on Wednesday and Saturday.',
      from: 'from',
      unit: 'Per loaf',
      items: {
        loaf: 'With poolish, a pre-dough that ferments overnight, and up to 35 h of fermentation: more flavour and it stays soft for more days. Mild, open crumb and a crust that crackles.',
        sourdough: 'Fermented with sourdough starter.',
        wholegrain: 'With 60 % wholegrain flour.',
      },
      photos: {
        loaf: 'Half a classic loaf in the hand, with its open crumb on show',
        sourdough: 'Two halves of sourdough bread stacked, with an airy crumb',
        wholegrain:
          'Two halves of wholegrain bread stacked on a board, toasted and dense crumb',
        sourdoughLoaf:
          'Sourdough loaf seen from above, with an open, golden score',
      },
      details: {
        sourdough:
          'Strong wheat flour, wholegrain flour, sourdough starter, water and salt.',
        wholegrain:
          'Wholegrain flour, yeast, water, strong wheat flour and salt.',
      },
      extraKicker: 'Filled breads',
      extraH4: 'Six more, same oven.',
      extraIntro:
        'The same loaf with olives, walnuts, chocolate or dried fruit. And a soft milk bread for breakfast.',
      extra: {
        kalamata: {
          name: 'Black olives and rosemary',
          text: 'Black olives and rosemary in the dough. For an aperitivo or with good olive oil.',
          alt: 'Two halves of bread with black olives and rosemary through the crumb',
          ingredients:
            'Wheat flour, water, salt and sourdough starter, with black olives and rosemary.',
        },
        nueces: {
          name: 'Walnuts',
          text: 'Walnuts all through the crumb. Superb with cheese.',
          alt: 'Two halves of bread with pieces of walnut in the crumb',
          ingredients:
            'Wheat flour, water, salt and sourdough starter, with walnuts.',
        },
        'nueces-naranja': {
          name: 'Walnuts and orange',
          text: 'Walnuts and a hint of orange. Perfect for breakfast.',
          alt: 'Two halves of bread with walnuts and orange, airy crumb',
          ingredients:
            'Wheat flour, water, salt and sourdough starter, with walnuts and orange.',
        },
        chocolate: {
          name: 'Chocolate',
          text: 'Streaks of melted chocolate inside the crumb.',
          alt: 'Two halves of bread with streaks of chocolate in the crumb',
          ingredients:
            'Wheat flour, water, salt and sourdough starter, with chocolate.',
        },
        'pasas-pistachos': {
          name: 'Raisins, cranberries and pistachios',
          text: 'Raisins, cranberries and pistachios in every slice.',
          alt: 'Two halves of bread with raisins, red cranberries and green pistachios in the crumb',
          ingredients:
            'Wheat flour, water, salt and sourdough starter, with raisins, cranberries and pistachios.',
        },
        'pan-de-leche': {
          name: 'Milk bread',
          text: 'With poolish. Soft, fluffy crumb, and a big one: almost 1 kg of dough.',
          alt: 'Two halves of milk bread with a white, fluffy crumb',
          ingredients:
            'Wheat flour, poolish, milk, butter, sugar, egg and salt.',
        },
      } satisfies Record<
        ExtraBreadId,
        { name: string; text: string; alt: string; ingredients: string }
      >,
      extraAllergens:
        'Walnuts and pistachios: tree nuts. The chocolate may contain milk and soy. The milk bread contains milk and egg.',
      allergens:
        'They contain wheat (gluten). If you have another allergy, ask me before ordering.',
      add: 'Add',
      less: (name: string) => `Remove ${name}`,
      more: (name: string) => `Add ${name}`,
    },
    pastry: {
      kicker: 'Pastries',
      tag: 'By the piece',
      short: 'Butter-laminated dough, by hand.',
      unit: 'Each',
      croissantText: 'Crackling layers and a honeycomb crumb.',
      painText: 'The same dough, with two chocolate batons inside.',
      ingredients:
        'Butter-laminated dough. The pain au chocolat has chocolate.',
      allergens:
        'Contains wheat (gluten), milk and egg. Ask me about traces before ordering.',
      alt: 'A golden pain au chocolat and croissant on a wooden board, in afternoon light',
      add: 'Add',
      less: (name: string) => `Remove one ${name}`,
      more: (name: string) => `Add one ${name}`,
      notify: 'Tell me when there are some',
    },
    why: {
      kicker: 'Why me',
      bar: 'And not the bakery next door',
      h2a: 'Why me',
      h2b: 'and not the bakery.',
      stats: [
        ['35 h', 'of slow fermentation'],
        ['€0', 'delivery, right to your door'],
        ['0', 'queues or “it’s all gone”'],
      ],
    },
    xp: {
      nav: { how: 'How I make it', menu: 'The menu' },
      order: {
        kicker: 'No. 04 · The order',
        bar: 'No card, no account',
        home: 'Bring it to my home',
        pickup: 'I’ll pick it up',
        homeAt: 'in',
        street: 'at',
        slot: 'at',
        name: 'My name is',
        phone: 'and my mobile is',
        email: 'If you want the receipt by email:',
        total: 'Total · pay on delivery',
        notify: 'Tell me about the next bake:',
        pick: 'Add:',
        pickupAt: (window: string) =>
          ` ${brand.pickupPlace.en}, in Sant Boi${window ? ` (${window})` : ''}`,
        lede: (day: string, wed: boolean) =>
          `This order is for ${day}. I’ll bring it to your home ${wed ? `${hours.en} or ${eveningEn}` : hours.en}, or you pick it up ${brand.pickupPlace.en}. Free delivery and you pay when it arrives. I bake every Wednesday and Saturday, and each bake is ordered separately.`,
      },
      hint: 'Touch the dough',
      ferment: {
        label: 'Up to 35 hours of fermentation',
        kicker: 'No. 02 · 35 hours',
        what: 'Poolish is a pre-dough (flour, water and a pinch of yeast) that ferments slowly overnight. That’s why the bread has more flavour, a more open crumb and stays soft for more days.',
        bar: 'Drag the time',
        lead: 'My bread ferments for up to',
        drag: '← Drag →',
        slider: 'Hours of fermentation',
        compare: 'Fermentation time, compared',
        fast: 'Rushed bread',
        fastValue: '< 3 h',
        me: 'Molla',
        replay: '↺ Again',
        fig: '(Fig. 2) The crumb, while it ferments',
        phases: [
          [0, 'Poolish', 'flour, water and a pinch of yeast. All night long.'],
          [14, 'Folds', 'by hand, no machines.'],
          [16, 'Shaping', 'loaf by loaf, one by one.'],
          [17, 'Cold', 'another whole night. No rush here.'],
          [33, 'Oven', 'a dark crust that crackles.'],
          [35, 'Ready', 'it smells of bread.'],
        ] as [number, string, string][],
      },
      cut: {
        label: 'The crumb, inside',
        word: ['Open', ' it'] as [string, string],
        says: 'This is the crumb.',
        fig: '(Fig. 3) The weekly loaf, cut open',
        scroll: 'Keep scrolling',
      },
      counter: {
        bar: 'The counter',
        hint: 'Swipe →',
        prev: 'Previous product',
        next: 'Next product',
      },
      sentence: {
        hi: 'Hi Víctor, I’d like',
        for: 'for',
        empty: 'a loaf',
        and: 'and',
      },
    },
    reviews: {
      kicker: 'No. — Reviews',
      fig: '(Fig. 7)',
      count: (n: number) => `${n} reviews on Google`,
      source: 'Google review',
      all: (n: number) => `See all ${n} reviews on Google`,
      leave: 'Leave yours',
      newTab: '(opens in a new tab)',
      label: 'Google reviews',
      prev: 'Previous review',
      next: 'Next review',
    },
    fix: {
      kicker: 'Weekly bread',
      bar: 'Every week, no thinking',
      h2a: 'Your bread every week.',
      h2b: 'Without thinking.',
      voucher:
        'Weekly bread only: once I’ve delivered 3 loaves, the 4th is on me.',
      cta: 'Sign up for weekly bread',
      facts: (price: string) => [
        `Wednesday or Saturday ${hours.en}`,
        `${price} per loaf · no delivery fee`,
        'Skip or cancel with one click',
      ],
    },
    organic: {
      kicker: 'Flour',
      h2a: 'Organic flour,',
      h2b: 'and time.',
      p: 'All the bread and the banana bread are made with organically grown flour. Good flour needs no improvers: water, salt, a little yeast and plenty of time are enough.',
      items: [
        ['100 %', 'organic flour'],
        ['0', 'improvers or additives'],
        ['35 h', 'of fermentation'],
      ],
    },
    process: {
      h2a: 'Most of the work',
      h2b: 'is waiting.',
      hours: 'hours of fermentation',
      intro:
        'Poolish is a liquid pre-dough that ferments slowly overnight. It gives the loaf a more open crumb, a thinner crust and a flavour you can’t get in a hurry.',
      more: 'What poolish is, in detail',
      closeWhen: (deadline: string) => {
        const d = madridParts('en', deadline);
        return `Until ${d.weekday}, ${d.time}`;
      },
      pickupWhen: (pickup: string) =>
        capital(madridParts('en', pickup).weekday),
      steps: [
        {
          when: 'Until closing, 20:00',
          title: 'Orders',
          text: 'I close orders and know exactly how many loaves to make. Not one more.',
        },
        {
          when: 'After closing',
          title: 'Slow fermentation',
          time: 'Up to 35 h',
          text: 'Poolish, hand-folded dough, shaping and a long cold fermentation. No rush: that’s where the flavour, the aroma and the crumb come from.',
        },
        {
          when: 'The morning of delivery',
          title: 'Oven',
          text: 'A dark crust that crackles, an open and moist crumb.',
        },
        {
          when: 'Wednesday or Saturday',
          title: 'To your door',
          text: `I deliver it ${hours.en} (on Wednesdays, also ${eveningEn}) to Sant Boi, Sant Just, Sant Joan Despí, Sant Feliu, Santa Coloma or Sant Vicenç, or you pick it up in Sant Boi. You pay when you get it.`,
        },
      ],
    },
    maker: {
      kicker: 'Who makes the bread',
      h2: 'Few loaves, made one at a time.',
      p1: 'I make artisan bread to order for people all over the Baix Llobregat. Each week I bake only what has been ordered: that way every loaf gets its time and nothing goes to waste.',
      p2: 'No improvers, no shortcuts. Organic flour, water, salt, a little yeast and a whole night of patience.',
      altPerson: 'The baker holds a freshly baked loaf and smiles',
      altDough: 'Two shaped doughs resting in their proofing baskets',
    },
    reserve: {
      kicker: 'Order for the next bake',
      h2: 'Place your order.',
      bananaQty: 'Banana bread',
      bananaHint: 'In halves: ½, 1, 1½ or 2',
      bananaLess: 'Remove half a banana bread',
      bananaMore: 'Add half a banana bread',
      bananaNone: 'No banana bread',
      emptyOrder: 'Add a loaf, a banana bread or pastries to order.',
      quickPick: 'Shall we start here?',
      quickLoaf: (price: string) => `1 loaf · ${price}`,
      totalLabel: 'Total to pay on delivery',
      pickup: 'Delivery',
      where: 'Where',
      pickupLocation: `Home delivery, ${hours.en} · Wednesdays also ${eveningEn}`,
      pickupDetails:
        'Sant Boi, Sant Just Desvern, Sant Joan Despí, Sant Feliu de Llobregat, Santa Coloma de Cervelló and Sant Vicenç dels Horts. Another town? Pick it up in Sant Boi.',
      pickupInfo: 'Delivery areas and times',
      deliveryH: '2 · How do you want it?',
      deliveryHome: (wed: boolean) =>
        wed
          ? 'Home delivery · midday or evening'
          : `Home delivery · ${hours.en}`,
      slotH: 'What time should I bring it?',
      slotMidday: `Midday · ${hours.en}`,
      slotEvening: `Evening · ${eveningEn}`,
      slotEveningHint: 'If you’re not home at midday',
      deliveryHomeHint:
        'Sant Boi, Sant Just Desvern, Sant Joan Despí, Sant Feliu de Llobregat, Santa Coloma de Cervelló and Sant Vicenç dels Horts',
      deliveryPickup: 'I’ll pick it up in Sant Boi',
      deliveryPickupHint:
        'Rest of the Baix Llobregat. In front of the Mercat de la Muntanyeta.',
      town: 'Town',
      townPick: 'Choose your town',
      address: 'Delivery address',
      notes: 'If you’re out (optional)',
      notesPlaceholder:
        'Leave it with the concierge, at reception, with the neighbour on the 2nd floor…',
      addressPlaceholder: 'Street, number, floor and door (home or work)',
      deliveryLabel: (town: string) => `Home delivery in ${town}`,
      pay: 'Payment',
      payValue: 'When you receive or pick it up. No card, no account.',
      question: 'I have a question ↗',
      yourOrder: 'Your order',
      step1: '1 · What you want',
      step3: '3 · Your details',
      moreProducts: '+ Add another product',
      notesToggle: '+ Add a delivery note',
      submitTotal: (total: string) => `Confirm order · ${total}`,
      demoIntro:
        'Test mode: use made-up details. No emails are sent and no bread is ordered.',
      qty: 'Loaves',
      qtyMax: 'Up to 4 per order',
      less: 'Remove a loaf',
      more: 'Add a loaf',
      name: 'Your name',
      email: 'Email (optional)',
      emailHint: 'If you leave it out, I’ll confirm the order on WhatsApp.',
      phone: 'Mobile or WhatsApp',
      honey: 'Leave this field empty',
      demoCheck: 'I understand I am testing a fake order.',
      pickupCheck: (day: string, window: string, wed = false) =>
        `I’ll deliver it on ${day}: to the address you give ${wed ? `${hours.en} or ${eveningEn}, depending on the slot you choose,` : hours.en} if you choose home delivery, or in front of the Mercat de la Muntanyeta, in Sant Boi de Llobregat${window ? ` (${window})` : ''}.`,
      privacyA: 'I have read the',
      privacyNote: 'By ordering you accept the',
      privacyLink: 'privacy policy and terms',
      referralNote:
        '🎁 A neighbour invited you: a free croissant with your first order.',
      newsCheck:
        'Optional: email me when each Saturday bake opens (two emails a week at most; unsubscribe with one click).',
      submitDemo: 'Test order',
      submit: 'Confirm order',
      footnote:
        'Pay on delivery. Cancel with one click until orders close. No commitment.',
      whatsappCta: 'Order on WhatsApp',
      whatsappAlt: 'Rather order on WhatsApp?',
      whatsappText: (day: string) =>
        `Hi! I’d like to order bread for ${day}. I’d like: `,
      noscript: 'Turn on JavaScript to see the confirmation on this page.',
      noscriptMail: 'You can also write to me to order.',
      closedH3: 'There are no loaves left this week.',
      closedP:
        'I’ll let you know as soon as the next bake opens: on WhatsApp or by email.',
      notify: 'Tell me',
    },
    faq: {
      h2: 'Questions',
      items: [
        [
          'Is it sourdough bread?',
          'There are both. The weekly loaf is poolish: a pre-dough of flour, water and very little yeast that ferments overnight, with up to 35 hours of fermentation in total; mild flavour, not sour at all. If you prefer sourdough, the sourdough loaf is on the menu too.',
        ],
        [
          'What’s in the loaf?',
          'Organic wheat flour, water, salt and yeast. Contains gluten. If you have another allergy, ask me before ordering: other flours are used in the kitchen.',
        ],
        [
          'Where do I pick it up?',
          `In front of the Mercat de la Muntanyeta, in Sant Boi de Llobregat. It’s the option if you live in another town in the Baix Llobregat, such as ${areaTowns.replace(' o ', ' or ')}.`,
        ],
        [
          'Do you deliver to homes?',
          `Yes, on Wednesdays ${hours.en} or ${eveningEn} and on Saturdays ${hours.en} in Sant Boi de Llobregat, Sant Just Desvern, Sant Joan Despí, Sant Feliu de Llobregat, Santa Coloma de Cervelló and Sant Vicenç dels Horts, free of charge. When ordering, choose «Home delivery», the slot if it’s a Wednesday, and write your address. You pay when you get it.`,
        ],
        [
          'Do you bring bread to Sant Just Desvern?',
          `Yes. Every Wednesday and Saturday I deliver in Sant Just Desvern ${hours.en} (on Wednesdays, also ${eveningEn}), just like in Sant Boi, Sant Joan Despí, Sant Feliu de Llobregat, Santa Coloma de Cervelló and Sant Vicenç dels Horts. Order before orders close: Monday for Wednesday and Thursday for Saturday, at 20:00.`,
        ],
        [
          'What if I won’t be home?',
          'Reply to the confirmation email or write to me as soon as possible with your order code. You get a reminder the day before. If there’s still time, I release your order for someone else.',
        ],
      ],
    },
    waitlist: {
      h2: 'Shall I tell you about the next bake?',
      p: 'One message when orders open, and nothing else.',
      whatsapp: 'Tell me on WhatsApp',
      whatsappText:
        'Hi Víctor! Please let me know when you open the next bake.',
      channelCta: 'Join the WhatsApp channel',
      emailAlt: 'Rather get an email?',
      label: 'Your email',
      button: 'Tell me',
      honey: 'Leave empty',
      consentA: 'I want to receive bake notices and I accept the',
      consentLink: 'privacy policy',
      channel: 'Or follow the WhatsApp channel: one notice per bake, no chat.',
      disabled: 'Notices will start when the first bake is announced.',
      demo: 'Test mode: you won’t receive emails.',
      success:
        'Almost done: I’ve sent you an email to confirm the notice. If you can’t see it, check your spam.',
      successDirect:
        'You’re on the list. I’ll write to you when the next bake opens.',
      poster: 'Loaf broken in half, with its open crumb against the light',
    },
    mobile: {
      label: 'Quick order',
      loaf: 'Loaf',
      order: 'Order',
      notify: 'Tell me',
    },
    ed: {
      bar: 'Artisan bread made to order',
      fig: '(Fig. 1) A loaf, broken in half',
      ferment: 'Fermented up to 35 h',
      diary: 'Bakehouse diary',
      swipe: 'Swipe',
      menuBar: 'From the oven to your table',
      processBar: 'Two bakes a week',
      flourBar: 'No improvers',
      makerBar: 'Baix Llobregat',
      reserveBar: 'No card, no account',
      faqBar: 'What people ask me most',
      waitBar: 'One notice per bake',
      fig2: '(Fig. 2) The weekly loaf, fresh out of the oven',
      fig3: '(Fig. 3) Chocolate chip banana bread',
      fig4: '(Fig. 6) The person who makes the bread',
      fig5: '(Fig. 4) Croissant and pain au chocolat',
      defWord: 'molla',
      defGram: 'n. (Catalan)',
      defText: 'The crumb: the soft inside of the bread.',
      whole: 'Whole',
      half: 'Half',
    },
    breadcrumbHome: 'Home',
  },
};
