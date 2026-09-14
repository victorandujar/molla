# Operación semanal

## Una única fuente de configuración

`src/lib/config.ts` contiene marca, producto, receta, precio en céntimos y la hornada inicial. La fecha 19/09/2026, el cupo 20 y los precios son de trabajo: deben confirmarse. No hay reservas ficticias precargadas: el cupo parte de cero. La especial está desactivada.

Para una nueva semana, crea un identificador distinto en `bake`, incrementa `number` y establece fechas ISO con el desplazamiento horario de Madrid correcto (`+02:00` en verano, `+01:00` en invierno). Nunca reutilices una hornada con pedidos para otra fecha. Ejecuta `npm run db:seed` después de migrar: inserta la nueva hornada, sin tocar registros existentes. Despliega la configuración al mismo entorno. Los estados y el cupo se consultan en la base de datos; las fechas no avanzan solas. Los precios del producto deben coincidir entre configuración y base de datos: una discrepancia impide reservar a un precio inesperado.

No reduzcas capacidad por debajo de las unidades ya reservadas. Los estados son UPCOMING, OPEN, SOLD_OUT, CLOSED y COMPLETED. Las transacciones bloquean la fila de la hornada al reservar; los pedidos cancelados liberan unidades. El cierre se aplica en el servidor a la hora exacta. Las mismas reglas se prueban en el almacenamiento local de demostración, serializado en un único proceso.

## Consultar y preparar

- `npm run orders -- summary`: resumen sin mostrar datos personales, por hornada y canal; clientes distintos, repetición, importe medio y avisos.
- `npm run orders -- export .data/pedidos.csv`: lista privada con nombre, contacto, producto, cantidad, importe (céntimos), estado y estado del email.
- `npm run orders -- collected UUID`: marca una reserva confirmada como recogida.
- `npm run orders -- cancel UUID`: cancela una reserva confirmada. No se puede reactivar una cancelada mediante este comando; se crea una nueva reserva para validar cupo.
- `npm run orders -- waitlist .data/avisos.json`: exportación privada para preparar el aviso semanal. Incluir un enlace a `https://DOMINIO/baja?token=TOKEN` por destinatario. Los avisos semanales no se envían automáticamente en este MVP.

Las exportaciones se crean con permisos privados. No subirlas a Git. En local sin DATABASE_URL, los comandos de lectura usan `.data/demo.json`. No trasladar datos ficticios a producción. La lista y el resumen son herramientas de operación; no hay un panel público con pedidos.

## Confirmaciones y pagos

Se paga al recoger. El cliente ve una confirmación con referencia y puede imprimirla o guardarla. Con RESEND_API_KEY y EMAIL_FROM se envía además una copia; el remitente debe estar verificado. En demo nunca se envían emails. El registro conserva SENT, FAILED, PENDING o DISABLED para que un fallo de correo no pierda un pedido confirmado. Si falla, consulta la exportación y contacta al cliente; no hay una cola automática de reintentos. El proveedor usa una clave idempotente. La interfaz en `payments.ts` es el punto de integración de un pago online futuro, todavía sin activar.

## Medición

Los eventos `molla:analytics` se emiten sin datos personales. Incluyen los nueve eventos pedidos: landing_view, view_current_bake, view_product, start_reservation, reservation_completed, waitlist_signup, click_instagram, click_whatsapp, pickup_info_view. Un proveedor futuro puede escuchar estos eventos. Actualmente no salen del navegador. El origen sí se guarda junto con cada pedido o alta. La atribución es del enlace o la visita actual, sin cookies ni seguimiento entre sesiones.

La tasa de repetición del resumen usa clientes con más de un pedido no cancelado. Para evaluar ventas reales, contrasta con COLLECTED. La ocupación se calcula dividiendo hogazas de la hornada por su capacidad. Los ingresos del resumen son el valor reservado, no cobros liquidados.

## Idiomas y SEO

Inicialmente solo existe español en `/`, con `lang=es`. El idioma y las fechas están centralizados; no se publican rutas catalanas vacías. Cuando haya traducción real, añadir `/ca/`, canonical propio y hreflang recíproco `es`, `ca` y `x-default` en ambas versiones. Mantener una única URL por idioma.

Metadatos, sitemap y robots se activan con la configuración del lanzamiento. El borrador permanece noindex. Organization describe la marca; no se declara un establecimiento Bakery abierto al público sin confirmar ese uso. No hay reseñas, estrellas, números de clientes ni escasez inventados. La capacidad en la demo está etiquetada como prueba.
