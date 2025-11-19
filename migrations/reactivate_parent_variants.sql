-- ============================================
-- REACTIVATE PARENT VARIANTS
-- ============================================
-- Your 128 and 256 variants are marked as SOLD
-- They need to be ACTIVE to accept IMEI children

-- Find the variants for iPhone X
SELECT 
  id,
  name,
  variant_name,
  sku,
  quantity,
  is_active,
  variant_type,
  is_parent
FROM lats_product_variants
WHERE sku LIKE 'SKU-1761461887260-H7J-V%'
ORDER BY name;

-- Reactivate them
UPDATE lats_product_variants
SET 
  is_active = TRUE,
  variant_type = 'parent',
  is_parent = TRUE,
  updated_at = NOW()
WHERE sku LIKE 'SKU-1761461887260-H7J-V%'
  AND name IN ('128', '256');

-- Verify
SELECT 
  name,
  variant_name,
  sku,
  quantity,
  is_active,
  variant_type,
  is_parent,
  'Status should be ACTIVE now' as note
FROM lats_product_variants
WHERE sku LIKE 'SKU-1761461887260-H7J-V%'
ORDER BY name;

-- Show expected result
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Parent variants reactivated!';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Expected Status:';
  RAISE NOTICE '   128: ACTIVE, parent=true, type=parent';
  RAISE NOTICE '   256: ACTIVE, parent=true, type=parent';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Now ready to receive IMEIs!';
  RAISE NOTICE '';
END $$;

