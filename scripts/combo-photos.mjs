import sharp from 'sharp';
// Combina Molla photos. El desayuno and El capricho are single scenes composed
// with an image model (Nano Banana Pro, via Figma Weave) from the real photos
// of the loaf and the pastries; their sources live in assets/combos/ and are
// only cropped to 5:4 here. Para compartir is still two real photos side by
// side, on the paper of the flyer: only crops and a gutter. Its sources are
// the largest published variants, so `npm run photos` comes first.
const W = 1600;
const H = 1280; // 5:4
const GUTTER = 14;
const paper = { r: 246, g: 239, b: 229 };
const source = (name) => `public/images/${name}-1600.webp`;

// Fill w × h from the photo, centred on (cx, cy) as fractions of the spare
// width and height; zoom > 1 crops tighter.
async function panel({ name, cx = 0.5, cy = 0.5, zoom = 1 }, w, h) {
  const image = sharp(source(name));
  const { width, height } = await image.metadata();
  const scale = Math.max(w / width, h / height) * zoom;
  const rw = Math.round(width * scale);
  const rh = Math.round(height * scale);
  return image
    .resize(rw, rh)
    .extract({
      left: Math.round((rw - w) * cx),
      top: Math.round((rh - h) * cy),
      width: w,
      height: h,
    })
    .toBuffer();
}

const combos = {
  // 2 hogazas + 2 croissants: the loaves get the wider panel.
  compartir: {
    split: 0.6,
    left: { name: 'kitchen', cy: 0.6 },
    right: { name: 'croissant', cy: 0.55 },
  },
};

async function publish(name, canvas) {
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

for (const name of ['desayuno', 'capricho'])
  await publish(
    name,
    await sharp(`assets/combos/${name}.webp`)
      .resize(W, H, { fit: 'cover' })
      .png()
      .toBuffer(),
  );

for (const [name, c] of Object.entries(combos)) {
  const wl = Math.round((W - GUTTER) * c.split);
  const wr = W - wl - GUTTER;
  const canvas = await sharp({
    create: { width: W, height: H, channels: 3, background: paper },
  })
    .composite([
      { input: await panel(c.left, wl, H), left: 0, top: 0 },
      { input: await panel(c.right, wr, H), left: wl + GUTTER, top: 0 },
    ])
    .png()
    .toBuffer();
  await publish(name, canvas);
}
console.log('Combinaciones preparadas.');
