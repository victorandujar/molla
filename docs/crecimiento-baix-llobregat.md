# Plan de captación: Sant Boi, Sant Just Desvern y Baix Llobregat

Complementa `lanzamiento-30-dias.md`. Mantiene sus reglas: nada de reseñas inventadas, seguidores comprados, listas sin permiso ni páginas casi idénticas para cada municipio.

## 1. La oferta

> **Pan artesano a domicilio, cada sábado de 12 a 14 h.**
> Harina ecológica, hasta 35 h de fermentación y solo lo que se encarga. 5 € la hogaza, sin coste de envío y pagas al recibirlo.

- **A domicilio**: Sant Boi de Llobregat, Sant Just Desvern y Santa Coloma de Cervelló. Los municipios y la franja están en `src/lib/delivery.ts`; si cambian, se cambian ahí.
- **Recogida en Sant Boi**: el resto del Baix Llobregat (Cornellà, Sant Joan Despí, Sant Feliu, Sant Vicenç dels Horts, Viladecans…).
- **Capacidad**: con una sola cocotte, 6–8 hogazas por hornada sin estrés. Con la ruta de 12 a 14 h, cuenta unos 10 minutos por entrega en la misma zona y 20 entre Sant Boi y Sant Just. Más de 10 entregas en dos horas obliga a ordenar bien la ruta o a abrir una segunda franja.

Mensajes que funcionan en local:

- **Hecho por una persona del barrio**, con cara y nombre. Las fotos ya existen; hay que ponerlas delante.
- **El sábado resuelto**: el pan llega a casa a la hora del vermut y de la comida.
- **Sin desperdicio**: solo se hornea lo reservado.
- **El precio**: 5 € por 750–850 g de pan ecológico de fermentación larga, en la puerta de casa.

## 2. Qué hace ya la web

- **Reserva con entrega**: el cliente elige «A domicilio» (municipio y dirección) o «Lo recojo en Sant Boi». La dirección aparece en `/gestio` con enlace a Google Maps, en el aviso «Nueva reserva» y en los emails del cliente.
- **Una página por servicio, no por municipio**:
  - `/es/pan-a-domicilio` y `/pa-a-domicili`: horario, zonas, cómo funciona y precio. Es la página a enlazar desde Google, Instagram y los flyers.
  - `/es/recogida` y `/recollida`: para el resto del Baix Llobregat.
- **SEO local**:
  - El título y la descripción de la portada nombran «a domicilio», Sant Boi y Sant Just.
  - Las preguntas frecuentes incluyen «¿Lleváis pan a Sant Just Desvern?».
  - Datos estructurados `Bakery` con las zonas de servicio y el horario del sábado, y un `Service` de reparto.
  - El sitemap tiene 10 URL.
- **Boca a boca medible**: tras reservar aparece «Pásaselo a un vecino por WhatsApp», con el enlace etiquetado `utm_source=whatsapp&utm_campaign=vecino`.
- **Medición**: Vercel Web Analytics (hay que activarlo en el panel), el embudo propio por canal y los canales `qr` y `facebook` para flyers y grupos.

## 3. Plan de 6 semanas

### Semana 1: que Google te encuentre

- [ ] **Perfil de Empresa de Google** (business.google.com):
  - Dalo de alta como empresa de área de servicio (dirección oculta).
  - Categoría principal: «Panadería».
  - Zonas de servicio: Sant Boi de Llobregat, Sant Just Desvern, Santa Coloma de Cervelló, Cornellà, Sant Joan Despí, Sant Feliu de Llobregat y Viladecans.
  - Horario: sábado de 12:00 a 14:00.
  - Web: `https://www.mollapa.com/es/pan-a-domicilio?utm_source=google&utm_medium=gbp`.
  - Sube 10 fotos (pan, miga, manos, entrega) y descripción: «Pan artesano de fermentación lenta a domicilio los sábados en Sant Boi, Sant Just Desvern y Santa Coloma de Cervelló».
