# Operación semanal

## Entornos y bases de datos

Hay dos bases en el mismo proyecto de Neon, cada una con su usuario:

- `neondb` (producción): solo la usan `www.mollapa.com` y los scripts `:prod`, con credenciales en `.env.production`.
- `molla_dev` (desarrollo y Preview): la usan `.env` y las Preview de Vercel. Su usuario `molla_dev` no puede conectarse a `neondb`.

Los scripts sin sufijo (`npm run bake`, `npm run orders`, `npm run db:migrate`) trabajan contra `molla_dev`. Para producción: `npm run bake:prod`, `npm run orders:prod`, `npm run db:migrate:prod` y `npm run db:seed:prod`. Todos muestran host y base antes de empezar, y los que escriben exigen `--yes`.

Las Preview tienen `LIVE_ORDERS=true` contra `molla_dev` y sin `RESEND_API_KEY`: se puede reservar y probar la gestión sin tocar clientes reales ni enviar emails.

## Gestión desde el móvil: /gestio

`https://www.mollapa.com/gestio`, con la contraseña `ADMIN_PASSWORD` (en `.env.production`; en Vercel, Production). Muestra la hornada activa (o cualquiera de las 12 últimas): reservadas, por recoger, importe por cobrar y cada pedido con código, teléfono, WhatsApp y email. Botones:

- **Marcar recogido** (con **Deshacer** por si te equivocas).
- **Cancelar…**: pide confirmación, libera las hogazas y no se puede deshacer.

Debajo, el embudo de los últimos 28 días y los avisos confirmados o pendientes. La sesión dura 12 horas, la cookie solo viaja a `/gestio` y hay 5 intentos de contraseña cada 10 minutos por IP. Cambiar `ADMIN_PASSWORD` (y redesplegar) cierra todas las sesiones.

## Hornadas: la base de datos manda

`src/lib/config.ts` contiene marca, producto, receta y precio en céntimos. La hornada que se muestra y admite pedidos se lee de la base de datos: la próxima recogida no completada o, si no hay ninguna, la última (que aparecerá como cerrada con la lista de avisos). Abrir una semana nueva no requiere desplegar.

Todos los comandos muestran el host de la base de datos. Los que escriben exigen `--yes`: revisa antes el host, porque `.env` apunta a producción.

- `npm run bake`: lista hornadas con estado, reservas/capacidad, apertura, cierre y recogida.
- `npm run bake:prod -- new 2026-10-03 --capacity=6 --yes`: crea la siguiente hornada (`hornada-002`, …). Por defecto la recogida es a las 12:00, cierra dos días antes a las 20:00, abre en el momento de crearla y usa la franja de `PICKUP_WINDOW`. Ajustable con `--pickup-time=HH:MM`, `--deadline=AAAA-MM-DDTHH:MM`, `--opens=AAAA-MM-DDTHH:MM` y `--window="de 11:00 a 13:00"`, siempre en hora de Madrid (el cambio de horario se calcula solo). La web muestra el cierre, el día y la franja de cada hornada; no hay fechas escritas a mano en los textos.
- `npm run bake:prod -- window hornada-002 "de 11:00 a 13:00" --yes`: cambia la franja. Los pedidos ya confirmados conservan la franja con la que se confirmaron.
- `npm run bake -- capacity hornada-002 8 --yes`: cambia el cupo; nunca por debajo de lo ya reservado.
- `npm run bake -- status hornada-001 COMPLETED --yes`: marca la hornada como entregada tras la recogida. Estados: UPCOMING, OPEN, SOLD_OUT, CLOSED y COMPLETED.

El cierre se aplica en el servidor a la hora exacta. Las reservas bloquean la fila de la hornada (`FOR UPDATE`): probado el 14/09/2026 contra Neon con cinco reservas simultáneas por las tres últimas hogazas (entraron tres, sin sobreventa). Los pedidos cancelados liberan unidades. El precio del producto debe coincidir entre configuración y base de datos; si no, se rechaza la reserva.

Hornada actual: `hornada-001`, recogida el sábado 26/09/2026, cierre el jueves 24/09 a las 20:00, 6 hogazas, máximo 4 por pedido.

