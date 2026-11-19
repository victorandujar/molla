import postgres from 'postgres';
import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
// `--vercel` is the build step (`npm run build`): it migrates only on a
// Production deployment, before the new code goes live. A failed migration
// fails the build, so Vercel keeps serving the previous deployment.
// Previews and local builds skip it; `npm run db:migrate` still works by hand.
const vercel = process.argv.includes('--vercel');
if (vercel && process.env.VERCEL_ENV !== 'production') {
  console.log('Migraciones: solo en el despliegue de Production. Omitidas.');
  process.exit(0);
}
const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url)
  throw new Error('Configura DATABASE_URL_UNPOOLED (o DATABASE_URL) para este proyecto.');
console.log(`Base de datos: ${new URL(url).host}${new URL(url).pathname}`);
const sql = postgres(url, {
  max: 1,
  prepare: false,
  connect_timeout: 20,
  onnotice: () => {},
});
try {
  await sql`CREATE TABLE IF NOT EXISTS migrations (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())`;
  await sql.begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(734210)`;
    let applied = 0;
    for (const file of (await readdir('migrations'))
      .filter((f) => f.endsWith('.sql'))
      .sort()) {
      const content = await readFile(`migrations/${file}`, 'utf8');
      const hash = createHash('sha256').update(content).digest('hex');
      const [old] =
        await tx`SELECT checksum FROM migrations WHERE name=${file}`;
      if (old) {
        if (old.checksum !== hash)
          throw new Error(`No edites migraciones aplicadas: ${file}`);
        continue;
      }
      await tx.unsafe(content);
      await tx`INSERT INTO migrations(name,checksum) VALUES(${file},${hash})`;
      console.log(`Aplicada: ${file}`);
      applied++;
    }
    if (!applied) console.log('Migraciones: todo al día.');
  });
} finally {
  await sql.end();
}
