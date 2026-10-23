-- Croissants and pains au chocolat join the weekly order, by the unit. Prices
-- match src/lib/config.ts; the reservation transaction rejects any mismatch.
-- Their shared quota per bake (48 pieces) lives in the config, like banana
-- bread's. Backwards compatible: the previous deployment never orders them.
INSERT INTO products (id, name, price) VALUES
  ('croissant', 'Croissant', 220),
  ('pain-au-chocolat', 'Pain au chocolat', 250)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price = EXCLUDED.price;
