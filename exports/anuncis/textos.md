# Kit de anuncios de Molla

32 imágenes en esta carpeta, con el lenguaje de los flyers: etiquetas en mono entre filetes, titular condensado, pies «(FIG. n)», precio en contorno y el patrón de miga. Solo fotos reales. `npm run ads` las regenera (por ejemplo, si cambian precios, días o zonas: los textos están en `scripts/ad-kit.mjs`).

| Concepto   | Idea                                                     | Foto                         |
| ---------- | -------------------------------------------------------- | ---------------------------- |
| `encarrec` | «Pa per encàrrec.», 5 € en contorno y los tres pasos     | Hogaza partida por la mitad  |
| `facil`    | «Així de fàcil.»: Reserva · Entrega · A taula            | Croissant y pain au chocolat |
| `hores`    | «35 hores» sobre el patrón de miga con su marco de texto | Patrón de miga (vector)      |
| `obrador`  | «Fet per algú del barri.»                                | El panadero en el obrador    |
| `carta`    | La carta con precios                                     | Banana bread                 |
| `porta`    | «Acabat de fer, a la porta de casa.», 5 € y los 6 municipios | Dos hogazas de corteza oscura |
| `veins`    | «Ho diuen els veïns.», 5/5 en Google y dos reseñas reales | Hogaza abierta, la miga       |
| `whatsapp` | «Escriu-me. Te’l porto.» con un pedido de ejemplo por chat | El panadero oliendo el pan    |

Cada concepto existe en catalán (`-ca-`) y castellano (`-es-`), y en dos formatos:

- `-feed` (1080×1350, 4:5): feed de Instagram y Facebook. Es el formato que más ocupa en el móvil.
- `-story` (1080×1920, 9:16): stories y reels. Las franjas de arriba y abajo llevan solo el patrón, porque Instagram las tapa con su interfaz.

Al crear el anuncio, sube el `-feed` y el `-story` del mismo concepto: Meta usa cada uno donde toca.

## Campaña nueva: clic a WhatsApp (noviembre 2026)

Para los tres conceptos nuevos: `porta`, `veins` y `whatsapp`. La campaña anterior (objetivo Tráfico) trajo visitas muy baratas y ninguna venta; esta lleva directamente a un chat contigo.

- **Objetivo**: Interacción → **Mensajes** → WhatsApp, con el número 649 90 79 12 (tiene que estar conectado a la página de Facebook de Molla, como cuenta de WhatsApp Business).
- **Mensaje de bienvenida** (lo que el cliente ve ya escrito al abrir el chat):
  - CA: «Hola! Vull pa per a aquesta setmana. Quins dies el porteu?»
  - ES: «¡Hola! Quiero pan para esta semana. ¿Qué días lo traéis?»
- **Público**: «personas que viven en», radio de 2–3 km alrededor de cada municipio de reparto (Sant Boi de Llobregat, Sant Just Desvern, Sant Joan Despí, Sant Feliu de Llobregat, Santa Coloma de Cervelló y Sant Vicenç dels Horts). Edad 28–65. Sin intereses. Sin Barcelona.
- **Ubicaciones**: solo Instagram y Facebook (feed, stories, reels). Sin Audience Network ni Messenger.
- **Presupuesto**: 5 € al día durante 7 días (≈35 €).
- **Un conjunto de anuncios** con los tres conceptos; en cada anuncio, catalán como idioma principal y castellano como segundo. Sube el `-feed` y el `-story` de cada concepto.
- **Botón**: «Enviar mensaje de WhatsApp».
- **Al acabar la semana**: si han salido 2 o 3 pedidos de los chats, sigue y renueva un creativo cada semana. Si no ha salido ninguno, pausa.

### Textos de la campaña de WhatsApp

**Catalán**

