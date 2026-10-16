-- Banana bread joins the weekly order: whole mould or half. Prices match
-- src/lib/config.ts; the reservation transaction rejects any mismatch.
-- Backwards compatible: the previous deployment only orders 'clasica'.
INSERT INTO products (id, name, price) VALUES
  ('banana', 'Banana bread', 1500),
  ('banana-mitad', 'Banana bread · mitad', 800)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price = EXCLUDED.price;
