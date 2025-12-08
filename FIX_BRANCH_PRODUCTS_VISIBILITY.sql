-- ================================================
-- FIX: Branch Products Visibility Issue
-- ================================================
-- This script fixes the issue where products are not visible
-- due to branch filtering in hybrid mode.
-- ================================================
-- 
-- Problem: 
-- - All products are in branch 00000000-0000-0000-0000-000000000001 (ARUSHA)
-- - Branch settings have share_products = NULL
-- - In hybrid mode, NULL is treated as false, causing strict filtering
-- 
-- Solutions:
-- 1. Enable product sharing for all branches (recommended)
-- 2. Or assign products to the correct branch
-- ================================================

BEGIN;

-- ================================================
-- OPTION 1: Enable Product Sharing (RECOMMENDED)
-- ================================================
-- This allows all branches to see all products in hybrid mode
-- while still maintaining inventory isolation if needed

UPDATE store_locations
SET share_products = true
WHERE data_isolation_mode = 'hybrid'
  AND (share_products IS NULL OR share_products = false);

-- ================================================
-- OPTION 2: Set Default Branch Settings
-- ================================================
-- Ensure all branches have proper default settings

UPDATE store_locations
SET 
  data_isolation_mode = COALESCE(data_isolation_mode, 'hybrid'),
  share_products = COALESCE(share_products, true),
  share_inventory = COALESCE(share_inventory, false)
WHERE data_isolation_mode IS NULL
   OR share_products IS NULL
   OR share_inventory IS NULL;

-- ================================================
-- OPTION 3: Make Products Shared (Alternative)
-- ================================================
-- Uncomment to make all products shared across branches
-- UPDATE lats_products
-- SET is_shared = true
-- WHERE is_shared IS NULL OR is_shared = false;

-- ================================================
-- VERIFY CHANGES
-- ================================================

SELECT 
  'Branch Settings After Fix' as section,
  id,
  name,
  code,
  data_isolation_mode,
  share_products,
  share_inventory
FROM store_locations
WHERE is_active = true
ORDER BY name;

COMMIT;

-- ================================================
-- NOTES
-- ================================================
-- After running this script:
-- 1. Refresh your browser
-- 2. Check localStorage.getItem('current_branch_id')
-- 3. Verify products are now visible
-- 
-- If products still don't show:
-- - Check browser console for current branch ID
-- - Verify branch ID matches one in store_locations table
-- - Check if products have correct branch_id assigned
