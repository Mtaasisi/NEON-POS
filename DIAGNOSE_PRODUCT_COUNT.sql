-- ============================================================================
-- DIAGNOSE PRODUCT COUNT ISSUE
-- ============================================================================
-- This script helps diagnose why only 4 products are showing
-- Checks product distribution by branch_id and active status
-- ============================================================================

DO $$
DECLARE
  target_branch_id UUID := '4cc81573-e86c-484b-a487-9d7a63a1b9e9'::UUID;
  total_products INT;
  active_products INT;
  branch_products INT;
  active_branch_products INT;
  null_branch_products INT;
  inactive_products INT;
  other_branch_products INT;
  rec RECORD;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'PRODUCT COUNT DIAGNOSIS';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Target Branch ID: %', target_branch_id;
  RAISE NOTICE '';
  
  -- Total products
  SELECT COUNT(*) INTO total_products FROM lats_products;
  RAISE NOTICE '📊 TOTAL PRODUCTS: %', total_products;
  
  -- Active products
  SELECT COUNT(*) INTO active_products FROM lats_products WHERE is_active = true;
  RAISE NOTICE '✅ ACTIVE PRODUCTS: %', active_products;
  
  -- Products assigned to target branch
  SELECT COUNT(*) INTO branch_products FROM lats_products WHERE branch_id = target_branch_id;
  RAISE NOTICE '🏪 PRODUCTS IN TARGET BRANCH: %', branch_products;
  
  -- Active products in target branch (this is what should show in UI)
  SELECT COUNT(*) INTO active_branch_products 
  FROM lats_products 
  WHERE branch_id = target_branch_id AND is_active = true;
  RAISE NOTICE '✅ ACTIVE PRODUCTS IN TARGET BRANCH: % (This is what shows in UI)', active_branch_products;
  
  -- Products with NULL branch_id
  SELECT COUNT(*) INTO null_branch_products FROM lats_products WHERE branch_id IS NULL;
  RAISE NOTICE '❓ PRODUCTS WITH NULL BRANCH_ID: %', null_branch_products;
  
  -- Inactive products
  SELECT COUNT(*) INTO inactive_products FROM lats_products WHERE is_active = false;
  RAISE NOTICE '⏸️  INACTIVE PRODUCTS: %', inactive_products;
  
  -- Products in other branches
  SELECT COUNT(*) INTO other_branch_products 
  FROM lats_products 
  WHERE branch_id IS NOT NULL AND branch_id != target_branch_id;
  RAISE NOTICE '🏢 PRODUCTS IN OTHER BRANCHES: %', other_branch_products;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'DETAILED BREAKDOWN';
  RAISE NOTICE '========================================';
  
  -- Show sample of products with NULL branch_id
  IF null_branch_products > 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE '📋 Sample products with NULL branch_id (first 10):';
    FOR rec IN 
      SELECT id, name, is_active, branch_id 
      FROM lats_products 
      WHERE branch_id IS NULL 
      LIMIT 10
    LOOP
      RAISE NOTICE '   - % (ID: %, Active: %)', rec.name, rec.id, rec.is_active;
    END LOOP;
  END IF;
  
  -- Show sample of inactive products
  IF inactive_products > 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE '📋 Sample inactive products (first 10):';
    FOR rec IN 
      SELECT id, name, branch_id, is_active 
      FROM lats_products 
      WHERE is_active = false 
      LIMIT 10
    LOOP
      RAISE NOTICE '   - % (ID: %, Branch: %)', rec.name, rec.id, COALESCE(rec.branch_id::text, 'NULL');
    END LOOP;
  END IF;
  
  -- Show products in target branch
  IF branch_products > 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE '📋 Products in target branch:';
    FOR rec IN 
      SELECT id, name, is_active 
      FROM lats_products 
      WHERE branch_id = target_branch_id 
      ORDER BY created_at DESC
      LIMIT 20
    LOOP
      RAISE NOTICE '   - % (ID: %, Active: %)', rec.name, rec.id, rec.is_active;
    END LOOP;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RECOMMENDATIONS';
  RAISE NOTICE '========================================';
  
  IF null_branch_products > 0 THEN
    RAISE NOTICE '💡 Found % products with NULL branch_id', null_branch_products;
    RAISE NOTICE '   → Run FIX_EVERYTHING_NOW.sql to assign them to your branch';
  END IF;
  
  IF inactive_products > 0 THEN
    RAISE NOTICE '💡 Found % inactive products', inactive_products;
    RAISE NOTICE '   → Run FIX_EVERYTHING_NOW.sql to activate them';
  END IF;
  
  IF active_branch_products < 10 AND (null_branch_products > 0 OR inactive_products > 0) THEN
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  WARNING: Only % products showing, but there are products to fix!', active_branch_products;
    RAISE NOTICE '   → Run FIX_EVERYTHING_NOW.sql to fix this';
  END IF;
  
  RAISE NOTICE '';
  
END $$;

-- Also show branch isolation settings
SELECT 
  id,
  name,
  data_isolation_mode,
  share_products,
  share_customers,
  share_suppliers
FROM store_locations
WHERE id = '4cc81573-e86c-484b-a487-9d7a63a1b9e9'::UUID;
