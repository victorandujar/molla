// Email de la hoja de amasado. Se lee en el orden en que se trabaja: qué te
// han pedido, qué preparas esta noche y, mañana, pan por pan. Las cuentas,
// al final. En castellano; solo para el obrador.
import {
  fillingKeys,
  fmt,
  grams,
  groupCounts,
  ingredientNames,
  loavesIn,
  recipeTitles,
  type Amount,
  type Sheet,
} from './recipes';

export type Doubtful = { code: string; reason: string; items: string };
export type SheetMeta = {
  bakeNumber: string;
  // Fechas de Madrid, AAAA-MM-DD.
  kneadDate: string;
  bakeDate: string;
  doubtful: Doubtful[];
  // Solo en la copia de la mañana: qué ha cambiado desde la noche anterior.
  changes?: string[];
};

// «martes 1 dic»
export const dayName = (date: string) =>
  new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })
    .format(new Date(`${date}T12:00:00Z`))
    .replace(',', '')
    .replace('.', '');
const dayBefore = (date: string) =>
  new Date(Date.parse(`${date}T12:00:00Z`) - 86400000)
    .toISOString()
    .slice(0, 10);

const loaves = (n: number) => `${n} ${n === 1 ? 'pan' : 'panes'}`;

export function sheetSubject(sheet: Sheet, meta: SheetMeta) {
  const g = groupCounts(sheet);
  const parts = [
    g.A ? `${g.A} de cada semana` : '',
    g.B ? `${g.B} integral` : '',
    g.C ? `${g.C} masa madre` : '',
    g.relleno ? `${g.relleno} con relleno` : '',
    g.leche ? `${g.leche} de leche` : '',
  ].filter(Boolean);
  const prefix = [
    sheet.ok ? '' : '⚠ REVISAR · ',
    meta.changes ? 'CAMBIOS · ' : '',
  ].join('');
  return `${prefix}molla. · Amasado ${dayName(meta.kneadDate)} · ${loaves(loavesIn(sheet))}${parts.length ? ` (${parts.join(' · ')})` : ''}`;
}

// ---- Contenido común: bloques con párrafos y tablas ------------------------

type Table = {
  caption?: string;
  head?: string[];
  rows: string[][];
  notes?: string[];
};
type Block = {
  title: string;
  tone?: 'warn' | 'quiet';
  paragraphs: string[];
  tables: Table[];
};

const amountRows = (lines: Amount[]) =>
  lines.map((l) => [l.label, grams(l.total, l.ingredient)]);
const isFilling = (key: string) =>
  (fillingKeys as readonly string[]).includes(key);

