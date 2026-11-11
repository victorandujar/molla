# Auditoría CRO de mollapa.com · noviembre de 2026

## Alcance y límites

- **Qué se ha revisado**: el código de `main` (lo que despliega producción), ejecutado en local en modo demo y como build de producción, en iPhone 13, iPhone SE (320 px), Pixel 5 y escritorio 1440 px. Se ha hecho un pedido completo de punta a punta, se han comprobado los eventos y se ha pasado Lighthouse (móvil) y la batería E2E del proyecto (33 pruebas, con auditoría de accesibilidad axe).
- **Qué no**: la web publicada no era accesible desde el entorno de la auditoría (el proxy rechazó `www.mollapa.com`). No hay datos reales de Vercel Analytics, `/gestio`, Search Console ni Meta Ads. **Ninguna cifra de este informe es de tráfico real** salvo las que tú diste (≈1.500 visitas, 1 pedido web).
- Las medidas de rendimiento son de un servidor local sin compresión: son pesimistas. Hay que confirmarlas con PageSpeed Insights sobre la URL real.

## 1. Diagnóstico ejecutivo

**La web no está rota, y es mejor de lo que dice el 0,067 %.** El pedido funciona (probado: un solo pedido aunque se pulse dos veces, confirmación clara, código, total y pago al recibir). Siempre hay una hornada abierta. El precio, el reparto gratis y el pago al recibir aparecen en la portada. Hay foto real, nombre del obrador, reseñas reales y un formulario corto (el email es opcional).

El problema es una mezcla de cuatro cosas, por este orden:

1. **La propia web manda los pedidos a WhatsApp, y luego no se cuentan como web.** En la portada había dos botones del mismo tamaño, «Reservar mi pan del sábado» y «Reservar por WhatsApp», y otro botón «Reservar por WhatsApp» debajo del formulario. Cada pedido que nace en la web y se cierra por chat se ha apuntado como «WhatsApp». La cifra «1 pedido desde la web» mide solo el formulario, no la contribución de la web.
2. **La atribución estaba rota.** Los enlaces de campaña (bio de Instagram, QR, Perfil de Google, anuncios) llevan a `/pa-a-domicili`; al pulsar «Reservar», la portada recalculaba el canal sin UTM y el pedido quedaba como `direct`. Además, los parámetros por defecto de Meta (`utm_source=ig`/`fb`) no se reconocían. Con esto no se puede saber qué canal convierte.
3. **En móvil, el botón principal estaba debajo del pliegue** (a 894 px con el aviso de demo, ~800 px en producción, en una pantalla de 664 px). Lo primero que se veía era la foto y el titular, sin precio junto al botón.
4. **La calidad y el tamaño del tráfico no están analizados.** «1.500 visitas» puede ser páginas vistas o visitantes (Vercel muestra ambas); con ~2 hornadas semanales de capacidad limitada, gran parte del tráfico de Instagram es gente que ya te sigue y prefiere el chat, o que vive fuera de la zona de reparto. Sin el desglose por canal no se puede culpar solo a la web.

Lo que funciona y **no hay que tocar**: la identidad visual, el tiquet de pedido en una sola página, el email opcional, «pagas al recibir», la cuenta atrás de cierre, «quedan pocos» sin cifras, las combinaciones al precio de las piezas, el Pan fijo, «Convida un veí», la confirmación por WhatsApp sin API y el embudo propio sin cookies.

## 2. Problemas detectados

Impacto = efecto esperado en pedidos. Esfuerzo: S (horas), M (1–2 días), L (más).

