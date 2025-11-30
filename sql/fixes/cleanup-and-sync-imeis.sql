-- ============================================================================
-- IMEI Cleanup and Synchronization Script (SQL Version)
-- ============================================================================
-- This script performs comprehensive IMEI validation and synchronization
-- NOTE: IMEIs are stored in variant_attributes JSONB column as {"imei": "..."}
-- Run each section separately and review results before proceeding
-- ============================================================================

-- ============================================================================
-- STEP 0: Initial Status Check (REVIEW ONLY - NO CHANGES)
-- ============================================================================

-- Check current inventory_items status distribution
SELECT 
  status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM inventory_items
GROUP BY status
ORDER BY count DESC;

-- Check lats_product_variants IMEI validity (from JSONB variant_attributes)
SELECT 
  CASE 
    WHEN variant_attributes->>'imei' IS NULL OR variant_attributes->>'imei' = '' THEN 'missing_imei'
    WHEN char_length(variant_attributes->>'imei') < 15 OR char_length(variant_attributes->>'imei') > 17 THEN 'invalid_length'
    WHEN variant_attributes->>'imei' ~ '[^0-9]' THEN 'non_numeric'
    ELSE 'valid'
  END as imei_category,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM lats_product_variants
WHERE variant_type = 'imei_child' OR variant_attributes ? 'imei'
GROUP BY imei_category
ORDER BY count DESC;

-- Check for IMEIs that exist in variants but not in inventory
SELECT 
  COUNT(*) as valid_imeis_missing_in_inventory,
  'These will be synced in Step 4' as note
FROM lats_product_variants lv
LEFT JOIN inventory_items i ON (lv.variant_attributes->>'imei') = i.serial_number
WHERE i.id IS NULL 
  AND lv.variant_attributes->>'imei' IS NOT NULL 
  AND lv.variant_attributes->>'imei' != ''
  AND char_length(lv.variant_attributes->>'imei') BETWEEN 15 AND 17
  AND lv.variant_attributes->>'imei' ~ '^[0-9]+$'
  AND lv.is_active = TRUE;

-- ============================================================================
-- STEP 1: Preview Invalid IMEIs in inventory_items (PREVIEW ONLY)
-- ============================================================================

-- Preview what will be marked as invalid
SELECT 
  id,
  serial_number,
  status,
  CASE 
    WHEN serial_number IS NULL OR serial_number = '' THEN 'empty_or_null'
    WHEN char_length(serial_number) < 15 THEN 'too_short'
    WHEN char_length(serial_number) > 17 THEN 'too_long'
    WHEN serial_number ~ '[^0-9]' THEN 'non_numeric'
    ELSE 'unknown'
  END as invalid_reason
FROM inventory_items
WHERE status != 'invalid'
  AND (
    serial_number IS NULL 
    OR serial_number = ''
    OR char_length(serial_number) < 15
    OR char_length(serial_number) > 17
    OR serial_number ~ '[^0-9]'
  )
LIMIT 20;

-- Count of items to be marked invalid
SELECT 
  COUNT(*) as items_to_mark_invalid,
  'Review the preview above before proceeding' as warning
FROM inventory_items
WHERE status != 'invalid'
  AND (
    serial_number IS NULL 
    OR serial_number = ''
    OR char_length(serial_number) < 15
    OR char_length(serial_number) > 17
    OR serial_number ~ '[^0-9]'
  );

-- ⚠️ UNCOMMENT THE FOLLOWING TO EXECUTE THE UPDATE ⚠️
-- UPDATE inventory_items
-- SET status = 'invalid',
--     updated_at = NOW()
-- WHERE status != 'invalid'
--   AND (
--     serial_number IS NULL 
--     OR serial_number = ''
--     OR char_length(serial_number) < 15
--     OR char_length(serial_number) > 17
--     OR serial_number ~ '[^0-9]'
--   );

-- ============================================================================
-- STEP 2: Preview Invalid IMEIs in lats_product_variants (PREVIEW ONLY)
-- ============================================================================

-- Preview what will be marked as invalid
-- Note: IMEIs are stored in variant_attributes JSONB column
SELECT 
  id,
  variant_attributes->>'imei' as imei,
  variant_type,
  is_active,
  CASE 
    WHEN variant_attributes->>'imei' IS NULL OR variant_attributes->>'imei' = '' THEN 'empty_or_null'
    WHEN char_length(variant_attributes->>'imei') < 15 THEN 'too_short'
    WHEN char_length(variant_attributes->>'imei') > 17 THEN 'too_long'
    WHEN variant_attributes->>'imei' ~ '[^0-9]' THEN 'non_numeric'
    ELSE 'unknown'
  END as invalid_reason
