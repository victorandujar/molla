// One-off seasonal emails to the confirmed waitlist, sent by the daily job
// (~17:00 Madrid) on `sendOn` or, if that run was missed, up to two days
// later. Each subscriber gets each campaign once (email_sends, kind
// 'campaign'). With `bakeDate`, whoever already ordered from that bake is
// skipped. To add one: a new entry with its own id and dates.
import type { Lang } from './domain';

export type Campaign = {
  id: string;
  // Madrid date of the send.
  sendOn: string;
  // Pickup date (Madrid) of the bake it promotes, if any.
  bakeDate?: string;
  // Where the buttons lead: the Christmas page for that day (24 or 31).
  dia: string;
  // A second button to the other Christmas bake (the first email only).
  secondDia?: string;
  copy: Record<
    Lang,
    {
      subject: string;
      kicker: string;
      heading: string;
      intro: string;
      // Rows of the details table: [label, value].
      rows: [string, string][];
      button: string;
      secondButton?: string;
      // Extra paragraph after the button (optional).
      note?: string;
    }
  >;
};

// The panettone is still being tested: the first email only asks who would
// want it (replies reach the baker). Set to false to drop the paragraph.
const panettoneTeaser = true;

export const campaigns: Campaign[] = [
  {
    id: 'nadal-2026-anunci',
    sendOn: '2026-12-01',
    dia: '24',
    secondDia: '31',
    copy: {
      ca: {
        subject: 'Aquest Nadal, pa de Molla a taula',
        kicker: 'Nadal 2026',
        heading: 'Fornades de Nit de Nadal i de Cap d’Any.',
        intro:
          'Aquest any fornejo el dijous 24 i el dijous 31 de desembre, perquè el pa arribi a taula el mateix dia. Ja pots reservar per a tots dos dies. Com sempre, només fornejo el que es reserva: quan s’omple, es tanca.',
        rows: [
          [
            'Nit de Nadal',
            'Dijous 24, 12–14 h · comandes obertes fins dimarts 22 a les 20 h',
          ],
          [
            'Cap d’Any',
            'Dijous 31, 12–14 h · comandes obertes fins dimarts 29 a les 20 h',
          ],
          [
            'Entrega',
            'A domicili a Sant Boi, Sant Just, Sant Joan Despí, Sant Feliu, Santa Coloma i Sant Vicenç, sense cost d’enviament. O recollida a Sant Boi.',
          ],
          ['La carta', 'Pa de poolish, banana bread i brioixeria, com sempre.'],
        ],
        button: 'Reservar per al 24 →',
        secondButton: 'Reservar per al 31 →',
        note: panettoneTeaser
          ? 'I una cosa més: estic provant un panettone de massa mare. Encara no sé si arribarà a temps per a aquestes festes. Si t’agradaria tenir-ne un, respon aquest correu i seràs dels primers a saber-ho.'
          : undefined,
      },
      es: {
        subject: 'Esta Navidad, pan de Molla en la mesa',
        kicker: 'Navidad 2026',
        heading: 'Hornadas de Nochebuena y de Nochevieja.',
        intro:
          'Este año horneo el jueves 24 y el jueves 31 de diciembre, para que el pan llegue a la mesa el mismo día. Ya puedes reservar para los dos días. Como siempre, solo horneo lo que se reserva: cuando se llena, se cierra.',
        rows: [
          [
            'Nochebuena',
            'Jueves 24, 12–14 h · pedidos abiertos hasta el martes 22 a las 20 h',
          ],
          [
            'Nochevieja',
            'Jueves 31, 12–14 h · pedidos abiertos hasta el martes 29 a las 20 h',
          ],
          [
            'Entrega',
            'A domicilio en Sant Boi, Sant Just, Sant Joan Despí, Sant Feliu, Santa Coloma y Sant Vicenç, sin coste de envío. O recogida en Sant Boi.',
          ],
          [
            'La carta',
            'Pan de poolish, banana bread y bollería, como siempre.',
          ],
        ],
        button: 'Reservar para el 24 →',
        secondButton: 'Reservar para el 31 →',
        note: panettoneTeaser
          ? 'Y una cosa más: estoy probando un panettone de masa madre. Todavía no sé si llegará a tiempo para estas fiestas. Si te gustaría tener uno, responde a este correo y serás de los primeros en saberlo.'
          : undefined,
      },
    },
  },
  {
    id: 'nadal-2026-nit-de-nadal',
    sendOn: '2026-12-18',
    bakeDate: '2026-12-24',
    dia: '24',
    copy: {
      ca: {
        subject: 'El pa de Nit de Nadal: comandes fins dimarts',
        kicker: 'Nit de Nadal',
        heading: 'El pa del 24, a casa a migdia.',
        intro:
          'Encara hi ets a temps de reservar el pa i la brioixeria per al dijous 24. Te’ls porto de 12 a 14 h, acabats de fer. Les comandes tanquen dimarts 22 a les 20 h o quan s’omple la fornada.',
        rows: [
          ['Entrega', 'Dijous 24 de desembre, 12–14 h'],
          ['Tancament', 'Dimarts 22 a les 20 h'],
        ],
        button: 'Reservar per al 24 →',
      },
      es: {
        subject: 'El pan de Nochebuena: pedidos hasta el martes',
        kicker: 'Nochebuena',
        heading: 'El pan del 24, en casa a mediodía.',
        intro:
          'Aún estás a tiempo de reservar el pan y la bollería para el jueves 24. Te lo llevo de 12 a 14 h, recién hecho. Los pedidos cierran el martes 22 a las 20 h o cuando se llena la hornada.',
        rows: [
          ['Entrega', 'Jueves 24 de diciembre, 12–14 h'],
          ['Cierre', 'Martes 22 a las 20 h'],
        ],
        button: 'Reservar para el 24 →',
      },
    },
  },
  {
    id: 'nadal-2026-cap-d-any',
    sendOn: '2026-12-27',
    bakeDate: '2026-12-31',
    dia: '31',
    copy: {
      ca: {
        subject: 'El pa de Cap d’Any: comandes fins dimarts',
        kicker: 'Cap d’Any',
        heading: 'Tanquem l’any amb pa bo.',
        intro:
          'Última fornada del 2026: dijous 31, de 12 a 14 h. Reserva el pa i la brioixeria per a l’últim sopar de l’any fins dimarts 29 a les 20 h.',
        rows: [
          ['Entrega', 'Dijous 31 de desembre, 12–14 h'],
          ['Tancament', 'Dimarts 29 a les 20 h'],
        ],
        button: 'Reservar per al 31 →',
      },
      es: {
        subject: 'El pan de Nochevieja: pedidos hasta el martes',
        kicker: 'Nochevieja',
        heading: 'Cerramos el año con pan bueno.',
        intro:
          'Última hornada de 2026: jueves 31, de 12 a 14 h. Reserva el pan y la bollería para la última cena del año hasta el martes 29 a las 20 h.',
        rows: [
          ['Entrega', 'Jueves 31 de diciembre, 12–14 h'],
          ['Cierre', 'Martes 29 a las 20 h'],
        ],
        button: 'Reservar para el 31 →',
      },
    },
  },
];

// Campaigns due on a Madrid date: from their send date to two days later.
export const campaignsDue = (today: string, list = campaigns) =>
  list.filter((c) => {
    const start = Date.parse(`${c.sendOn}T12:00:00Z`);
    const day = Date.parse(`${today}T12:00:00Z`);
    return day >= start && day <= start + 2 * 86400000;
  });
