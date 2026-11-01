-- "Convida un veí": every customer gets a personal invite code. A friend's
-- first order through it carries a gift croissant, and once that order has
-- been delivered the referrer's next order carries one too.
-- Backwards compatible: the previous deployment never reads these columns.
ALTER TABLE customers ADD COLUMN IF NOT EXISTS referral_code text;
CREATE UNIQUE INDEX IF NOT EXISTS customers_referral_code_idx
  ON customers(referral_code) WHERE referral_code IS NOT NULL;
CREATE TABLE IF NOT EXISTS referrals (
 -- The friend's first order: one referral per order.
 order_id uuid PRIMARY KEY REFERENCES orders(id),
 referrer_id uuid NOT NULL REFERENCES customers(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 -- The referrer's order that carries their gift (null until claimed; a
 -- cancelled reward order frees it again).
 reward_order_id uuid REFERENCES orders(id)
);
CREATE INDEX IF NOT EXISTS referrals_referrer_idx ON referrals(referrer_id, created_at);