function blocks(sheet: Sheet, meta: SheetMeta): Block[] {
  const out: Block[] = [];
  const problems = sheet.warnings.filter((w) => w.startsWith('NO CUADRA'));
  const notices = sheet.warnings.filter((w) => !w.startsWith('NO CUADRA'));
  const perLoaf = (key: string) => {
    const c = sheet.checks.find((c) => c.key === key);
    return c ? ` · ${fmt(Math.round(c.perLoaf))} g de masa por pan` : '';
  };

  if (meta.changes)
    out.push({
      title: 'Ha cambiado desde anoche',
      tone: 'warn',
      paragraphs: [
        ...meta.changes,
        'Las cantidades de abajo ya incluyen el cambio. El poolish y el starter de anoche se hicieron con las cifras anteriores: mira si te llegan.',
      ],
      tables: [],
    });
  if (problems.length)
    out.push({
      title: '⚠ Revisa antes de pesar',
      tone: 'warn',
      paragraphs: problems,
      tables: [],
    });

  // Te han pedido
  out.push({
    title: 'Te han pedido',
    paragraphs: [
      `Amasas el ${dayName(meta.kneadDate)} y se entrega el ${dayName(meta.bakeDate)} (hornada ${meta.bakeNumber}).`,
      ...(loavesIn(sheet)
        ? []
        : ['Ningún pan con receta: esta vez no hay nada que amasar.']),
    ],
    tables: [
      { rows: sheet.counts.map((c) => [recipeTitles[c.key], `${c.n}`]) },
      ...(sheet.uncalculated.length
        ? [
            {
              caption: 'Sin receta aquí (no se calcula)',
              rows: sheet.uncalculated.map((u) => [u.name, `${u.n}`]),
            },
          ]
        : []),
    ],
  });

  // Esta noche
  out.push({
    title: `Esta noche (${dayName(dayBefore(meta.kneadDate))})`,
    paragraphs: sheet.tonight.length
      ? []
      : ['Esta noche no hay nada que preparar.'],
    tables: sheet.tonight.map((p) => ({
      caption: p.title,
      rows: p.lines.map((l) => [l.label, grams(l.total, l.ingredient)]),
      notes: p.notes,
    })),
  });

  // Mañana, pan por pan
  const tables: Table[] = [];
  for (const d of sheet.doughs) {
    if (d.key === 'base') {
      tables.push({
        caption: `Panes con relleno · ${loaves(d.n)}`,
        rows: amountRows(d.lines),
        notes: d.notes,
      });
      for (const f of sheet.doughs.filter((f) => isFilling(f.key)))
        tables.push({
          caption: `Relleno · ${f.title} (${loaves(f.n)})`,
          rows: amountRows(f.lines),
        });
    } else if (!isFilling(d.key))
      tables.push({
        caption: `${d.title} · ${loaves(d.n)}${perLoaf(d.key)}`,
        rows: amountRows(d.lines),
        notes: d.notes,
      });
  }
  if (tables.length) {
    tables.push({
      caption: 'Todo junto, para sacarlo de la despensa',
      rows: sheet.totalsTomorrow.map((t) => [
        ingredientNames[t.ingredient],
        grams(t.total, t.ingredient),
      ]),
    });
    out.push({
      title: `Mañana, pan por pan (${dayName(meta.kneadDate)})`,
      paragraphs: [],
      tables,
    });
  }

  // Comprobación
  if (sheet.checks.length)
    out.push({
      title: 'Comprueba con la báscula',
      tone: 'quiet',
      paragraphs: [
        'Harina y agua contando lo del poolish, starter o levain. Hidratación = agua ÷ harina × 100.',
      ],
      tables: [
        {
          head: ['Pan', 'Harina', 'Agua', 'Hidratación'],
          rows: sheet.checks.map((c) => [
            `${c.ok ? '✓' : '✗'} ${c.title}`,
            grams(c.flour),
            grams(c.water),
            `${fmt(c.hydration, 2)} %`,
          ]),
          notes: sheet.checks.map(
            (c) =>
              `${c.title}: harina = ${c.flourCalc} (tiene que dar ${fmt(c.expectedFlour)}). Agua = ${c.waterCalc}.${c.integralPct ? ` Integral ${fmt(c.integralPct, 1)} %${c.integralLabel ? ` (${c.integralLabel})` : ''}.` : ''} Masa total ${grams(Math.round(c.mass))} (${c.massCalc}): ${grams(Math.round(c.perLoaf))} por pan.`,
          ),
        },
      ],
    });

  // Recuerda
  const g = groupCounts(sheet);
  out.push({
    title: 'Recuerda',
    tone: 'quiet',
    paragraphs: [
      'Agua de la masa a ~31 °C para que la masa quede a 24–25 °C (cocina a ~18 °C).',
      'Prueba del dedo: si rebota despacio, está en su punto.',
      ...(g.A || g.B || g.C
        ? [
            'Horario: mezcla ~10:00 · bloque ~5 h · formado ~15:30–16:30 · nevera ~15 h · horno ~8:00–9:00.',
          ]
        : []),
      ...(g.relleno
        ? [
            'Con relleno: 4 series de pliegues · bloque 5,5–7 h a ~19 °C (hasta +50 %) · nevera 12–14 h · horno 20 min a 230 °C con vapor y 40 min a 190 °C sin vapor.',
          ]
        : []),
    ],
    tables: [],
  });

  if (meta.doubtful.length)
    out.push({
      title: 'Pedidos dudosos (no están sumados arriba)',
      tone: 'warn',
      paragraphs: [],
      tables: [
        {
          rows: meta.doubtful.map((d) => [d.code, `${d.reason}: ${d.items}`]),
        },
      ],
    });

  if (notices.length)
    out.push({
      title: 'Para tener en cuenta',
      tone: 'quiet',
      paragraphs: notices,
      tables: [],
    });
  return out;
}

