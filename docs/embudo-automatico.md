# Embudo de ventas automático

Objetivo: que Molla consiga y retenga clientes en el Baix Llobregat **sin que tengas que escribir emails ni mensajes a mano**. La web atrae, capta el email, convierte cada semana, fideliza y pide recomendaciones sola. A ti te quedan el pan, las entregas y 5 minutos el domingo para leer el resumen.

Complementa `crecimiento-baix-llobregat.md` (zonas y oferta) y `operacion.md` (operación diaria). Las reglas siguen siendo las mismas: nada de reseñas inventadas, listas compradas ni emails a quien no lo ha pedido.

## 1. El embudo

```
 ATRAER            CAPTAR               CONVERTIR             REPETIR               RECOMENDAR
 Google, anuncios  Reserva o aviso      Email «hornada        Email «¿qué tal?»     Reseña Google +
 locales, QR,      por email (con       abierta» (lunes) +    y oferta Pan fijo     WhatsApp a un
 boca a boca       casilla al reservar) «último aviso»        tras el 2.º pedido    vecino
                                        (jueves)
```

La pieza que faltaba era el paso del medio: hasta ahora la lista de avisos se guardaba, pero nadie la avisaba. Quien visitaba la web y no compraba ese día se perdía. Ahora cada visita que deja su email recibe, cada semana y sin intervención, el aviso de la hornada.

Para **clientes nuevos** hay tres motores, de más barato a más caro:

1. **«Convida un veí»** (automático, en la web): cada cliente trae al siguiente. Ver §2.1.
2. **Google** (gratis): las reseñas se piden solas tras cada primer pedido y suben el perfil en Maps. Ver §4.1.
3. **Anuncios locales** (5 €/día): el kit de imágenes y textos ya está hecho en `exports/anuncis/`. Ver §4.2.

Cada visitante nuevo que no compra el primer día deja su email y el embudo lo sigue trabajando cada semana. Por eso cada euro de anuncios rinde más que sin él.

## 2. Qué hace solo, desde que se despliega

| Cuándo (hora de Madrid)                                         | Email                                                                                                                                                 | A quién                                                                      |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| **Lunes ~20:05**, al abrir la hornada del sábado                | «Ya puedes reservar el pan del sábado»: foto, carta con precios, entrega, una reseña real de Google y botón de reserva                                | Avisos confirmados que aún no han reservado esa hornada y no tienen Pan fijo |
| **Jueves ~17:00**, el día del cierre                            | «Hoy a las 20:00 cierro los pedidos»                                                                                                                  | Los mismos, si siguen sin reservar y la hornada no está agotada              |
| **Día siguiente a la entrega** (~17:00) del primer pedido       | «¿Qué tal el pan?»: botón de reseña en Google, «pásaselo a un vecino» por WhatsApp y, si no está en la lista, «¿te aviso cada semana?» (doble opt-in) | Cada cliente, una sola vez en la vida                                        |
| **Día siguiente a la entrega** del segundo pedido               | «¿Te guardo el pan cada semana?»: la propuesta del Pan fijo                                                                                           | Cada cliente sin Pan fijo, una sola vez                                      |
| **Día siguiente a la entrega** del primer pedido de un invitado | «Un vecino ha probado Molla gracias a ti»: su próximo croissant es de regalo                                                                          | Quien le invitó                                                              |
| **Domingo ~17:00**                                              | Resumen semanal: pedidos, importe, clientes nuevos, embudo de la web, canales, ocupación de hornadas y emails enviados                                | Tú (`CONTACT_EMAIL`)                                                         |

Y en la web:

- **Casilla opcional al reservar**: «Avísame por email cuando abra cada hornada del sábado». Desmarcada por defecto. Quien la marca entra en la lista confirmado. Es la forma más rápida de que la lista crezca, porque quien ya ha comprado es quien más repite.
- **Todos los enlaces de los emails llevan `utm_source=email`**, así que en `/gestio`, en el resumen semanal y en Vercel Analytics ves qué ventas vienen del embudo.
- **`/gestio`** muestra, en «Últimos 28 días», cuántos emails de cada tipo han salido.

