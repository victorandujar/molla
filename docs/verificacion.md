# Verificación del MVP

Fecha: 14/09/2026. Entorno local, Node 24, Astro 7, Chromium. Actualizado el mismo día tras el despliegue en Vercel (`www.mollapa.com`) con Neon y Resend.

## Endurecimiento de lanzamiento (14/09/2026, rama `feature/launch-hardening`)

- Bases separadas: `molla_dev` con su propio usuario; se comprobó que ese usuario recibe «permission denied» al conectarse a `neondb`. Tras el cambio de permisos, producción siguió respondiendo (`/api/bake` OPEN 0/6).
- `npm run check`: cero errores y avisos. `npm test`: 15 pruebas (estados, capacidad, validación, zona horaria, códigos, emails bilingües y escapados, ventana de recordatorio, CSV, claves de mensajes, fechas de cierre y sesiones de gestión).
- `npm run test:e2e` (con `dev:e2e`): 14 pruebas. A las anteriores se suman el doble opt-in con confirmación por POST, la clave de reserva generada en el navegador, los errores en catalán, JSON inválido (400), hornada no activa (409), contadores sin datos personales, panel de gestión (contraseña, recogido y deshacer, POST sin sesión rechazado, axe sin infracciones) y privacidad en catalán.
- Ruta PostgreSQL contra `molla_dev` con los módulos reales: idempotencia, rechazo de otra hornada abierta que no es la activa, cliente existente no sobrescrito, recordatorios reclamados una sola vez y liberados si fallan, transiciones de estado, reintento de confirmaciones, doble opt-in, contadores, límites por ámbito y limpieza. Datos de prueba borrados al terminar.
- Handler compilado con `.env`: páginas públicas con `s-maxage=60`; API, alta, baja y gestión con `no-store`; CSP presente; cron con 401 sin secreto y 200 con él; login con 303 y cookie `HttpOnly; Secure; SameSite=Strict; Path=/gestio`; 403 con otro origen. Ningún secreto del `.env` aparece en `.vercel/output` ni en `dist`.
- Chromium sobre el handler compilado: reserva y lista de espera completas y ninguna violación de CSP. Se corrigió además el `pattern` del teléfono, que los navegadores actuales rechazaban como expresión regular inválida (modo `v`), así que la validación del navegador no funcionaba.
- Pendiente tras desplegar: comprobar la primera ejecución del cron en Vercel y un recordatorio real el viernes anterior a la recogida.

## Prueba en producción (14/09/2026)

- Reserva real en `www.mollapa.com`: HTTP 201, pedido y línea guardados en Neon, `emailStatus` SENT. Resend marcó como entregados la confirmación al cliente y el aviso al obrador. Repetir la misma solicitud devuelve el mismo pedido (idempotencia).
- Contra la misma base, con la compilación nueva y email desactivado: hornada leída de la base de datos, hornada inexistente rechazada (409), exceso de cupo rechazado (409) y cinco reservas simultáneas por tres hogazas (tres aceptadas, estado SOLD_OUT, sin sobreventa).
- Todos los datos de prueba (pedidos, líneas, cliente y límites) se borraron después; la hornada quedó OPEN 0/6.

## Comprobaciones realizadas

- `npm run check`: cero errores, avisos o hints.
- `npm test`: 4 pruebas de dominio correctas: apertura, cierre exacto, agotado, completado, capacidad, validación y consentimiento.
- `npm run test:e2e`: 8 pruebas correctas sobre el servidor local de demostración. Reserva y confirmación; validación de formulario; doble envío con la misma clave; dos solicitudes simultáneas disputando las últimas unidades; agotado; cerrado; lista de espera; duplicación de emails y baja confirmada por POST; rechazo de solicitudes de otro origen; navegación interna y metadatos.
- `npm run build`: compilación Vercel correcta.
- `npm audit`: cero vulnerabilidades reportadas al instalar las dependencias finales. `path-to-regexp` se fija en 6.3.0 para corregir una dependencia transitiva del adaptador.
- Axe: cero infracciones detectadas en la página de inicio móvil. Navegación con teclado y salto al contenido probados. Etiquetas visibles incluidas en los nombres accesibles.
- Capturas completas a 375, 768, 1440 y 1920 px, con todas las fotografías cargadas; sin desbordamiento horizontal. Revisión visual de la cabecera móvil, escritorio y fotografías dentro de la página. Las capturas están en `screenshots/`.
- La compilación de producción se ejecutó mediante su handler generado: devuelve la página de preparación, no activa la demo y rechaza reservas/lista de espera con 503 mientras falte configuración.

## Lighthouse móvil sobre la compilación

Informe final: `audits/lighthouse.html`, datos: `audits/lighthouse.json`.

| Métrica | Resultado local |
|---|---:|
| Rendimiento | 100 |
| Accesibilidad | 100 |
| Buenas prácticas | 100 |
| SEO | 66 |
| LCP | 1,81 s |
| CLS | 0 |

El 66 de SEO se debe al bloqueo de indexación explícito del borrador (`noindex` y `robots.txt`). No se ha quitado ese bloqueo para elevar la nota. Se generan canonical, OpenGraph con imagen absoluta, sitemap y datos estructurados cuando el dominio y la configuración real están completos. La indexación y los datos estructurados activados deben verificarse tras configurar ese entorno. No se declara un establecimiento comercial abierto al público.

Primera medición: rendimiento 81; tras recortar y comprimir las variantes de fotos, añadir AVIF, precargar las dos fuentes necesarias y ajustar la cabecera móvil, rendimiento 100. No se ha alterado el contenido de las fotografías. Las cifras son de laboratorio local, no datos de usuarios reales ni una garantía de rendimiento en Vercel. Deben repetirse con el dominio y la base de datos reales.

## Pendientes fuera del código

- Registro sanitario del obrador (RSIPAC o comunicación previa), alta de la actividad, formación de manipulador y permiso de entrega en el punto de recogida si es vía pública. `LAUNCH_REVIEWED=true` no lo comprueba.
- Instagram y WhatsApp sin configurar: no aparecen en la web.
- DMARC de mollapa.com en `p=none`; subir a `quarantine` cuando los envíos lleven unas semanas sin problemas.
- Avisos de próximas hornadas: se exportan para envío por el propietario; no hay envío masivo automático.
- Analítica: hooks disponibles y canal de origen en pedidos; sin contador de visitas externo.
