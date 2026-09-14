# Verificación del MVP

Fecha: 14/09/2026. Entorno local, Node 24, Astro 7, Chromium. No se ha desplegado un entorno público ni conectado una base de datos remota.

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

## Pendientes externos explícitos

- PostgreSQL: el esquema, migraciones, seed y capa transaccional están implementados. No se han ejecutado contra Neon/PostgreSQL remoto por falta de credenciales. Los tests de concurrencia ejercitan la demo local serializada, no prueban el bloqueo distribuido de PostgreSQL. Validar esta capa en el entorno de pruebas antes de activar pedidos reales.
- Email: integración y plantilla preparadas; no se ha realizado un envío real. Remitente y clave pendientes. Las confirmaciones funcionan en pantalla sin correo.
- Datos operativos: dirección, franja, contacto, receta/alérgenos, capacidad y precios definitivos por confirmar.
- Publicación: dominio, Vercel y remoto Git propios pendientes. Ningún recurso de `purpose-cohors` se ha modificado ni reutilizado. Los commits locales se integran en `pre`; no es posible hacer push sin remoto propio.
- Datos legales: identidad, domicilio, proveedores y conservación por completar; la activación requiere confirmación explícita de estos datos mediante configuración.
- Avisos de próximas hornadas: se exportan para envío por el propietario. No hay campaña ni envío masivo automático.
- Analítica: hooks disponibles y canal de origen en pedidos; aún no se recoge un contador de visitas externo.
