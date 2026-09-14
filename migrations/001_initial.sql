CREATE TABLE IF NOT EXISTS bakes (
 id text PRIMARY KEY, number text NOT NULL, pickup_date timestamptz NOT NULL,
 deadline timestamptz NOT NULL, opens_at timestamptz NOT NULL,
 capacity integer NOT NULL CHECK(capacity > 0), status text NOT NULL CHECK(status IN ('UPCOMING','OPEN','SOLD_OUT','CLOSED','COMPLETED'))
);
CREATE TABLE IF NOT EXISTS products (id text PRIMARY KEY, name text NOT NULL, price integer NOT NULL CHECK(price >= 0));
CREATE TABLE IF NOT EXISTS customers (id uuid PRIMARY KEY, email text UNIQUE NOT NULL, name text NOT NULL, phone text NOT NULL);
CREATE TABLE IF NOT EXISTS orders (
 id uuid PRIMARY KEY, request_id uuid UNIQUE NOT NULL, bake_id text NOT NULL REFERENCES bakes(id), customer_id uuid NOT NULL REFERENCES customers(id),
 snapshot jsonb NOT NULL, status text NOT NULL CHECK(status IN ('CONFIRMED','COLLECTED','CANCELLED')), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS order_items (order_id uuid NOT NULL REFERENCES orders(id), product_id text NOT NULL REFERENCES products(id), quantity integer NOT NULL CHECK(quantity BETWEEN 1 AND 4), unit_price integer NOT NULL CHECK(unit_price >= 0), PRIMARY KEY(order_id, product_id));
CREATE INDEX IF NOT EXISTS orders_bake_idx ON orders(bake_id);
CREATE TABLE IF NOT EXISTS waitlist_subscribers (email text PRIMARY KEY, source text NOT NULL, consent_version text NOT NULL, subscribed_at timestamptz NOT NULL DEFAULT now(), unsubscribe_token uuid UNIQUE NOT NULL);
CREATE TABLE IF NOT EXISTS request_limits (key text PRIMARY KEY, count integer NOT NULL, resets_at timestamptz NOT NULL);
