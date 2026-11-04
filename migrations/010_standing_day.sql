-- "Pa fix" on Wednesdays too: each subscription belongs to one bake day.
-- Backwards compatible: existing rows become Saturday ones, and the previous
-- deployment never reads the column (its inserts take the default).
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS day text NOT NULL DEFAULT 'sat'
  CHECK (day IN ('wed','sat'));