FROM lats_product_variants
WHERE (variant_type = 'imei_child' OR variant_attributes ? 'imei')
  AND (
    variant_attributes->>'imei' IS NULL 
    OR variant_attributes->>'imei' = ''
    OR char_length(variant_attributes->>'imei') < 15
    OR char_length(variant_attributes->>'imei') > 17
    OR variant_attributes->>'imei' ~ '[^0-9]'
  )
LIMIT 20;

-- Count of variants to be marked invalid
SELECT 
  COUNT(*) as variants_to_mark_invalid,
  'Review the preview above before proceeding' as warning
FROM lats_product_variants
WHERE (variant_type = 'imei_child' OR variant_attributes ? 'imei')
  AND (
    variant_attributes->>'imei' IS NULL 
    OR variant_attributes->>'imei' = ''
    OR char_length(variant_attributes->>'imei') < 15
    OR char_length(variant_attributes->>'imei') > 17
    OR variant_attributes->>'imei' ~ '[^0-9]'
  );

-- ⚠️ UNCOMMENT THE FOLLOWING TO EXECUTE THE UPDATE ⚠️
-- Mark variants as inactive and add imei_status to variant_attributes
-- UPDATE lats_product_variants
-- SET is_active = FALSE,
--     variant_attributes = variant_attributes || '{"imei_status": "invalid"}'::jsonb,
--     updated_at = NOW()
-- WHERE (variant_type = 'imei_child' OR variant_attributes ? 'imei')
--   AND (
--     variant_attributes->>'imei' IS NULL 
--     OR variant_attributes->>'imei' = ''
--     OR char_length(variant_attributes->>'imei') < 15
--     OR char_length(variant_attributes->>'imei') > 17
--     OR variant_attributes->>'imei' ~ '[^0-9]'
--   );

-- ============================================================================
-- STEP 3: Flag Items with Missing IMEIs (PREVIEW)
-- ============================================================================

-- Preview items to be flagged as missing_imei
SELECT 
  id,
  serial_number,
  status,
  product_id
FROM inventory_items
WHERE (serial_number IS NULL OR serial_number = '')
  AND status != 'missing_imei'
LIMIT 20;

-- Count of items to be flagged
SELECT 
  COUNT(*) as items_to_flag_missing_imei,
  'Review the preview above before proceeding' as warning
FROM inventory_items
WHERE (serial_number IS NULL OR serial_number = '')
  AND status != 'missing_imei';

-- ⚠️ UNCOMMENT THE FOLLOWING TO EXECUTE THE UPDATE ⚠️
-- UPDATE inventory_items
-- SET status = 'missing_imei',
--     updated_at = NOW()
-- WHERE (serial_number IS NULL OR serial_number = '')
--   AND status != 'missing_imei';

-- ============================================================================
-- STEP 4: Sync Valid IMEIs from variants to inventory (PREVIEW)
-- ============================================================================

-- Preview IMEIs that will be synced
SELECT 
  lv.id as variant_id,
  lv.variant_attributes->>'imei' as imei,
  lv.product_id,
  lv.parent_variant_id,
  p.name as product_name,
  lv.variant_type
FROM lats_product_variants lv
LEFT JOIN inventory_items i ON (lv.variant_attributes->>'imei') = i.serial_number
LEFT JOIN lats_products p ON lv.product_id = p.id
WHERE i.id IS NULL 
  AND lv.variant_attributes->>'imei' IS NOT NULL 
  AND lv.variant_attributes->>'imei' != ''
  AND char_length(lv.variant_attributes->>'imei') BETWEEN 15 AND 17
  AND lv.variant_attributes->>'imei' ~ '^[0-9]+$'
  AND lv.is_active = TRUE
  AND (lv.variant_type = 'imei_child' OR lv.variant_attributes ? 'imei')
LIMIT 20;

-- Count of IMEIs to be synced
SELECT 
  COUNT(*) as imeis_to_sync,
  'These IMEIs will be added to inventory_items' as note
FROM lats_product_variants lv
LEFT JOIN inventory_items i ON (lv.variant_attributes->>'imei') = i.serial_number
WHERE i.id IS NULL 
  AND lv.variant_attributes->>'imei' IS NOT NULL 
  AND lv.variant_attributes->>'imei' != ''
  AND char_length(lv.variant_attributes->>'imei') BETWEEN 15 AND 17
  AND lv.variant_attributes->>'imei' ~ '^[0-9]+$'
  AND lv.is_active = TRUE
  AND (lv.variant_type = 'imei_child' OR lv.variant_attributes ? 'imei');

