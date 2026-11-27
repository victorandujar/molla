// Hoja de amasado en la terminal, sin enviar nada.
//   npm run amasado -- --panes "clasica=3 integral=1 masa-madre=4"
//     calcula a partir de las cantidades que le des (sin base de datos)
//   npm run amasado:prod -- hornada-045
//     la hoja de esa hornada con sus pedidos reales (solo lectura)
//   Añade --html=ruta.html para guardar el email tal y como llegará.
import { writeFile } from 'node:fs/promises';
import { productById } from '../src/lib/config';
import { computeSheet, settingsFromEnv } from '../src/lib/recipes';
import { sheetEmail } from '../src/lib/amasado-email';

const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.findIndex(
    (a) => a === `--${name}` || a.startsWith(`--${name}=`),
  );
  if (i < 0) return undefined;
  const a = args[i]!;
  return a.includes('=') ? a.slice(a.indexOf('=') + 1) : args[i + 1];
};
const panes = flag('panes');
const htmlPath = flag('html');
let email: ReturnType<typeof sheetEmail>;
if (panes) {
  const counts: Record<string, number> = {};
  for (const pair of panes.split(/[\s,]+/).filter(Boolean)) {
    const [id, n] = pair.split('=');
    const qty = Number(n);
    if (!id || !Number.isInteger(qty) || qty < 0)
      throw new Error(
        `No entiendo "${pair}". Usa producto=cantidad, p. ej. clasica=3.`,
      );
    counts[id] = (counts[id] || 0) + qty;
  }
  const names = Object.fromEntries(
    Object.keys(counts).map((id) => [id, productById(id)?.name || id]),
  );
  const { settings, warnings } = settingsFromEnv(process.env);
  const sheet = computeSheet(counts, names, settings, warnings);
  const today = new Date().toISOString().slice(0, 10);
  email = sheetEmail(sheet, {
    bakeNumber: '(prueba)',
    kneadDate: today,
    bakeDate: today,
    doubtful: [],
  });
} else {
  const id = args.find((a) => !a.startsWith('--'));
  if (!id)
    throw new Error(
      'Indica una hornada (npm run amasado:prod -- hornada-045) o --panes "clasica=3 integral=1".',
    );
  if (!process.env.DATABASE_URL) throw new Error('Configura DATABASE_URL.');
  console.log(`Base de datos: ${new URL(process.env.DATABASE_URL).host}`);
  const { bakeById, buildSheet, production } =
    await import('../src/lib/amasado');
  const { sql } = await import('../src/lib/store');
  try {
    const bake = await bakeById(id);
    if (!bake) throw new Error(`No existe la hornada ${id}.`);
    email = buildSheet(await production(bake)).email;
  } finally {
    await sql?.end();
  }
}
console.log(`Asunto: ${email.subject}\n\n${email.text}`);
if (htmlPath) {
  await writeFile(htmlPath, email.html);
  console.log(`\nHTML guardado en ${htmlPath}`);
}
