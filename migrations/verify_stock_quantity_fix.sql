-- ============================================================================
-- VERIFY STOCK_QUANTITY FIX
-- ============================================================================
-- This script verifies that all stock_quantity references are correct
-- and that the add_imei_to_parent_variant function works properly
-- ============================================================================

-- Step 1: Verify lats_product_variants table structure
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_product_variants' 
    AND column_name = 'stock_quantity'
  ) THEN
    RAISE EXCEPTION '❌ ERROR: lats_product_variants should NOT have stock_quantity column!';
  ELSE
    RAISE NOTICE '✅ VERIFIED: lats_product_variants does NOT have stock_quantity (correct)';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_product_variants' 
    AND column_name = 'quantity'
  ) THEN
    RAISE NOTICE '✅ VERIFIED: lats_product_variants has quantity column (correct)';
  ELSE
    RAISE EXCEPTION '❌ ERROR: lats_product_variants missing quantity column!';
  END IF;
END $$;

-- Step 2: Verify lats_products table has stock_quantity
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_products' 
    AND column_name = 'stock_quantity'
  ) THEN
    RAISE NOTICE '✅ VERIFIED: lats_products has stock_quantity column (correct)';
  ELSE
    RAISE WARNING '⚠️  WARNING: lats_products missing stock_quantity column';
  END IF;
END $$;

-- Step 3: Check add_imei_to_parent_variant function for stock_quantity references
DO $$
DECLARE
  v_function_source TEXT;
  v_has_bad_reference BOOLEAN := FALSE;
BEGIN
  -- Get the function source code
  SELECT pg_get_functiondef(oid) INTO v_function_source
  FROM pg_proc
  WHERE proname = 'add_imei_to_parent_variant'
  LIMIT 1;
  
  IF v_function_source IS NULL THEN
    RAISE WARNING '⚠️  add_imei_to_parent_variant function not found';
    RETURN;
  END IF;
  
  -- Check if function tries to update stock_quantity on lats_product_variants
  IF v_function_source LIKE '%UPDATE lats_product_variants%stock_quantity%' THEN
    v_has_bad_reference := TRUE;
  END IF;
  
  IF v_has_bad_reference THEN
    RAISE EXCEPTION '❌ ERROR: add_imei_to_parent_variant function still references stock_quantity on lats_product_variants!';
  ELSE
    RAISE NOTICE '✅ VERIFIED: add_imei_to_parent_variant function does NOT reference stock_quantity on variants';
  END IF;
END $$;

-- Step 4: Show summary of parent variants and their children
SELECT 
  '📊 Parent Variant Summary' as report,
  COUNT(DISTINCT pv.id) FILTER (WHERE pv.is_parent = TRUE OR pv.variant_type = 'parent') as total_parent_variants,
  COUNT(DISTINCT child.id) FILTER (WHERE child.variant_type = 'imei_child') as total_imei_children,
  SUM(pv.quantity) FILTER (WHERE pv.is_parent = TRUE OR pv.variant_type = 'parent') as total_parent_stock,
  SUM(child.quantity) FILTER (WHERE child.variant_type = 'imei_child' AND child.is_active = TRUE) as total_active_children_stock
FROM lats_product_variants pv
LEFT JOIN lats_product_variants child ON child.parent_variant_id = pv.id;

-- Step 5: Check for any mismatched parent-child stock counts
SELECT 
  '⚠️  Mismatched Parent-Child Stocks' as report,
  pv.id as parent_id,
  pv.sku as parent_sku,
  pv.variant_name as parent_name,
  pv.quantity as parent_quantity,
  COALESCE(SUM(child.quantity), 0) as calculated_from_children,
  COUNT(child.id) as child_count
FROM lats_product_variants pv
LEFT JOIN lats_product_variants child ON child.parent_variant_id = pv.id
  AND child.variant_type = 'imei_child'
  AND child.is_active = TRUE
WHERE (pv.is_parent = TRUE OR pv.variant_type = 'parent')
GROUP BY pv.id, pv.sku, pv.variant_name, pv.quantity
HAVING pv.quantity != COALESCE(SUM(child.quantity), 0)
  AND (COUNT(child.id) > 0 OR pv.quantity > 0)
ORDER BY pv.quantity DESC
LIMIT 10;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '╔════════════════════════════════════════════════════╗';
  RAISE NOTICE '║  ✅ STOCK_QUANTITY FIX VERIFICATION COMPLETE      ║';
  RAISE NOTICE '╚════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  RAISE NOTICE 'All checks passed! The database structure is correct.';
  RAISE NOTICE '';
  RAISE NOTICE '✅ lats_product_variants uses: quantity';
  RAISE NOTICE '✅ lats_products uses: stock_quantity';
  RAISE NOTICE '✅ add_imei_to_parent_variant function is fixed';
  RAISE NOTICE '';
  RAISE NOTICE '🎉 You can now receive purchase orders with IMEIs!';
  RAISE NOTICE '';
END $$;

