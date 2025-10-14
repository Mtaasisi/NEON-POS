-- FIX STORE ISOLATION SETTINGS
-- This script fixes stores that have conflicting isolation mode settings
-- Issue: Stores with data_isolation_mode = 'isolated' but share_* flags are still true

BEGIN;

-- Step 1: Report current state
SELECT 
    '═══════════════════════════════════════════════════════════════════════' as separator;

SELECT 
    'CURRENT STORE ISOLATION SETTINGS' as report_title;

SELECT 
    '═══════════════════════════════════════════════════════════════════════' as separator;

-- Show all stores with their isolation settings
SELECT 
    id,
    name,
    code,
    data_isolation_mode,
    share_products,
    share_customers,
    share_inventory,
    share_suppliers,
    share_categories,
    share_employees,
    is_active
FROM store_locations
ORDER BY is_main DESC, name;

SELECT 
    '═══════════════════════════════════════════════════════════════════════' as separator;

-- Step 2: Identify problematic stores
SELECT 
    'PROBLEMATIC STORES (isolated mode but sharing enabled):' as issue;

SELECT 
    name,
    code,
    data_isolation_mode,
    CASE 
        WHEN share_products THEN '❌ share_products = true (should be false)'
        ELSE '✅ share_products = false'
    END as product_sharing_status,
    CASE 
        WHEN share_customers THEN '❌ share_customers = true (should be false)'
        ELSE '✅ share_customers = false'
    END as customer_sharing_status,
    CASE 
        WHEN share_inventory THEN '❌ share_inventory = true (should be false)'
        ELSE '✅ share_inventory = false'
    END as inventory_sharing_status
FROM store_locations
WHERE data_isolation_mode = 'isolated'
  AND (
    share_products = true OR
    share_customers = true OR
    share_inventory = true OR
    share_suppliers = true OR
    share_categories = true OR
    share_employees = true
  );

SELECT 
    '═══════════════════════════════════════════════════════════════════════' as separator;

-- Step 3: Fix isolated stores - set all share_* flags to false
UPDATE store_locations
SET 
    share_products = false,
    share_customers = false,
    share_inventory = false,
    share_suppliers = false,
    share_categories = false,
    share_employees = false,
    updated_at = NOW()
WHERE data_isolation_mode = 'isolated'
  AND (
    share_products = true OR
    share_customers = true OR
    share_inventory = true OR
    share_suppliers = true OR
    share_categories = true OR
    share_employees = true
  );

SELECT 
    'FIXED ' || COUNT(*) || ' isolated stores with incorrect sharing settings' as fix_result
FROM store_locations
WHERE data_isolation_mode = 'isolated';

SELECT 
    '═══════════════════════════════════════════════════════════════════════' as separator;

-- Step 4: Fix shared stores - set all share_* flags to true
UPDATE store_locations
SET 
    share_products = true,
    share_customers = true,
    share_inventory = true,
    share_suppliers = true,
    share_categories = true,
    share_employees = true,
    updated_at = NOW()
WHERE data_isolation_mode = 'shared'
  AND (
    share_products = false OR
    share_customers = false OR
    share_inventory = false OR
    share_suppliers = false OR
    share_categories = false OR
    share_employees = false
  );

SELECT 
    'FIXED ' || COUNT(*) || ' shared stores with incorrect sharing settings' as fix_result
FROM store_locations
WHERE data_isolation_mode = 'shared';

SELECT 
    '═══════════════════════════════════════════════════════════════════════' as separator;

-- Step 5: Show updated state
SELECT 
    'UPDATED STORE ISOLATION SETTINGS' as report_title;

SELECT 
    '═══════════════════════════════════════════════════════════════════════' as separator;

SELECT 
    id,
    name,
    code,
    data_isolation_mode,
    share_products,
    share_customers,
    share_inventory,
    share_suppliers,
    share_categories,
    share_employees,
    CASE 
        WHEN data_isolation_mode = 'isolated' AND (share_products OR share_customers OR share_inventory) THEN '❌ STILL HAS ISSUES'
        WHEN data_isolation_mode = 'shared' AND NOT (share_products AND share_customers AND share_inventory) THEN '⚠️ INCOMPLETE SHARING'
        ELSE '✅ CORRECT'
    END as status
FROM store_locations
ORDER BY is_main DESC, name;

SELECT 
    '═══════════════════════════════════════════════════════════════════════' as separator;

-- Step 6: Summary Report
SELECT 
    'SUMMARY REPORT' as report_title;

SELECT 
    '═══════════════════════════════════════════════════════════════════════' as separator;

SELECT 
    data_isolation_mode,
    COUNT(*) as store_count,
    COUNT(CASE WHEN share_products THEN 1 END) as stores_sharing_products,
    COUNT(CASE WHEN share_customers THEN 1 END) as stores_sharing_customers,
    COUNT(CASE WHEN share_inventory THEN 1 END) as stores_sharing_inventory
FROM store_locations
WHERE is_active = true
GROUP BY data_isolation_mode;

SELECT 
    '═══════════════════════════════════════════════════════════════════════' as separator;

-- Step 7: Verify no conflicts remain
SELECT 
    'VERIFICATION: Stores with conflicts remaining' as verification;

SELECT 
    COUNT(*) as stores_with_conflicts,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ All stores have correct settings!'
        ELSE '❌ Some stores still have issues - manual review needed'
    END as status
FROM store_locations
WHERE 
    (data_isolation_mode = 'isolated' AND (share_products OR share_customers OR share_inventory OR share_suppliers OR share_categories OR share_employees))
    OR
    (data_isolation_mode = 'shared' AND NOT (share_products AND share_customers AND share_inventory AND share_suppliers AND share_categories));

SELECT 
    '═══════════════════════════════════════════════════════════════════════' as separator;

COMMIT;

-- Print success message
SELECT 
    '✅ Store isolation settings have been fixed!' as result,
    'Please refresh your browser to see the changes.' as next_step;

