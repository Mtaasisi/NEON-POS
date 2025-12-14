-- ============================================================================
-- FIX INCONSISTENT STOCK QUANTITIES
-- ============================================================================
-- This script recalculates parent variant quantities from their IMEI children
-- and updates product total stock to ensure consistency
-- ============================================================================

-- Step 1: Recalculate all parent variant quantities from their children
UPDATE lats_product_variants pv
SET 
  quantity = COALESCE((
    SELECT SUM(quantity)
    FROM lats_product_variants children
    WHERE children.parent_variant_id = pv.id
      AND children.variant_type = 'imei_child'
      AND children.is_active = TRUE
  ), 0),
  updated_at = NOW()
WHERE pv.is_parent = TRUE 
  OR pv.variant_type = 'parent';

-- Step 2: Update product total stock from parent variants
UPDATE lats_products p
SET 
  stock_quantity = COALESCE((
    SELECT SUM(COALESCE(pv.quantity, 0))
    FROM lats_product_variants pv
    WHERE pv.product_id = p.id
      AND (pv.is_parent = TRUE OR pv.variant_type = 'parent' OR pv.parent_variant_id IS NULL)
      AND pv.is_active = TRUE
  ), 0),
  total_quantity = COALESCE((
    SELECT SUM(COALESCE(pv.quantity, 0))
    FROM lats_product_variants pv
    WHERE pv.product_id = p.id
      AND (pv.is_parent = TRUE OR pv.variant_type = 'parent' OR pv.parent_variant_id IS NULL)
      AND pv.is_active = TRUE
  ), 0),
  updated_at = NOW()
WHERE EXISTS (
  SELECT 1 
  FROM lats_product_variants pv 
  WHERE pv.product_id = p.id
);

-- Step 3: Show summary of fixes
SELECT 
  '✅ Stock Quantities Fixed' as status,
  COUNT(*) FILTER (WHERE is_parent = TRUE OR variant_type = 'parent') as parent_variants_updated,
  COUNT(*) FILTER (WHERE variant_type = 'imei_child') as imei_children_count,
  SUM(quantity) FILTER (WHERE is_parent = TRUE OR variant_type = 'parent') as total_parent_stock
FROM lats_product_variants;

-- Step 4: Show products with updated stock
SELECT 
  p.id,
  p.name,
  p.sku,
  p.stock_quantity as product_stock,
  COUNT(DISTINCT pv.id) FILTER (WHERE pv.is_parent = TRUE OR pv.variant_type = 'parent') as parent_variant_count,
  SUM(pv.quantity) FILTER (WHERE pv.is_parent = TRUE OR pv.variant_type = 'parent') as calculated_stock
FROM lats_products p
LEFT JOIN lats_product_variants pv ON pv.product_id = p.id
WHERE EXISTS (SELECT 1 FROM lats_product_variants WHERE product_id = p.id AND (is_parent = TRUE OR variant_type = 'parent'))
GROUP BY p.id, p.name, p.sku, p.stock_quantity
ORDER BY p.name;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '╔════════════════════════════════════════════════════╗';
  RAISE NOTICE '║  ✅ STOCK QUANTITIES RECALCULATED                 ║';
  RAISE NOTICE '╚════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  RAISE NOTICE 'All parent variant quantities have been recalculated';
  RAISE NOTICE 'from their IMEI children to ensure consistency.';
  RAISE NOTICE '';
  RAISE NOTICE 'Product total stocks have also been updated.';
  RAISE NOTICE '';
  RAISE NOTICE '🔄 Please refresh your application to see the updated values.';
  RAISE NOTICE '';
END $$;

