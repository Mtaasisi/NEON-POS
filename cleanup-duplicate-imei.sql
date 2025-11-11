-- ============================================
-- CLEANUP DUPLICATE IMEI NUMBERS
-- Keeps newest variant, deactivates older duplicates
-- ============================================

-- Step 1: Find all duplicate IMEIs
SELECT 
  '=== DUPLICATE IMEIs FOUND ===' as section,
  variant_attributes->>'imei' as imei,
  COUNT(*) as count,
  string_agg(variant_name, ', ') as variant_names,
  string_agg(created_at::text, ', ') as created_dates
FROM lats_product_variants
WHERE variant_attributes->>'imei' IS NOT NULL
  AND variant_attributes->>'imei' != ''
  AND is_active = true
GROUP BY variant_attributes->>'imei'
HAVING COUNT(*) > 1;

-- Step 2: Deactivate older duplicates (keep newest)
WITH duplicate_imeis AS (
  SELECT 
    id,
    variant_attributes->>'imei' as imei,
    variant_name,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY variant_attributes->>'imei' 
      ORDER BY created_at DESC
    ) as row_num
  FROM lats_product_variants
  WHERE variant_attributes->>'imei' IS NOT NULL
    AND variant_attributes->>'imei' != ''
    AND is_active = true
)
UPDATE lats_product_variants
SET 
  is_active = false,
  quantity = 0,
  updated_at = NOW()
WHERE id IN (
  SELECT id FROM duplicate_imeis WHERE row_num > 1
)
RETURNING 
  variant_name,
  variant_attributes->>'imei' as imei,
  'Deactivated (duplicate)' as action;

-- Step 3: Recalculate product stock quantities
UPDATE lats_products p
SET stock_quantity = (
  SELECT COALESCE(SUM(v.quantity), 0)
  FROM lats_product_variants v
  WHERE v.product_id = p.id
    AND v.is_active = true
)
WHERE EXISTS (
  SELECT 1 FROM lats_product_variants v
  WHERE v.product_id = p.id
    AND v.variant_attributes->>'imei' IS NOT NULL
);

-- Step 4: Verify no more duplicates
SELECT 
  '=== VERIFICATION: No Duplicates Remaining ===' as section,
  COUNT(*) as total_active_imei_variants,
  COUNT(DISTINCT variant_attributes->>'imei') as unique_imeis,
  CASE 
    WHEN COUNT(*) = COUNT(DISTINCT variant_attributes->>'imei') THEN '✅ All IMEIs are unique!'
    ELSE '❌ Still has duplicates!'
  END as status
FROM lats_product_variants
WHERE variant_attributes->>'imei' IS NOT NULL
  AND variant_attributes->>'imei' != ''
  AND is_active = true;

-- Step 5: Show cleaned up data
SELECT 
  p.name as product_name,
  v.variant_name,
  v.variant_attributes->>'imei' as imei,
  v.quantity,
  v.is_active,
  v.created_at
FROM lats_product_variants v
JOIN lats_products p ON p.id = v.product_id
WHERE v.variant_attributes->>'imei' IS NOT NULL
ORDER BY p.name, v.created_at DESC;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ DUPLICATE IMEI CLEANUP COMPLETE!';
  RAISE NOTICE '';
  RAISE NOTICE 'Actions taken:';
  RAISE NOTICE '  ✅ Older duplicate variants deactivated';
  RAISE NOTICE '  ✅ Newest variant kept for each IMEI';
  RAISE NOTICE '  ✅ Product stocks recalculated';
  RAISE NOTICE '  ✅ All active IMEIs are now unique';
  RAISE NOTICE '';
END $$;

