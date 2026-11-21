// Fotos de cada pan de la carta: masa madre (miga y hogaza) e integral (miga).
// Uso: node scripts/photos-breads.mjs <carpeta con los originales>
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
const dir = process.argv[2] || 'assets/originals-breads';
// Recortes sobre el original: la miga ocupa el centro, fuera pared y mesa.
const photos = {
  sourdough: {
    file: 'masa-madre-crumb.jpg',
    crop: { left: 0, top: 0, width: 1600, height: 1600 },
  },
  sourdoughLoaf: {
    file: 'masa-madre-top.webp',
    crop: { left: 0, top: 0, width: 1600, height: 1600 },
  },
  wholegrain: {
    file: 'integral-crumb.jpg',
    crop: { left: 0, top: 0, width: 1600, height: 1600 },
  },
};
await mkdir('public/images', { recursive: true });
for (const [name, { file, crop }] of Object.entries(photos))
  for (const width of [400, 720, 1100, 1600]) {
    if (width > crop.width * 1.15) continue;
    const img = sharp(`${dir}/${file}`)
      .rotate()
      .extract(crop)
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
