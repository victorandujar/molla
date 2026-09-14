import postgres from 'postgres';
import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
if (!process.env.DATABASE_URL_UNPOOLED)
  throw new Error('Configura DATABASE_URL_UNPOOLED para este proyecto.');
console.log(`Base de datos: ${new URL(process.env.DATABASE_URL_UNPOOLED).host}`);
const sql = postgres(process.env.DATABASE_URL_UNPOOLED, { max: 1 });
try {
  await sql`CREATE TABLE IF NOT EXISTS migrations (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())`;
  await sql.begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(734210)`;
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
    }
  });
} finally {
  await sql.end();
}
