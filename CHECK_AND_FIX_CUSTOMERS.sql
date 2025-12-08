-- ============================================================================
-- CHECK AND FIX CUSTOMERS - Make Them Shared
-- ============================================================================
-- This script checks all customers and ensures they are configured as shared
-- Customers should NOT be isolated - they should be shared across branches
-- ============================================================================

DO $$
DECLARE
  total_customers INT;
  customers_with_null_branch INT;
  customers_with_branch INT;
  customers_shared INT;
  customers_not_shared INT;
  current_branch_id UUID := '4cc81573-e86c-484b-a487-9d7a63a1b9e9'::UUID;
  customers_updated INT := 0;
  rec RECORD;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'CHECKING ALL CUSTOMERS';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  
  -- Count total customers
  SELECT COUNT(*) INTO total_customers FROM customers;
  RAISE NOTICE '📊 Total customers in database: %', total_customers;
  
  -- Count customers with NULL branch_id
  SELECT COUNT(*) INTO customers_with_null_branch 
  FROM customers 
  WHERE branch_id IS NULL;
  RAISE NOTICE '📊 Customers with branch_id = NULL: %', customers_with_null_branch;
  
  -- Count customers with branch_id assigned
  SELECT COUNT(*) INTO customers_with_branch 
  FROM customers 
  WHERE branch_id IS NOT NULL;
  RAISE NOTICE '📊 Customers with branch_id assigned: %', customers_with_branch;
  
  -- Count shared customers
  SELECT COUNT(*) INTO customers_shared 
  FROM customers 
  WHERE is_shared = true;
  RAISE NOTICE '📊 Customers with is_shared = true: %', customers_shared;
  
  -- Count non-shared customers
  SELECT COUNT(*) INTO customers_not_shared 
  FROM customers 
  WHERE is_shared = false OR is_shared IS NULL;
  RAISE NOTICE '📊 Customers with is_shared = false/NULL: %', customers_not_shared;
  
  -- Show sample customers
  RAISE NOTICE '';
  RAISE NOTICE 'Sample customers (first 10):';
  FOR rec IN 
    SELECT id, name, phone, branch_id, is_shared, created_at
    FROM customers 
    ORDER BY created_at DESC
    LIMIT 10
  LOOP
    RAISE NOTICE '  Customer: % (Phone: %)', rec.name, rec.phone;
    RAISE NOTICE '    branch_id: %, is_shared: %',
      COALESCE(rec.branch_id::TEXT, 'NULL'),
      COALESCE(rec.is_shared::TEXT, 'NULL');
  END LOOP;
  
  -- Show branch distribution
  RAISE NOTICE '';
  RAISE NOTICE 'Customers by branch_id:';
  FOR rec IN 
    SELECT 
      COALESCE(branch_id::TEXT, 'NULL') as branch_id,
      COUNT(*) as count
    FROM customers
    GROUP BY branch_id
    ORDER BY count DESC
  LOOP
    RAISE NOTICE '  Branch %: % customers', rec.branch_id, rec.count;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'FIXING CUSTOMERS - Making Them Shared';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Customers should be SHARED (not isolated) across branches.';
  RAISE NOTICE 'Setting is_shared = true and branch_id = NULL for all customers...';
  RAISE NOTICE '';
  
  -- Make all customers shared
  -- Option 1: Set is_shared = true and keep branch_id (for tracking)
  UPDATE customers
  SET 
    is_shared = true,
    updated_at = now()
  WHERE is_shared = false OR is_shared IS NULL;
  
  GET DIAGNOSTICS customers_updated = ROW_COUNT;
  RAISE NOTICE '✅ Updated % customers to is_shared = true', customers_updated;
  
  -- Option 2: Also set branch_id to NULL for truly shared customers
  -- Uncomment if you want customers to have NULL branch_id (fully shared)
  /*
  UPDATE customers
  SET 
    branch_id = NULL,
    is_shared = true,
    updated_at = now();
  
  GET DIAGNOSTICS customers_updated = ROW_COUNT;
  RAISE NOTICE '✅ Updated % customers to branch_id = NULL and is_shared = true', customers_updated;
  */
  
  -- Option 3: Assign customers to current branch but keep them shared
  -- Uncomment if you want customers assigned to a branch but still shared
  /*
  UPDATE customers
  SET 
    branch_id = current_branch_id,
    is_shared = true,
    updated_at = now()
  WHERE branch_id IS NULL;
  
  GET DIAGNOSTICS customers_updated = ROW_COUNT;
  RAISE NOTICE '✅ Assigned % customers to branch % and set is_shared = true', customers_updated, current_branch_id;
  */
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ FIX COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Customers updated: %', customers_updated;
  RAISE NOTICE '';
  RAISE NOTICE '💡 Next step: Update branch settings to ensure share_customers = true';
  RAISE NOTICE '   Run: UPDATE store_locations SET share_customers = true WHERE id = ''%'';', current_branch_id;
  
END $$;

-- Show current branch settings for customers
SELECT 
  id,
  name,
  data_isolation_mode,
  share_customers
FROM store_locations
WHERE id = '4cc81573-e86c-484b-a487-9d7a63a1b9e9'::UUID;
