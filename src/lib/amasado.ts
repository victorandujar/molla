// Hoja de amasado: qué hornada toca, sus pedidos y el envío por email.
//
// Cada hornada cierra sus pedidos a las 20:00 dos días antes de la entrega
// (lunes para el miércoles, jueves para el sábado; martes en las semanas de
// Navidad). Se amasa el día antes de la entrega. El email sale la noche del
// cierre, después de las 20:00, con los pedidos de esa hornada ya cerrados.
import { brand, productById } from './config';
import { orderItems } from './domain';
import { demo, listBakes, sql, useDemo } from './store';
import { emailEnabled, sendFunnel } from './email';
import { computeSheet, settingsFromEnv, type Sheet } from './recipes';
import { sheetEmail, type Doubtful, type SheetMeta } from './amasado-email';

const TZ = 'Europe/Madrid';
export function madridClock(at: Date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      weekday: 'short',
      hourCycle: 'h23',
    })
      .formatToParts(at)
      .map((p) => [p.type, p.value]),
  );
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
    weekday: weekdays.indexOf(parts.weekday!),
  };
}
export const addDays = (date: string, days: number) =>
  new Date(Date.parse(`${date}T12:00:00Z`) + days * 86400000)
    .toISOString()
    .slice(0, 10);

// AMASADO_DIAS: días en que puede salir el email de la noche (los del
// cierre), p. ej. "lunes,jueves". Vacío: cualquier noche en que cierre una
// hornada, que sigue también los cambios de Navidad.
const dayNames = [
  'domingo',
  'lunes',
  'martes',
  'miercoles',
  'jueves',
  'viernes',
  'sabado',
];
export function sendDays(value = process.env.AMASADO_DIAS) {
  if (!value?.trim()) return null;
  const days = value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[\s,]+/)
    .filter(Boolean)
    .map((d) => dayNames.findIndex((n) => n.startsWith(d.slice(0, 2))))
    .filter((d) => d >= 0);
  return days.length ? days : null;
}

// Nunca antes de las 20:00 (el cierre); como tarde, a las 23:59.
export const EVENING_FROM = '20:00';
// Copia de la mañana (opcional): entre las 7:00 y las 9:59.
export const MORNING_FROM = '07:00';
export const MORNING_UNTIL = '10:00';
export const morningCopyEnabled = () =>
  process.env.AMASADO_COPIA_MANANA === 'true';
export const sheetRecipient = () =>
  (process.env.AMASADO_EMAIL || brand.contact || '').trim();

export type BakeRow = {
  id: string;
  number: string;
  pickupDate: string;
  deadline: string;
};
export type Production = {
  bake: BakeRow;
  counts: Record<string, number>;
  names: Record<string, string>;
  doubtful: Doubtful[];
};

const toBakeRow = (r: Record<string, unknown>): BakeRow => ({
  id: String(r.id),
  number: String(r.number),
  pickupDate: new Date(r.pickup_date as string).toISOString(),
  deadline: new Date(r.deadline as string).toISOString(),
});

// Hornadas cuyo cierre ya ha pasado y cae en `day` (Madrid).
export async function bakesClosedOn(
  day: string,
  now: Date,
): Promise<BakeRow[]> {
  if (useDemo()) return [];
  const rows = await sql!`
    SELECT id, number, pickup_date, deadline FROM bakes
    WHERE status != 'COMPLETED' AND deadline <= ${now.toISOString()}
      AND to_char(deadline AT TIME ZONE ${TZ}, 'YYYY-MM-DD') = ${day}
    ORDER BY pickup_date`;
  return rows.map(toBakeRow);
}
// Hornadas que se amasan `day`: las que se entregan el día siguiente.
export async function bakesKneadedOn(day: string): Promise<BakeRow[]> {
  if (useDemo()) return [];
  const rows = await sql!`
    SELECT id, number, pickup_date, deadline FROM bakes
    WHERE status != 'COMPLETED'
      AND to_char(pickup_date AT TIME ZONE ${TZ}, 'YYYY-MM-DD') = ${addDays(day, 1)}
    ORDER BY pickup_date`;
  return rows.map(toBakeRow);
}
export async function bakeById(id: string): Promise<BakeRow | null> {
  if (useDemo()) {
    const b = (await listBakes()).find((b) => b.id === id);
    return b
      ? {
          id: b.id,
          number: b.number,
          pickupDate: b.pickupDate,
          deadline: b.deadline,
        }
      : null;
  }
  const [row] =
    await sql!`SELECT id, number, pickup_date, deadline FROM bakes WHERE id=${id}`;
  return row ? toBakeRow(row) : null;
}

const nameOf = (product: string, fallback?: string) =>
  productById(product)?.name || fallback || product;

