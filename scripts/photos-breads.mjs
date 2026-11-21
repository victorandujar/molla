// Fotos de cada pan de la carta: masa madre (miga y hogaza), integral (miga)
// y los panes con relleno y el pan de leche (miga).
// Uso: node scripts/photos-breads.mjs <carpeta con los originales>
// Los originales que no estén en la carpeta se saltan.
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
const full = { left: 0, top: 0, width: 1600, height: 1600 };
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
  kalamata: { file: 'kalamata-crumb.jpg', crop: full },
  nueces: { file: 'nueces-crumb.jpg', crop: full },
  'nueces-naranja': { file: 'nueces-naranja-crumb.jpg', crop: full },
  chocolate: { file: 'chocolate-crumb.jpg', crop: full },
  'pasas-pistachos': { file: 'pasas-pistachos-crumb.jpg', crop: full },
  'pan-de-leche': { file: 'pan-de-leche-crumb.jpg', crop: full },
};
await mkdir('public/images', { recursive: true });
for (const [name, { file, crop }] of Object.entries(photos)) {
  if (!existsSync(`${dir}/${file}`)) {
    console.log(`Sin original, se salta: ${file}`);
    continue;
  }
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
}
