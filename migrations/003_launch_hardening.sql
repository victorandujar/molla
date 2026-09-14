-- Pickup window per bake, reminder tracking, double opt-in for the waitlist
-- and cookie-free daily event counters. Backwards compatible with the
-- previous deployment: existing subscribers (and rows it still inserts)
-- default to confirmed; the new code inserts pending rows explicitly.
ALTER TABLE bakes ADD COLUMN IF NOT EXISTS pickup_window text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz;
ALTER TABLE waitlist_subscribers ADD COLUMN IF NOT EXISTS confirmed_at timestamptz DEFAULT now();
ALTER TABLE waitlist_subscribers ADD COLUMN IF NOT EXISTS confirm_token uuid UNIQUE NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE waitlist_subscribers ADD COLUMN IF NOT EXISTS lang text NOT NULL DEFAULT 'es' CHECK (lang IN ('es','ca'));
CREATE TABLE IF NOT EXISTS analytics_daily (
 day date NOT NULL, event text NOT NULL, source text NOT NULL, count integer NOT NULL DEFAULT 0,
 PRIMARY KEY(day, event, source)
);
