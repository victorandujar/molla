ALTER TABLE orders ADD COLUMN IF NOT EXISTS code text;
CREATE UNIQUE INDEX IF NOT EXISTS orders_code_idx ON orders(code);
