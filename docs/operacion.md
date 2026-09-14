# Operación semanal

## Hornadas: la base de datos manda

`src/lib/config.ts` contiene marca, producto, receta y precio en céntimos. La hornada que se muestra y admite pedidos se lee de la base de datos: la próxima recogida no completada o, si no hay ninguna, la última (que aparecerá como cerrada con la lista de avisos). Abrir una semana nueva no requiere desplegar.

Todos los comandos muestran el host de la base de datos. Los que escriben exigen `--yes`: revisa antes el host, porque `.env` apunta a producción.

- `npm run bake`: lista hornadas con estado, reservas/capacidad, apertura, cierre y recogida.
- `npm run bake -- new 2026-10-03 --capacity=6 --yes`: crea la siguiente hornada (`hornada-002`, …). Por defecto la recogida es a las 12:00, cierra dos días antes a las 20:00 y abre en el momento de crearla. Ajustable con `--pickup-time=HH:MM`, `--deadline=AAAA-MM-DDTHH:MM` y `--opens=AAAA-MM-DDTHH:MM`, siempre en hora de Madrid (el cambio de horario se calcula solo).
- `npm run bake -- capacity hornada-002 8 --yes`: cambia el cupo; nunca por debajo de lo ya reservado.
- `npm run bake -- status hornada-001 COMPLETED --yes`: marca la hornada como entregada tras la recogida. Estados: UPCOMING, OPEN, SOLD_OUT, CLOSED y COMPLETED.

El cierre se aplica en el servidor a la hora exacta. Las reservas bloquean la fila de la hornada (`FOR UPDATE`): probado el 14/09/2026 contra Neon con cinco reservas simultáneas por las tres últimas hogazas (entraron tres, sin sobreventa). Los pedidos cancelados liberan unidades. El precio del producto debe coincidir entre configuración y base de datos; si no, se rechaza la reserva.

Hornada actual: `hornada-001`, recogida el sábado 26/09/2026, cierre el jueves 24/09 a las 20:00, 6 hogazas, máximo 4 por pedido.

## Consultar y preparar

- `npm run orders -- summary`: resumen sin mostrar datos personales, por hornada y canal; clientes distintos, repetición, importe medio y avisos.
- `npm run orders -- export .data/pedidos.csv`: lista privada con nombre, contacto, producto, cantidad, importe (céntimos), estado y estado del email.
- `npm run orders -- collected 001-K7QM`: marca una reserva confirmada como recogida. Acepta el código de recogida (número de hornada + 4 caracteres sin 0/O, 1/I/L) o la referencia UUID interna.
- `npm run orders -- cancel 001-K7QM`: cancela una reserva confirmada. No se puede reactivar una cancelada mediante este comando; se crea una nueva reserva para validar cupo.
- `npm run orders -- waitlist .data/avisos.json`: exportación privada para preparar el aviso semanal. Incluir un enlace a `https://DOMINIO/baja?token=TOKEN` por destinatario. Los avisos semanales no se envían automáticamente en este MVP.

Las exportaciones se crean con permisos privados. No subirlas a Git. En local sin DATABASE_URL, los comandos de lectura usan `.data/demo.json`. No trasladar datos ficticios a producción. La lista y el resumen son herramientas de operación; no hay un panel público con pedidos.

## Confirmaciones, pagos y no presentados

Se paga al recoger. El cliente ve una confirmación con su código de recogida y puede imprimirla o guardarla. Con RESEND_API_KEY y EMAIL_FROM se envía además un email HTML con la identidad de Molla (código, detalle, mapa estático enlazado a Google Maps y botón «Cómo llegar») con alternativa en texto, y un aviso «Nueva reserva» a CONTACT_EMAIL con teléfono y email clicables. Vista previa en `docs/screenshots/email-confirmacion.png`. Las imágenes se sirven desde `public/email/` del dominio, así que deben estar desplegadas; el dominio mollapa.com está verificado en Resend. Los rechazos del proveedor quedan en los logs de Vercel sin datos personales («Email rejected», «Owner notification failed»). En demo nunca se envían emails. El registro conserva SENT, FAILED, PENDING o DISABLED para que un fallo de correo no pierda un pedido confirmado. Si falla, consulta la exportación y contacta al cliente; no hay una cola automática de reintentos. El proveedor usa una clave idempotente. Las condiciones publicadas piden avisar antes del cierre y advierten que quien no recoja ni avise podrá tener que pagar por adelantado. La interfaz en `payments.ts` es el punto de integración de un pago online futuro, todavía sin activar.

## Medición

Los eventos `molla:analytics` se emiten sin datos personales. Incluyen los nueve eventos pedidos: landing_view, view_current_bake, view_product, start_reservation, reservation_completed, waitlist_signup, click_instagram, click_whatsapp, pickup_info_view. Un proveedor futuro puede escuchar estos eventos. Actualmente no salen del navegador. El origen sí se guarda junto con cada pedido o alta. La atribución es del enlace o la visita actual, sin cookies ni seguimiento entre sesiones.

La tasa de repetición del resumen usa clientes con más de un pedido no cancelado. Para evaluar ventas reales, contrasta con COLLECTED. La ocupación se calcula dividiendo hogazas de la hornada por su capacidad. Los ingresos del resumen son el valor reservado, no cobros liquidados.

## Idiomas y SEO

El catalán es el idioma principal: `/`, `/recollida` y `/poolish`. El castellano vive en `/es/`, `/es/recogida` y `/es/poolish`. Cada página tiene canonical propio y hreflang recíproco `ca`, `es` y `x-default` (catalán), también en el sitemap. Las URLs antiguas `/ca/…` y `/recogida` redirigen con 308 (definidas en `astro.config.mjs`). Privacidad y baja siguen solo en castellano, igual que los emails de confirmación y los mensajes de error del servidor.

Portada editorial: «Pa artesà ✳ per encàrrec» en dos pesos (cada palabra se dimensiona según su longitud para que catalán y castellano ocupen lo mismo), subtítulo con Sant Boi, entrada en primera persona, fila con dos fotos reales (panadero y hogazas con el azulejo) y la hornada en vivo como panel azul, y una línea de palabras clave.

## Entornos

Producción (`www.mollapa.com`) tiene `LIVE_ORDERS=true`. Las Preview de Vercel tienen `LIVE_ORDERS=false`: comparten base de datos y no deben aceptar pedidos ni enviar emails reales. Si se necesita probar reservas en Preview, crear antes una rama de Neon y apuntar a ella las variables de Preview.

## Marca

`npm run brand` regenera con la tipografía de la web el wordmark del email (`public/email/molla-crema.png`), los iconos (`favicon-48.png`, `apple-touch-icon.png`, `icon-512.png`) y el mapa del punto de recogida (`public/email/mapa-recogida.png`, teselas de OpenStreetMap con su atribución). Ejecutarlo solo si cambia la marca o el punto de recogida.
