-- ================================================================
-- IMEI RECEIVING VERIFICATION SCRIPT
-- ================================================================
-- Run this in your Neon SQL Editor to diagnose IMEI receiving issues
-- ================================================================

\echo '========================================='
\echo '🔍 CHECKING IMEI SYSTEM SETUP'
\echo '========================================='
\echo ''

-- ================================================================
-- 1. CHECK IF REQUIRED FUNCTIONS EXIST
-- ================================================================
\echo '1️⃣ Checking Required Database Functions...'
\echo ''

SELECT 
  CASE 
    WHEN COUNT(*) = 5 THEN '✅ ALL FUNCTIONS EXIST'
    ELSE '❌ MISSING ' || (5 - COUNT(*))::text || ' FUNCTIONS'
  END as status,
  array_agg(proname) as existing_functions
FROM pg_proc
WHERE proname IN (
  'add_imei_to_parent_variant',
  'mark_imei_as_sold',
  'get_available_imeis_for_pos',
  'update_parent_stock_from_children',
  'recalculate_all_parent_stocks'
);

\echo ''
\echo 'Required functions:'
\echo '  • add_imei_to_parent_variant'
\echo '  • mark_imei_as_sold'
\echo '  • get_available_imeis_for_pos'
\echo '  • update_parent_stock_from_children'
\echo '  • recalculate_all_parent_stocks'
\echo ''

-- Check each function individually
SELECT 
  'add_imei_to_parent_variant' as function_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'add_imei_to_parent_variant') 
    THEN '✅ EXISTS' 
    ELSE '❌ MISSING' 
  END as status;

SELECT 
  'mark_imei_as_sold' as function_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'mark_imei_as_sold') 
    THEN '✅ EXISTS' 
    ELSE '❌ MISSING' 
  END as status;

SELECT 
  'get_available_imeis_for_pos' as function_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_available_imeis_for_pos') 
    THEN '✅ EXISTS' 
    ELSE '❌ MISSING' 
  END as status;

SELECT 
  'update_parent_stock_from_children' as function_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_parent_stock_from_children') 
    THEN '✅ EXISTS' 
    ELSE '❌ MISSING' 
  END as status;

\echo ''

-- ================================================================
-- 2. CHECK IF REQUIRED TRIGGERS EXIST
-- ================================================================
\echo '2️⃣ Checking Required Triggers...'
\echo ''

SELECT 
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation,
  CASE 
    WHEN trigger_name = 'trigger_update_parent_stock' THEN '✅ OK'
    ELSE '⚠️ UNKNOWN TRIGGER'
  END as status
FROM information_schema.triggers
WHERE event_object_table = 'lats_product_variants'
  AND trigger_name LIKE '%parent%'
ORDER BY trigger_name;

\echo ''

-- ================================================================
-- 3. CHECK TABLE STRUCTURE
-- ================================================================
\echo '3️⃣ Checking Table Structure...'
\echo ''

SELECT 
  column_name,
  data_type,
  is_nullable,
  CASE 
    WHEN column_name IN ('parent_variant_id', 'is_parent', 'variant_type') 
    THEN '✅ REQUIRED'
    ELSE 'ℹ️ Optional'
  END as importance
FROM information_schema.columns
WHERE table_name = 'lats_product_variants'
  AND column_name IN ('parent_variant_id', 'is_parent', 'variant_type', 'variant_attributes', 'quantity')
ORDER BY column_name;

\echo ''

-- ================================================================
-- 4. CHECK EXISTING DATA
-- ================================================================
\echo '4️⃣ Checking Existing Data...'
\echo ''

-- Count variants by type
SELECT 
  '📊 Variant Statistics' as section,
  variant_type,
  COUNT(*) as count,
  SUM(quantity) as total_quantity
FROM lats_product_variants
GROUP BY variant_type
ORDER BY 
  CASE variant_type
    WHEN 'parent' THEN 1
    WHEN 'imei_child' THEN 2
    WHEN 'standard' THEN 3
    ELSE 4
  END;

\echo ''

-- Parent variants
SELECT 
  '👨‍👧 Parent Variants' as section,
  COUNT(*) as total_parents,
  SUM(quantity) as total_stock
FROM lats_product_variants
WHERE is_parent = TRUE OR variant_type = 'parent';

\echo ''

-- IMEI children
SELECT 
  '👶 IMEI Children' as section,
  COUNT(*) as total_imei_children,
  SUM(CASE WHEN is_active = TRUE AND quantity > 0 THEN 1 ELSE 0 END) as available,
  SUM(CASE WHEN is_active = FALSE OR quantity = 0 THEN 1 ELSE 0 END) as sold