-- ⚠️ UNCOMMENT THE FOLLOWING TO EXECUTE THE SYNC ⚠️
-- INSERT INTO inventory_items (
--   serial_number, 
--   status, 
--   product_id, 
--   parent_variant_id, 
--   created_at,
--   updated_at
-- )
-- SELECT 
--   lv.variant_attributes->>'imei' as serial_number,
--   'available' as status,
--   lv.product_id,
--   COALESCE(lv.parent_variant_id, lv.id) as parent_variant_id,
--   NOW() as created_at,
--   NOW() as updated_at
-- FROM lats_product_variants lv
-- LEFT JOIN inventory_items i ON (lv.variant_attributes->>'imei') = i.serial_number
-- WHERE i.id IS NULL 
--   AND lv.variant_attributes->>'imei' IS NOT NULL 
--   AND lv.variant_attributes->>'imei' != ''
--   AND char_length(lv.variant_attributes->>'imei') BETWEEN 15 AND 17
--   AND lv.variant_attributes->>'imei' ~ '^[0-9]+$'
--   AND lv.is_active = TRUE
--   AND (lv.variant_type = 'imei_child' OR lv.variant_attributes ? 'imei');

-- ============================================================================
-- STEP 5: Final Report (RUN AFTER ALL UPDATES)
-- ============================================================================

-- Inventory items final status
SELECT 
  status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*) OVER(), 2) as percentage
FROM inventory_items
GROUP BY status
ORDER BY count DESC;

-- Product variants IMEI status (based on variant_attributes)
SELECT 
  variant_type,
  is_active,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM lats_product_variants
WHERE variant_type = 'imei_child' OR variant_attributes ? 'imei'
GROUP BY variant_type, is_active
ORDER BY count DESC;

-- Check for duplicate IMEIs (should be none)
SELECT 
  serial_number,
  COUNT(*) as duplicate_count
FROM inventory_items
WHERE serial_number IS NOT NULL 
  AND serial_number != ''
  AND status NOT IN ('invalid', 'missing_imei')
GROUP BY serial_number
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- Summary statistics
SELECT 
  (SELECT COUNT(*) FROM inventory_items) as total_inventory_items,
  (SELECT COUNT(*) FROM inventory_items WHERE status = 'invalid') as invalid_inventory,
  (SELECT COUNT(*) FROM inventory_items WHERE status = 'missing_imei') as missing_imei_inventory,
  (SELECT COUNT(*) FROM inventory_items WHERE status = 'available') as available_inventory,
  (SELECT COUNT(*) FROM lats_product_variants WHERE variant_type = 'imei_child' OR variant_attributes ? 'imei') as total_imei_variants,
  (SELECT COUNT(*) FROM lats_product_variants WHERE (variant_type = 'imei_child' OR variant_attributes ? 'imei') AND is_active = FALSE) as invalid_variants,
  (SELECT COUNT(*) FROM lats_product_variants WHERE (variant_type = 'imei_child' OR variant_attributes ? 'imei') AND (variant_attributes->>'imei' IS NULL OR variant_attributes->>'imei' = '')) as null_variant_imeis;

-- ============================================================================
-- QUICK EXECUTE VERSION (Use with caution - runs all updates at once)
-- ============================================================================
-- Uncomment the entire DO block below to execute all updates in sequence
-- ============================================================================