// Pedidos no cancelados de la hornada, sumados por producto. Un pedido sin
// líneas o apuntado después del cierre no se suma: va a «pedidos dudosos».
export async function production(bake: BakeRow): Promise<Production> {
  type Row = {
    id: string;
    code: string;
    createdAt: string;
    items: { product: string; name: string; quantity: number }[];
  };
  let orders: Row[];
  if (useDemo())
    orders = await demo((d) =>
      d.orders
        .filter((o) => o.bakeId === bake.id && o.status !== 'CANCELLED')
        .map((o) => ({
          id: o.id,
          code: o.code,
          createdAt: o.createdAt,
          items: orderItems(o).map((i) => ({
            product: i.product,
            name: i.name,
            quantity: i.quantity,
          })),
        })),
    );
  else {
    const rows = await sql!`
      SELECT o.id, o.code, o.created_at, i.product_id, i.quantity, p.name
      FROM orders o
      LEFT JOIN order_items i ON i.order_id = o.id
      LEFT JOIN products p ON p.id = i.product_id
      WHERE o.bake_id = ${bake.id} AND o.status != 'CANCELLED'
      ORDER BY o.created_at, i.product_id`;
    const byId = new Map<string, Row>();
    for (const r of rows) {
      const id = String(r.id);
      if (!byId.has(id))
        byId.set(id, {
          id,
          code: String(r.code || id.slice(0, 8)),
          createdAt: new Date(r.created_at).toISOString(),
          items: [],
        });
      if (r.product_id)
        byId.get(id)!.items.push({
          product: String(r.product_id),
          name: String(r.name || r.product_id),
          quantity: Number(r.quantity),
        });
    }
    orders = [...byId.values()];
  }
  const counts: Record<string, number> = {};
  const names: Record<string, string> = {};
  const doubtful: Doubtful[] = [];
  for (const o of orders) {
    const items = o.items
      .map((i) => `${i.quantity} × ${nameOf(i.product, i.name)}`)
      .join(', ');
    if (!o.items.length) {
      doubtful.push({
        code: o.code,
        reason: 'Pedido sin productos',
        items: '—',
      });
      continue;
    }
    if (Date.parse(o.createdAt) > Date.parse(bake.deadline)) {
      doubtful.push({
        code: o.code,
        reason: 'Apuntado después del cierre de la hornada',
        items,
      });
      continue;
    }
    for (const i of o.items) {
      if (!(i.quantity > 0)) continue;
      counts[i.product] = (counts[i.product] || 0) + i.quantity;
      names[i.product] = nameOf(i.product, i.name);
    }
  }
  return { bake, counts, names, doubtful };
}

export function buildSheet(p: Production, changes?: string[]) {
  const { settings, warnings } = settingsFromEnv(process.env);
  const sheet: Sheet = computeSheet(p.counts, p.names, settings, warnings);
  const bakeDate = madridClock(new Date(p.bake.pickupDate)).date;
  const meta: SheetMeta = {
    bakeNumber: p.bake.number,
    bakeDate,
    kneadDate: addDays(bakeDate, -1),
    doubtful: p.doubtful,
    changes,
  };
  return { sheet, meta, email: sheetEmail(sheet, meta) };
}

// Qué ha cambiado entre la hoja de anoche y la de ahora.
export function countChanges(
  before: Record<string, number>,
  after: Record<string, number>,
  names: Record<string, string>,
) {
  const changes: string[] = [];
  for (const id of new Set([...Object.keys(before), ...Object.keys(after)])) {
    const a = before[id] || 0;
    const b = after[id] || 0;
    if (a !== b)
      changes.push(
        `${names[id] || nameOf(id)}: ${a} → ${b} (${b > a ? '+' : ''}${b - a})`,
      );
  }
  return changes;
}

// ---- Registro de envíos ------------------------------------------------------

type Kind = 'evening' | 'morning';
// true si esta ejecución se queda con el envío (nadie lo ha hecho antes).
async function claim(
  bakeId: string,
  kind: Kind,
  counts: Record<string, number>,
) {
  const rows = await sql!`
    INSERT INTO production_sheets (bake_id, kind, counts)
    VALUES (${bakeId}, ${kind}, ${sql!.json(counts)})
    ON CONFLICT DO NOTHING RETURNING bake_id`;
  return rows.length > 0;
}
const release = (bakeId: string, kind: Kind) =>
  sql!`DELETE FROM production_sheets WHERE bake_id=${bakeId} AND kind=${kind}`;
async function sentCounts(bakeId: string, kind: Kind) {
  const [row] =
    await sql!`SELECT counts FROM production_sheets WHERE bake_id=${bakeId} AND kind=${kind}`;
  return row ? (row.counts as Record<string, number>) : null;
}

export async function sendSheet(
  to: string,
  email: { subject: string; text: string; html: string },
  key: string,
) {
  return sendFunnel(to, email, key);
}

// La llaman los crons de la noche (después del cierre) y de la mañana.
// Repetirla no duplica nada: cada hoja se registra antes de enviarse y se
// libera si el proveedor la rechaza.
export async function runAmasadoJob(now = new Date()) {
  const result = {
    evening: [] as string[],
    morning: [] as string[],
    failed: [] as string[],
    skipped: '' as string,
  };
  const to = sheetRecipient();
  if (useDemo() || !emailEnabled() || !to) {
    result.skipped = !to ? 'sin destinatario' : 'email desactivado';
    return result;
  }
  const clock = madridClock(now);
  const days = sendDays();
  if (clock.time >= EVENING_FROM && (!days || days.includes(clock.weekday))) {
    for (const bake of await bakesClosedOn(clock.date, now)) {
      const p = await production(bake);
      if (!(await claim(bake.id, 'evening', p.counts))) continue;
      const { email } = buildSheet(p);
      if (await sendSheet(to, email, `amasado-${bake.id}-noche`))
        result.evening.push(bake.id);
      else {
        await release(bake.id, 'evening');
        result.failed.push(bake.id);
      }
    }
  }
  if (
    morningCopyEnabled() &&
    clock.time >= MORNING_FROM &&
    clock.time < MORNING_UNTIL
  ) {
    for (const bake of await bakesKneadedOn(clock.date)) {
      const before = await sentCounts(bake.id, 'evening');
      if (!before) continue;
      const p = await production(bake);
      const changes = countChanges(before, p.counts, p.names);
      if (!changes.length) continue;
      if (!(await claim(bake.id, 'morning', p.counts))) continue;
      const { email } = buildSheet(p, changes);
      if (await sendSheet(to, email, `amasado-${bake.id}-manana`))
        result.morning.push(bake.id);
      else {
        await release(bake.id, 'morning');
        result.failed.push(bake.id);
      }
    }
  }
  return result;
}
