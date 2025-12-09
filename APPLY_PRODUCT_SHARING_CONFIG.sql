-- ================================================
-- APPLY PRODUCT SHARING CONFIGURATION
-- ================================================
-- This script applies the recommended configuration:
-- - share_products = true   (Shared catalog - all branches see products)
-- - share_inventory = false (Isolated stock - each branch has own inventory)
-- ================================================
-- 
-- IMPORTANT: Run this in Supabase SQL Editor
-- ================================================

BEGIN;

-- ================================================
-- STEP 1: Ensure All Branches Use Hybrid Mode
-- ================================================
-- Set hybrid mode for any branches that don't have it

UPDATE store_locations
SET data_isolation_mode = 'hybrid'
WHERE is_active = true
  AND (data_isolation_mode IS NULL OR data_isolation_mode NOT IN ('shared', 'isolated', 'hybrid'));

-- ================================================
-- STEP 2: Apply Configuration to All Active Branches
-- ================================================
-- Apply the recommended configuration to ALL active branches

UPDATE store_locations
SET 
  share_products = true,   -- ✅ Shared catalog
  share_inventory = false  -- ✅ Isolated stock
WHERE is_active = true;

-- ================================================
-- STEP 3: Set Defaults for Any Branches Without Settings
-- ================================================
-- Ensure all branches have proper default settings

UPDATE store_locations
SET 
  data_isolation_mode = COALESCE(data_isolation_mode, 'hybrid'),
  share_products = COALESCE(share_products, true),
  share_inventory = COALESCE(share_inventory, false)
WHERE is_active = true
  AND (
    data_isolation_mode IS NULL
    OR share_products IS NULL
    OR share_inventory IS NULL
  );

-- ================================================
-- STEP 3: Verify Configuration Applied
-- ================================================

SELECT 
  '✅ Configuration Applied' as status,
  id,
  name,
  code,
  data_isolation_mode,
  share_products,
  share_inventory,
  is_active
FROM store_locations
WHERE is_active = true
ORDER BY name;

-- ================================================
-- STEP 4: Show Summary
-- ================================================

SELECT 
  '📊 Configuration Summary' as section,
  COUNT(*) FILTER (WHERE share_products = true) as branches_with_shared_products,
  COUNT(*) FILTER (WHERE share_inventory = false) as branches_with_isolated_inventory,
  COUNT(*) as total_active_branches
FROM store_locations
WHERE is_active = true;

COMMIT;

-- ================================================
-- CONFIGURATION EXPLANATION
-- ================================================
-- 
-- ✅ share_products = true
--    → All branches can see the same product catalog
--    → Products are visible across all branches
--    → Product definitions, names, prices are shared
-- 
-- ✅ share_inventory = false
--    → Each branch has its own independent stock levels
--    → Stock quantities are branch-specific
--    → Inventory is isolated per branch
-- 
-- This means:
-- - All branches can see and sell the same products
-- - Each branch tracks its own inventory independently
-- - Stock levels are branch-specific
-- 
-- Example:
-- - Product "Macbook Pro 2019" is visible to all branches
-- - ARUSHA branch: 5 units in stock
-- - DAR branch: 2 units in stock
-- - Each branch manages its own stock independently
-- 
-- ================================================
-- NEXT STEPS
-- ================================================
-- 1. Refresh your browser
-- 2. Products should now be visible to all branches
-- 3. Each branch will show its own stock levels
-- 4. Verify in browser console: localStorage.getItem('current_branch_id')
