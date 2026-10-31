import sharp from 'sharp';
// Combina Molla photos: one scene per pairing, composed with an image model
// (Nano Banana Pro) from the real photos of the loaves and the pastries. The
// sources live in assets/combos/; here they are only cropped to 5:4 and
// published in the same widths and formats as the other photos.
const W = 1600;
const H = 1280; // 5:4

for (const name of ['desayuno', 'capricho', 'compartir']) {
  const canvas = await sharp(`assets/combos/${name}.webp`)
    .resize(W, H, { fit: 'cover' })
    .png()
    .toBuffer();
  for (const width of [400, 720, 1100, 1600]) {
    const out = sharp(canvas).resize(width, Math.round((width * H) / W));
    await out
      .clone()
      .webp({ quality: 78 })
      .toFile(`public/images/combo-${name}-${width}.webp`);
    await out
      .clone()
      .avif({ quality: 53, effort: 4 })
      .toFile(`public/images/combo-${name}-${width}.avif`);
  }
}
console.log('Combinaciones preparadas.');