| ID   | Problema                                                                             | Evidencia                                                                                                                                                   | Impacto              | Esfuerzo            | Prioridad | Estado                                                                                                                                                 |
| ---- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | ------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| P-01 | WhatsApp compite con el pedido: botón de igual peso en la portada y en el formulario | `Home.astro`: `.stub-whatsapp` como botón `full` bajo el CTA; `button-ghost full` bajo «Confirmar reserva»                                                  | Alto                 | S                   | 1         | **Hecho**: enlace de texto «¿Prefieres pedirlo por WhatsApp?», se mantiene en los dos sitios                                                           |
| P-02 | El canal se perdía al cambiar de página                                              | `client.ts` recalculaba `source()` en cada carga; referente del mismo dominio → `direct`. Verificado: anuncio → `/es/pan-a-domicilio` → reservar = `direct` | Alto (decisiones)    | S                   | 1         | **Hecho**: se conserva en la pestaña. Verificado: mismo recorrido = `ads`                                                                              |
| P-03 | Meta Ads no se distinguía de Instagram orgánico                                      | `utm_source=ig`/`fb` no estaba en la lista; navegador interno de Instagram sin referente = `direct`                                                         | Alto (decisiones)    | S                   | 1         | **Hecho**: `ads` por medio de pago o fuente de Meta; navegador de Instagram → `instagram`. `fbclid` no cuenta como pago                                |
| P-04 | Las campañas aterrizan en una página sin formulario                                  | Bio, QR, Google y anuncios apuntan a `/pa-a-domicili`; hay que pulsar «Reservar» y cambiar de página                                                        | Medio-alto           | S (cambiar enlaces) | 2         | Pendiente: tú cambias los enlaces (ver §10, semana 2)                                                                                                  |
| P-05 | CTA principal fuera de la primera pantalla en móvil                                  | Medido: CTA a 894 px; pantalla de 664 px                                                                                                                    | Alto                 | S                   | 1         | **Hecho**: CTA a 577 px en iPhone 13 y 579 px en Pixel 5; precio y condiciones junto al botón                                                          |
| P-06 | Sin medición de clics a WhatsApp con intención de pedido                             | Un solo `click_whatsapp` para «reservar», «tengo una pregunta» y «avísame»                                                                                  | Alto (decisiones)    | S                   | 1         | **Hecho**: `click_whatsapp_order` aparte, con ubicación; canal manual «WhatsApp desde la web» en `/gestio`                                             |
| P-07 | Sin GA4/GTM ni eventos estándar                                                      | No hay `dataLayer`                                                                                                                                          | Medio                | M                   | 2         | **Hecho** el `dataLayer` y la carga opcional de GTM con consentimiento denegado. Falta: banner de consentimiento y contenedor (ver `analitica-ga4.md`) |
| P-08 | Confirmación de un envío a domicilio decía «Código de recogida»                      | Pantalla de confirmación                                                                                                                                    | Bajo                 | S                   | 3         | **Hecho**: «Código de pedido» si es a domicilio                                                                                                        |
| P-09 | Píldora flotante móvil cortada: «Tu pedido · Hogaz…»                                 | Captura móvil                                                                                                                                               | Bajo                 | S                   | 3         | **Hecho**: «Hogaza 5€ · sábado»                                                                                                                        |
| P-10 | En 320 px el recuadro de la hornada se salía por la derecha                          | Medido: fila de 333 px en 320 px                                                                                                                            | Bajo (pocos móviles) | S                   | 3         | **Hecho** en la portada. Queda un desbordamiento menor en la carta y el tiquet a 320 px                                                                |
| P-11 | Página muy larga para un pedido de 5 €                                               | 14.000 px ≈ 21 pantallas en móvil; el formulario empieza a ~9,6 pantallas                                                                                   | Medio                | —                   | —         | Se mantiene: los CTA y la píldora saltan al tiquet. No compensa recortar sin datos (ver A/B 3)                                                         |
| P-12 | Rendimiento: 7 tipografías y CSS bloqueante                                          | Lighthouse móvil local: rendimiento 71, LCP 5,1 s, ~270 KB de fuentes, CSS de 80 KB sin comprimir                                                           | Medio                | M                   | 2         | Pendiente: reducir familias tipográficas; medir antes en PageSpeed                                                                                     |
| P-13 | Envío gratis con pedido de 5 € a seis municipios                                     | Sin pedido mínimo                                                                                                                                           | Medio (margen)       | S                   | 2         | Pendiente: decisión de negocio (ver §5)                                                                                                                |
| P-14 | Reseñas: 7, todas de 5 estrellas                                                     | `googleReviews.count = 7`                                                                                                                                   | Medio                | —                   | 2         | Se mantiene el diseño. El email «¿qué tal el pan?» ya las pide; falta volumen                                                                          |
| P-15 | Fecha de la hornada marcada como `<h2>`                                              | Estructura de encabezados                                                                                                                                   | Muy bajo             | S                   | 4         | Pendiente, cosmético                                                                                                                                   |

