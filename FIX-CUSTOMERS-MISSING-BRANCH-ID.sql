-- ============================================================================
-- FIX: Assign branch_id to customers that don't have one
-- ============================================================================
-- This script finds customers without a branch_id and assigns them to a branch
-- Date: October 13, 2025

-- ============================================================================
-- STEP 1: Check current state
-- ============================================================================

SELECT 
    '📊 CUSTOMER BRANCH STATUS' as analysis,
    COUNT(*) as total_customers,
    COUNT(branch_id) as customers_with_branch,
    COUNT(*) - COUNT(branch_id) as customers_without_branch
FROM customers;

-- Show sample customers without branch_id
SELECT 
    '👥 Customers Without Branch (First 10)' as info,
    id,
    name,
    phone,
    created_at,
    branch_id,
    created_by_branch_id
FROM customers
WHERE branch_id IS NULL
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================================
-- STEP 2: Strategy for assigning branch_id
-- ============================================================================

-- Option A: Assign all customers without branch_id to the Main Store
-- (Most common scenario - assign orphaned customers to primary branch)

-- First, let's find the Main Store branch ID
DO $$ 
DECLARE
    main_branch_id UUID;
    main_branch_name TEXT;
    main_branch_address TEXT;
    main_branch_city TEXT;
    affected_count INT;
BEGIN
    -- Get the Main Store branch ID (or first branch if Main Store doesn't exist)
    SELECT id
    INTO main_branch_id
    FROM store_locations
    WHERE name = 'Main Store'
    LIMIT 1;
    
    -- If Main Store not found, get the first branch
    IF main_branch_id IS NULL THEN
        SELECT id
        INTO main_branch_id
        FROM store_locations
        ORDER BY created_at ASC
        LIMIT 1;
    END IF;
    
    -- If we found a branch, get its details
    IF main_branch_id IS NOT NULL THEN
        SELECT name, address, city 
        INTO main_branch_name, main_branch_address, main_branch_city
        FROM store_locations
        WHERE id = main_branch_id;
    END IF;

    -- Display results
    IF main_branch_id IS NULL THEN
        RAISE NOTICE '❌ No branches found! Cannot assign customers to a branch.';
        RAISE NOTICE '   Please create a branch first using the branch management interface.';
    ELSE
        RAISE NOTICE '🏪 Found branch to assign customers to:';
        RAISE NOTICE '   Branch ID: %', main_branch_id;
        RAISE NOTICE '';
        RAISE NOTICE '📍 Branch Details:';
        RAISE NOTICE '   Name: %', main_branch_name;
        RAISE NOTICE '   Address: %', main_branch_address;
        RAISE NOTICE '   City: %', main_branch_city;
        
        -- Count how many customers will be affected
        SELECT COUNT(*) INTO affected_count
        FROM customers
        WHERE branch_id IS NULL;
        
        RAISE NOTICE '';
        RAISE NOTICE '👥 Will assign % customers to this branch', affected_count;
        RAISE NOTICE '';
        RAISE NOTICE '⚠️  READY TO UPDATE!';
        RAISE NOTICE '   Uncomment the UPDATE section below to apply changes.';
    END IF;
END $$;

-- ============================================================================
-- STEP 3: APPLY THE FIX (Uncomment to execute)
-- ============================================================================

-- ⚠️  UNCOMMENT THE CODE BELOW AFTER REVIEWING THE OUTPUT ABOVE ⚠️

/*
DO $$ 
DECLARE
    main_branch_id UUID;
    main_branch_name TEXT;
    updated_count INT;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '════════════════════════════════════════════════════════════════';
    RAISE NOTICE '🔧 STARTING CUSTOMER BRANCH ASSIGNMENT';
    RAISE NOTICE '════════════════════════════════════════════════════════════════';
    
    -- Get the Main Store branch ID
    SELECT id
    INTO main_branch_id
    FROM store_locations
    WHERE name = 'Main Store'
    LIMIT 1;
    
    -- If Main Store not found, get the first branch
    IF main_branch_id IS NULL THEN
        SELECT id
        INTO main_branch_id
        FROM store_locations
        ORDER BY created_at ASC
        LIMIT 1;
    END IF;
    
    -- If we found a branch, get its name
    IF main_branch_id IS NOT NULL THEN
        SELECT name
        INTO main_branch_name
        FROM store_locations
        WHERE id = main_branch_id;
    END IF;

    IF main_branch_id IS NULL THEN
        RAISE EXCEPTION '❌ No branches found! Cannot proceed.';
    END IF;

    RAISE NOTICE '🏪 Target Branch: % (%)', main_branch_name, main_branch_id;
    RAISE NOTICE '';
    
    -- Update customers without branch_id
    UPDATE customers
    SET 
        branch_id = main_branch_id,
        created_by_branch_id = main_branch_id,
        created_by_branch_name = main_branch_name,
        updated_at = NOW()
    WHERE branch_id IS NULL;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    RAISE NOTICE '✅ Updated % customers', updated_count;
    RAISE NOTICE '';
    RAISE NOTICE '════════════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ CUSTOMER BRANCH ASSIGNMENT COMPLETE';
    RAISE NOTICE '════════════════════════════════════════════════════════════════';
END $$;
*/

-- ============================================================================
-- STEP 4: Verify the fix (Run after uncommenting and executing STEP 3)
-- ============================================================================

/*
SELECT 
    '✅ VERIFICATION - After Fix' as status,
    COUNT(*) as total_customers,
    COUNT(branch_id) as customers_with_branch,
    COUNT(*) - COUNT(branch_id) as customers_without_branch
FROM customers;

-- Show customers grouped by branch
SELECT 
    '📊 Customers by Branch' as report,
    sl.name as branch_name,
    sl.city as branch_city,
    COUNT(c.id) as customer_count
FROM customers c
LEFT JOIN store_locations sl ON c.branch_id = sl.id
GROUP BY sl.id, sl.name, sl.city
ORDER BY customer_count DESC;

-- Show recent customers with their branch
SELECT 
    '👥 Recent Customers (with branch)' as info,
    c.name as customer_name,
    c.phone,
    sl.name as branch_name,
    c.created_at
FROM customers c
LEFT JOIN store_locations sl ON c.branch_id = sl.id
ORDER BY c.created_at DESC
LIMIT 10;
*/

-- ============================================================================
-- ALTERNATIVE APPROACH: Assign based on created_by_branch_id
-- ============================================================================

/*
-- If some customers have created_by_branch_id but not branch_id,
-- we can copy it over:

UPDATE customers
SET 
    branch_id = created_by_branch_id,
    updated_at = NOW()
WHERE branch_id IS NULL 
  AND created_by_branch_id IS NOT NULL;

SELECT 
    '✅ Copied created_by_branch_id to branch_id for ' || COUNT(*) || ' customers' as result
FROM customers
WHERE branch_id = created_by_branch_id
  AND branch_id IS NOT NULL;
*/

-- ============================================================================
-- NOTES
-- ============================================================================

-- 📝 This script:
--    1. Identifies customers without a branch_id
--    2. Finds the appropriate branch to assign them to (Main Store or first branch)
--    3. Updates those customers with the branch information
--    4. Provides verification queries to confirm the fix

-- ⚠️  Important:
--    - Review the output of STEP 1 and STEP 2 first
--    - Only uncomment STEP 3 if you're satisfied with the assignment strategy
--    - This operation can be safely run multiple times (idempotent)

-- 🎯 After running this script:
--    - All customers will have a branch_id
--    - They will appear in the customer list for their assigned branch
--    - Branch filtering will work correctly for all customers

