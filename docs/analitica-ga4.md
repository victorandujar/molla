# Analítica: embudo propio, Vercel y GA4 con Google Tag Manager

## Qué fuente manda

| Pregunta                                        | Fuente fiable                                                     |
| ----------------------------------------------- | ----------------------------------------------------------------- |
| ¿Cuántos pedidos hay y de qué canal vienen?     | La base de datos: `/gestio` y `npm run orders:prod -- summary`    |
| ¿Dónde se queda la gente en la web?             | Contadores propios: `/gestio` (28 días) y `orders:prod -- funnel` |
| Visitantes, páginas, referentes y `utm_*`       | Vercel Web Analytics                                              |
| Optimizar anuncios de Google o Meta, audiencias | GA4 (si se activa, con banner de consentimiento)                  |

Un clic no es un pedido. **Solo es pedido** una fila en la base de datos (`reservation_completed` en el embudo propio, `purchase` en GA4) o un pedido apuntado a mano en `/gestio`. `whatsapp_click`, `form_submit` o `cta_reserve_click` son intenciones.

## Canales (`source`)

El canal se calcula al llegar y **se conserva durante toda la visita** (sessionStorage de la pestaña). Antes se recalculaba en cada página: quien llegaba a `/pa-a-domicili` desde un anuncio y reservaba en la portada quedaba como `direct`.

| Canal guardado                                 | Cuándo                                                                                                                                                 |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ads`                                          | `utm_medium` de pago (`paid`, `paid_social`, `cpc`, `ppc`, `cpm`…), `utm_source` de Meta (`ig`, `fb`, `an`, `msg`, `meta`) o `gclid`/`gbraid`/`wbraid` |
| `instagram`                                    | `utm_source=instagram`, referente `instagram.com`, o navegador interno de Instagram sin referente ni UTM                                               |
| `facebook`                                     | `utm_source=facebook`, referente `facebook.com` o navegador interno de Facebook                                                                        |
| `google`                                       | `utm_source=google` o referente de Google (orgánico y Perfil de Empresa)                                                                               |
| `whatsapp`, `qr`, `email`, `referral`, `pafix` | Por su `utm_source`                                                                                                                                    |
| `whatsapp_web`                                 | Solo para pedidos apuntados a mano: WhatsApp cuyo primer mensaje es el texto que escribe la web                                                        |
| `direct`                                       | Ninguno de los anteriores                                                                                                                              |

`fbclid` no se usa para detectar pago: Meta también lo añade a los clics orgánicos (bio, historias).

### Cómo etiquetar cada fuente

- **Meta Ads** (Administrador de anuncios → Anuncio → Parámetros de URL):
  `utm_source={{site_source_name}}&utm_medium=paid_social&utm_campaign={{campaign.name}}&utm_content={{ad.name}}`
  Destino: la portada (`https://www.mollapa.com/es` o `/`), no `/pa-a-domicili` (ver auditoría, P-04).
- **Instagram orgánico**: bio `https://www.mollapa.com/?utm_source=instagram&utm_medium=bio`; stickers de enlace en historias `utm_source=instagram&utm_medium=story`.
- **Google Ads**: el autoetiquetado (`gclid`) basta.
- **Perfil de Empresa de Google**: `utm_source=google&utm_medium=gbp` (ya en los documentos).
- **Directo**: lo que queda. En Instagram sin UTM, el navegador interno se reconoce por su user agent; el resto de apps no siempre se puede distinguir.

Meta y Google Ads comparten el canal `ads` en el embudo propio (la base solo guarda el canal). Para separarlos, usa `utm_campaign` en Vercel o la dimensión fuente/medio de GA4.

### Pedidos que empiezan en la web y terminan en WhatsApp

1. El botón «¿Prefieres pedirlo por WhatsApp?» (portada y formulario) cuenta `click_whatsapp_order` con su ubicación (`hero` o `form`). «Tengo una pregunta» y el aviso de la próxima hornada cuentan `click_whatsapp` (dudas y otros).
2. Ese enlace abre WhatsApp con «¡Hola! Quiero reservar pan para el …» ya escrito. Cuando llegue un chat que empiece así, apúntalo en `/gestio` → «Pedido manual» con el canal **«WhatsApp desde la web»** (`whatsapp_web`).
3. Así, `/gestio` da tres cifras distintas: pedidos hechos en la web, pedidos por WhatsApp que salieron de la web y clics a WhatsApp. La tasa de cierre de WhatsApp es `pedidos whatsapp_web ÷ click_whatsapp_order`.

## Eventos

Los contadores propios guardan solo evento, canal y día (sin cookies). La misma acción se publica en `window.dataLayer` con el nombre de GA4.