Sin cambios necesarios: accesibilidad (Lighthouse 100, axe sin incidencias), mejores prácticas (96), metadatos, hreflang ca/es, sitemap, canonical, JSON-LD (`Bakery` de área de servicio, `Product`, `FAQPage`), CSP estricta, sin cookies.

## 3. Experiencia móvil

Antes (iPhone 13, 390 × 664):

1. Barra «Pan artesano por encargo», foto 16:10 (219 px), titular de tres líneas.
2. Entradilla de cinco líneas con precio y condiciones.
3. Resguardo de la hornada: estado, fecha, cierre, cuenta atrás.
4. **CTA naranja y botón de WhatsApp del mismo tamaño**, fuera de pantalla.
5. Barra flotante «Tu pedido · Hogaz…» (sin nada dentro) tapando contenido al hacer scroll.

Después:

1. Foto más baja (12:5), titular, y directamente el resguardo: fecha, cierre, cuenta atrás, **«5,00 € la hogaza · Envío gratis · Pagas al recibirlo»** y el **CTA, visible sin scroll** en iPhone 13 y Pixel 5 (en un iPhone SE de 320 px asoma).
2. Debajo, un enlace discreto «¿Prefieres pedirlo por WhatsApp?».
3. La entradilla pasa debajo. En escritorio no cambia nada salvo el enlace de WhatsApp.

El resto del recorrido móvil funciona: «Añadir» en cada producto, píldora con el total, el CTA lleva al tiquet con dos atajos («1 hogaza · 5 €» y «Para compartir · 14,70 €»), selector de entrega claro y teclado numérico en el teléfono. Distracciones que se quedan porque son la marca: la cinta animada y el diario del obrador.

## 4. Embudo de compra

Recorrido actual (una sola página, sin cuenta):

`Portada → (carta / combinaciones) → tiquet: productos → entrega (domicilio por defecto) → municipio + dirección + nota opcional → nombre → email opcional → teléfono → Confirmar → confirmación en la misma página`

Campos obligatorios a domicilio: municipio, dirección, nombre y teléfono. Recogida: nombre y teléfono. Es el mínimo para entregar; **no hay que quitar ninguno**.

Dónde se puede ir la gente, por orden de probabilidad:

1. **Portada → nada** (rebote): el CTA no se veía en móvil; tráfico de Instagram de baja intención. → P-05 hecho; falta medir rebote por canal.
2. **Portada → WhatsApp**: el botón invitaba. → P-01 y P-06 hechos; ahora se mide.
3. **Página de campaña → portada**: un salto más. → P-04.
4. **Tiquet → datos**: aceptable. Ahora `form_start` separa «tocó un producto» de «empezó a escribir sus datos».
5. **Envío → error**: el servidor responde en el idioma de la página; `reservation_error` se cuenta.

Qué pasa después de enviar: se entiende (día, franja, dirección, total, «pago al recibirlo», código, guardar/imprimir, confirmación por WhatsApp). Disponibilidad: «Pedidos hasta el jueves 12 a las 20:00 o hasta completar la hornada» y cuenta atrás; claro.

**Lo que necesito para cuantificar el embudo** (ver §11).

## 5. Estrategia comercial y ticket medio

La estructura ya es buena: un producto principal (hogaza 5 €), complementos de mayor margen (bollería, banana bread), combinaciones sin descuento, repetición con Pan fijo (el 4.º pan lo pagas tú tras 3) y boca a boca con «Convida un veí». No hace falta añadir productos.

Para subir el ticket **sin descuentos**:

1. **Pedido mínimo para el envío a domicilio** (decisión tuya). Hoy un pedido de 5 € a Sant Vicenç dels Horts tiene envío gratis. Propuesta a probar: envío gratis desde 8 € (una hogaza + un croissant = 7,20 €; una hogaza + un pain = 7,50 €), recogida en Sant Boi sin mínimo. Requiere cambio de servidor y textos: **no implementado** porque es una decisión de negocio y puede bajar la conversión; pruébalo dos semanas y compara pedidos e importe medio en `/gestio`.
2. **Venta cruzada en el tiquet**: cuando solo hay pan, una línea «¿Y para el desayuno? + 2 croissants · 4,40 €» con un botón. Sin descuento. (A/B 4.)
3. **«Para compartir» como primera opción** ya está en el tiquet. Mantener.
4. **Escasez real**: ya existe («quedan pocos», cierre con cuenta atrás). No inventar urgencia.
5. **Pan fijo**: es el mejor motor de ingresos recurrentes; se ofrece tras el pedido y por email tras el segundo. Mantener.

## 6. Nueva propuesta de homepage

La estructura actual ya sigue casi el orden pedido. Propuesta, sin rediseñar:

| #   | Bloque                      | Hoy                                           | Propuesta                                                                                                                  |
| --- | --------------------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| 1   | Hero con propuesta de valor | Titular + resguardo + CTA                     | **Hecho**: CTA, precio y condiciones en la primera pantalla móvil; WhatsApp como enlace                                    |
| 2   | Producto principal y precio | En el resguardo y en la carta                 | Mantener                                                                                                                   |
| —   | Quién lo hace + una reseña  | Justo después del hero                        | Mantener: es la mejor prueba de confianza                                                                                  |
| 3   | Beneficios diferenciales    | «Por qué yo y no el horno» (tras las reseñas) | Probar a subirlo antes de la carta, en tres líneas (A/B 3)                                                                 |
| 4   | Cómo funciona el pedido     | Repartido entre resguardo, tiquet y preguntas | Añadir una franja de 3 pasos encima del tiquet: «Elige · Te lo llevo miércoles o sábado de 12 a 14 h · Pagas al recibirlo» |
| 5   | Productos y packs           | Carta + Combina                               | Mantener                                                                                                                   |
| 6   | Opiniones                   | Tablero de reseñas                            | Mantener; con más reseñas, mostrar el total en el hero                                                                     |
| 7   | Historia y creador          | Diario del obrador + página Poolish           | Mantener                                                                                                                   |
| 8   | CTA de compra               | Tiquet + píldora flotante + botón de cabecera | Mantener                                                                                                                   |

## 7. Nueva propuesta de checkout

Mantener el tiquet de una página (no añadir pasos). Cambios propuestos:

1. **Hecho**: WhatsApp como enlace bajo «Confirmar reserva», no como segundo botón.
2. **Hecho**: «Código de pedido» en entregas a domicilio.
3. Pendiente (S): la nota «Si no estás (opcional)» detrás de un enlace «Añadir una nota», para que el formulario parezca más corto.
4. Pendiente (S): repetir el total junto al botón («Confirmar reserva · 14,70 €»).
5. No cambiar: email opcional, sin casilla de privacidad (enviar es aceptar, con el enlace), casilla de novedades desmarcada, «pagas al recibir».

## 8. Plan de instrumentación GA4

Detalle completo en [`analitica-ga4.md`](analitica-ga4.md): eventos, cuándo se disparan, cómo etiquetar Meta Ads e Instagram, cómo atribuir los pedidos web→WhatsApp y cómo activar GTM. Resumen:

- `page_view → view_item → select_item → add_to_cart → begin_checkout → form_start → form_submit → purchase`, más `whatsapp_click` (con `intent` y `placement`) e `instagram_click`.
- `purchase` solo cuando el servidor guarda la reserva, una vez por código de pedido, nunca en la demo.
- **GA4 no está activado**: falta un banner de consentimiento (obligatorio para usar cookies en España) y el ID de GTM. Hasta entonces, la fuente de verdad es `/gestio`, que ya cuenta el embudo por canal sin cookies.

## 9. Lista priorizada de cambios