- **porta** · Pa artesà acabat de fer, a la porta de casa. El faig aquell mateix matí i te’l porto dimecres o dissabte de 12 a 14 h a Sant Boi, Sant Just Desvern, Sant Joan Despí, Sant Feliu, Santa Coloma i Sant Vicenç. 5 € el pa, enviament gratuït i pagues en rebre’l. Escriu-me i t’ho aparto.
  Títol: Pa acabat de fer, a casa teva
- **veins** · 5/5 a Google. «Crujiente por fuera y una buena molla por dentro», diu el David a la seva ressenya. Fermentació lenta, farina ecològica i fet a mà a Sant Boi. Te’l porto a casa dimecres o dissabte. Escriu-me per WhatsApp i reserva el teu.
  Títol: Ho diuen els veïns
- **whatsapp** · Sense webs ni formularis: escriu-me què vols i quin dia, i te’l porto a casa. Pa, croissants i pains au chocolat, dimecres o dissabte de 12 a 14 h. Pagues en rebre’l.
  Títol: Escriu-me. Te’l porto.

**Castellano**

- **porta** · Pan artesano recién hecho, en tu puerta. Lo horneo esa misma mañana y te lo llevo el miércoles o el sábado de 12 a 14 h a Sant Boi, Sant Just Desvern, Sant Joan Despí, Sant Feliu, Santa Coloma y Sant Vicenç. 5 € la hogaza, envío gratis y pagas al recibirlo. Escríbeme y te la guardo.
  Título: Pan recién hecho, en tu casa
- **veins** · 5/5 en Google. «Crujiente por fuera y una buena molla por dentro», dice David. Fermentación lenta, harina ecológica y hecho a mano en Sant Boi. Te lo llevo a casa el miércoles o el sábado. Escríbeme por WhatsApp y reserva el tuyo.
  Título: Lo dicen los vecinos
- **whatsapp** · Sin webs ni formularios: escríbeme qué quieres y qué día, y te lo llevo a casa. Pan, croissants y pains au chocolat, el miércoles o el sábado de 12 a 14 h. Pagas al recibirlo.
  Título: Escríbeme. Te lo llevo.

## Configuración de la campaña anterior (Tráfico, octubre 2026)

- **Objetivo**: Tráfico. Destino: sitio web.
- **Público**: ubicación «personas que viven en», radio de 3 km alrededor de Sant Boi de Llobregat, Sant Just Desvern, Sant Joan Despí, Sant Feliu de Llobregat, Santa Coloma de Cervelló y Sant Vicenç dels Horts. Edad 28–65. Sin intereses.
- **Ubicaciones**: manuales. Solo Instagram (feed, stories, reels, explorar) y Facebook (feed, stories, reels). Quita Audience Network y Messenger: dan clics accidentales que no acaban en pedidos.
- **Presupuesto**: **2,50 € al día** (unos 17 € a la semana, 75 € al mes), sin fecha de fin.
- **Un solo conjunto de anuncios** para los dos idiomas: con poco presupuesto, dividirlo deja cada parte sin datos para aprender. En cada anuncio, «Añadir idiomas» → catalán como principal y castellano como segundo, con su texto y su enlace: Meta enseña a cada persona su versión.
- **Tres conceptos para empezar**: `obrador` (la cara de quien hornea), `encarrec` (precio y cómo funciona) y `carta` (bollería y precios). `hores` y `facil` quedan de reserva para sustituir al que peor vaya.
- **Botón**: «Más información».

## Enlaces (con la etiqueta para medir)

- Catalán: `https://www.mollapa.com/pa-a-domicili?utm_source=ads&utm_medium=meta&utm_campaign=local-ca`
- Castellano: `https://www.mollapa.com/es/pan-a-domicilio?utm_source=ads&utm_medium=meta&utm_campaign=local-es`

## Textos

### Catalán

