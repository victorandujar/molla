-- The sourdough loaf goes from 5,50 € to 6 €. Prices match src/lib/config.ts;
-- the reservation transaction rejects any mismatch.
UPDATE products SET price = 600 WHERE id = 'masa-madre';
