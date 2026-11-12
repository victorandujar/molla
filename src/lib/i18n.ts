import { bake, brand, money, productById } from './config';
import { deliveryWindow, eveningWindow, windowHours } from './delivery';
import type { Lang } from './messages';
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
} as const;
export const standingFrequency = (
  lang: Lang,
  frequency: 'weekly' | 'biweekly',
  day: 'wed' | 'sat',
) => {
  const d = standingWords[lang].day[day];
  if (frequency === 'weekly') return `Cada ${d}`;
  return lang === 'ca' ? `Un ${d} sí i un altre no` : `Un ${d} sí y otro no`;
};

// Pages that exist in both languages. Keys are shared, paths are localised.
export const routes = {
  home: { ca: '/', es: '/es/' },
  pickup: { ca: '/recollida', es: '/es/recogida' },
  delivery: { ca: '/pa-a-domicili', es: '/es/pan-a-domicilio' },
  standing: { ca: '/pa-fix', es: '/es/pan-fijo' },
  poolish: { ca: '/poolish', es: '/es/poolish' },
  privacy: { ca: '/privacitat', es: '/privacidad' },
} as const;
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
  new Intl.DateTimeFormat(lang === 'ca' ? 'ca-ES' : 'es-ES', {
    timeZone: 'Europe/Madrid',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(iso));

// Parts of a Madrid date for sentences such as "hasta el jueves 24 a las 20:00".
export const madridParts = (lang: Lang, iso: string) => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat(lang === 'ca' ? 'ca-ES' : 'es-ES', {
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
};
// Wednesday's second round, for people who work at midday.
const evening = windowHours(eveningWindow);

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
      terms: `Pan desde ${loafPrice} · Envío gratis · Pagas al recibirlo`,
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
      h2a: 'La carta,',
      h2b: 'hecha sin prisa.',
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
      short: 'Tres plátanos maduros y 100 g de chocolate por molde.',
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
    // La carta de pan: tres panes en una lista, con una sola foto.
    breads: {
      kicker: 'El pan',
      h3: 'Tres panes, una hornada.',
      intro:
        'Elige uno o combínalos: salen del mismo horno el miércoles y el sábado.',
      from: 'desde',
      unit: 'La hogaza',
      items: {
        loaf: 'Poolish y hasta 35 h de fermentación. Suave, miga abierta y corteza que cruje.',
        sourdough: 'Fermentada con masa madre.',
        wholegrain: 'Con un 60 % de harina integral.',
      },
      details: {
        sourdough:
          'Harina de trigo de fuerza, harina integral, masa madre, agua y sal.',
        wholegrain:
          'Harina integral, levadura, agua, harina de trigo de fuerza y sal.',
      },
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
        'Resto del Baix Llobregat. Te confirmo el punto exacto.',
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
        `Te lo entrego el ${day}: en la dirección que pongas ${wed ? `${hours.es} o ${evening}, según la franja que elijas,` : hours.es} si eliges entrega a domicilio, o en el punto de recogida de Sant Boi de Llobregat${window ? ` (${window})` : ''}.`,
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
          `En un punto de recogida en Sant Boi de Llobregat; te confirmo el punto exacto con tu pedido. Es la opción si vives en otro municipio del Baix Llobregat, como ${areaTowns}.`,
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
      terms: `Pa des de ${loafPrice} · Enviament gratis · Pagues en rebre’l`,
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
      h2a: 'La carta,',
      h2b: 'feta sense pressa.',
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
      short: 'Tres plàtans madurs i 100 g de xocolata per motlle.',
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
      h3: 'Tres pans, una fornada.',
      intro:
        'Tria’n un o combina’ls: surten del mateix forn el dimecres i el dissabte.',
      from: 'des de',
      unit: 'El pa',
      items: {
        loaf: 'Poolish i fins a 35 h de fermentació. Suau, molla oberta i crosta que cruix.',
        sourdough: 'Fermentat amb massa mare.',
        wholegrain: 'Amb un 60 % de farina integral.',
      },
      details: {
        sourdough:
          'Farina de blat de força, farina integral, massa mare, aigua i sal.',
        wholegrain:
          'Farina integral, llevat, aigua, farina de blat de força i sal.',
      },
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
        'Resta del Baix Llobregat. Et confirmo el punt exacte.',
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
        `Te l’entrego ${day}: a l’adreça que posis ${wed ? `${hours.ca} o ${evening}, segons la franja que triïs,` : hours.ca} si tries entrega a domicili, o al punt de recollida de Sant Boi de Llobregat${window ? ` (${window})` : ''}.`,
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
          `En un punt de recollida a Sant Boi de Llobregat; et confirmo el punt exacte amb la comanda. És l’opció si vius en un altre municipi del Baix Llobregat, com ${areaTowns}.`,
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
};
