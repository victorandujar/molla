// Fotos de la bollería (croissant y pain au chocolat), con la luz de la tarde.
// Uso: node scripts/photos-pastry.mjs <carpeta con los originales>
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
const dir = process.argv[2] || 'assets/originals-3';
const photos = {
  // Los dos, desde arriba, sobre la tabla.
  pastries: '4.jpg',
  // El croissant de lado, a contraluz, con sus capas.
  croissant: '1.jpg',
};
await mkdir('public/images', { recursive: true });
for (const [name, file] of Object.entries(photos))
  for (const width of [400, 720, 1100, 1600]) {
    const meta = await sharp(`${dir}/${file}`).metadata();
    if (width > meta.width * 1.15) continue;
    const img = sharp(`${dir}/${file}`)
      .rotate()
      .resize({ width, withoutEnlargement: true });
    await img
      .clone()
      .webp({ quality: 80 })
      .toFile(`public/images/${name}-${width}.webp`);
    await img
      .clone()
      .avif({ quality: 55, effort: 4 })
      .toFile(`public/images/${name}-${width}.avif`);
  }
console.log('Fotos de bollería generadas.');
