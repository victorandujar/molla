-- Automated sales funnel: one row per email the funnel sends, claimed before
-- sending so overlapping cron runs never email anyone twice.
--   kind 'open'   ref = bake id   · a bake opens (confirmed subscribers)
--   kind 'last'   ref = bake id   · last call on the closing day
--   kind 'thanks' ref = 'once'    · the day after a customer's first order
--   kind 'pafix'  ref = 'once'    · the day after their second order
--   kind 'report' ref = Madrid day · the weekly summary for the baker
-- Backwards compatible: the previous deployment never reads this table.
CREATE TABLE IF NOT EXISTS email_sends (
 kind text NOT NULL,
 ref text NOT NULL,
 email text NOT NULL,
 sent_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (kind, ref, email)
);
CREATE INDEX IF NOT EXISTS email_sends_sent_idx ON email_sends(sent_at);
