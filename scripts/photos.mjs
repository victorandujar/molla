import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
const dir =
  process.argv[2] || 'assets/originals';
const roles = {
  hero: '1000041564',
  crumb: '1000041563',
  loaves: '1000041558',
  maker: '1000041594',
  hands: '1000041588',
  dough: '1000045169',
  person: '1000041581',
};
await mkdir('public/images', { recursive: true });
const ratios = {
  hero: 1,
  crumb: 1,
  loaves: 1.4,
  maker: 0.75,
  hands: 1.333,
  dough: 0.8,
  person: 0.75,
};
for (const [name, id] of Object.entries(roles))
  for (const width of [400, 720, 1100, 1600]) {
    const source = sharp(`${dir}/${id}.jpg`)
      .rotate()
      .resize(width, Math.round(width / ratios[name]), {
        fit: 'cover',
        position: 'centre',
      });
    await source
      .clone()
      .webp({ quality: 78 })
      .toFile(`public/images/${name}-${width}.webp`);
    await source
      .clone()
      .avif({ quality: 53, effort: 4 })
      .toFile(`public/images/${name}-${width}.avif`);
  }
await sharp(`${dir}/${roles.hero}.jpg`)
  .rotate()
  .resize(1200, 630, { fit: 'cover', position: 'center' })
  .jpeg({ quality: 85 })
  .toFile('public/images/social.jpg');
const notes = {
  1000041556: 'Hogazas desde arriba; alternativa para Stories.',
  1000041558: 'Producto: corteza y dos hogazas.',
  1000041563: 'Ficha de producto: miga visible a contraluz.',
  1000041564: 'Hero: hogazas, luz y azul de la cocina.',
  1000041570: 'Retrato cercano oliendo el pan; Stories.',
  1000041571: 'Retrato medio; Instagram persona.',
  1000041578: 'Retrato abierto con cocina; alternativa.',
  1000041581: 'Retrato sonriendo con el pan; contenido de lanzamiento.',
  1000041587: 'Corte en proceso; alternativa vertical.',
  1000041588: 'Manos cortando; sección proceso.',
  1000041594: 'Retrato trabajando en la cocina real; sección autor.',
  1000041600: 'Detalle del corte; Instagram producto.',
  1000041608: 'Rebanadas y miga; detalle editorial.',
  1000045161: 'Masa en fermentación; contenido de proceso.',
  1000045169: 'Bannetons; proceso en la web.',
};
await writeFile(
  'docs/fotografia.md',
  '# Selección de las 15 fotografías\n\n' +
    Object.entries(notes)
      .map(([id, n]) => `- ${id}.jpg: ${n}`)
      .join('\n') +
    '\n\nOriginales conservados sin cambios en la carpeta proporcionada. WebP y AVIF sin filtros, metadatos retirados, tamaños 400/720/1100/1600. No se han usado imágenes generadas ni de stock.\n',
);
console.log('Fotografías preparadas.');