| #   | Paso                            | Embudo propio (`/gestio`)                 | dataLayer / GA4                                              | Cuándo exactamente                                                             |
| --- | ------------------------------- | ----------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| 1   | Visita                          | `landing_view`                            | `page_view` (lo envía la etiqueta GA4)                       | Cada carga de página                                                           |
| 2   | Ve la carta                     | `view_product`                            | `view_item` (4 productos)                                    | La carta ocupa ≥35 % de la pantalla, una vez                                   |
| 3   | Elige un producto o combinación | —                                         | `select_item`                                                | Primer «Añadir» de cada producto o combinación                                 |
| 4   | Añade / quita                   | `start_reservation` (el primero)          | `add_to_cart` / `remove_from_cart`                           | Cada cambio de cantidad, con su importe                                        |
| 5   | Empieza el pedido               | —                                         | `begin_checkout`                                             | El tiquet está en pantalla con algo dentro, una vez                            |
| 6   | Empieza a rellenar datos        | `form_start`                              | `form_start`                                                 | Primer foco en municipio, dirección, nombre, email o teléfono                  |
| 7   | Pulsa «Confirmar reserva»       | `reservation_submit`                      | `form_submit`                                                | El clic, antes de la validación del navegador: es un intento                   |
| 7b  | Error al reservar               | `reservation_error`                       | `form_error`                                                 |                                                                                |
| 8   | **Pedido**                      | `reservation_completed`                   | **`purchase`** con `transaction_id`                          | El servidor ha guardado la reserva (201). Nunca en la demo; una vez por código |
| 9   | WhatsApp                        | `click_whatsapp_order` / `click_whatsapp` | `whatsapp_click` (`intent`: `order`/`question`, `placement`) | Clic                                                                           |
| 10  | Instagram                       | `click_instagram`                         | `instagram_click`                                            | Clic en el pie                                                                 |
| —   | Aviso de la próxima hornada     | `waitlist_signup`                         | `generate_lead`                                              | Email guardado                                                                 |
| —   | Canal de WhatsApp               | `click_channel`                           | `whatsapp_channel_click`                                     |                                                                                |
| —   | Pan fijo                        | `subscription_completed`                  | `subscription_signup`                                        |                                                                                |

Todos los eventos de dataLayer llevan `traffic_channel` (el canal de la tabla anterior). `purchase` lleva además `delivery_type` (`home`/`pickup`) y `first_order`.

**Sin duplicados**: el formulario se bloquea mientras envía y cada pedido lleva un `requestId` único (el servidor no crea dos pedidos con el mismo); `purchase` se envía una sola vez por código de pedido (sessionStorage) y nunca en la demo. Ojo: es una **reserva con pago al recibir**. Si se cancela, GA4 no lo sabe; los ingresos reales están en `/gestio`.

## Activar GA4 con Google Tag Manager

El código ya está preparado y **no carga nada de Google mientras `PUBLIC_GTM_ID` esté vacío**.

1. **Antes de nada, el consentimiento.** GA4 usa cookies: en España (LSSI y RGPD) hace falta un banner que permita aceptar o rechazar. La web arranca con todo denegado (Consent Mode v2: `analytics_storage`, `ad_storage`, `ad_user_data` y `ad_personalization` en `denied`). Sin banner, GA4 solo recibe pings sin cookies, y con este volumen de tráfico apenas mostrará datos. Elige una CMP compatible con Consent Mode v2 que se pueda cargar desde GTM (por ejemplo, la plantilla de Cookiebot, CookieYes o Iubenda en la Galería de plantillas) y actualiza la política de privacidad.
2. Crea un contenedor web en GTM y una propiedad GA4 (zona horaria Europe/Madrid, moneda EUR).
3. En GTM:
   - Etiqueta **Google tag** con el ID de medición `G-…`, activador _Initialization – All Pages_.
   - Variables de capa de datos: `traffic_channel`, `placement`, `intent`, `delivery_type`, `first_order`.
   - Etiqueta **GA4 Event** con nombre `{{Event}}`, «Enviar datos de comercio electrónico» desde la capa de datos, y activador _Evento personalizado_ con la expresión regular `^(view_item|select_item|add_to_cart|remove_from_cart|begin_checkout|form_start|form_submit|form_error|purchase|whatsapp_click|instagram_click|whatsapp_channel_click|generate_lead|subscription_signup|cta_reserve_click)$`. Añade los parámetros anteriores.
4. En GA4: marca **`purchase`** como evento clave (conversión). `generate_lead` puede ser secundario. **No** marques `whatsapp_click` ni `form_submit` como conversión.
5. En Vercel → Settings → Environment Variables (Production): `PUBLIC_GTM_ID=GTM-XXXXXXX`. Se lee al compilar: hay que **volver a desplegar**. El CSP (`src/middleware.ts`) añade entonces `googletagmanager.com` y `google-analytics.com`; nada más.
6. Prueba con la Vista previa de GTM y DebugView de GA4: un pedido real de prueba debe dar un solo `purchase`; cancélalo después en `/gestio`.

Meta Pixel y la API de conversiones no están instalados. Si las campañas de Meta lo justifican, se añaden en el mismo contenedor, con el mismo consentimiento, disparando `Purchase` desde el evento `purchase` (con `transaction_id` como `event_id` para deduplicar).
