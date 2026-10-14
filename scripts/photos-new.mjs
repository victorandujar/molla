// Fotos nuevas (boule, miga, banana bread) y textura de miga en azul.
// Uso: node scripts/photos-new.mjs <carpeta con los originales>
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
const dir = process.argv[2] || 'assets/originals-2';
const photos = {
  boule: '1.webp',
  crumb2: '2.webp',
  banana: '4.jpg',
  bananaDetail: '3.jpg',
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
// Textura: el dibujo de la miga como máscara (alfa = tinta azul), recortado sin el marco de texto.
const crop = { left: 62, top: 58, width: 1412, height: 908 };
for (const width of [768, 1412]) {
  const { data, info } = await sharp(`${dir}/5.webp`)
    .extract(crop)
    .resize({ width })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(info.width * info.height * 4, 255);
  for (let i = 0; i < info.width * info.height; i++)
    out[i * 4 + 3] = Math.min(255, Math.max(0, (255 - data[i * 3]) * 1.15));
  await sharp(out, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .webp({ quality: 80, alphaQuality: 90 })
    .toFile(`public/images/texture-${width}.webp`);
}
