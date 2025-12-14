-- ============================================
-- VERIFY INVENTORY_ITEMS ACCESS FOR POS
-- ============================================
-- This script verifies that inventory_items table is properly configured
-- for POS system to access serial number devices
--
-- Run this after applying fix_inventory_items_rls_for_pos.sql
-- ============================================

-- 1. Check RLS is enabled
SELECT 
    'RLS Status' as check_type,
    CASE 
        WHEN rowsecurity THEN '✅ Enabled'
        ELSE '❌ Disabled'
    END as status
FROM pg_tables
WHERE tablename = 'inventory_items';

-- 2. List all RLS policies
SELECT 
    'RLS Policies' as check_type,
    policyname as policy_name,
    cmd as command,
    CASE 
        WHEN permissive THEN 'Permissive'
        ELSE 'Restrictive'
    END as policy_type
FROM pg_policies
WHERE tablename = 'inventory_items'
ORDER BY policyname;

-- 3. Count available inventory items
SELECT 
    'Available Items' as check_type,
    COUNT(*) as count,
    COUNT(DISTINCT product_id) as unique_products,
    COUNT(DISTINCT variant_id) as unique_variants
FROM inventory_items
WHERE status = 'available';

-- 4. Test query access (simulating POS query)
SELECT 
    'Query Test' as check_type,
    COUNT(*) as items_found,
    '✅ Can query inventory_items' as status
FROM inventory_items
WHERE status = 'available'
LIMIT 10;

-- 5. Check for items that might be in cart but not accessible
-- This helps identify potential issues
SELECT 
    'Potential Issues' as check_type,
    COUNT(*) as items_with_null_branch,
    'Items with NULL branch_id (may cause RLS issues)' as note
FROM inventory_items
WHERE branch_id IS NULL AND status = 'available';

-- 6. Verify helper function exists
SELECT 
    'Helper Function' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE n.nspname = 'public'
            AND p.proname = 'check_variant_exists'
        ) THEN '✅ Function exists'
        ELSE '❌ Function missing'
    END as status;

-- 7. Test the helper function with a real ID
DO $$
DECLARE
    test_id uuid;
    test_result record;
BEGIN
    SELECT id INTO test_id 
    FROM inventory_items 
    WHERE status = 'available' 
    LIMIT 1;
    
    IF test_id IS NOT NULL THEN
        SELECT * INTO test_result FROM check_variant_exists(test_id);
        
        RAISE NOTICE '=== Helper Function Test ===';
        RAISE NOTICE 'Test ID: %', test_id;
        RAISE NOTICE 'Exists in lats_product_variants: %', test_result.exists_in_variants;
        RAISE NOTICE 'Exists in inventory_items: %', test_result.exists_in_inventory;
        RAISE NOTICE 'Inventory status: %', test_result.inventory_status;
    ELSE
        RAISE NOTICE 'No available inventory items to test';
    END IF;
END $$;

-- 8. Compare with lats_product_variants RLS policies
SELECT 
    'Comparison' as check_type,
    'lats_product_variants' as table_name,
    COUNT(*) as policy_count
FROM pg_policies
WHERE tablename = 'lats_product_variants'
UNION ALL
SELECT 
    'Comparison' as check_type,
    'inventory_items' as table_name,
    COUNT(*) as policy_count
FROM pg_policies
WHERE tablename = 'inventory_items';

-- 9. Summary report
SELECT 
    '=== SUMMARY ===' as report_section,
    '' as details
UNION ALL
SELECT 
    'RLS Enabled',
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_tables 
            WHERE tablename = 'inventory_items' AND rowsecurity = true
        ) THEN 'Yes ✅'
        ELSE 'No ❌'
    END
UNION ALL
SELECT 
    'Policies Count',
    COUNT(*)::text
FROM pg_policies
WHERE tablename = 'inventory_items'
UNION ALL
SELECT 
    'Available Items',
    COUNT(*)::text
FROM inventory_items
WHERE status = 'available'
UNION ALL
SELECT 
    'Helper Function',
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE n.nspname = 'public' AND p.proname = 'check_variant_exists'
        ) THEN 'Exists ✅'
        ELSE 'Missing ❌'
    END;

