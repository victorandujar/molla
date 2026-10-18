-- "Pa fix": a standing weekly (or fortnightly) order. Each bake the daily
-- cycle places one ordinary order per active subscription; the customer skips,
-- pauses or cancels with one click from a private link (token). Backwards
-- compatible: the previous deployment never reads these columns, and the
-- orders it inserts simply have no subscription or cancel token.
CREATE TABLE IF NOT EXISTS subscriptions (
 id uuid PRIMARY KEY,
 token uuid UNIQUE NOT NULL,
 email text NOT NULL,
 name text NOT NULL,
 phone text NOT NULL,
 lang text NOT NULL DEFAULT 'ca' CHECK (lang IN ('es','ca')),
 quantity integer NOT NULL CHECK (quantity BETWEEN 0 AND 4),
 banana integer NOT NULL DEFAULT 0 CHECK (banana BETWEEN 0 AND 4),
 delivery text NOT NULL CHECK (delivery IN ('home','pickup')),
 town text NOT NULL DEFAULT '',
 address text NOT NULL DEFAULT '',
 frequency text NOT NULL CHECK (frequency IN ('weekly','biweekly')),
 status text NOT NULL CHECK (status IN ('ACTIVE','PAUSED','CANCELLED')),
 skip_remaining integer NOT NULL DEFAULT 0 CHECK (skip_remaining >= 0),
 last_bake_id text,
 source text NOT NULL DEFAULT 'direct',
 created_at timestamptz NOT NULL DEFAULT now(),
 cancelled_at timestamptz,
 CHECK (quantity + banana > 0)
);
CREATE INDEX IF NOT EXISTS subscriptions_status_idx ON subscriptions(status, created_at);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS subscription_id uuid REFERENCES subscriptions(id);
-- One generated order per subscription and bake, even if two jobs overlap.
CREATE UNIQUE INDEX IF NOT EXISTS orders_subscription_bake_idx
  ON orders(subscription_id, bake_id) WHERE subscription_id IS NOT NULL;
-- Private one-click cancellation link of an order (null on older orders).
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancel_token uuid;
CREATE UNIQUE INDEX IF NOT EXISTS orders_cancel_token_idx
  ON orders(cancel_token) WHERE cancel_token IS NOT NULL;
