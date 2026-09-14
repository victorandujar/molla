import postgres from 'postgres';
const { bake, products } = await import('../src/lib/config');
if (!process.env.DATABASE_URL_UNPOOLED)
  throw new Error('Configura DATABASE_URL_UNPOOLED.');
console.log(`Base de datos: ${new URL(process.env.DATABASE_URL_UNPOOLED).host}`);
const sql = postgres(process.env.DATABASE_URL_UNPOOLED, { max: 1 });
try {
  await sql.begin(async (tx) => {
    await tx`INSERT INTO bakes(id,number,pickup_date,deadline,opens_at,capacity,status) VALUES(${bake.id},${bake.number},${bake.pickupDate},${bake.deadline},${bake.opensAt},${bake.capacity},${bake.status}) ON CONFLICT(id) DO NOTHING`;
    for (const p of products.filter((p) => p.available))
      await tx`INSERT INTO products(id,name,price) VALUES(${p.id},${p.name},${p.price}) ON CONFLICT(id) DO NOTHING`;
  });
  console.log(
    'Hornada y producto preparados. Los registros existentes no se han modificado.',
  );
} finally {
  await sql.end();
}
