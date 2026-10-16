// Turns the packaging print (assets/brand/pattern.png) into an SVG where each
// alveolus of the crumb is its own path. The web animates them one by one, so
// the crumb "opens" like a dough that ferments.
//   node scripts/crumb-svg.mjs
import sharp from 'sharp';
import potrace from 'potrace';
import { writeFile, mkdir } from 'node:fs/promises';
import { promisify } from 'node:util';

const src = 'assets/brand/pattern.png';
// Inner field of the print, without the printed border and its lettering.
const field = { left: 64, top: 58, width: 1408, height: 908 };
const width = 1408;

const { data, info } = await sharp(src)
  .extract(field)
  .resize(width)
  .greyscale()
  .raw()
  .toBuffer({ resolveWithObject: true });

// Holes are the light paper: trace them as the "dark" shapes by inverting.
const inverted = Buffer.from(data.map((v) => 255 - v));
const png = await sharp(inverted, {
  raw: { width: info.width, height: info.height, channels: 1 },
})
  .png()
  .toBuffer();

const trace = promisify(potrace.trace);
const svg = await trace(png, {
  threshold: 150,
  turdSize: 40,
  optTolerance: 0.6,
  alphaMax: 1.1,
  color: '#000',
});
// potrace returns a single compound path: split it into its subpaths, one
// closed contour each, and keep them with their bounding-box centre.
const d = /<path[^>]* d="([^"]+)"/.exec(svg)[1];
const parts = d
  .split(/(?=M)/)
  .map((p) => p.trim())
  .filter(Boolean);
const round = (s) => s.replace(/-?\d+\.\d+/g, (n) => String(Math.round(+n)));
const holes = parts
  .map((p) => {
    const nums = p.match(/-?\d+(\.\d+)?/g).map(Number);
    const xs = nums.filter((_, i) => i % 2 === 0);
    const ys = nums.filter((_, i) => i % 2 === 1);
    const [x0, x1, y0, y1] = [
      Math.min(...xs),
      Math.max(...xs),
      Math.min(...ys),
      Math.max(...ys),
    ];
    return {
      d: round(p),
      cx: Math.round((x0 + x1) / 2),
      cy: Math.round((y0 + y1) / 2),
      area: (x1 - x0) * (y1 - y0),
    };
  })
  // Drop contours touching the whole frame (the outer edge) and specks.
  .filter((h) => h.area > 120 && h.area < info.width * info.height * 0.5);

await mkdir('src/assets', { recursive: true });
await writeFile(
  'src/assets/crumb.json',
  JSON.stringify({ w: info.width, h: info.height, holes }),
);
console.log(
  `${holes.length} alvéolos · ${info.width}×${info.height} · ${(
    JSON.stringify(holes).length / 1024
  ).toFixed(0)} KB`,
);
