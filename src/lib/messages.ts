// Messages the server sends back to the page, in the visitor's language.
export type Lang = 'es' | 'ca';
export const messages = {
  es: {
    closed: 'Todavía no hemos abierto las reservas. Vuelve pronto.',
    origin: 'Solicitud no válida.',
    tooLarge: 'Solicitud demasiado larga.',
    rateLimited:
      'Has enviado varias solicitudes. Espera diez minutos y vuelve a intentarlo.',
    invalid: 'Revisa los datos.',
    name: 'Escribe tu nombre.',
    email: 'Revisa tu email.',
    phone: 'Revisa tu teléfono.',
    pickup: 'Confirma que podrás recoger el pan.',
    privacy: 'Necesitamos tu aceptación para gestionar el pedido.',
    capacity:
      'Esta hornada ya no admite esa cantidad. Puedes apuntarte a la próxima.',
    bakeChanged: 'La hornada ha cambiado. Recarga la página.',
    productUnavailable: 'Este pan no está disponible.',
    priceChanged: 'Este pan ha cambiado de precio. Contacta antes de reservar.',
    reservationFailed:
      'No se ha podido procesar la reserva. Conservamos tus datos en el formulario; vuelve a intentarlo.',
    waitlistInvalid: 'Revisa el email y acepta recibir el aviso.',
    waitlistFailed: 'No se ha podido guardar tu aviso. Inténtalo de nuevo.',
    unavailable: 'No podemos consultar la disponibilidad.',
  },
  ca: {
    closed: 'Encara no hem obert les reserves. Torna aviat.',
    origin: 'Sol·licitud no vàlida.',
    tooLarge: 'Sol·licitud massa llarga.',
    rateLimited:
      'Has enviat diverses sol·licituds. Espera deu minuts i torna-ho a provar.',
    invalid: 'Revisa les dades.',
    name: 'Escriu el teu nom.',
    email: 'Revisa el correu electrònic.',
    phone: 'Revisa el telèfon.',
    pickup: 'Confirma que podràs recollir el pa.',
    privacy: 'Necessitem la teva acceptació per gestionar la comanda.',
    capacity:
      'Aquesta fornada ja no admet aquesta quantitat. Pots apuntar-te a la propera.',
    bakeChanged: 'La fornada ha canviat. Recarrega la pàgina.',
    productUnavailable: 'Aquest pa no està disponible.',
    priceChanged: 'Aquest pa ha canviat de preu. Contacta abans de reservar.',
    reservationFailed:
      'No s’ha pogut processar la reserva. Conservem les teves dades al formulari; torna-ho a provar.',
    waitlistInvalid: 'Revisa el correu i accepta rebre l’avís.',
    waitlistFailed: 'No s’ha pogut desar el teu avís. Torna-ho a provar.',
    unavailable: 'No podem consultar la disponibilitat.',
  },
} satisfies Record<Lang, Record<string, string>>;
export type MessageKey = keyof typeof messages.es;
export const isMessageKey = (key: string): key is MessageKey =>
  Object.hasOwn(messages.es, key);
// Expected failures carry a message key; the route translates it.
export class AppError extends Error {
  constructor(
    public key: MessageKey,
    public status = 409,
  ) {
    super(key);
  }
}
