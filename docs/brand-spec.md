# Molla — identidad de trabajo

Molla es un nombre provisional centralizado en `src/lib/config.ts`. Voz directa, cercana y sobria, siempre en primera persona. La promesa es pan por encargo hecho cerca, con una cita semanal. No se atribuye al negocio una historia, una clientela o un local que no existen.

Dirección visual (octubre 2026, revisada con el flyer y los reels): la web se viste como el flyer «Pa per encàrrec» y el «Diari de l’obrador» de Instagram. Azul cobalto `#2442a4` a sangre, papel crema `#f6efe5`, naranja `#fe7b29` para el precio, los números y lo que tiene que saltar, y un negro de obrador `#141519` para las piezas tipo reel. Archivo variable muy estrecha en mayúsculas para gritar («FET A MÀ.», «AIXÍ DE FÀCIL.») y muy ancha para el titular y el producto; Instrument Serif en cursiva para la palabra que respira; Space Mono para las cabeceras con regla, los pies «(Fig. 1)» y los botones. Bricolage solo para «molla.». Esquinas rectas, reglas finas y precios en contorno. El naranja sobre crema no tiene contraste: ahí solo decora.

Experiencia (noviembre 2026), «Fermenta mientras bajas»: la web se comporta como el pan. La portada es la miga del packaging, viva: se abre alvéolo a alvéolo desde el remolino, respira y se abre donde la tocas; al bajar, los alvéolos crecen hasta que gana el papel. Las 35 horas caben en una pantalla: la masa sube en un molde y se llena de alvéolos, se puede arrastrar el tiempo y una barra la compara con un pan hecho deprisa. Un cuchillo parte en dos «OBRE’L» y deja ver la miga real. La carta es un mostrador: un pan cada vez sobre su tabla redonda, que gira con el scroll; en el móvil se desliza con el dedo. La reserva empieza con una frase a Víctor que se escribe sola con lo que eliges. Código en `src/lib/experience.ts` y `src/styles/experience.css`.

Movimiento: entre páginas, la nueva sube como una lámina (View Transitions); las reglas se trazan al entrar y las fotos se abren como persianas; el diario se fija y pasa de lado como un reel. Todo se apaga con «reducir movimiento»: la miga queda quieta, la masa a 35 h, el pan abierto y el mostrador se desliza a mano.

El patrón de miga del packaging (`assets/brand/pattern.png`, vectorizado con `npm run brand:crumb`) abre la portada (viva) y cierra el pie, como el papel que envuelve el pan, con «molla.» de etiqueta. Entre medias solo vuelve dentro del molde de las 35 horas.

La fotografía manda: la luz, el azulejo, las manos y el entorno doméstico permanecen visibles. No hay filtros, imágenes generadas ni banco de imágenes. No se presentan panes especiales sin receta confirmada. La selección completa está en `fotografia.md`.

## Nombres alternativos — pendientes de comprobar disponibilidad

- **Tanda**: funciona para las hornadas de hoy y las rondas de café de mañana.
- **Replà**: el rellano como lugar de encuentro cercano; una raíz catalana natural.
- **Tros**: un trozo de pan, un pequeño espacio, algo sencillo que compartir.
- **Lleva**: conecta con la fermentación y con llevarte algo hecho aquí.
- **A Mig Camí**: propone una parada del barrio que puede crecer hacia pan y café.
