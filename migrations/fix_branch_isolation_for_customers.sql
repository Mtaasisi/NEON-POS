-- ============================================================================
-- Fix Branch Isolation - Make Customers Visible in Mobile App
-- ============================================================================
-- 
-- ISSUE: Customers not showing in mobile app despite 28,961 customers in DB
-- ROOT CAUSE: Branch isolation mode was "isolated" with share_customers=false
--             Customers belonged to wrong branch_id, so filter excluded them
--
-- SOLUTION: Change branches to SHARED mode and mark all customers as shared
--
-- Date: 2025-11-09
-- Impact: All customers now visible to all branches
-- ============================================================================

-- Before state:
-- - ARUSHA branch: mode=isolated, share_customers=false
-- - DAR branch: mode=isolated, share_customers=false  
-- - 16,753 customers with branch_id = 00000000-0000-0000-0000-000000000001
-- - 12,208 customers with branch_id = NULL
-- Result: NO CUSTOMERS VISIBLE (filter excluded all)

-- ============================================================================
-- STEP 1: Change branch isolation mode to SHARED
-- ============================================================================

UPDATE store_locations 
SET 
    data_isolation_mode = 'shared',
    share_customers = true,
    share_products = true,
    share_inventory = true,
    updated_at = now()
WHERE is_active = true;

-- Verify branch update
SELECT 
    id,
    name,
    code,
    is_main,
    data_isolation_mode,
    share_customers,
    share_products,
    share_inventory
FROM store_locations 
WHERE is_active = true
ORDER BY is_main DESC, name;

-- Expected output:
-- ARUSHA: mode=shared, share_customers=true
-- DAR: mode=shared, share_customers=true

-- ============================================================================
-- STEP 2: Mark all customers as shared
-- ============================================================================

UPDATE lats_customers 
SET 
    is_shared = true,
    updated_at = now()
WHERE is_shared IS NULL OR is_shared = false;

-- This ensures all customers are visible regardless of branch

-- ============================================================================
-- VERIFICATION: Confirm all customers are visible
-- ============================================================================

-- Count total customers
SELECT 
    COUNT(*) as total_customers,
    COUNT(CASE WHEN is_shared = true THEN 1 END) as shared_customers,
    COUNT(CASE WHEN is_shared = false THEN 1 END) as isolated_customers,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_customers
FROM lats_customers;

-- Expected output:
-- total_customers: 28961
-- shared_customers: 28961
-- isolated_customers: 0
-- active_customers: ~6260

-- Show customer distribution by branch
SELECT 
    COALESCE(branch_id::text, 'NULL') as branch_id,
    COUNT(*) as customer_count,
    COUNT(CASE WHEN is_shared = true THEN 1 END) as shared_count
FROM lats_customers
GROUP BY branch_id
ORDER BY customer_count DESC;

-- Test the query that mobile app will run (via customers view)
SELECT 
    COUNT(*) as visible_in_app
FROM customers
WHERE is_active = true;

-- Expected: Should show active customers count

-- Show sample customers (what mobile app will display)
SELECT 
    id,
    name,
    phone,
    email,
    city,
    branch_id,
    is_shared,
    is_active,
    loyalty_level,
    total_spent
FROM customers
WHERE is_active = true
ORDER BY name
LIMIT 10;

-- ============================================================================
-- ROLLBACK PLAN (if needed)
-- ============================================================================

/*
-- If you need to switch back to ISOLATED mode later:

-- 1. First, assign customers to correct branches based on location
UPDATE lats_customers
SET branch_id = '115e0e51-d0d6-437b-9fda-dfe11241b167' -- ARUSHA
WHERE city IN ('Arusha', 'Moshi', 'Kilimanjaro')
   OR phone LIKE '+255757%'; -- Arusha region codes

UPDATE lats_customers
SET branch_id = '24cd45b8-1ce1-486a-b055-29d169c3a8ea' -- DAR
WHERE city IN ('Dar es Salaam', 'Pwani', 'Coastal')
   OR phone LIKE '+255767%'; -- Dar region codes

-- 2. Then switch branches back to isolated mode
UPDATE store_locations
SET 
    data_isolation_mode = 'isolated',
    share_customers = false,
    share_products = false,
    updated_at = now()
WHERE id IN (
    '115e0e51-d0d6-437b-9fda-dfe11241b167', -- ARUSHA
    '24cd45b8-1ce1-486a-b055-29d169c3a8ea'  -- DAR
);

-- 3. Optionally mark some customers as branch-specific
UPDATE lats_customers
SET is_shared = false
WHERE branch_id IS NOT NULL 
  AND branch_id != '00000000-0000-0000-0000-000000000001';
*/

-- ============================================================================
-- ALTERNATIVE: HYBRID MODE (Mixed shared/isolated)
-- ============================================================================

/*
-- If you want some data shared and some isolated:

UPDATE store_locations
SET 
    data_isolation_mode = 'hybrid',
    share_customers = true,  -- Customers shared
    share_products = true,   -- Products shared
    share_inventory = false, -- Inventory isolated per branch
    updated_at = now()
WHERE is_active = true;

-- With hybrid mode:
-- - Shared entities (share_X = true) are visible to all branches
-- - Isolated entities (share_X = false) are filtered by branch_id
-- - Entities with is_shared=true are always visible
*/

-- ============================================================================
-- NOTES AND RECOMMENDATIONS
-- ============================================================================

/*
CURRENT CONFIGURATION (After this migration):
✅ Mode: SHARED
✅ All customers visible to all branches
✅ All products visible to all branches
✅ All inventory visible to all branches

BENEFITS:
- Simple data management
- No filtering complexity
- All data accessible everywhere
- Great for small businesses or single logical location

CONSIDERATIONS:
- All branches can see all customers
- Consider UI-based filtering if soft separation needed
- Sales reports may need branch-based grouping

WHEN TO USE EACH MODE:

SHARED:
- Single business location with multiple registers
- Small business with < 5 locations
- Unified inventory and customer base
- Centralized management

ISOLATED:
- Franchise model (completely separate operations)
- Multi-tenant system
- Strict data segregation required
- Different owners per location

HYBRID:
- Multi-location with shared customers
- Centralized inventory, local sales
- Regional management structure
- Flexible data sharing needs
*/

-- ============================================================================
-- COMPLETED: Branch isolation fixed - All customers now visible
-- ============================================================================

-- Final verification
DO $$
DECLARE
    customer_count INTEGER;
    shared_count INTEGER;
    branch_count INTEGER;
BEGIN
    SELECT COUNT(*), COUNT(CASE WHEN is_shared THEN 1 END)
    INTO customer_count, shared_count
    FROM lats_customers;
    
    SELECT COUNT(*)
    INTO branch_count
    FROM store_locations
    WHERE is_active = true AND data_isolation_mode = 'shared';
    
    RAISE NOTICE '✅ Migration Complete!';
    RAISE NOTICE '📊 Total Customers: %', customer_count;
    RAISE NOTICE '🌐 Shared Customers: %', shared_count;
    RAISE NOTICE '🏪 Branches in SHARED mode: %', branch_count;
    RAISE NOTICE '';
    RAISE NOTICE '🎯 Next Steps:';
    RAISE NOTICE '1. Refresh mobile app';
    RAISE NOTICE '2. Login and navigate to Customers page';
    RAISE NOTICE '3. Verify all customers are visible';
    RAISE NOTICE '4. Test adding/updating customers';
END $$;

