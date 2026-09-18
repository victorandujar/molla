import { bake, brand } from './config';
import type { Lang } from './messages';
export type { Lang };

// Pages that exist in both languages. Keys are shared, paths are localised.
export const routes = {
  home: { ca: '/', es: '/es/' },
  pickup: { ca: '/recollida', es: '/es/recogida' },
  poolish: { ca: '/poolish', es: '/es/poolish' },
  privacy: { ca: '/privacitat', es: '/privacidad' },
} as const;
// Pages listed in the sitemap; the privacy page is noindex.
export const indexedRoutes = ['home', 'pickup', 'poolish'] as const;
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

const areaTowns =
  'Sant Boi, Santa Coloma de Cervelló, Sant Vicenç dels Horts, Cornellà, Sant Joan Despí o Viladecans';

export const ui = {
  es: {
    skip: 'Ir al contenido',
    demo: 'Vista de prueba · Los pedidos de esta versión no son reales.',
    home: `${brand.name}, inicio`,
    nav: {
      process: 'El proceso',
      pickup: 'Recogida',
      faq: 'Preguntas',
      order: 'Reservar',
    },
    switchLabel: 'Català',
    switchAria: 'Llegeix aquesta pàgina en català',
    footer: {
      line: 'Pan artesanal de fermentación lenta, por encargo.',
      area: `Recogida en Sant Boi de Llobregat · Para todo el ${brand.region}`,
      privacy: 'Privacidad y condiciones',
      write: 'Escríbeme ↗',
    },
    meta: {
      title: `Pan artesanal por encargo en Sant Boi de Llobregat · ${brand.name}`,
      description:
        'Hogazas hechas a mano con poolish y más de 20 horas de fermentación lenta. Reserva online y recoge el sábado en Sant Boi de Llobregat. Para todo el Baix Llobregat.',
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
      sub: 'Cada sábado en Sant Boi de Llobregat.',
      lede: 'Amaso a mano una hornada pequeña cada semana, con poolish y más de 20 horas de fermentación lenta. Tú lo reservas aquí y el sábado lo pasas a recoger.',
      keywords: [
        'Poolish',
        '+20 h de fermentación',
        'Hecho a mano',
        'Recogida el sábado',
        'Sant Boi de Llobregat',
        'Baix Llobregat',
      ],
      order: 'Reservar hogaza',
      notify: 'Avísame cuando abra',
      how: 'Cómo lo hago',
      photos: [
        'El panadero cortando hogazas recién hechas junto al azulejo azul',
        'Dos hogazas de corteza tostada delante del azulejo azul de la cocina',
      ],
    },
    bake: {
      number: 'Hornada',
      of: 'de',
      reserved: 'hogazas reservadas',
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
      fermentation: 'Fermentación',
      fermentationValue: 'Poolish y más de 20 horas de fermentación lenta',
      ingredients: 'Ingredientes',
      ingredientsValue: 'Harina de trigo, agua, sal y levadura.',
      allergens: 'Alérgenos',
      allergensValue:
        'Contiene trigo (gluten). Si tienes otra alergia, pregúntame antes de reservar.',
      keeps: 'Aguanta',
      keepsValue:
        'Varios días envuelta en un paño. Se congela bien en rebanadas.',
      order: 'Reservar esta hogaza',
      notify: 'Quiero enterarme',
    },
    process: {
      h2a: 'La mayor parte del trabajo',
      h2b: 'es esperar.',
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
          when: 'Desde la víspera',
          title: 'Fermentación lenta',
          time: '+20 h',
          text: 'Poolish, amasado con pliegues a mano, formado y una noche en frío. Sin prisa: ahí nacen el sabor, el aroma y la miga.',
        },
        {
          when: 'Antes de recoger',
          title: 'Horno',
          text: 'Corteza oscura que cruje, miga abierta y húmeda.',
        },
        {
          when: 'Sábado',
          title: 'Recogida',
          text: 'Te llevas el pan del día en Sant Boi. Pagas al recogerlo.',
        },
      ],
    },
    maker: {
      kicker: 'Quién hace el pan',
      h2: 'Pocas hogazas, hechas de una en una.',
      p1: 'Hago pan artesanal por encargo para gente de todo el Baix Llobregat. Cada semana horneo solo lo que se ha reservado: así cada hogaza tiene su tiempo y no se tira nada.',
      p2: 'Sin mejorantes ni atajos. Harina, agua, sal, un poco de levadura y una noche entera de paciencia.',
      altPerson: 'El panadero sostiene una hogaza recién horneada y sonríe',
      altDough: 'Dos masas formadas reposando en sus cestas de fermentación',
    },
    reserve: {
      kicker: 'Pedido para recoger',
      h2: 'Reserva tu hogaza.',
      pickup: 'Recogida',
      where: 'Dónde',
      pickupLocation: 'Punto de recogida en Sant Boi de Llobregat',
      pickupDetails:
        'Te confirmaremos el punto exacto de recogida con tu pedido.',
      windowPending: 'Sábado · horario de recogida confirmado con el pedido',
      pickupInfo: 'Más información sobre la recogida',
      pay: 'Pago',
      payValue: 'Al recoger. Sin tarjeta ni cuenta.',
      left: 'Quedan',
      loaves: 'hogazas',
      question: 'Tengo una pregunta ↗',
      yourOrder: 'Tu pedido',
      demoIntro:
        'Modo de prueba: usa datos ficticios. No se envían emails ni se encarga pan.',
      qty: 'Hogazas',
      qtyMax: 'Máximo 4 por reserva',
      less: 'Quitar una hogaza',
      more: 'Añadir una hogaza',
      name: 'Tu nombre',
      email: 'Email',
      phone: 'Móvil o WhatsApp',
      honey: 'Deja este campo vacío',
      demoCheck: 'Entiendo que estoy probando una reserva ficticia.',
      pickupCheck: (day: string, window: string) =>
        `Recogeré el pan el ${day} en Sant Boi de Llobregat${window ? `, ${window}` : ''}. El punto exacto se confirma con el pedido.`,
      privacyA: 'He leído la',
      privacyLink: 'privacidad y las condiciones',
      submitDemo: 'Probar reserva',
      submit: 'Confirmar reserva',
      footnote: 'Recibirás la confirmación por email. Sin suscripciones.',
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
          'No. Uso poolish: una masa previa de harina, agua y muy poca levadura que fermenta durante la noche. En total, cada hogaza lleva más de 20 horas de fermentación. Como la masa madre, es una fermentación lenta que da sabor y una miga abierta, pero con un gusto más suave y menos ácido.',
        ],
        [
          '¿Qué es un poolish?',
          'Una masa previa líquida que se prepara la noche anterior. Aporta aroma, una corteza fina y crujiente y una miga más abierta, sin necesidad de aditivos.',
        ],
        [
          '¿Qué lleva la hogaza?',
          'Harina de trigo, agua, sal y levadura. Contiene gluten. Si tienes otra alergia, pregúntame antes de reservar: en el espacio de elaboración se trabaja con otras harinas.',
        ],
        [
          '¿Dónde se recoge?',
          `En un punto de recogida en Sant Boi de Llobregat. Te confirmaremos el punto exacto con tu pedido. La recogida te queda cerca si vives en ${areaTowns}.`,
        ],
        [
          '¿Puedo pedir que me lo envíes?',
          `Hago pan para todo el ${brand.region}, pero de momento no hago envíos: se recoge en Sant Boi de Llobregat.`,
        ],
        [
          '¿Cómo lo conservo?',
          'Entero, en un lugar fresco y seco, envuelto en un paño limpio. Si no lo vas a comer pronto, córtalo en rebanadas y congélalo.',
        ],
        [
          '¿Y si no puedo venir?',
          'Responde al email de confirmación o escríbeme cuanto antes con el código de tu reserva. El día antes de la recogida te llega un recordatorio. Si aún estamos a tiempo, libero tu hogaza para otra persona.',
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
      disabled: 'Los avisos se activarán al anunciar la primera hornada.',
      demo: 'Modo de prueba: no recibirás emails.',
      success:
        'Casi está: te he enviado un email para confirmar el aviso. Si no lo ves, mira en spam.',
      successDirect:
        'Ya estás en la lista. Te escribiré cuando abra la próxima hornada.',
    },
    mobile: {
      label: 'Reserva rápida',
      loaf: 'Hogaza',
      order: 'Reservar',
      notify: 'Avísame',
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
      faq: 'Preguntes',
      order: 'Reservar',
    },
    switchLabel: 'Castellano',
    switchAria: 'Lee esta página en castellano',
    footer: {
      line: 'Pa artesà de fermentació lenta, per encàrrec.',
      area: `Recollida a Sant Boi de Llobregat · Per a tot el ${brand.region}`,
      privacy: 'Privacitat i condicions',
      write: 'Escriu-me ↗',
    },
    meta: {
      title: `Pa artesà per encàrrec a Sant Boi de Llobregat · ${brand.name}`,
      description:
        'Pans fets a mà amb poolish i més de 20 hores de fermentació lenta. Reserva en línia i recull-lo dissabte a Sant Boi de Llobregat. Per a tot el Baix Llobregat.',
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
      sub: 'Cada dissabte a Sant Boi de Llobregat.',
      lede: 'Pasto a mà una fornada petita cada setmana, amb poolish i més de 20 hores de fermentació lenta. Tu el reserves aquí i dissabte el passes a buscar.',
      keywords: [
        'Poolish',
        '+20 h de fermentació',
        'Fet a mà',
        'Recollida dissabte',
        'Sant Boi de Llobregat',
        'Baix Llobregat',
      ],
      order: 'Reservar pa',
      notify: 'Avisa’m quan obri',
      how: 'Com el faig',
      photos: [
        'El forner tallant pans acabats de fer al costat de la rajola blava',
        'Dos pans de crosta torrada davant la rajola blava de la cuina',
      ],
    },
    bake: {
      number: 'Fornada',
      of: 'de',
      reserved: 'pans reservats',
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
      fermentation: 'Fermentació',
      fermentationValue: 'Poolish i més de 20 hores de fermentació lenta',
      ingredients: 'Ingredients',
      ingredientsValue: 'Farina de blat, aigua, sal i llevat.',
      allergens: 'Al·lèrgens',
      allergensValue:
        'Conté blat (gluten). Si tens una altra al·lèrgia, pregunta’m abans de reservar.',
      keeps: 'Aguanta',
      keepsValue:
        'Uns quants dies embolicat amb un drap. Es congela bé a llesques.',
      order: 'Reservar aquest pa',
      notify: 'Vull assabentar-me’n',
    },
    process: {
      h2a: 'La major part de la feina',
      h2b: 'és esperar.',
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
          when: 'Des de la vigília',
          title: 'Fermentació lenta',
          time: '+20 h',
          text: 'Poolish, pastat amb plecs a mà, formació i una nit en fred. Sense pressa: aquí neixen el gust, l’aroma i la molla.',
        },
        {
          when: 'Abans de recollir',
          title: 'Forn',
          text: 'Crosta fosca que cruix, molla oberta i humida.',
        },
        {
          when: 'Dissabte',
          title: 'Recollida',
          text: 'T’emportes el pa del dia a Sant Boi. Pagues en recollir-lo.',
        },
      ],
    },
    maker: {
      kicker: 'Qui fa el pa',
      h2: 'Pocs pans, fets d’un en un.',
      p1: 'Faig pa artesà per encàrrec per a gent de tot el Baix Llobregat. Cada setmana només cou el que s’ha reservat: així cada pa té el seu temps i no es llença res.',
      p2: 'Sense milloradors ni dreceres. Farina, aigua, sal, una mica de llevat i una nit sencera de paciència.',
      altPerson: 'El forner sosté un pa acabat de coure i somriu',
      altDough:
        'Dues masses formades reposant als seus cistells de fermentació',
    },
    reserve: {
      kicker: 'Comanda per recollir',
      h2: 'Reserva el teu pa.',
      pickup: 'Recollida',
      where: 'On',
      pickupLocation: 'Punt de recollida a Sant Boi de Llobregat',
      pickupDetails:
        'Et confirmarem el punt exacte de recollida amb la teva comanda.',
      windowPending: 'Dissabte · horari de recollida confirmat amb la comanda',
      pickupInfo: 'Més informació sobre la recollida',
      pay: 'Pagament',
      payValue: 'En recollir. Sense targeta ni compte.',
      left: 'En queden',
      loaves: 'pans',
      question: 'Tinc una pregunta ↗',
      yourOrder: 'La teva comanda',
      demoIntro:
        'Mode de prova: fes servir dades fictícies. No s’envien correus ni s’encarrega pa.',
      qty: 'Pans',
      qtyMax: 'Màxim 4 per reserva',
      less: 'Treure un pa',
      more: 'Afegir un pa',
      name: 'El teu nom',
      email: 'Correu electrònic',
      phone: 'Mòbil o WhatsApp',
      honey: 'Deixa aquest camp buit',
      demoCheck: 'Entenc que estic provant una reserva fictícia.',
      pickupCheck: (day: string, window: string) =>
        `Recolliré el pa ${day} a Sant Boi de Llobregat${window ? `, ${window}` : ''}. El punt exacte es confirma amb la comanda.`,
      privacyA: 'He llegit la',
      privacyLink: 'privacitat i les condicions',
      submitDemo: 'Provar la reserva',
      submit: 'Confirmar la reserva',
      footnote: 'Rebràs la confirmació per correu. Sense subscripcions.',
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
          'No. Faig servir poolish: una massa prèvia de farina, aigua i molt poc llevat que fermenta durant la nit. En total, cada pa porta més de 20 hores de fermentació. Com la massa mare, és una fermentació lenta que dona gust i una molla oberta, però amb un sabor més suau i menys àcid.',
        ],
        [
          'Què és un poolish?',
          'Una massa prèvia líquida que es prepara la nit abans. Aporta aroma, una crosta fina i cruixent i una molla més oberta, sense additius.',
        ],
        [
          'Què porta el pa?',
          'Farina de blat, aigua, sal i llevat. Conté gluten. Si tens una altra al·lèrgia, pregunta’m abans de reservar: a l’espai d’elaboració es treballa amb altres farines.',
        ],
        [
          'On es recull?',
          `En un punt de recollida a Sant Boi de Llobregat. Et confirmarem el punt exacte amb la teva comanda. La recollida et queda a prop si vius a ${areaTowns}.`,
        ],
        [
          'Me’l pots enviar?',
          `Faig pa per a tot el ${brand.region}, però de moment no faig enviaments: es recull a Sant Boi de Llobregat.`,
        ],
        [
          'Com el conservo?',
          'Sencer, en un lloc fresc i sec, embolicat amb un drap net. Si no te’l menjaràs aviat, talla’l a llesques i congela’l.',
        ],
        [
          'I si no puc venir?',
          'Respon el correu de confirmació o escriu-me com més aviat millor amb el codi de la reserva. El dia abans de la recollida t’arriba un recordatori. Si encara som a temps, allibero el teu pa per a una altra persona.',
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
      disabled: 'Els avisos s’activaran quan s’anunciï la primera fornada.',
      demo: 'Mode de prova: no rebràs correus.',
      success:
        'Gairebé fet: t’he enviat un correu per confirmar l’avís. Si no el veus, mira al correu brossa.',
      successDirect:
        'Ja ets a la llista. T’escriuré quan obri la propera fornada.',
    },
    mobile: {
      label: 'Reserva ràpida',
      loaf: 'Pa',
      order: 'Reservar',
      notify: 'Avisa’m',
    },
    breadcrumbHome: 'Inici',
  },
};