## Consultar y preparar

Los comandos siguientes aparecen sin sufijo; para producción usa `orders:prod`.

- `npm run orders -- summary`: resumen sin mostrar datos personales, por hornada y canal; clientes distintos, repetición, importe medio y avisos.
- `npm run orders -- export .data/pedidos.csv`: lista privada con nombre, contacto, producto, cantidad, importe (céntimos), estado y estado del email.
- `npm run orders -- funnel --days=28`: embudo por evento y canal (visitas, ven la hornada, empiezan a reservar, reservan, se apuntan al aviso).
- `npm run orders -- collected 001-K7QM --yes`: marca una reserva confirmada como recogida. Acepta el código de recogida (número de hornada + 4 caracteres sin 0/O, 1/I/L) o la referencia UUID interna.
- `npm run orders -- cancel 001-K7QM --yes`: cancela una reserva confirmada. No se puede reactivar una cancelada mediante este comando; se crea una nueva reserva para validar cupo.
- `npm run orders -- waitlist .data/avisos.json`: exporta solo los avisos **confirmados** (doble opt-in), con su idioma. Incluir un enlace a `https://DOMINIO/baja?token=TOKEN&lang=IDIOMA` por destinatario. Los avisos semanales no se envían automáticamente en este MVP.
- `npm run orders -- purge --months=12 --yes`: anonimiza nombre, email y teléfono de los pedidos cuya recogida tiene más de N meses. Conserva importes, cantidades, fechas y canal para las métricas. Ajusta N al plazo de conservación publicado.

Las exportaciones se crean con permisos privados. No subirlas a Git. En local sin DATABASE_URL, los comandos de lectura usan `.data/demo.json`. No trasladar datos ficticios a producción. La lista y el resumen son herramientas de operación; no hay un panel público con pedidos.

## Tarea diaria: recordatorios y reintentos

Vercel Cron llama cada día a `/api/cron/daily` a las 16:00 UTC (18:00 en verano y 17:00 en invierno en Madrid; en el plan Hobby puede ejecutarse en cualquier momento de esa hora), autenticado con `CRON_SECRET`. La tarea:

1. Envía un **recordatorio** en el idioma del cliente a los pedidos confirmados cuya recogida cae en las próximas 30 horas: con recogida el sábado a mediodía, llega el viernes por la tarde. Cada pedido se marca antes de enviar, para que dos ejecuciones no dupliquen el email. Si el envío falla, se desmarca.
2. **Reintenta** las confirmaciones en FAILED o PENDING de más de 10 minutos, para recogidas futuras. Usa la misma clave idempotente, así que Resend no duplica un email que ya había aceptado.
3. Borra los límites de peticiones antiguos y los avisos sin confirmar de más de 7 días.

El resultado (`reminders`, `reminderFailures`, `retried`) aparece en los logs de la ejecución en Vercel (Settings → Cron Jobs). En `/gestio` cada pedido indica si el recordatorio salió.

## Lista de avisos: doble opt-in

Al apuntarse, el email queda pendiente y recibe un correo con el botón «Confirmar el aviso». El enlace abre `/alta`, que pide pulsar un botón, para que los antivirus de correo que abren enlaces no confirmen por nadie. Solo los confirmados salen en la exportación. Si alguien lo vuelve a pedir estando pendiente, el correo se reenvía como mucho una vez por hora. Sin `RESEND_API_KEY` no hay forma de confirmar, así que ese despliegue apunta directamente.

## Confirmaciones, pagos y no presentados

