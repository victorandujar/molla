-- Keep the persisted catalog aligned with the price shown by the application.
UPDATE products SET price = 500 WHERE id = 'clasica';

-- Existing confirmations and reminders read their pickup copy from the order
-- snapshot. Remove the former public point there as well.
UPDATE orders
SET snapshot = jsonb_set(
  snapshot,
  '{pickupAddress}',
  to_jsonb(
    CASE
      WHEN snapshot->>'lang' = 'ca'
        THEN 'Punt de recollida a Sant Boi de Llobregat'
      ELSE 'Punto de recogida en Sant Boi de Llobregat'
    END
  )
)
WHERE snapshot->>'pickupAddress' ILIKE '%Ronda de Sant Ramon%';
