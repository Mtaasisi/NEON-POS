-- ============================================
-- FIX VARIANT DISPLAY CONSISTENCY
-- ============================================
-- This script ensures all variants have proper names
-- and fixes null/empty variant names
-- ============================================

-- PART 1: Check for variants with null or empty names
-- ============================================

DO $$
DECLARE
  v_null_name_count INTEGER;
  v_empty_name_count INTEGER;
BEGIN
  -- Count variants with null names
  SELECT COUNT(*) INTO v_null_name_count
  FROM lats_product_variants
  WHERE name IS NULL;
  
  -- Count variants with empty names
  SELECT COUNT(*) INTO v_empty_name_count
  FROM lats_product_variants
  WHERE name = '';
  
  RAISE NOTICE '🔍 Variant Analysis:';
  RAISE NOTICE '   - Variants with NULL name: %', v_null_name_count;
  RAISE NOTICE '   - Variants with empty name: %', v_empty_name_count;
  
  IF (v_null_name_count + v_empty_name_count) > 0 THEN
    RAISE NOTICE '⚠️  Found % variants needing name updates', (v_null_name_count + v_empty_name_count);
  END IF;
END $$;

-- ============================================
-- PART 2: Update variants with missing names
-- ============================================

-- Update NULL or empty variant names to "Default"
UPDATE lats_product_variants
SET 
  name = 'Default',
  updated_at = NOW()
WHERE name IS NULL OR name = '' OR name = 'undefined';

-- Log the update
DO $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  IF v_updated_count > 0 THEN
    RAISE NOTICE '✅ Updated % variant names to "Default"', v_updated_count;
  ELSE
    RAISE NOTICE '✅ All variant names are properly set';
  END IF;
END $$;

-- ============================================
-- PART 3: Set default names based on attributes
-- ============================================

-- For variants with attributes, create descriptive names
UPDATE lats_product_variants pv
SET 
  name = (
    CASE
      WHEN pv.attributes IS NOT NULL AND jsonb_typeof(pv.attributes) = 'object' THEN
        (
          SELECT string_agg(key || ': ' || value, ', ')
          FROM jsonb_each_text(pv.attributes)
        )
      ELSE 'Default'
    END
  ),
  updated_at = NOW()
WHERE 
  (name = 'Default' OR name IS NULL) 
  AND attributes IS NOT NULL 
  AND jsonb_typeof(attributes) = 'object'
  AND jsonb_array_length(jsonb_object_keys(attributes)) > 0;

-- Log the update
DO $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  IF v_updated_count > 0 THEN
    RAISE NOTICE '✅ Generated descriptive names for % variants based on attributes', v_updated_count;
  END IF;
END $$;

-- ============================================
-- PART 4: Verify variant data integrity
-- ============================================

-- Check for purchase order items with invalid variant references
DO $$
DECLARE
  v_invalid_variant_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_invalid_variant_count
  FROM lats_purchase_order_items poi
  WHERE poi.variant_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM lats_product_variants pv
    WHERE pv.id = poi.variant_id
  );
  
  IF v_invalid_variant_count > 0 THEN
    RAISE WARNING '⚠️  Found % purchase order items with invalid variant references', v_invalid_variant_count;
    RAISE NOTICE '   Consider running: SELECT poi.id, poi.product_id, poi.variant_id FROM lats_purchase_order_items poi WHERE variant_id NOT IN (SELECT id FROM lats_product_variants)';
  ELSE
    RAISE NOTICE '✅ All purchase order items have valid variant references';
  END IF;
END $$;

-- Check for inventory items with invalid variant references
DO $$
DECLARE
  v_invalid_variant_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_invalid_variant_count
  FROM inventory_items ii
  WHERE ii.variant_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM lats_product_variants pv
    WHERE pv.id = ii.variant_id
  );
  
  IF v_invalid_variant_count > 0 THEN
    RAISE WARNING '⚠️  Found % inventory items with invalid variant references', v_invalid_variant_count;
    RAISE NOTICE '   Consider running: SELECT ii.id, ii.product_id, ii.variant_id FROM inventory_items ii WHERE variant_id NOT IN (SELECT id FROM lats_product_variants)';
  ELSE
    RAISE NOTICE '✅ All inventory items have valid variant references';
  END IF;
END $$;

-- ============================================
-- PART 5: Show sample of updated variants
-- ============================================

SELECT 
  pv.id,
  pv.name as variant_name,
  p.name as product_name,
  pv.sku as variant_sku,
  pv.attributes,
  pv.updated_at
FROM lats_product_variants pv
LEFT JOIN lats_products p ON p.id = pv.product_id
ORDER BY pv.updated_at DESC
LIMIT 10;

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
DECLARE
  v_total_variants INTEGER;
  v_named_variants INTEGER;
  v_default_variants INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total_variants FROM lats_product_variants;
  SELECT COUNT(*) INTO v_named_variants FROM lats_product_variants WHERE name IS NOT NULL AND name != '';
  SELECT COUNT(*) INTO v_default_variants FROM lats_product_variants WHERE name = 'Default';
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ ============================================';
  RAISE NOTICE '✅ VARIANT DISPLAY FIX COMPLETE';
  RAISE NOTICE '✅ ============================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Variant Statistics:';
  RAISE NOTICE '   - Total variants: %', v_total_variants;
  RAISE NOTICE '   - Variants with names: %', v_named_variants;
  RAISE NOTICE '   - Variants named "Default": %', v_default_variants;
  RAISE NOTICE '';
  RAISE NOTICE '🔍 Next steps:';
  RAISE NOTICE '   - Refresh purchase order detail pages';
  RAISE NOTICE '   - Verify variant names display consistently';
  RAISE NOTICE '   - Check that no UUIDs are shown instead of names';
  RAISE NOTICE '';
END $$;