// ---- Texto y HTML ------------------------------------------------------------

export function sheetText(sheet: Sheet, meta: SheetMeta) {
  const lines: string[] = [];
  for (const b of blocks(sheet, meta)) {
    lines.push('', b.title.toUpperCase(), '');
    for (const p of b.paragraphs) lines.push(p);
    for (const t of b.tables) {
      if (t.caption) lines.push('', t.caption);
      if (t.head) lines.push(`  ${t.head.join(' · ')}`);
      for (const r of t.rows) lines.push(`  ${r.join(' · ')}`);
      for (const n of t.notes || []) lines.push(`  - ${n}`);
    }
  }
  return lines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const esc = (s: string) =>
  s.replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!,
  );

export function sheetHtml(sheet: Sheet, meta: SheetMeta) {
  const cell =
    'padding:7px 4px;border-bottom:1px solid #eee3d1;text-align:left;vertical-align:top';
  const num = `${cell};text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums;font-weight:600`;
  const body = blocks(sheet, meta)
    .map((b) => {
      const box =
        b.tone === 'warn'
          ? 'background:#fdecea;border:1px solid #e0a59e;padding:12px 14px;border-radius:10px;'
          : '';
      const size = b.tone === 'quiet' ? 'font-size:14px;color:#4a3d30;' : '';
      const paras = b.paragraphs
        .map((p) => `<p style="margin:6px 0">${esc(p)}</p>`)
        .join('');
      const tables = b.tables
        .map((t) => {
          const head = t.head
            ? `<thead><tr>${t.head
                .map(
                  (h, i) =>
                    `<th style="${i ? num : cell};color:#7a6650;font-size:13px">${esc(h)}</th>`,
                )
                .join('')}</tr></thead>`
            : '';
          const rows = t.rows
            .map(
              (r) =>
                `<tr>${r
                  .map((c, i) => `<td style="${i ? num : cell}">${esc(c)}</td>`)
                  .join('')}</tr>`,
            )
            .join('');
          const table = rows
            ? `<table style="border-collapse:collapse;width:100%;font-size:15px">${head}<tbody>${rows}</tbody></table>`
            : '';
          const notes = (t.notes || [])
            .map((n) => `<li style="margin:4px 0">${esc(n)}</li>`)
            .join('');
          return `${t.caption ? `<h3 style="font-size:16px;margin:18px 0 4px;color:#2b2118">${esc(t.caption)}</h3>` : ''}${table}${notes ? `<ul style="margin:8px 0 0;padding-left:18px;color:#6b5a45;font-size:13px">${notes}</ul>` : ''}`;
        })
        .join('');
      return `<section style="margin:0 0 26px;${box}${size}"><h2 style="font-size:19px;margin:0 0 8px;color:#2b2118">${esc(b.title)}</h2>${paras}${tables}</section>`;
    })
    .join('');
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(sheetSubject(sheet, meta))}</title></head><body style="margin:0;background:#f6f1e7;color:#2b2118;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.45"><div style="max-width:640px;margin:0 auto;padding:20px 16px;background:#fffdf8">${body}</div></body></html>`;
}

export const sheetEmail = (sheet: Sheet, meta: SheetMeta) => ({
  subject: sheetSubject(sheet, meta),
  text: sheetText(sheet, meta),
  html: sheetHtml(sheet, meta),
});
