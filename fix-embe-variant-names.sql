-- ============================================
-- FIX EMBE VARIANT NAMES
-- If variants were created but named wrong
-- ============================================

-- First, check what we have:
SELECT 
  id,
  variant_name,
  sku,
  variant_attributes->>'imei' as imei,
  quantity
FROM lats_product_variants v
WHERE v.product_id = (SELECT id FROM lats_products WHERE name ILIKE '%Embe%')
ORDER BY created_at DESC;

-- If variants have IMEI but wrong name, fix them:
UPDATE lats_product_variants
SET variant_name = 'IMEI: ' || (variant_attributes->>'imei')
WHERE product_id = (SELECT id FROM lats_products WHERE name ILIKE '%Embe%')
  AND variant_attributes->>'imei' IS NOT NULL
  AND variant_attributes->>'imei' != ''
  AND variant_name != 'IMEI: ' || (variant_attributes->>'imei');

-- Verify the fix:
SELECT 
  '=== AFTER FIX ===' as section,
  variant_name,
  sku,
  quantity,
  variant_attributes->>'imei' as imei
FROM lats_product_variants
WHERE product_id = (SELECT id FROM lats_products WHERE name ILIKE '%Embe%')
  AND variant_attributes->>'imei' IS NOT NULL
ORDER BY created_at DESC;

