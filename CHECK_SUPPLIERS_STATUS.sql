-- ============================================================================
-- CHECK SUPPLIERS STATUS
-- ============================================================================
-- Quick diagnostic to see what's happening with suppliers
-- ============================================================================

DO $$
DECLARE
  current_branch_id UUID := '4cc81573-e86c-484b-a487-9d7a63a1b9e9'::UUID;
  total_suppliers INT;
  active_suppliers INT;
  suppliers_with_null_branch INT;
  suppliers_in_current_branch INT;
  suppliers_inactive INT;
  supplier_record RECORD;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'SUPPLIERS STATUS CHECK';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Current Branch ID: %', current_branch_id;
  RAISE NOTICE '';
  
  -- Count total suppliers
  SELECT COUNT(*) INTO total_suppliers FROM lats_suppliers;
  RAISE NOTICE '📊 Total suppliers in database: %', total_suppliers;
  
  -- Count active suppliers
  SELECT COUNT(*) INTO active_suppliers 
  FROM lats_suppliers 
  WHERE is_active = true;
  RAISE NOTICE '📊 Active suppliers: %', active_suppliers;
  
  -- Count inactive suppliers
  SELECT COUNT(*) INTO suppliers_inactive 
  FROM lats_suppliers 
  WHERE is_active = false;
  RAISE NOTICE '📊 Inactive suppliers: %', suppliers_inactive;
  
  -- Count suppliers with NULL branch_id
  SELECT COUNT(*) INTO suppliers_with_null_branch 
  FROM lats_suppliers 
  WHERE branch_id IS NULL AND is_active = true;
  RAISE NOTICE '📊 Active suppliers with branch_id = NULL: %', suppliers_with_null_branch;
  
  -- Count suppliers in current branch
  SELECT COUNT(*) INTO suppliers_in_current_branch 
  FROM lats_suppliers 
  WHERE branch_id = current_branch_id AND is_active = true;
  RAISE NOTICE '📊 Active suppliers in current branch: %', suppliers_in_current_branch;
  
  -- Show sample suppliers
  RAISE NOTICE '';
  RAISE NOTICE 'Sample suppliers (first 10):';
  FOR supplier_record IN 
    SELECT id, name, branch_id, is_shared, is_active
    FROM lats_suppliers 
    ORDER BY created_at DESC
    LIMIT 10
  LOOP
    RAISE NOTICE '  Supplier: % (ID: %)', supplier_record.name, supplier_record.id;
    RAISE NOTICE '    branch_id: %, is_shared: %, is_active: %',
      COALESCE(supplier_record.branch_id::TEXT, 'NULL'),
      COALESCE(supplier_record.is_shared::TEXT, 'NULL'),
      supplier_record.is_active;
  END LOOP;
  
  -- Show branch distribution
  RAISE NOTICE '';
  RAISE NOTICE 'Active suppliers by branch_id:';
  FOR supplier_record IN 
    SELECT 
      COALESCE(branch_id::TEXT, 'NULL') as branch_id,
      COUNT(*) as count
    FROM lats_suppliers
    WHERE is_active = true
    GROUP BY branch_id
    ORDER BY count DESC
  LOOP
    RAISE NOTICE '  Branch %: % suppliers', supplier_record.branch_id, supplier_record.count;
  END LOOP;
  
  RAISE NOTICE '';
  IF suppliers_in_current_branch = 0 AND active_suppliers > 0 THEN
    RAISE WARNING '⚠️ PROBLEM: % active suppliers exist but none are in current branch!', active_suppliers;
    IF suppliers_with_null_branch > 0 THEN
      RAISE NOTICE '💡 SOLUTION: Run FIX_ALL_SUPPLIERS_TO_BRANCH.sql to assign % suppliers to your branch', suppliers_with_null_branch;
    ELSE
      RAISE NOTICE '💡 SOLUTION: All suppliers belong to other branches. You may need to:';
      RAISE NOTICE '   1. Make suppliers shared (update store_locations.share_suppliers = true), OR';
      RAISE NOTICE '   2. Assign suppliers to your branch manually';
    END IF;
  ELSIF active_suppliers = 0 THEN
    RAISE WARNING '⚠️ PROBLEM: No active suppliers in database!';
    RAISE NOTICE '💡 SOLUTION: Create suppliers or activate existing ones';
  ELSE
    RAISE NOTICE '✅ Found % suppliers in current branch', suppliers_in_current_branch;
  END IF;
  
END $$;
