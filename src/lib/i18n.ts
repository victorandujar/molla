import { bake, brand } from './config';
import { deliveryWindow } from './delivery';
import type { Lang } from './messages';
export type { Lang };

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
const areaTowns =
  'Cornellà, Sant Joan Despí, Sant Feliu de Llobregat, Sant Vicenç dels Horts o Viladecans';
// "12:00–14:00" reads "de 12 a 14 h" in copy.
const [fromH, toH] = deliveryWindow
  .split('–')
  .map((t) => String(Number(t.split(':')[0])));
const hours = {
  es: `de ${fromH}\u00a0a\u00a0${toH}\u00a0h`,
  ca: `de ${fromH}\u00a0a\u00a0${toH}\u00a0h`,
};

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
      area: `Pan a domicilio los sábados ${hours.es} en Sant Boi, Sant Just Desvern y Santa Coloma de Cervelló · Recogida en Sant Boi de Llobregat`,
      privacy: 'Privacidad y condiciones',
      write: 'Escríbeme ↗',
      channel: 'Canal de WhatsApp',
    },
    meta: {
      title: `Pan artesano a domicilio en Sant Boi y Sant Just Desvern · ${brand.name}`,
      description: `Pan de fermentación lenta y banana bread con harina ecológica, hechos a mano en el Baix Llobregat. Reserva online y te lo llevo a casa el sábado ${hours.es} en Sant Boi, Sant Just Desvern y Santa Coloma.`,
      ogAlt: 'Hogazas de corteza tostada recién cortadas',
    },
    status: {
      OPEN: 'Reservas abiertas',
      SOLD_OUT: 'Hornada agotada',
      CLOSED: 'Pedidos cerrados',
      UPCOMING: 'Próxima hornada',
      COMPLETED: 'Esta hornada ya salió del horno',
    },
    hero: {
      h1a: 'Pan artesanal',
      h1b: 'por encargo',
      sub: `Cada sábado ${hours.es}, a domicilio en Sant Boi, Sant Just Desvern y Santa Coloma.`,
      lede: 'Amaso a mano una hornada pequeña cada semana, con harinas ecológicas, poolish y hasta 35 horas de fermentación lenta. Tú lo reservas aquí y el sábado te lo llevo a casa, o lo recoges en Sant Boi.',
      kicker: 'Panadería de barrio · Baix Llobregat',
      keywords: [
        'Harinas ecológicas',
        'Poolish',
        'Hasta 35 h de fermentación',
        'Hecho a mano',
        'A domicilio el sábado',
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
          `Sábados ${hours.es} en Sant Boi, Sant Just y Santa Coloma.`,
        ],
      ],
      nextBake: 'Próxima hornada',
      ribbon: [
        'Molla',
        'Pa artesà',
        'Fins a 35 h de fermentació',
        'Baix Llobregat',
      ],
      trust: 'Pagas al recibirlo · Cancelas con un clic · Sin cuenta',
      gift: 'Tu primera comanda lleva un regalo de bienvenida.',
      scroll: 'Desliza',
      hands: 'Las manos de mi madre',
      sealTop: 'hasta',
      sealBottom: 'de fermentación',
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
      h2a: 'Dos piezas,',
      h2b: 'hechas sin prisa.',
      intro:
        'Cada semana horneo solo lo que se reserva. Añade lo que te apetezca a tu pedido y el sábado es tuyo.',
      loaf: 'La de cada semana',
      bananaWhole: 'Banana bread entero',
      bananaHalf: 'Medio banana bread',
      add: 'Añadir al pedido',
      inOrder: (n: string) => `${n} en tu pedido`,
      remove: 'Quitar uno',
      whole: 'Entero',
      half: 'Mitad',
      size: 'Tamaño',
      each: 'cada una',
      bananaLeft: (halves: number) =>
        halves <= 0
          ? 'Agotado esta semana'
          : halves === 1
            ? 'Queda medio molde esta semana'
            : halves === 2
              ? 'Queda un molde esta semana'
              : halves === 3
                ? 'Queda un molde y medio esta semana'
                : `Quedan ${halves % 2 ? `${Math.floor(halves / 2)} moldes y medio` : `${halves / 2} moldes`} esta semana`,
      closed: 'Se reserva cuando abra la hornada',
      pill: 'Tu pedido',
      pillCta: 'Reservar',
      loaves: (n: number) => `${n} ${n === 1 ? 'hogaza' : 'hogazas'}`,
      banana: (halves: number) =>
        halves === 1 ? '½ banana bread' : `${halves / 2} banana bread`,
      croissant: 'Croissant',
      pain: 'Pain au chocolat',
      croissants: (n: number) => `${n} ${n === 1 ? 'croissant' : 'croissants'}`,
      pains: (n: number) =>
        `${n} ${n === 1 ? 'pain au chocolat' : 'pains au chocolat'}`,
      pastryLeft: (n: number) =>
        n <= 0
          ? 'Bollería agotada esta semana'
          : n === 1
            ? 'Queda 1 pieza de bollería esta semana'
            : `Quedan ${n} piezas de bollería esta semana`,
    },
    bake: {
      number: 'Hornada',
      of: 'de',
      reserved: 'hogazas reservadas',
      small: (n: number) => `Hornada pequeña · ${n} hogazas`,
      leftOf: (n: number) => `hogazas libres de ${n}`,
      test: ' (prueba)',
      open: (deadline: string) => {
        const d = madridParts('es', deadline);
        return `Pedidos hasta el ${d.weekday} ${d.day} a las ${d.time} o hasta completar la hornada.`;
      },
      dateSoon: 'Fecha por confirmar',
      upcoming: 'Anunciaré la fecha al abrir reservas.',
      closed: 'Esta semana ya no acepto pedidos. Te aviso de la próxima.',
      unavailable:
        'No puedo consultar el cupo ahora. Recarga la página antes de reservar.',
      ctaOpen: 'Reservar mi hogaza',
      ctaClosed: 'Avísame de la próxima',
    },
    loaf: {
      kicker: 'La hogaza',
      name: 'La de cada semana',
      alt: 'Dos hogazas artesanas con greñas abiertas sobre una tabla de madera',
      altSlice:
        'Media hogaza sostenida en la mano, con la miga alveolada a la vista',
      fermentation: 'Fermentación',
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
      point1: 'Harina ecológica',
      point2: '3 plátanos por molde',
      point3: '100 g de chocolate',
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
    pastry: {
      kicker: 'Bollería',
      bar: 'Mantequilla, en capas',
      h2a: 'Capas.',
      h2b: 'Siete pasos, ningún atajo.',
      intro:
        'Mantequilla, plegar, estirar, cortar, enrollar, pintar y horno. Croissants y pains au chocolat de masa laminada, hechos a mano para el sábado. Por unidades.',
      unit: 'La unidad',
      steps: [
        'Mantequilla',
        'Plegar',
        'Estirar',
        'Cortar',
        'Enrollar',
        'Pintar',
        'Horno',
      ],
      croissantText: 'Capas que crujen y miga de panal.',
      painText: 'La misma masa, con dos barritas de chocolate dentro.',
      ingredients:
        'Masa laminada con mantequilla. El pain au chocolat lleva chocolate.',
      allergens:
        'Contiene trigo (gluten), leche y huevo. Pregúntame por trazas antes de reservar.',
      quota: (n: number) => `${n} piezas por hornada, entre los dos`,
      alt: 'Un pain au chocolat y un croissant dorados sobre una tabla de madera, con luz de tarde',
      add: 'Añadir',
      less: (name: string) => `Quitar un ${name}`,
      more: (name: string) => `Añadir un ${name}`,
      notify: 'Avísame cuando haya',
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
          when: 'Hasta el jueves, 20:00',
          title: 'Reservas',
          text: 'Cierro pedidos y sé exactamente cuántas hogazas hacer. Ni una de más.',
        },
        {
          when: 'Desde el jueves',
          title: 'Fermentación lenta',
          time: 'Hasta 35 h',
          text: 'Poolish, amasado con pliegues a mano, formado y una larga fermentación en frío. Sin prisa: ahí nacen el sabor, el aroma y la miga.',
        },
        {
          when: 'Sábado por la mañana',
          title: 'Horno',
          text: 'Corteza oscura que cruje, miga abierta y húmeda.',
        },
        {
          when: 'Sábado',
          title: 'A tu casa',
          text: `Te lo llevo ${hours.es} a Sant Boi, Sant Just o Santa Coloma, o lo recoges en Sant Boi. Pagas al recibirlo.`,
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
      kicker: 'Pedido para el sábado',
      h2: 'Reserva tu pedido.',
      bananaQty: 'Banana bread',
      bananaHint: 'Por mitades: ½, 1, 1½ o 2',
      bananaLess: 'Quitar media pieza de banana bread',
      bananaMore: 'Añadir media pieza de banana bread',
      bananaNone: 'Sin banana bread',
      emptyOrder: 'Añade una hogaza o un banana bread para reservar.',
      totalLabel: 'Total a pagar al recibirlo',
      pickup: 'Entrega',
      where: 'Dónde',
      pickupLocation: `A domicilio, sábado ${hours.es}`,
      pickupDetails:
        'En Sant Boi de Llobregat, Sant Just Desvern y Santa Coloma de Cervelló. Si vives en otro municipio del Baix Llobregat, lo recoges en Sant Boi: te confirmo el punto exacto con tu pedido.',
      windowPending: 'Recogida en Sant Boi · horario confirmado con el pedido',
      pickupInfo: 'Zonas y horario de reparto',
      standingCta: '¿Lo quieres cada semana? Pan fijo',
      deliveryH: '¿Cómo lo quieres?',
      deliveryHome: `A domicilio · sábado ${hours.es}`,
      deliveryHomeHint:
        'Sant Boi, Sant Just Desvern y Santa Coloma de Cervelló',
      deliveryPickup: 'Lo recojo en Sant Boi',
      deliveryPickupHint:
        'Resto del Baix Llobregat. Te confirmo el punto exacto.',
      town: 'Municipio',
      townPick: 'Elige tu municipio',
      address: 'Dirección de entrega',
      addressPlaceholder: 'Calle, número, piso y puerta',
      deliveryLabel: (town: string) => `Entrega a domicilio en ${town}`,
      pay: 'Pago',
      payValue: 'Al recibirlo o recogerlo. Sin tarjeta ni cuenta.',
      left: 'Quedan',
      loaves: 'hogazas',
      question: 'Tengo una pregunta ↗',
      yourOrder: 'Tu pedido',
      demoIntro:
        'Modo de prueba: usa datos ficticios. No se envían emails ni se encarga pan.',
      qty: 'Hogazas',
      qtyMax: 'Hasta 4 por pedido',
      less: 'Quitar una hogaza',
      more: 'Añadir una hogaza',
      name: 'Tu nombre',
      email: 'Email',
      phone: 'Móvil o WhatsApp',
      honey: 'Deja este campo vacío',
      demoCheck: 'Entiendo que estoy probando una reserva ficticia.',
      pickupCheck: (day: string, window: string) =>
        `Recibiré el pedido el ${day}: en casa ${hours.es} si he elegido entrega a domicilio, o en el punto de recogida de Sant Boi de Llobregat${window ? ` (${window})` : ''}.`,
      privacyA: 'He leído la',
      privacyLink: 'privacidad y las condiciones',
      submitDemo: 'Probar reserva',
      submit: 'Confirmar reserva',
      footnote:
        'Pagas al recibirlo. Cancelas con un clic hasta el jueves a las 20:00. Sin cuenta ni suscripciones.',
      giftH: 'Regalo de bienvenida',
      gift: 'Si es tu primera comanda, te regalo un cuarto de banana bread y un chutney de pimiento rojo y tomate.',
      giftAllergens:
        'El banana bread contiene gluten y leche. Pregúntame por los ingredientes del chutney.',
      whatsappCta: 'Reservar por WhatsApp',
      whatsappText: (day: string) =>
        `¡Hola! Quiero reservar pan para el ${day}. Me gustaría: `,
      noscript: 'Activa JavaScript para ver la confirmación en esta página.',
      noscriptMail: 'También puedes escribirme para reservar.',
      closedH3: 'Esta semana ya no quedan hogazas.',
      closedP:
        'Déjame tu email y te escribo en cuanto abra la próxima hornada.',
      notify: 'Avísame',
    },
    faq: {
      h2: 'Preguntas',
      items: [
        [
          '¿Es pan de masa madre?',
          'No. Uso poolish: una masa previa de harina, agua y muy poca levadura que fermenta durante la noche. En total, cada hogaza lleva hasta 35 horas de fermentación. Como la masa madre, es una fermentación lenta que da sabor y una miga abierta, pero con un gusto más suave y menos ácido.',
        ],
        [
          '¿Qué es un poolish?',
          'Una masa previa líquida que se prepara la noche anterior. Aporta aroma, una corteza fina y crujiente y una miga más abierta, sin necesidad de aditivos.',
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
          '¿Haces banana bread?',
          'Sí, de chocolate y con harina ecológica, en tandas pequeñas. Se reserva aquí mismo, entero o la mitad, junto a tu hogaza o solo.',
        ],
        [
          '¿Las harinas son ecológicas?',
          'Sí. Trabajo con harinas de cultivo ecológico, tanto para el pan como para el banana bread.',
        ],
        [
          '¿Hacéis entrega a domicilio?',
          `Sí, los sábados ${hours.es} en Sant Boi de Llobregat, Sant Just Desvern y Santa Coloma de Cervelló, sin coste de envío. Al reservar eliges «A domicilio» y escribes tu dirección. Pagas al recibirlo.`,
        ],
        [
          '¿Lleváis pan a Sant Just Desvern?',
          `Sí. Cada sábado reparto en Sant Just Desvern ${hours.es}, igual que en Sant Boi y Santa Coloma de Cervelló. Reserva antes del cierre de pedidos del jueves.`,
        ],
        [
          '¿Cómo lo conservo?',
          'Entero, en un lugar fresco y seco, envuelto en un paño limpio. Si no lo vas a comer pronto, córtalo en rebanadas y congélalo.',
        ],
        [
          '¿Y si no voy a estar?',
          'Responde al email de confirmación o escríbeme cuanto antes con el código de tu reserva. El día antes te llega un recordatorio. Si aún estamos a tiempo, libero tu hogaza para otra persona.',
        ],
        [
          '¿Y si ya no quedan?',
          'Apúntate al aviso de la próxima hornada. El aviso no reserva pan: tú decides si encargas.',
        ],
      ],
    },
    waitlist: {
      h2: '¿Te aviso de la próxima hornada?',
      p: 'Un email cuando abra reservas. Te das de baja cuando quieras.',
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
      made: 'Hecho a mano.',
      fig: '(Fig. 1) Pan de miga, partido por la mitad',
      ferment: 'Fermentado hasta 35 h',
      steps: [
        'Reserva aquí, hasta el jueves a las 20 h',
        `Entrega gratuita el sábado ${hours.es} · Sant Boi, Sant Just Desvern y Santa Coloma de Cervelló`,
        'Pagas al recibirlo',
      ],
      diary: 'Diario del obrador',
      swipe: 'Desliza',
      menuBar: 'Del horno a tu mesa',
      processBar: 'Jueves → sábado',
      flourBar: 'Sin mejorantes',
      makerBar: 'Baix Llobregat',
      reserveBar: 'Sin tarjeta ni cuenta',
      faqBar: 'Lo que más me preguntan',
      waitBar: 'Un correo por hornada',
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
      area: `Pa a domicili els dissabtes ${hours.ca} a Sant Boi, Sant Just Desvern i Santa Coloma de Cervelló · Recollida a Sant Boi de Llobregat`,
      privacy: 'Privacitat i condicions',
      write: 'Escriu-me ↗',
      channel: 'Canal de WhatsApp',
    },
    meta: {
      title: `Pa artesà a domicili a Sant Boi i Sant Just Desvern · ${brand.name}`,
      description: `Pa de fermentació lenta i banana bread amb farina ecològica, fets a mà al Baix Llobregat. Reserva en línia i te’l porto a casa dissabte ${hours.ca} a Sant Boi, Sant Just Desvern i Santa Coloma.`,
      ogAlt: 'Pans de crosta torrada acabats de tallar',
    },
    status: {
      OPEN: 'Reserves obertes',
      SOLD_OUT: 'Fornada exhaurida',
      CLOSED: 'Comandes tancades',
      UPCOMING: 'Propera fornada',
      COMPLETED: 'Aquesta fornada ja ha sortit del forn',
    },
    hero: {
      h1a: 'Pa artesà',
      h1b: 'per encàrrec',
      sub: `Cada dissabte ${hours.ca}, a domicili a Sant Boi, Sant Just Desvern i Santa Coloma.`,
      lede: 'Pasto a mà una fornada petita cada setmana, amb farines ecològiques, poolish i fins a 35 hores de fermentació lenta. Tu el reserves aquí i dissabte te’l porto a casa, o el reculls a Sant Boi.',
      kicker: 'Fleca de barri · Baix Llobregat',
      keywords: [
        'Farines ecològiques',
        'Poolish',
        'Fins a 35 h de fermentació',
        'Fet a mà',
        'A domicili dissabte',
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
          `Dissabtes ${hours.ca} a Sant Boi, Sant Just i Santa Coloma.`,
        ],
      ],
      nextBake: 'Propera fornada',
      ribbon: [
        'Molla',
        'Pa artesà',
        'Fins a 35 h de fermentació',
        'Baix Llobregat',
      ],
      trust: 'Pagues en rebre’l · Cancel·les amb un clic · Sense compte',
      gift: 'La teva primera comanda porta un regal de benvinguda.',
      scroll: 'Llisca',
      hands: 'Les mans de la meva mare',
      sealTop: 'fins a',
      sealBottom: 'de fermentació',
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
      h2a: 'Dues peces,',
      h2b: 'fetes sense pressa.',
      intro:
        'Cada setmana només cou el que es reserva. Afegeix el que et vingui de gust a la comanda i el dissabte és teu.',
      loaf: 'El de cada setmana',
      bananaWhole: 'Banana bread sencer',
      bananaHalf: 'Mig banana bread',
      add: 'Afegir a la comanda',
      inOrder: (n: string) => `${n} a la comanda`,
      remove: 'Treure’n un',
      whole: 'Sencer',
      half: 'Meitat',
      size: 'Mida',
      each: 'cadascun',
      bananaLeft: (halves: number) =>
        halves <= 0
          ? 'Exhaurit aquesta setmana'
          : halves === 1
            ? 'Queda mig motlle aquesta setmana'
            : halves === 2
              ? 'Queda un motlle aquesta setmana'
              : halves === 3
                ? 'Queda un motlle i mig aquesta setmana'
                : `Queden ${halves % 2 ? `${Math.floor(halves / 2)} motlles i mig` : `${halves / 2} motlles`} aquesta setmana`,
      closed: 'Es reserva quan obri la fornada',
      pill: 'La teva comanda',
      pillCta: 'Reservar',
      loaves: (n: number) => `${n} ${n === 1 ? 'pa' : 'pans'}`,
      banana: (halves: number) =>
        halves === 1 ? '½ banana bread' : `${halves / 2} banana bread`,
      croissant: 'Croissant',
      pain: 'Pain au chocolat',
      croissants: (n: number) => `${n} ${n === 1 ? 'croissant' : 'croissants'}`,
      pains: (n: number) =>
        `${n} ${n === 1 ? 'pain au chocolat' : 'pains au chocolat'}`,
      pastryLeft: (n: number) =>
        n <= 0
          ? 'Brioixeria exhaurida aquesta setmana'
          : n === 1
            ? 'Queda 1 peça de brioixeria aquesta setmana'
            : `Queden ${n} peces de brioixeria aquesta setmana`,
    },
    bake: {
      number: 'Fornada',
      of: 'de',
      reserved: 'pans reservats',
      small: (n: number) => `Fornada petita · ${n} pans`,
      leftOf: (n: number) => `pans lliures de ${n}`,
      test: ' (prova)',
      open: (deadline: string) => {
        const d = madridParts('ca', deadline);
        return `Comandes fins ${d.weekday} ${d.day} a les ${d.time} o fins que s’acabi la fornada.`;
      },
      dateSoon: 'Data per confirmar',
      upcoming: 'Anunciaré la data quan obri reserves.',
      closed: 'Aquesta setmana ja no accepto comandes. T’aviso de la propera.',
      unavailable:
        'Ara no puc consultar la disponibilitat. Recarrega la pàgina abans de reservar.',
      ctaOpen: 'Reservar el meu pa',
      ctaClosed: 'Avisa’m de la propera',
    },
    loaf: {
      kicker: 'El pa',
      name: 'El de cada setmana',
      alt: 'Dos pans artesans amb els talls oberts sobre una taula de fusta',
      altSlice: 'Mig pa sostingut a la mà, amb la molla alveolada a la vista',
      fermentation: 'Fermentació',
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
      point1: 'Farina ecològica',
      point2: '3 plàtans per motlle',
      point3: '100 g de xocolata',
      ingredientsValue:
        'Plàtan madur, farina de blat ecològica, iogurt i xips de xocolata.',
      allergensValue: 'Conté blat (gluten) i llet. Pregunta’m per traces.',
      note: 'Sencer o la meitat. Amb el teu pa o sol.',
      alt: 'Banana bread amb xips de xocolata sobre una taula de fusta',
      altDetail: 'Detall de la crosta del banana bread amb xips de xocolata',
      ask: 'Demanar banana bread',
      notify: 'Avisa’m quan n’hi hagi',
    },
    pastry: {
      kicker: 'Brioixeria',
      bar: 'Mantega, en capes',
      h2a: 'Capes.',
      h2b: 'Set passos, cap drecera.',
      intro:
        'Mantega, plegar, estirar, tallar, enrotllar, pintar i forn. Croissants i pains au chocolat de massa fullada, fets a mà per a dissabte. Per unitats.',
      unit: 'La unitat',
      steps: [
        'Mantega',
        'Plegar',
        'Estirar',
        'Tallar',
        'Enrotllar',
        'Pintar',
        'Forn',
      ],
      croissantText: 'Capes que cruixen i molla de bresca.',
      painText: 'La mateixa massa, amb dues barretes de xocolata a dins.',
      ingredients:
        'Massa fullada amb mantega. El pain au chocolat porta xocolata.',
      allergens:
        'Conté blat (gluten), llet i ou. Pregunta’m per traces abans de reservar.',
      quota: (n: number) => `${n} peces per fornada, entre els dos`,
      alt: 'Un pain au chocolat i un croissant daurats sobre una taula de fusta, amb llum de tarda',
      add: 'Afegir',
      less: (name: string) => `Treure un ${name}`,
      more: (name: string) => `Afegir un ${name}`,
      notify: 'Avisa’m quan n’hi hagi',
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
          when: 'Fins dijous, 20:00',
          title: 'Reserves',
          text: 'Tanco comandes i sé exactament quants pans he de fer. Ni un de més.',
        },
        {
          when: 'Des de dijous',
          title: 'Fermentació lenta',
          time: 'Fins a 35 h',
          text: 'Poolish, pastat amb plecs a mà, formació i una llarga fermentació en fred. Sense presses: aquí neixen el gust, l’aroma i la molla.',
        },
        {
          when: 'Dissabte al matí',
          title: 'Forn',
          text: 'Crosta fosca que cruix, molla oberta i humida.',
        },
        {
          when: 'Dissabte',
          title: 'A casa teva',
          text: `Te’l porto ${hours.ca} a Sant Boi, Sant Just o Santa Coloma, o el reculls a Sant Boi. Pagues en rebre’l.`,
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
      kicker: 'Comanda per a dissabte',
      h2: 'Reserva la teva comanda.',
      bananaQty: 'Banana bread',
      bananaHint: 'Per meitats: ½, 1, 1½ o 2',
      bananaLess: 'Treure mitja peça de banana bread',
      bananaMore: 'Afegir mitja peça de banana bread',
      bananaNone: 'Sense banana bread',
      emptyOrder: 'Afegeix un pa o un banana bread per reservar.',
      totalLabel: 'Total a pagar en rebre’l',
      pickup: 'Entrega',
      where: 'On',
      pickupLocation: `A domicili, dissabte ${hours.ca}`,
      pickupDetails:
        'A Sant Boi de Llobregat, Sant Just Desvern i Santa Coloma de Cervelló. Si vius en un altre municipi del Baix Llobregat, el reculls a Sant Boi: et confirmo el punt exacte amb la comanda.',
      windowPending: 'Recollida a Sant Boi · horari confirmat amb la comanda',
      pickupInfo: 'Zones i horari de repartiment',
      standingCta: 'El vols cada setmana? Pa fix',
      deliveryH: 'Com el vols?',
      deliveryHome: `A domicili · dissabte ${hours.ca}`,
      deliveryHomeHint:
        'Sant Boi, Sant Just Desvern i Santa Coloma de Cervelló',
      deliveryPickup: 'El recullo a Sant Boi',
      deliveryPickupHint:
        'Resta del Baix Llobregat. Et confirmo el punt exacte.',
      town: 'Municipi',
      townPick: 'Tria el teu municipi',
      address: 'Adreça d’entrega',
      addressPlaceholder: 'Carrer, número, pis i porta',
      deliveryLabel: (town: string) => `Entrega a domicili a ${town}`,
      pay: 'Pagament',
      payValue: 'En rebre’l o recollir-lo. Sense targeta ni compte.',
      left: 'En queden',
      loaves: 'pans',
      question: 'Tinc una pregunta ↗',
      yourOrder: 'La teva comanda',
      demoIntro:
        'Mode de prova: fes servir dades fictícies. No s’envien correus ni s’encarrega pa.',
      qty: 'Pans',
      qtyMax: 'Fins a 4 per comanda',
      less: 'Treure un pa',
      more: 'Afegir un pa',
      name: 'El teu nom',
      email: 'Correu electrònic',
      phone: 'Mòbil o WhatsApp',
      honey: 'Deixa aquest camp buit',
      demoCheck: 'Entenc que estic provant una reserva fictícia.',
      pickupCheck: (day: string, window: string) =>
        `Rebré la comanda ${day}: a casa ${hours.ca} si he triat entrega a domicili, o al punt de recollida de Sant Boi de Llobregat${window ? ` (${window})` : ''}.`,
      privacyA: 'He llegit la',
      privacyLink: 'privacitat i les condicions',
      submitDemo: 'Provar la reserva',
      submit: 'Confirmar la reserva',
      footnote:
        'Pagues en rebre’l. Cancel·les amb un clic fins dijous a les 20:00. Sense compte ni subscripcions.',
      giftH: 'Regal de benvinguda',
      gift: 'Si és la teva primera comanda, et regalo un quart de banana bread i un chutney de pebrot vermell i tomàquet.',
      giftAllergens:
        'El banana bread conté gluten i llet. Pregunta’m pels ingredients del chutney.',
      whatsappCta: 'Reservar per WhatsApp',
      whatsappText: (day: string) =>
        `Hola! Voldria reservar pa per al ${day}. M’agradaria: `,
      noscript: 'Activa JavaScript per veure la confirmació en aquesta pàgina.',
      noscriptMail: 'També em pots escriure per reservar.',
      closedH3: 'Aquesta setmana ja no queden pans.',
      closedP: 'Deixa’m el teu correu i t’escric quan obri la propera fornada.',
      notify: 'Avisa’m',
    },
    faq: {
      h2: 'Preguntes',
      items: [
        [
          'És pa de massa mare?',
          'No. Faig servir poolish: una massa prèvia de farina, aigua i molt poc llevat que fermenta durant la nit. En total, cada pa porta fins a 35 hores de fermentació. Com la massa mare, és una fermentació lenta que dona gust i una molla oberta, però amb un sabor més suau i menys àcid.',
        ],
        [
          'Què és un poolish?',
          'Una massa prèvia líquida que es prepara la nit abans. Aporta aroma, una crosta fina i cruixent i una molla més oberta, sense additius.',
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
          'Fas banana bread?',
          'Sí, de xocolata i amb farina ecològica, en tandes petites. Es reserva aquí mateix, sencer o la meitat, amb el teu pa o sol.',
        ],
        [
          'Les farines són ecològiques?',
          'Sí. Treballo amb farines de cultiu ecològic, tant per al pa com per al banana bread.',
        ],
        [
          'Feu entrega a domicili?',
          `Sí, els dissabtes ${hours.ca} a Sant Boi de Llobregat, Sant Just Desvern i Santa Coloma de Cervelló, sense cost d’enviament. En reservar tries «A domicili» i escrius la teva adreça. Pagues en rebre’l.`,
        ],
        [
          'Porteu pa a Sant Just Desvern?',
          `Sí. Cada dissabte reparteixo a Sant Just Desvern ${hours.ca}, igual que a Sant Boi i Santa Coloma de Cervelló. Reserva abans del tancament de comandes del dijous.`,
        ],
        [
          'Com el conservo?',
          'Sencer, en un lloc fresc i sec, embolicat amb un drap net. Si no te’l menjaràs aviat, talla’l a llesques i congela’l.',
        ],
        [
          'I si no hi seré?',
          'Respon el correu de confirmació o escriu-me com més aviat millor amb el codi de la reserva. El dia abans t’arriba un recordatori. Si encara som a temps, allibero el teu pa per a una altra persona.',
        ],
        [
          'I si ja no en queden?',
          'Apunta’t a l’avís de la propera fornada. L’avís no reserva pa: tu decideixes si l’encarregues.',
        ],
      ],
    },
    waitlist: {
      h2: 'T’aviso de la propera fornada?',
      p: 'Un correu quan obri reserves. Et dones de baixa quan vulguis.',
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
      made: 'Fet a mà.',
      fig: '(Fig. 1) Pa de molla, tallat per la meitat',
      ferment: 'Fermentat fins a 35 h',
      steps: [
        'Reserva aquí, fins dijous a les 20 h',
        `Entrega gratuïta dissabte ${hours.ca} · Sant Boi, Sant Just Desvern i Santa Coloma de Cervelló`,
        'Pagues quan el reps',
      ],
      diary: 'Diari de l’obrador',
      swipe: 'Llisca',
      menuBar: 'Del forn a la taula',
      processBar: 'Dijous → dissabte',
      flourBar: 'Sense milloradors',
      makerBar: 'Baix Llobregat',
      reserveBar: 'Sense targeta ni compte',
      faqBar: 'El que més em pregunteu',
      waitBar: 'Un correu per fornada',
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