Garantías:

- Ningún email sale dos veces: cada envío se registra (`email_sends`) antes de mandarse y se libera si el proveedor lo rechaza, para reintentarlo en la siguiente ejecución.
- Como mucho **dos emails por semana** a la lista (apertura y cierre). Por defecto solo para la hornada del sábado; `NEWSLETTER_DAYS=3,6` añade la del miércoles.
- Cada aviso lleva enlace de baja en el pie y en la cabecera `List-Unsubscribe` (Gmail y Outlook muestran el botón «Cancelar suscripción»).
- Las hornadas agotadas no generan emails.

### 2.1 «Convida un veí»: cada cliente trae al siguiente

El canal más rentable de un obrador de barrio es la recomendación de un vecino. Ahora está automatizada y tiene premio para los dos:

- **Cada cliente tiene un enlace personal** (`mollapa.com/?ref=K7QMRT`). Lo recibe en la pantalla de confirmación, en el email de confirmación y en el email «¿qué tal el pan?», con un botón que abre WhatsApp con el mensaje ya escrito.
- **El vecino que entra por ese enlace** ve en el formulario «Vienes invitado por un vecino: con tu primer pedido, un croissant de regalo». Su primer pedido lleva el regalo.
- **Quien invitó** recibe otro croissant en su siguiente pedido, pero solo **cuando el pedido del amigo ya se ha entregado** (así nadie se autoinvita con un email falso para cancelar después). El día después de la entrega le llega el email «Un vecino ha probado Molla gracias a ti: tu próximo croissant es de regalo», que además le anima a reservar y a invitar a otro.
- **Tú no haces nada más que poner el croissant en la bolsa**: el aviso «Nueva reserva» dice «Regalo: 1 croissant sin cobrar (viene invitado…)», `/gestio` muestra la etiqueta 🎁 en el pedido y el total de «Croissants de regalo» para hornear.
- Reglas: el regalo del invitado solo vale en su primer pedido; quien invita acumula como mucho 2 croissants por pedido (el resto espera al siguiente); si un pedido con regalo se cancela, el regalo pasa al siguiente.
- Coste: unos 2 croissants por cliente nuevo. Es tu coste de captación, muy por debajo de cualquier anuncio. `REFERRAL_GIFT=false` lo apaga.
- Medición: los pedidos llegan con canal `referral` (campaña `convida`) y el resumen del domingo muestra «Nuevos por invitación».

Para darle empuje: pon el enlace también en la tarjeta QR de cada entrega («Invita a un vecino: croissant para los dos»).

## 3. Activarlo (una vez, unos 15 minutos)

1. **Migraciones**: `npm run db:migrate:prod` (crea `email_sends`, `referrals` y el código personal de cada cliente; compatibles con la versión anterior). Hazlo **antes** de desplegar `main`.
2. **Desplegar** `main`. Desde ese momento los crons existentes (`/api/cron/cycle` y `/api/cron/daily`) hacen todo lo demás.
3. **Revisar el plan de Resend**. El plan gratuito permite 100 emails al día y 3.000 al mes, contando confirmaciones y recordatorios. Por eso el embudo envía como mucho 80 por ejecución (`FUNNEL_MAX_PER_RUN`). Cuando la lista pase de ~70 personas, cambia a Resend Pro (50.000 al mes) y sube `FUNNEL_MAX_PER_RUN` a 1000.
4. **Entregabilidad** (en el DNS de mollapa.com): que Resend muestre SPF y DKIM en verde y añade un registro DMARC `_dmarc` con `v=DMARC1; p=none; rua=mailto:TU_EMAIL`. Sin esto, los emails a listas acaban en spam.
5. Opcional, en Vercel → Environment Variables (Production), y redesplegar:

| Variable             | Valor por defecto | Para qué                                                        |
| -------------------- | ----------------- | --------------------------------------------------------------- |
| `FUNNEL_EMAILS`      | activo            | `false` apaga todos los emails del embudo (no los de pedidos)   |
| `NEWSLETTER_DAYS`    | `6`               | Días de hornada con aviso: `6` sábado, `3,6` miércoles y sábado |
| `FUNNEL_MAX_PER_RUN` | `80`              | Tope de emails del embudo por ejecución                         |

