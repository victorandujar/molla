-- Hoja de amasado (src/lib/amasado.ts): una fila por email enviado, con los
-- panes por producto que llevaba. Se registra antes de enviar, así dos crons
-- no envían la misma hoja; la copia de la mañana compara con la de la noche.
--   kind 'evening' · la noche del cierre (después de las 20:00)
--   kind 'morning' · copia opcional a las 7:00 si algún pedido ha cambiado
-- Backwards compatible: the previous deployment never reads this table.
CREATE TABLE IF NOT EXISTS production_sheets (
 bake_id text NOT NULL REFERENCES bakes(id),
 kind text NOT NULL CHECK (kind IN ('evening', 'morning')),
 counts jsonb NOT NULL,
 sent_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (bake_id, kind)
);