| Tipo        | Cambio                                                                       | Impacto        | Esfuerzo | Estado                 |
| ----------- | ---------------------------------------------------------------------------- | -------------- | -------- | ---------------------- |
| Inmediato   | CTA visible en móvil con precio y condiciones (P-05)                         | Alto           | S        | Hecho                  |
| Inmediato   | WhatsApp como canal secundario (P-01)                                        | Alto           | S        | Hecho                  |
| Analítica   | Canal conservado en la visita, Meta Ads, navegador de Instagram (P-02, P-03) | Alto           | S        | Hecho                  |
| Analítica   | `click_whatsapp_order`, `form_start`, canal «WhatsApp desde la web» (P-06)   | Alto           | S        | Hecho                  |
| Analítica   | `dataLayer` GA4 + GTM opcional con consentimiento denegado (P-07)            | Medio          | M        | Hecho (falta CMP + ID) |
| Inmediato   | Enlaces de campaña a la portada (P-04)                                       | Medio-alto     | S        | Tú                     |
| UX          | Código de pedido, píldora, 320 px (P-08–P-10)                                | Bajo           | S        | Hecho                  |
| UX          | Nota opcional plegada, total en el botón (§7)                                | Bajo-medio     | S        | Pendiente              |
| UX          | Franja «cómo funciona» de 3 pasos (§6)                                       | Medio          | S        | Pendiente / A/B        |
| Estructural | Pedido mínimo para envío gratis (P-13)                                       | Medio (margen) | M        | Decisión tuya          |
| Estructural | Menos familias tipográficas (P-12)                                           | Medio          | M        | Pendiente              |
| Experimento | Ver §10                                                                      | —              | —        | —                      |

## 10. Plan de experimentación, próximos 30 días

Con ~1.500 visitas al mes y pocos pedidos, **un A/B con significación estadística es imposible** (harían falta miles de visitas por variante). Se trabaja con cambios de efecto grande, uno cada vez, comparando semana contra semana en `/gestio` y anotando qué se cambió y cuándo.

| Semana | Qué                                                                                                                                                                                                                                                    | Métrica principal                                                  | Decisión                                                                 |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| 1      | Desplegar estos cambios. Línea base: `/gestio` cada domingo; apuntar en `/gestio` cada pedido de chat que empiece con «Quiero reservar pan…» como «WhatsApp desde la web». Preguntar a cada cliente nuevo de WhatsApp/Instagram «¿viste la web antes?» | Pedidos web + `whatsapp_web` ÷ visitas; `click_whatsapp_order`     | Saber cuánto vende la web de verdad                                      |
| 2      | Cambiar los enlaces de la bio, historias, QR nuevos y anuncios a la portada (`/?utm_source=…` o `/es?utm_source=…`) en lugar de `/pa-a-domicili`                                                                                                       | `start_reservation` ÷ `landing_view` del canal `instagram` y `ads` | Si sube, dejarlo                                                         |
| 3      | Subir «Por qué yo» (tres cifras) encima de la carta                                                                                                                                                                                                    | `start_reservation` ÷ `view_current_bake`                          | Dejar la versión que gane por margen claro; si no hay diferencia, volver |
| 4      | Venta cruzada en el tiquet cuando solo hay pan («¿Y para el desayuno? + 2 croissants»)                                                                                                                                                                 | Importe medio por pedido y % de pedidos con bollería               | Mantener si sube el ticket sin bajar pedidos                             |

En paralelo, **5 pruebas de usuario** con vecinos que no conozcan Molla: «Pide un pan para el sábado desde el móvil», sin ayuda, mirando dónde dudan. Es la forma más barata de encontrar fricción con este volumen.

## 11. Qué necesito para seguir

1. **Vercel → Analytics, últimos 30 días**: visitantes y páginas vistas (para saber qué son las «1.500»), referentes, `utm_source`, `utm_campaign`, páginas de entrada y países/ciudades.
2. **`/gestio` → «Últimos 28 días»** (captura) y la salida de `npm run orders:prod -- funnel --days=28` (embudo por canal) y `npm run orders:prod -- summary` (pedidos por canal e importe medio).
3. **Pedidos por WhatsApp e Instagram por semana** de las últimas 4–8 semanas (aunque sea a mano) y cuántos venían «de la web».
4. **Meta Ads**: objetivo de campaña, URL de destino y parámetros de URL, segmentación geográfica (¿solo los seis municipios?), alcance, clics en el enlace, visitas a la página de destino e importe gastado.
5. **Google Search Console**: consultas, páginas indexadas y clics de los últimos 3 meses.
6. Capacidad real por hornada (hogazas y bollería) y cuántas hornadas se han agotado: si se agotan por WhatsApp, el límite no es la web.