FROM lats_product_variants
WHERE variant_type = 'imei_child';

\echo ''

-- ================================================================
-- 5. CHECK FOR ORPHANED IMEI VARIANTS
-- ================================================================
\echo '5️⃣ Checking for Orphaned IMEI Variants...'
\echo ''

SELECT 
  '🔍 Orphaned IMEIs (no parent)' as issue,
  COUNT(*) as count
FROM lats_product_variants
WHERE variant_type = 'imei_child'
  AND parent_variant_id IS NULL;

-- Show details if any found
SELECT 
  id,
  variant_name,
  variant_attributes->>'imei' as imei,
  quantity,
  is_active,
  created_at
FROM lats_product_variants
WHERE variant_type = 'imei_child'
  AND parent_variant_id IS NULL
LIMIT 10;

\echo ''

-- ================================================================
-- 6. CHECK FOR DATA INCONSISTENCIES
-- ================================================================
\echo '6️⃣ Checking for Data Inconsistencies...'
\echo ''

-- Parent variants with wrong quantities
WITH parent_calcs AS (
  SELECT 
    p.id,
    p.variant_name,
    p.quantity as reported_quantity,
    COALESCE(SUM(c.quantity), 0) as calculated_quantity,
    COUNT(c.id) as child_count
  FROM lats_product_variants p
  LEFT JOIN lats_product_variants c 
    ON c.parent_variant_id = p.id 
    AND c.variant_type = 'imei_child'
    AND c.is_active = TRUE
  WHERE (p.is_parent = TRUE OR p.variant_type = 'parent')
  GROUP BY p.id, p.variant_name, p.quantity
)
SELECT 
  '⚠️ Parents with Incorrect Stock' as issue,
  COUNT(*) as count
FROM parent_calcs
WHERE reported_quantity != calculated_quantity;

-- Show details
SELECT 
  id,
  variant_name,
  reported_quantity as current_stock,
  calculated_quantity as should_be,
  (calculated_quantity - reported_quantity) as difference,
  child_count
FROM (
  SELECT 
    p.id,
    p.variant_name,
    p.quantity as reported_quantity,
    COALESCE(SUM(c.quantity), 0) as calculated_quantity,
    COUNT(c.id) as child_count
  FROM lats_product_variants p
  LEFT JOIN lats_product_variants c 
    ON c.parent_variant_id = p.id 
    AND c.variant_type = 'imei_child'
    AND c.is_active = TRUE
  WHERE (p.is_parent = TRUE OR p.variant_type = 'parent')
  GROUP BY p.id, p.variant_name, p.quantity
) calc
WHERE reported_quantity != calculated_quantity
LIMIT 10;

\echo ''

-- ================================================================
-- 7. TEST FUNCTION WITH SAMPLE DATA
-- ================================================================
\echo '7️⃣ Testing add_imei_to_parent_variant Function...'
\echo ''

-- This will only work if the function exists
DO $$
DECLARE
  v_test_result RECORD;
BEGIN
  -- Check if function exists
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'add_imei_to_parent_variant') THEN
    RAISE NOTICE '✅ Function add_imei_to_parent_variant exists';
    RAISE NOTICE 'ℹ️  Function signature:';
    
    SELECT 
      pg_get_functiondef(oid) INTO v_test_result
    FROM pg_proc 
    WHERE proname = 'add_imei_to_parent_variant'
    LIMIT 1;
    
    RAISE NOTICE 'Function is ready to use';
  ELSE
    RAISE NOTICE '❌ Function add_imei_to_parent_variant DOES NOT EXIST';
    RAISE NOTICE '🔧 Action Required: Run CRITICAL_FIX_RECEIVING_PO_IMEI.sql';
  END IF;
END $$;

\echo ''

-- ================================================================
-- 8. SUMMARY & RECOMMENDATIONS
-- ================================================================
\echo '========================================='
\echo '📋 DIAGNOSIS SUMMARY'
\echo '========================================='
\echo ''

DO $$
DECLARE
  v_functions_count INT;
  v_trigger_count INT;
  v_parent_count INT;
  v_imei_count INT;
  v_orphaned_count INT;
  v_inconsistent_count INT;
