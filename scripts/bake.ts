import postgres from 'postgres';
import { madridIso, type BakeState } from '../src/lib/domain';
const url = process.env.DATABASE_URL_UNPOOLED;
if (!url) throw new Error('Configura DATABASE_URL_UNPOOLED.');
const [command = 'list', ...rest] = process.argv.slice(2);
const flags = Object.fromEntries(
  rest
    .filter((a) => a.startsWith('--'))
    .map((a) => a.slice(2).split('=') as [string, string?]),
);
const args = rest.filter((a) => !a.startsWith('--'));
const writes = command !== 'list';
console.log(`Base de datos: ${new URL(url).host}`);
if (writes && flags.yes === undefined)
  throw new Error(
    'Este comando modifica la base de datos. Revisa el host y repite con --yes.',
  );
const sql = postgres(url, { max: 1 });
const addDays = (date: string, days: number) =>
  new Date(Date.parse(`${date}T12:00:00Z`) + days * 86400000)
    .toISOString()
    .slice(0, 10);
const fmt = (d: Date) =>
  new Intl.DateTimeFormat('es-ES', {
    timeZone: 'Europe/Madrid',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(d);
try {
  if (command === 'list') {
    const rows =
      await sql`SELECT b.*, COALESCE((SELECT SUM(i.quantity) FROM orders o JOIN order_items i ON i.order_id=o.id WHERE o.bake_id=b.id AND o.status!='CANCELLED'),0)::int AS reserved FROM bakes b ORDER BY pickup_date`;
    for (const b of rows)
      console.log(
        `${b.id} · nº ${b.number} · ${b.status} · ${b.reserved}/${b.capacity} · abre ${fmt(b.opens_at)} · cierra ${fmt(b.deadline)} · recogida ${fmt(b.pickup_date)}`,
      );
    if (!rows.length) console.log('No hay hornadas.');
  } else if (command === 'new') {
    // npm run bake -- new 2026-10-03 --capacity=6 [--pickup-time=12:00]
    // [--deadline=2026-10-01T20:00] [--opens=2026-09-27T00:00] --yes
    const [date] = args;
    if (!date) throw new Error('Indica la fecha de recogida: AAAA-MM-DD.');
    const capacity = Number(flags.capacity);
    if (!Number.isInteger(capacity) || capacity < 1)
      throw new Error('Indica --capacity=N (hogazas).');
    const at = (value: string) => {
      const [d, t] = value.split('T');
      return madridIso(d!, t);
    };
    const pickupDate = madridIso(date, flags['pickup-time'] || '12:00');
    const deadline = flags.deadline
      ? at(flags.deadline)
      : madridIso(addDays(date, -2), '20:00');
    const opensAt = flags.opens ? at(flags.opens) : new Date().toISOString();
    if (!(Date.parse(opensAt) < Date.parse(deadline)))
      throw new Error('La apertura debe ser anterior al cierre.');
    if (!(Date.parse(deadline) <= Date.parse(pickupDate)))
      throw new Error('El cierre debe ser anterior a la recogida.');
    await sql.begin(async (tx) => {
      const [last] =
        await tx`SELECT number FROM bakes ORDER BY number DESC LIMIT 1`;
      const number = String(Number(last?.number || 0) + 1).padStart(3, '0');
      const [clash] =
        await tx`SELECT id FROM bakes WHERE status!='COMPLETED' AND pickup_date::date=${pickupDate}::timestamptz::date`;
      if (clash) throw new Error(`Ya existe una hornada ese día: ${clash.id}`);
      await tx`INSERT INTO bakes(id,number,pickup_date,deadline,opens_at,capacity,status) VALUES(${`hornada-${number}`},${number},${pickupDate},${deadline},${opensAt},${capacity},'OPEN')`;
      console.log(
        `Creada hornada-${number}: recogida ${fmt(new Date(pickupDate))}, cierre ${fmt(new Date(deadline))}, ${capacity} hogazas.`,
      );
    });
  } else if (command === 'status') {
    const [id, status] = args as [string?, BakeState?];
    const allowed = ['UPCOMING', 'OPEN', 'SOLD_OUT', 'CLOSED', 'COMPLETED'];
    if (!id || !status || !allowed.includes(status))
      throw new Error(`Uso: bake -- status ID ${allowed.join('|')} --yes`);
    const rows =
      await sql`UPDATE bakes SET status=${status} WHERE id=${id} RETURNING id`;
    console.log(rows.length ? 'Estado actualizado.' : 'No existe esa hornada.');
  } else if (command === 'capacity') {
    const [id, value] = args;
    const capacity = Number(value);
    if (!id || !Number.isInteger(capacity) || capacity < 1)
      throw new Error('Uso: bake -- capacity ID N --yes');
    await sql.begin(async (tx) => {
      const [b] = await tx`SELECT id FROM bakes WHERE id=${id} FOR UPDATE`;
      if (!b) throw new Error('No existe esa hornada.');
      const [r] =
        await tx`SELECT COALESCE(SUM(i.quantity),0)::int AS n FROM orders o JOIN order_items i ON i.order_id=o.id WHERE o.bake_id=${id} AND o.status!='CANCELLED'`;
      if (capacity < r!.n)
        throw new Error(`Ya hay ${r!.n} hogazas reservadas en ${id}.`);
      await tx`UPDATE bakes SET capacity=${capacity} WHERE id=${id}`;
      console.log('Capacidad actualizada.');
    });
  } else {
    throw new Error('Comandos: list | new | status | capacity');
  }
} finally {
  await sql.end();
}
