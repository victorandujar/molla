# Kit de anuncios de Molla

Imágenes en esta carpeta (`npm run ads` las regenera): tres conceptos, en catalán (`-ca-`) y castellano (`-es-`), cada uno en formato cuadrado para el feed (`-feed`, 1080×1080) y vertical para stories y reels (`-story`, 1080×1920). Solo fotos reales.

Sube a un mismo conjunto de anuncios los tres conceptos de un idioma: Meta reparte el presupuesto hacia el que mejor funciona.

## Configuración (Meta Business Suite → Anuncios → Crear)

- **Objetivo**: Tráfico. Destino: sitio web.
- **Público**: ubicación «personas que viven en», radio de 3 km alrededor de Sant Boi de Llobregat, Sant Just Desvern y Santa Coloma de Cervelló. Edad 28–65. Sin intereses.
- **Idiomas**: un conjunto con catalán y otro con castellano (o un solo conjunto con las dos versiones y la opción de idioma de Meta).
- **Presupuesto**: 5 € al día, sin fecha de fin.
- **Ubicaciones**: Advantage+ (automáticas).
- **Botón**: «Más información».

## Enlaces (con la etiqueta para medir)

- Catalán: `https://www.mollapa.com/pa-a-domicili?utm_source=ads&utm_medium=meta&utm_campaign=local-ca`
- Castellano: `https://www.mollapa.com/es/pan-a-domicilio?utm_source=ads&utm_medium=meta&utm_campaign=local-es`

## Textos

### Catalán

**Texto principal (porta)**
Pa de poolish fet a mà, amb farina ecològica i fins a 35 hores de fermentació. Te’l porto a casa dimecres i dissabte de 12 a 14 h a Sant Boi, Sant Just Desvern i Santa Coloma de Cervelló. 5 € la fogassa, sense cost d’enviament, i pagues en rebre’l.
**Títol**: El pa del dissabte, a la teva porta
**Descripció**: Reserva fins dijous a les 20:00

**Texto principal (molla)**
Només fornejo el que es reserva: per això cada fogassa té el temps que necessita. Crosta que cruix, molla oberta i un gust que dura dies. A domicili a Sant Boi, Sant Just i Santa Coloma.
**Títol**: 35 hores de fermentació. Es nota.
**Descripció**: Pagues en rebre’l

**Texto principal (brioixeria)**
Croissants i pains au chocolat de massa laminada amb mantega, fets a mà, amb el pa de la setmana. Ho reserves al web i t’ho porto a casa el dissabte.
**Títol**: Croissants i pa acabats de fer, a casa
**Descripció**: Pa + croissant, 7,20 €

### Castellano

**Texto principal (puerta)**
Pan de poolish hecho a mano, con harina ecológica y hasta 35 horas de fermentación. Te lo llevo a casa el miércoles y el sábado de 12 a 14 h en Sant Boi, Sant Just Desvern y Santa Coloma de Cervelló. 5 € la hogaza, sin coste de envío, y pagas al recibirlo.
**Título**: El pan del sábado, en tu puerta
**Descripción**: Reserva hasta el jueves a las 20:00

**Texto principal (miga)**
Solo horneo lo que se reserva: por eso cada hogaza tiene el tiempo que necesita. Corteza que cruje, miga abierta y un sabor que dura días. A domicilio en Sant Boi, Sant Just y Santa Coloma.
**Título**: 35 horas de fermentación. Se nota.
**Descripción**: Pagas al recibirlo

**Texto principal (bollería)**
Croissants y pains au chocolat de masa laminada con mantequilla, hechos a mano, con el pan de la semana. Lo reservas en la web y te lo llevo a casa el sábado.
**Título**: Croissants y pan recién hechos, en casa
**Descripción**: Pan + croissant, 7,20 €

## Regla de decisión (cada domingo, con el resumen semanal)

En el resumen, fila `ads` de «Por canal»:

- Si en 3 semanas no hay al menos **1 pedido o 3 altas de aviso por cada 10 €** gastados: cambia de imagen una vez; si sigue igual, apaga la campaña.
- Si funciona: sube el presupuesto un 50% y vuelve a medir 2 semanas.