/*
DO $$ 
DECLARE
  v_inventory_updated INTEGER;
  v_variants_updated INTEGER;
  v_missing_flagged INTEGER;
  v_synced INTEGER;
BEGIN
  -- Step 1: Mark invalid IMEIs in inventory_items
  UPDATE inventory_items
  SET status = 'invalid', updated_at = NOW()
  WHERE status != 'invalid'
    AND (
      serial_number IS NULL OR serial_number = ''
      OR char_length(serial_number) < 15 OR char_length(serial_number) > 17
      OR serial_number ~ '[^0-9]'
    );
  GET DIAGNOSTICS v_inventory_updated = ROW_COUNT;
  RAISE NOTICE 'Step 1: Marked % invalid IMEIs in inventory_items', v_inventory_updated;

  -- Step 2: Mark invalid IMEIs in lats_product_variants
  UPDATE lats_product_variants
  SET is_active = FALSE,
      variant_attributes = variant_attributes || '{"imei_status": "invalid"}'::jsonb,
      updated_at = NOW()
  WHERE (variant_type = 'imei_child' OR variant_attributes ? 'imei')
    AND (
      variant_attributes->>'imei' IS NULL OR variant_attributes->>'imei' = ''
      OR char_length(variant_attributes->>'imei') < 15 OR char_length(variant_attributes->>'imei') > 17
      OR variant_attributes->>'imei' ~ '[^0-9]'
    );
  GET DIAGNOSTICS v_variants_updated = ROW_COUNT;
  RAISE NOTICE 'Step 2: Marked % invalid IMEIs in lats_product_variants', v_variants_updated;

  -- Step 3: Flag missing IMEIs
  UPDATE inventory_items
  SET status = 'missing_imei', updated_at = NOW()
  WHERE (serial_number IS NULL OR serial_number = '')
    AND status != 'missing_imei';
  GET DIAGNOSTICS v_missing_flagged = ROW_COUNT;
  RAISE NOTICE 'Step 3: Flagged % items as missing_imei', v_missing_flagged;

  -- Step 4: Sync valid IMEIs
  INSERT INTO inventory_items (serial_number, status, product_id, parent_variant_id, created_at, updated_at)
  SELECT 
    lv.variant_attributes->>'imei' as serial_number,
    'available' as status,
    lv.product_id,
    COALESCE(lv.parent_variant_id, lv.id) as parent_variant_id,
    NOW() as created_at,
    NOW() as updated_at
  FROM lats_product_variants lv
  LEFT JOIN inventory_items i ON (lv.variant_attributes->>'imei') = i.serial_number
  WHERE i.id IS NULL 
    AND lv.variant_attributes->>'imei' IS NOT NULL AND lv.variant_attributes->>'imei' != ''
    AND char_length(lv.variant_attributes->>'imei') BETWEEN 15 AND 17
    AND lv.variant_attributes->>'imei' ~ '^[0-9]+$'
    AND lv.is_active = TRUE
    AND (lv.variant_type = 'imei_child' OR lv.variant_attributes ? 'imei');
  GET DIAGNOSTICS v_synced = ROW_COUNT;
  RAISE NOTICE 'Step 4: Synced % valid IMEIs to inventory', v_synced;

  RAISE NOTICE '✅ All operations completed successfully!';
  RAISE NOTICE 'Summary: % invalid inventory, % invalid variants, % missing flagged, % synced',
    v_inventory_updated, v_variants_updated, v_missing_flagged, v_synced;
END $$;
*/

-- ============================================================================
-- ADDITIONAL QUERIES: Investigate IMEI Variants
-- ============================================================================

-- View all IMEI variants with their details
SELECT 
  id,
  product_id,
  variant_type,
  is_parent,
  parent_variant_id,
  variant_attributes->>'imei' as imei,
  variant_attributes->>'condition' as condition,
  variant_attributes->>'serial_number' as serial_number,
  is_active,
  quantity
FROM lats_product_variants
WHERE variant_type = 'imei_child' OR variant_attributes ? 'imei'
ORDER BY created_at DESC
LIMIT 50;

-- Find orphaned IMEI variants (parent doesn't exist)
SELECT 
  lv.id as variant_id,
  lv.parent_variant_id,
  lv.variant_attributes->>'imei' as imei,
  'Parent variant does not exist' as issue
FROM lats_product_variants lv
LEFT JOIN lats_product_variants parent ON lv.parent_variant_id = parent.id
WHERE lv.variant_type = 'imei_child'
  AND lv.parent_variant_id IS NOT NULL
  AND parent.id IS NULL;

-- Check IMEI variants vs inventory_items sync status
SELECT 
  'In Variants Only' as location,
  COUNT(*) as count
FROM lats_product_variants lv
LEFT JOIN inventory_items i ON (lv.variant_attributes->>'imei') = i.serial_number
WHERE (lv.variant_type = 'imei_child' OR lv.variant_attributes ? 'imei')
  AND lv.variant_attributes->>'imei' IS NOT NULL
  AND i.id IS NULL

UNION ALL

SELECT 
  'In Inventory Only' as location,
  COUNT(*) as count
FROM inventory_items i
LEFT JOIN lats_product_variants lv ON i.serial_number = (lv.variant_attributes->>'imei')
WHERE i.serial_number IS NOT NULL
  AND i.serial_number != ''
  AND lv.id IS NULL
  AND char_length(i.serial_number) BETWEEN 15 AND 17

UNION ALL

SELECT 
  'In Both' as location,
  COUNT(*) as count
FROM inventory_items i
INNER JOIN lats_product_variants lv ON i.serial_number = (lv.variant_attributes->>'imei')
WHERE i.serial_number IS NOT NULL;
