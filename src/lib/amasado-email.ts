// Email de la hoja de amasado: lo que toca hacer la noche antes y el día de
// amasado, con todas las cuentas a la vista. En castellano; solo para el
// obrador.
import {
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

const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

export function sheetSubject(sheet: Sheet, meta: SheetMeta) {
  const g = groupCounts(sheet);
  const extra = [
    g.relleno ? `relleno: ${g.relleno}` : '',
    g.leche ? `leche: ${g.leche}` : '',
  ]
    .filter(Boolean)
    .map((s) => ` · ${s}`)
    .join('');
  const prefix = [
    sheet.ok ? '' : '⚠ REVISAR · ',
    meta.changes ? 'CAMBIOS · ' : '',
  ].join('');
  return `${prefix}molla. · Amasado ${dayName(meta.kneadDate)} · ${plural(loavesIn(sheet), 'pan', 'panes')} (A: ${g.A} · B: ${g.B} · C: ${g.C}${extra})`;
}

// ---- Contenido común --------------------------------------------------------

type Block = { title: string; paragraphs: string[]; tables: Table[] };
type Table = {
  caption?: string;
  head: string[];
  rows: string[][];
  notes?: string[];
};

const amountRows = (lines: Amount[]) =>
  lines.map((l) => [
    l.label,
    grams(l.perLoaf, l.ingredient),
    grams(l.total, l.ingredient),
  ]);

function blocks(sheet: Sheet, meta: SheetMeta): Block[] {
  const out: Block[] = [];
  const g = groupCounts(sheet);
  const problems = sheet.warnings.filter((w) => w.startsWith('NO CUADRA'));
  const notices = sheet.warnings.filter((w) => !w.startsWith('NO CUADRA'));

  if (meta.changes)
    out.push({
      title: 'Ha cambiado desde anoche',
      paragraphs: [
        ...meta.changes,
        'Las cantidades de abajo ya incluyen el cambio. El poolish y el starter de anoche se hicieron con las cifras anteriores: revisa si te llegan.',
      ],
      tables: [],
    });
  if (problems.length)
    out.push({
      title: '⚠ Revisa antes de pesar',
      paragraphs: problems,
      tables: [],
    });

  // 1 · Resumen
  const rows = sheet.counts.map((c) => [recipeTitles[c.key], String(c.n)]);
  out.push({
    title: '1 · Resumen',
    paragraphs: [
      `Amasas el ${dayName(meta.kneadDate)}; horneado y entrega el ${dayName(meta.bakeDate)} (hornada nº ${meta.bakeNumber}).`,
      loavesIn(sheet)
        ? `${plural(loavesIn(sheet), 'pan', 'panes')} que calcular: A ${g.A} · B ${g.B} · C ${g.C}${g.relleno ? ` · con relleno ${g.relleno}` : ''}${g.leche ? ` · pan de leche ${g.leche}` : ''}.`
        : 'No hay panes con fórmula que amasar en esta hornada.',
    ],
    tables: [
      ...(rows.length ? [{ head: ['Pan', 'Panes'], rows }] : []),
      ...(sheet.uncalculated.length
        ? [
            {
              caption: 'Sin fórmula definida (no calculado)',
              head: ['Producto', 'Cantidad'],
              rows: sheet.uncalculated.map((u) => [u.name, String(u.n)]),
            },
          ]
        : []),
    ],
  });

  // 2 · Poolish y 3 · Starter / levain
  const poolish = sheet.tonight.filter((p) => p.title.startsWith('Poolish'));
  const sour = sheet.tonight.filter((p) => !p.title.startsWith('Poolish'));
  const prefBlock = (title: string, list: typeof poolish): Block => ({
    title,
    paragraphs: [],
    tables: list.map((p) => ({
      caption: p.title,
      head: ['Ingrediente', 'Total'],
      rows: p.lines.map((l) => [l.label, grams(l.total, l.ingredient)]),
      notes: p.notes,
    })),
  });
  out.push(
    poolish.length
      ? prefBlock('2 · Poolish de esta noche', poolish)
      : {
          title: '2 · Poolish de esta noche',
          paragraphs: ['Esta noche no hay poolish.'],
          tables: [],
        },
  );
  if (sour.length)
    out.push(prefBlock('3 · Starter y levain de esta noche', sour));
  if (sheet.totalsTonight.length)
    out[out.length - 1]!.tables.push({
      caption: 'Total a pesar esta noche',
      head: ['Ingrediente', 'Total'],
      rows: sheet.totalsTonight.map((t) => [
        ingredientNames[t.ingredient],
        grams(t.total, t.ingredient),
      ]),
    });

  // 4 · Masa
  if (sheet.doughs.length)
    out.push({
      title: '4 · Masa',
      paragraphs: [],
      tables: [
        ...sheet.doughs.map((d) => ({
          caption:
            d.key === 'A' || d.key === 'B' || d.key === 'C'
              ? `${d.title} (${plural(d.n, 'pan', 'panes')})`
              : d.title,
          head: ['Ingrediente', 'Por pan', `Total (× ${d.n})`],
          rows: amountRows(d.lines),
          notes: d.notes,
        })),
        {
          caption:
            'Total a pesar mañana (sin el poolish, starter y levain de anoche)',
          head: ['Ingrediente', 'Total'],
          rows: sheet.totalsTomorrow.map((t) => [
            ingredientNames[t.ingredient],
            grams(t.total, t.ingredient),
          ]),
        },
      ],
    });

  // 5 · Comprobación
  if (sheet.checks.length)
    out.push({
      title: '5 · Comprobación',
      paragraphs: [
        'Hidratación = agua total ÷ harina total × 100, contando una sola vez la harina y el agua del poolish, starter o levain. Calculado con los gramos redondeados que pesas.',
      ],
      tables: sheet.checks.map((c) => ({
        caption: `${c.ok ? '✓' : '✗'} ${c.title} (${plural(c.n, 'pan', 'panes')})`,
        head: ['Dato', 'Valor', 'Cuenta'],
        rows: [
          [
            'Harina total',
            grams(c.flour),
            `${c.flourCalc} (esperado ${fmt(c.expectedFlour)})`,
          ],
          ['Agua total', grams(c.water), c.waterCalc],
          [
            'Hidratación',
            `${fmt(c.hydration, 2)} %`,
            `${fmt(c.water)} ÷ ${fmt(c.flour)} × 100 (rango ${fmt(c.hydrationRange[0], 2)}–${fmt(c.hydrationRange[1], 2)} %)`,
          ],
          ['% de integral', `${fmt(c.integralPct, 1)} %`, c.integralLabel],
          ['Peso total', grams(Math.round(c.mass)), c.massCalc],
          [
            'Peso por pan',
            grams(Math.round(c.perLoaf)),
            `${fmt(Math.round(c.mass))} ÷ ${c.n}`,
          ],
        ],
      })),
    });

  // 6 · Recordatorios
  out.push({
    title: '6 · Recordatorios',
    paragraphs: [
      'Agua de la masa a ~31 °C; temperatura final de la masa 24–25 °C (cocina a ~18 °C).',
      'Prueba del dedo: si rebota despacio, está en su punto.',
      ...(g.A || g.B || g.C
        ? [
            'Horario de referencia: poolish esta noche (~21:00–22:00); mezcla ~10:00; bloque ~5 h; formado ~15:30–16:30; nevera ~15 h; horno ~8:00–9:00.',
          ]
        : []),
      ...(g.relleno
        ? [
            'Panes con relleno: 4 series de pliegues; bloque 5,5–7 h a ~19 °C hasta ~+50 %; nevera 12–14 h; horno 20 min a ~230 °C con vapor y 40 min a ~190 °C sin vapor (interior 96–98 °C).',
          ]
        : []),
    ],
    tables: [],
  });

  // 7 · Pedidos dudosos
  if (meta.doubtful.length)
    out.push({
      title: '7 · Pedidos dudosos (no sumados arriba)',
      paragraphs: [],
      tables: [
        {
          head: ['Pedido', 'Motivo', 'Contenido'],
          rows: meta.doubtful.map((d) => [d.code, d.reason, d.items]),
        },
      ],
    });

  if (notices.length)
    out.push({
      title: 'Avisos y datos pendientes',
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
    'padding:6px 8px;border-bottom:1px solid #e6dccb;text-align:left;vertical-align:top';
  const num = `${cell};text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums`;
  const body = blocks(sheet, meta)
    .map((b) => {
      const warn = b.title.startsWith('⚠') || b.title.startsWith('Ha cambiado');
      const paras = b.paragraphs
        .map((p) => `<p style="margin:6px 0">${esc(p)}</p>`)
        .join('');
      const tables = b.tables
        .map((t) => {
          const head = t.head
            .map(
              (h, i) =>
                `<th style="${i && !['Cuenta', 'Motivo', 'Contenido'].includes(h) ? num : cell};font-weight:600;color:#6b5a45">${esc(h)}</th>`,
            )
            .join('');
          const rows = t.rows
            .map(
              (r) =>
                `<tr>${r
                  .map((c, i) => {
                    // Columnas de gramos a la derecha; la de la cuenta, en gris.
                    const style =
                      t.head[i] === 'Cuenta' ||
                      t.head[i] === 'Motivo' ||
                      t.head[i] === 'Contenido'
                        ? `${cell};color:#6b5a45;font-size:13px`
                        : i
                          ? num
                          : cell;
                    return `<td style="${style}">${esc(c)}</td>`;
                  })
                  .join('')}</tr>`,
            )
            .join('');
          const notes = (t.notes || [])
            .map((n) => `<li style="margin:3px 0">${esc(n)}</li>`)
            .join('');
          return `${t.caption ? `<h3 style="font-size:15px;margin:16px 0 6px">${esc(t.caption)}</h3>` : ''}<table style="border-collapse:collapse;width:100%;font-size:14px"><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table>${notes ? `<ul style="margin:6px 0 0;padding-left:18px;color:#6b5a45;font-size:13px">${notes}</ul>` : ''}`;
        })
        .join('');
      return `<section style="margin:0 0 22px;${warn ? 'background:#fdecea;border:1px solid #e0a59e;padding:10px 12px;border-radius:8px' : ''}"><h2 style="font-size:17px;margin:0 0 8px;color:#2b2118">${esc(b.title)}</h2>${paras}${tables}</section>`;
    })
    .join('');
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(sheetSubject(sheet, meta))}</title></head><body style="margin:0;background:#f6f1e7;color:#2b2118;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.45"><div style="max-width:680px;margin:0 auto;padding:20px 16px;background:#fffdf8">${body}</div></body></html>`;
}

export const sheetEmail = (sheet: Sheet, meta: SheetMeta) => ({
  subject: sheetSubject(sheet, meta),
  text: sheetText(sheet, meta),
  html: sheetHtml(sheet, meta),
});