**encarrec** · Pa de poolish fet a mà, amb farina ecològica i fins a 35 hores de fermentació. Te’l porto a casa dimecres i dissabte de 12 a 14 h a Sant Boi, Sant Just Desvern, Sant Joan Despí, Sant Feliu de Llobregat, Santa Coloma de Cervelló i Sant Vicenç dels Horts. 5 € la fogassa, sense cost d’enviament, i pagues en rebre’l.
Títol: Pa per encàrrec, a la teva porta · Descripció: Tanca dilluns i dijous a les 20 h

**facil** · Reserves al web en un minut, sense targeta ni compte. Te’l porto a casa dimecres o dissabte i pagues quan el reps.
Títol: Així de fàcil · Descripció: Entrega gratuïta

**hores** · Només fornejo el que es reserva: per això cada fogassa té el temps que necessita. Crosta que cruix, molla oberta i un gust que dura dies.
Títol: 35 hores de fermentació. Es nota. · Descripció: Pagues en rebre’l

**obrador** · Soc un obrador petit de Sant Boi. Pasto, formo i fornejo cada fogassa a mà, i te la porto a casa dimecres i dissabte a Sant Boi, Sant Just, Sant Joan Despí, Sant Feliu, Santa Coloma i Sant Vicenç.
Títol: Fet per algú del barri · Descripció: Pa, banana bread i brioixeria

**carta** · Pa de poolish 5 €, croissant 2,20 €, pain au chocolat 2,50 € i banana bread de xocolata. Ho reserves al web i t’ho porto a casa, sense cost d’enviament.
Títol: La carta de Molla · Descripció: Entrega dimecres i dissabte

### Castellano

**encarrec** · Pan de poolish hecho a mano, con harina ecológica y hasta 35 horas de fermentación. Te lo llevo a casa el miércoles y el sábado de 12 a 14 h en Sant Boi, Sant Just Desvern, Sant Joan Despí, Sant Feliu de Llobregat, Santa Coloma de Cervelló y Sant Vicenç dels Horts. 5 € la hogaza, sin coste de envío, y pagas al recibirlo.
Título: Pan por encargo, en tu puerta · Descripción: Cierra lunes y jueves a las 20 h

**facil** · Reservas en la web en un minuto, sin tarjeta ni cuenta. Te lo llevo a casa el miércoles o el sábado y pagas al recibirlo.
Título: Así de fácil · Descripción: Entrega gratis

**hores** · Solo horneo lo que se reserva: por eso cada hogaza tiene el tiempo que necesita. Corteza que cruje, miga abierta y un sabor que dura días.
Título: 35 horas de fermentación. Se nota. · Descripción: Pagas al recibirlo

**obrador** · Soy un obrador pequeño de Sant Boi. Amaso, formo y horneo cada hogaza a mano, y te la llevo a casa el miércoles y el sábado en Sant Boi, Sant Just, Sant Joan Despí, Sant Feliu, Santa Coloma y Sant Vicenç.
Título: Hecho por alguien del barrio · Descripción: Pan, banana bread y bollería

**carta** · Pan de poolish 5 €, croissant 2,20 €, pain au chocolat 2,50 € y banana bread de chocolate. Lo reservas en la web y te lo llevo a casa, sin coste de envío.
Título: La carta de Molla · Descripción: Entrega miércoles y sábado

## Regla de decisión (cada domingo, con el resumen semanal)

En el resumen, fila `ads` de «Por canal»:

- Mide a las **4 semanas** (con 2,50 €/día llegan datos más despacio). La referencia es **1 pedido o 3 altas de aviso por cada 10 €** gastados: unos 7 pedidos o 20 altas al mes. Si no llegas ni a la mitad, cambia el peor concepto por uno de reserva; si a las 4 semanas siguientes sigue igual, apaga la campaña.
- Si funciona: sube el presupuesto un 50% y vuelve a medir 2 semanas.
- En Meta (Administrador de anuncios → Desglose por anuncio) verás qué concepto gana: deja ese y prueba otro nuevo en lugar del peor.