Para verlo funcionar sin esperar al lunes: Vercel → Settings → Cron Jobs → `/api/cron/daily` → Run. La respuesta incluye `funnel` con lo enviado.

## 4. Atraer tráfico al embudo

El embudo convierte; ahora hay que llenarlo. Por orden de rentabilidad para un obrador de barrio:

### 4.1 Google: búsquedas locales (gratis, se trabaja una vez)

La mayoría de los clientes nuevos de una panadería llegan buscando «pan artesano Sant Boi» o «panadería cerca» en Google Maps. La web ya tiene SEO local (datos `Bakery`, zonas, FAQ por municipio).

- [ ] **Perfil de Empresa de Google** completo: categoría «Panadería», empresa de área de servicio con Sant Boi, Sant Just, Santa Coloma, Cornellà, Sant Joan Despí, Sant Feliu y Viladecans; horario de miércoles y sábado de 12 a 14 h; web `https://www.mollapa.com/pa-a-domicili?utm_source=google&utm_medium=gbp`; 15 fotos reales (pan, miga, bollería, manos, entrega).
- [ ] **Reseñas**: ya no hace falta pedirlas a mano. El email «¿Qué tal el pan?» las pide a cada cliente nuevo al día siguiente de probarlo, que es cuando más ganas tiene de opinar. Las reseñas son lo que más sube el perfil en Maps.
- [ ] Search Console: reenviar `sitemap.xml` tras desplegar y `npm run seo:indexnow`.

### 4.2 Anuncios locales siempre activos (5–10 €/día, se configuran una vez)

Un anuncio pequeño, bien segmentado y que no hay que tocar cada semana. Funciona porque **el email captado hace rentable cada clic**: aunque no compre ese día, el visitante que deja su email recibe el aviso todas las semanas.

**El kit ya está hecho**: `exports/anuncis/` tiene 12 imágenes listas para subir (tres conceptos, en catalán y castellano, en formato feed y story, con fotos reales) y `exports/anuncis/textos.md` los textos, la configuración y los enlaces etiquetados. Si cambian precios o zonas: `npm run ads`.

**Meta (Instagram + Facebook)**, en Meta Business Suite → Anuncios:

- Objetivo: **Tráfico**, hacia la página de entrega a domicilio.
- Ubicación: radio de 3 km alrededor de Sant Boi, Sant Just Desvern y Santa Coloma de Cervelló (tres puntos). Edad 28–65. Sin intereses: deja que Meta optimice.
- Presupuesto: **5 €/día**, campaña continua, sin fecha de fin.
- Creatividades (2–3, rotan solas): el reel «del horno a tu puerta» (15 s), la foto de la miga y la foto de la combinación «Para compartir». Texto: «Pan de poolish con 35 h de fermentación, a domicilio los sábados en Sant Boi, Sant Just y Santa Coloma. 5 € la hogaza, pagas al recibirlo».
- Enlace: `https://www.mollapa.com/pa-a-domicili?utm_source=ads&utm_medium=meta&utm_campaign=local`

**Google Ads (búsqueda)**, solo si sobra presupuesto, 3–5 €/día:

- Palabras clave (concordancia de frase): «pan artesano sant boi», «pa artesà sant boi», «panadería sant just desvern», «pan a domicilio baix llobregat», «pan masa madre sant boi», «croissants sant boi».
- Ubicación: Sant Boi, Sant Just Desvern, Santa Coloma de Cervelló, Cornellà, Sant Joan Despí.
- Enlace: `https://www.mollapa.com/es/pan-a-domicilio?utm_source=ads&utm_medium=google&utm_campaign=busqueda`

**Regla para no tirar dinero** (se revisa con el resumen del domingo, fila «ads» en «Por canal»): si en 3 semanas un anuncio no ha traído al menos **1 pedido o 3 altas de aviso por cada 10 € gastados**, cambia la creatividad una vez; si sigue igual, apágalo. Si funciona, sube el presupuesto un 50% y vuelve a medir.

