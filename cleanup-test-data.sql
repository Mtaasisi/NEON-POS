-- Clean up test data from IMEI system tests

-- Delete stock movements first
DELETE FROM lats_stock_movements
WHERE variant_id IN (
  SELECT id FROM lats_product_variants
  WHERE variant_attributes->>'imei' IN ('999888777666555', '999888777666556')
);

-- Delete test IMEIs
DELETE FROM lats_product_variants
WHERE variant_attributes->>'imei' IN ('999888777666555', '999888777666556');

-- Delete test products
DELETE FROM lats_products
WHERE name ILIKE '%test%imei%';

-- Success
DO $$
BEGIN
    RAISE NOTICE '✅ Test data cleaned up';
END $$;