- [ ] **Vercel**: proyecto → Analytics → Enable. Desplegar `main`.
- [ ] **Google Search Console**: volver a enviar `sitemap.xml` y pedir la indexación de `/es/pan-a-domicilio` y `/pa-a-domicili`. Después, `npm run seo:indexnow`.
- [ ] **Reseñas**: escribir a cada cliente que ya ha comprado con el enlace de reseña de Google. Objetivo: las primeras 5.

### Semana 2: Instagram y WhatsApp con la nueva oferta

- [ ] Bio de Instagram: «Pan ecológico de 35 h · A domicilio los sábados 12–14 h · Sant Boi · Sant Just · Santa Coloma ↓». Enlace a `/es/pan-a-domicilio?utm_source=instagram`.
- [ ] Reel «del horno a tu puerta» (15 s): sacar el pan, envolverlo, el coche y entregarlo en una puerta (sin enseñar la dirección).
- [ ] Ubicación en cada post (Sant Boi, Sant Just) y hashtags `#santboi`, `#santjustdesvern`, `#baixllobregat`, `#santcolomadecervello`, `#panartesano`, `#pacatala`.
- [ ] Canal de WhatsApp de Molla: un aviso por semana (lunes, apertura de la hornada) con `/?utm_source=whatsapp`.

### Semana 3: Sant Just Desvern en persona

- [ ] **200 tarjetas A6 con QR** a `https://www.mollapa.com/es/pan-a-domicilio?utm_source=qr&utm_campaign=<lugar>`, con un `utm_campaign` por sitio (`santjust-cafe`, `santjust-mercat`, `santboi-pedido`…).
- [ ] **Una tarjeta en cada entrega**: «¿Te ha gustado? Pásala a un vecino».
- [ ] Hablar con 2 comercios de Sant Just (cafetería, tienda ecológica, quesería): degustación y tarjetas en el mostrador.
- [ ] Post personal en los grupos de vecinos de Facebook de Sant Just y Sant Boi (lee sus normas antes). Enlace con `utm_source=facebook`.

### Semana 4: que vuelvan

- [ ] Mensaje de agradecimiento el lunes a quien recibió pan, con la apertura de la nueva hornada.
- [ ] Revisar datos (ver §4) y decidir: ¿subir el cupo, ampliar la franja o mantener?
- [ ] Anunciar la **hornada de Navidad** y los lotes regalo con lista de espera.

### Semanas 5–6: escalar lo que funciona

- [ ] **«Pan fijo» (suscripción semanal)**, ya en la web en `/pa-fix`: ofrécelo a cada cliente que repite («¿te lo preparo cada semana?») y en el canal de WhatsApp. Ver `operacion.md`.
- [ ] **Pedido de escalera u oficina**: 4 o más hogazas a una misma dirección. Sant Just tiene muchas oficinas.
- [ ] Repetir solo los canales que hayan traído pedidos. Quitar el resto.

## 4. Cómo medir (domingo, 10 minutos)

| Dónde                                    | Qué mirar                                                        |
| ---------------------------------------- | ---------------------------------------------------------------- |
| Vercel → Analytics                       | Visitantes, páginas, referentes, `utm_source` y `utm_campaign`   |
| `npm run orders:prod -- funnel --days=7` | Ven la hornada → empiezan → reservan, por canal                  |
| `/gestio`                                | Pedidos, a domicilio frente a recogida, municipios y repetidores |
| Perfil de Empresa de Google              | Búsquedas, clics a la web, llamadas y reseñas                    |

**Objetivos a 60 días:**

- 400 visitantes al mes en la web, con al menos un 20% desde Google.
- 15 reseñas reales en Google.
- 4 o más entregas semanales en Sant Just Desvern.
- Un 30% de clientes que repite.
- La hornada llena 3 semanas seguidas, como señal para subir el cupo.