### 4.3 Lo físico que trabaja solo

- **Tarjeta con QR en cada entrega** (`npm run qr`): «¿Te ha gustado? Pásala a un vecino». Cada QR lleva su campaña, así ves cuál funciona.
- **2–3 comercios de Sant Just y Sant Boi** (cafetería, tienda ecológica, quesería) con tarjetas en el mostrador. Una visita y se queda trabajando meses.

### 4.4 Boca a boca, automatizado

Cuatro momentos piden la recomendación sin que intervengas, todos con el enlace personal de «Convida un veí» (§2.1): la pantalla de confirmación, el email de confirmación, el email del día siguiente y el email del regalo. Más la tarjeta QR de cada entrega (`utm_source=qr`).

## 5. Qué no se puede automatizar (y cómo reducirlo al mínimo)

- **Canal de WhatsApp**: WhatsApp no permite publicar en canales de forma automática. Opción: dejarlo como canal secundario y mover a la gente al email (el email de confirmación ya lo hace con la casilla y el aviso).
- **Instagram**: una hora al mes en Meta Business Suite para programar 8 publicaciones (2 por semana: lunes «hornada abierta», jueves «hoy cierro») con fotos reales. Los anuncios ya se renuevan solos.
- **Perfil de Empresa de Google**: subir 2–3 fotos nuevas al mes desde el móvil.
- **El pan**: lo único que de verdad convierte a un comprador en cliente fijo.

## 6. Tu semana

| Día       | Tú                                                                       | El sistema                                                    |
| --------- | ------------------------------------------------------------------------ | ------------------------------------------------------------- |
| Lunes     | —                                                                        | A las 20:00 abre la hornada del sábado y avisa a la lista     |
| Miércoles | Hornear y entregar                                                       | Recordatorio el martes; «¿qué tal?» el jueves                 |
| Jueves    | —                                                                        | «Último aviso» a quien no ha reservado; cierra a las 20:00    |
| Sábado    | Hornear, entregar, tarjeta QR en cada pedido                             | Recordatorio el viernes; los pedidos de Pan fijo ya colocados |
| Domingo   | **5 minutos**: leer el resumen semanal y decidir cupo y anuncios         | «¿Qué tal?» y oferta Pan fijo a los clientes del sábado       |
| Mensual   | 1 hora: programar Instagram, fotos al Perfil de Google, revisar anuncios | —                                                             |

## 7. Qué mirar y objetivos

En el resumen del domingo:

- **Conversión de la web**: «Reservan» entre «Ven la hornada». Por debajo del 5%, el problema está en la página (precio, fotos, dudas), no en el tráfico.
- **Lista de avisos confirmados**: tiene que crecer cada semana. Es el activo que hace crecer las ventas sin pagar más anuncios.
- **Pedidos por canal `email`**: cuánto vende el embudo por sí solo.
- **Ocupación de la hornada**: 3 semanas seguidas llena → sube el cupo (`npm run bake:prod -- capacity …`) o abre la franja del miércoles a la lista (`NEWSLETTER_DAYS=3,6`).

Objetivos a 90 días:

- 150 avisos confirmados en la lista.
- 25 reseñas reales en Google.
- Un 25% de los pedidos semanales con origen `email`.
- 15 Pan fijo activos (ingreso fijo de cada semana).
- Hornada del sábado llena 3 semanas seguidas.

## 8. Privacidad

- La lista solo incluye a quien lo pide: formulario de avisos con doble opt-in, casilla opcional al reservar (desmarcada) o el botón del email «¿qué tal?», que vuelve a pedir confirmación.
- Los emails «¿qué tal?» y Pan fijo son un único mensaje cada uno, ligado a la compra, y la política de privacidad ya los describe.
- La baja borra el email de la lista. Los logs no guardan direcciones: las claves de envío van cifradas con hash.
- `purge` sigue anonimizando los pedidos antiguos; `email_sends` solo guarda tipo, referencia, email y fecha. Si alguien pide la supresión total, borra también sus filas: `DELETE FROM email_sends WHERE email='…'`.