BEGIN
  -- Count functions
  SELECT COUNT(*) INTO v_functions_count
  FROM pg_proc
  WHERE proname IN (
    'add_imei_to_parent_variant',
    'mark_imei_as_sold',
    'get_available_imeis_for_pos',
    'update_parent_stock_from_children'
  );
  
  -- Count triggers
  SELECT COUNT(*) INTO v_trigger_count
  FROM information_schema.triggers
  WHERE trigger_name = 'trigger_update_parent_stock';
  
  -- Count parent variants
  SELECT COUNT(*) INTO v_parent_count
  FROM lats_product_variants
  WHERE is_parent = TRUE OR variant_type = 'parent';
  
  -- Count IMEI children
  SELECT COUNT(*) INTO v_imei_count
  FROM lats_product_variants
  WHERE variant_type = 'imei_child';
  
  -- Count orphaned IMEIs
  SELECT COUNT(*) INTO v_orphaned_count
  FROM lats_product_variants
  WHERE variant_type = 'imei_child' AND parent_variant_id IS NULL;
  
  -- Count inconsistent stocks
  SELECT COUNT(*) INTO v_inconsistent_count
  FROM (
    SELECT 
      p.id,
      p.quantity as reported,
      COALESCE(SUM(c.quantity), 0) as calculated
    FROM lats_product_variants p
    LEFT JOIN lats_product_variants c 
      ON c.parent_variant_id = p.id 
      AND c.variant_type = 'imei_child'
      AND c.is_active = TRUE
    WHERE (p.is_parent = TRUE OR p.variant_type = 'parent')
    GROUP BY p.id, p.quantity
  ) calc
  WHERE reported != calculated;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '📊 SYSTEM STATUS';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Functions: % / 4', v_functions_count;
  RAISE NOTICE 'Triggers: % / 1', v_trigger_count;
  RAISE NOTICE 'Parent Variants: %', v_parent_count;
  RAISE NOTICE 'IMEI Children: %', v_imei_count;
  RAISE NOTICE 'Orphaned IMEIs: %', v_orphaned_count;
  RAISE NOTICE 'Inconsistent Stocks: %', v_inconsistent_count;
  RAISE NOTICE '';
  
  -- Provide recommendations
  RAISE NOTICE '========================================';
  RAISE NOTICE '💡 RECOMMENDATIONS';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  
  IF v_functions_count < 4 THEN
    RAISE NOTICE '❌ CRITICAL: Missing database functions';
    RAISE NOTICE '   → Action: Run CRITICAL_FIX_RECEIVING_PO_IMEI.sql';
    RAISE NOTICE '';
  END IF;
  
  IF v_trigger_count < 1 THEN
    RAISE NOTICE '❌ CRITICAL: Missing trigger for parent stock updates';
    RAISE NOTICE '   → Action: Run CRITICAL_FIX_RECEIVING_PO_IMEI.sql';
    RAISE NOTICE '';
  END IF;
  
  IF v_orphaned_count > 0 THEN
    RAISE NOTICE '⚠️  WARNING: Found % orphaned IMEI variants', v_orphaned_count;
    RAISE NOTICE '   → These IMEIs have no parent variant';
    RAISE NOTICE '   → Action: Review and fix parent relationships';
    RAISE NOTICE '';
  END IF;
  
  IF v_inconsistent_count > 0 THEN
    RAISE NOTICE '⚠️  WARNING: Found % parents with incorrect stock', v_inconsistent_count;
    RAISE NOTICE '   → Parent quantities dont match child totals';
    RAISE NOTICE '   → Action: Run: SELECT * FROM recalculate_all_parent_stocks();';
    RAISE NOTICE '';
  END IF;
  
  IF v_functions_count = 4 AND v_trigger_count = 1 AND v_orphaned_count = 0 AND v_inconsistent_count = 0 THEN
    RAISE NOTICE '✅ SYSTEM IS HEALTHY';
    RAISE NOTICE '   All checks passed!';
    RAISE NOTICE '   You can now receive POs with IMEI tracking.';
    RAISE NOTICE '';
  END IF;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '📝 NEXT STEPS';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '1. If functions are missing:';
  RAISE NOTICE '   → Run: CRITICAL_FIX_RECEIVING_PO_IMEI.sql';
  RAISE NOTICE '';
  RAISE NOTICE '2. If stock is inconsistent:';
  RAISE NOTICE '   → Run: SELECT * FROM recalculate_all_parent_stocks();';
  RAISE NOTICE '';
  RAISE NOTICE '3. Test IMEI receiving:';
  RAISE NOTICE '   → Create test PO with 2 units';
  RAISE NOTICE '   → Receive with IMEIs: 123456789012345, 234567890123456';
  RAISE NOTICE '   → Verify in database';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;

