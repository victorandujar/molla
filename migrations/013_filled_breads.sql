-- Six more breads: five with a filling and a milk loaf. Prices match
-- src/lib/config.ts (`extraBreads`); the reservation transaction rejects any
-- mismatch. They share the bake's capacity with the other breads.
-- Backwards compatible: the previous deployment never orders them.
INSERT INTO products (id, name, price) VALUES
  ('kalamata', 'Kalamata y romero', 650),
  ('nueces', 'Nueces', 700),
  ('nueces-naranja', 'Nueces y naranja', 700),
  ('chocolate', 'Chocolate', 800),
  ('pasas-pistachos', 'Pasas, arándanos y pistachos', 900),
  ('pan-de-leche', 'Pan de leche', 850)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price = EXCLUDED.price;