Se paga al recoger. El cliente ve una confirmación con su código de recogida y puede imprimirla o guardarla. Los emails al cliente (confirmación, recordatorio y aviso) van en el idioma de la página donde reservó. Se envían después de responder, así que un Resend lento no retrasa la confirmación en pantalla. Con RESEND_API_KEY y EMAIL_FROM se envía además un email HTML con la identidad de Molla (código, detalle, mapa estático enlazado a Google Maps y botón «Cómo llegar») con alternativa en texto, y un aviso «Nueva reserva» a CONTACT_EMAIL con teléfono y email clicables. Vista previa en `docs/screenshots/email-confirmacion.png`. Las imágenes se sirven desde `public/email/` del dominio, así que deben estar desplegadas; el dominio mollapa.com está verificado en Resend. Los rechazos del proveedor quedan en los logs de Vercel sin datos personales («Email rejected», «Owner notification failed»). En demo nunca se envían emails. El registro conserva SENT, FAILED, PENDING o DISABLED para que un fallo de correo no pierda un pedido confirmado. Si falla, la tarea diaria lo reintenta; si sigue en FAILED, contacta al cliente desde `/gestio`. El proveedor usa una clave idempotente. Las condiciones publicadas piden avisar antes del cierre y advierten que quien no recoja ni avise podrá tener que pagar por adelantado. La interfaz en `payments.ts` es el punto de integración de un pago online futuro, todavía sin activar.

## Medición

Los eventos `molla:analytics` se emiten sin datos personales. Incluyen los nueve eventos: landing_view, view_current_bake, view_product, start_reservation, reservation_completed, waitlist_signup, click_instagram, click_whatsapp, pickup_info_view. Además se cuentan en la propia base (`analytics_daily`): solo evento, canal y día, sin cookies, IP ni identificador. Se consultan en `/gestio` o con `orders -- funnel`. No distingue visitantes únicos: una misma persona que recarga cuenta dos veces. El origen sí se guarda junto con cada pedido o alta. La atribución es del enlace o la visita actual, sin cookies ni seguimiento entre sesiones.

La tasa de repetición del resumen usa clientes con más de un pedido no cancelado. Para evaluar ventas reales, contrasta con COLLECTED. La ocupación se calcula dividiendo hogazas de la hornada por su capacidad. Los ingresos del resumen son el valor reservado, no cobros liquidados.

## Idiomas y SEO

El catalán es el idioma principal: `/`, `/recollida` y `/poolish`. El castellano vive en `/es/`, `/es/recogida` y `/es/poolish`. Cada página tiene canonical propio y hreflang recíproco `ca`, `es` y `x-default` (catalán), también en el sitemap. Las URLs antiguas `/ca/…` y `/recogida` redirigen con 308 (definidas en `astro.config.mjs`). Privacidad tiene versión catalana (`/privacitat`) y castellana (`/privacidad`); sus textos legales salen de `PRIVACY_*` y `PRIVACY_*_CA`. Alta y baja de avisos, emails al cliente y mensajes de error del servidor siguen el idioma de la página (`?lang=ca`). El aviso al obrador y `/gestio` están en castellano.

## Caché y seguridad

Las páginas públicas (`/`, `/es/`, recogida, privacidad, robots y sitemap) se sirven desde la CDN de Vercel durante 60 s y se revalidan en segundo plano, así que un pico de visitas no llega a la base. El contador de la hornada se refresca desde `/api/bake` al cargar. Las API, `/alta`, `/baja` y `/gestio` no se cachean. La clave de idempotencia de cada reserva se genera en el navegador. En producción se envía una Content-Security-Policy que solo permite recursos del propio dominio.

Portada editorial: «Pa artesà ✳ per encàrrec» en dos pesos (cada palabra se dimensiona según su longitud para que catalán y castellano ocupen lo mismo), subtítulo con Sant Boi, entrada en primera persona, fila con dos fotos reales (panadero y hogazas con el azulejo) y la hornada en vivo como panel azul, y una línea de palabras clave.

## Entornos

Producción (`www.mollapa.com`) tiene `LIVE_ORDERS=true`. Preview también, pero contra `molla_dev` y sin envío de emails (ver «Entornos y bases de datos»).

## Marca

`npm run brand` regenera con la tipografía de la web el wordmark del email (`public/email/molla-crema.png`), los iconos (`favicon-48.png`, `apple-touch-icon.png`, `icon-512.png`) y el mapa del punto de recogida (`public/email/mapa-recogida.png`, teselas de OpenStreetMap con su atribución). Ejecutarlo solo si cambia la marca o el punto de recogida.
