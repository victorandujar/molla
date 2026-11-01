import sharp from 'sharp';
// Combina Molla photos, one per pairing, each showing exactly its pieces.
// El desayuno and Para compartir are the photos the baker supplied on
// 1 Nov 2026; El capricho is still the scene composed with an image model
// (Nano Banana Pro) from the real photos. The sources live in assets/combos/;
// here they are only cropped to 5:4 and published in the same widths and
// formats as the other photos.
const W = 1600;
const H = 1280; // 5:4
// The desayuno source is portrait: keep the 5:4 band holding both the loaf
// and the croissant (its top edge as a fraction of the height).
const bandTop = { desayuno: 0.263 };

for (const name of ['desayuno', 'capricho', 'compartir']) {
  let source = sharp(`assets/combos/${name}.webp`);
  if (bandTop[name] !== undefined) {
    const { width, height } = await source.metadata();
    const band = Math.round((width * H) / W);
    const top = Math.min(height - band, Math.round(height * bandTop[name]));
    source = sharp(
      await source.extract({ left: 0, top, width, height: band }).toBuffer(),
    );
  }
  const canvas = await source.resize(W, H, { fit: 'cover' }).png().toBuffer();
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
