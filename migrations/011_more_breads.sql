-- Two more breads join the menu: a sourdough loaf and a 60 % wholegrain one.
-- Prices match src/lib/config.ts; the reservation transaction rejects any
-- mismatch. All three breads share the bake's capacity (bakes.capacity is
-- loaves of any bread). Backwards compatible: the previous deployment never
-- orders them.
INSERT INTO products (id, name, price) VALUES
  ('masa-madre', 'Masa madre', 550),
  ('integral', 'Integral 60 %', 500)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price = EXCLUDED.price;
-- order_items allowed 1–4 per line since the first migration, but an order
-- may carry up to 12 croissants or pains au chocolat: lines of 5 or more
-- were rejected by the database. Widen it to what the application allows.
ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_quantity_check;
ALTER TABLE order_items ADD CONSTRAINT order_items_quantity_check
  CHECK (quantity BETWEEN 1 AND 12);
