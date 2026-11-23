-- English joins Catalan and Spanish: subscribers and subscriptions (pa fix) may now
-- keep 'en' as their language. Backwards compatible: the previous deployment
-- only writes 'es' or 'ca'. The inline CHECKs were named by Postgres, so they
-- are looked up instead of assumed.
DO $$
DECLARE c record;
BEGIN
  FOR c IN
    SELECT conrelid::regclass AS tbl, conname
    FROM pg_constraint
    WHERE contype = 'c'
      AND conrelid IN ('waitlist_subscribers'::regclass, 'subscriptions'::regclass)
      AND pg_get_constraintdef(oid) ILIKE '%lang%'
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', c.tbl, c.conname);
  END LOOP;
END $$;
ALTER TABLE waitlist_subscribers
  ADD CONSTRAINT waitlist_subscribers_lang_check CHECK (lang IN ('es','ca','en'));
ALTER TABLE subscriptions
  ADD CONSTRAINT subscriptions_lang_check CHECK (lang IN ('es','ca','en'));
