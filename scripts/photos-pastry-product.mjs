// Fotos de producto de la bollería: el croissant y el pain au chocolat,
// recortados de la foto de los dos sobre la tabla (26 nov 2026) y puestos
// sobre el beige mineral de las fotos de los panes, con su sombra suave.
// Los compuestos están en assets/pastry/; aquí solo se publican en los
// anchos y formatos de las demás fotos.
// Uso: node scripts/photos-pastry-product.mjs
import sharp from 'sharp';
import { rm } from 'node:fs/promises';
for (const name of ['croissant', 'pain-au-chocolat']) {
  for (const width of [400, 720, 1100]) {
    const img = sharp(`assets/pastry/${name}.webp`).resize(width, width);
    await img
      .clone()
      .webp({ quality: 80 })
      .toFile(`public/images/${name}-${width}.webp`);
    await img
      .clone()
      .avif({ quality: 55, effort: 4 })
      .toFile(`public/images/${name}-${width}.avif`);
  }
  // La foto antigua del croissant tenía un ancho más que ya no se usa.
  for (const ext of ['webp', 'avif'])
    await rm(`public/images/${name}-1600.${ext}`, { force: true });
}
console.log('Fotos de producto de la bollería generadas.');
