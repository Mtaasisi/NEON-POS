-- ============================================================================
-- DIAGNOSE MISSING PRODUCTS AND SUPPLIERS
-- ============================================================================
-- This script checks why products and suppliers are not showing up
-- Run this to see what data exists and what branch_id values they have
-- ============================================================================

-- ============================================================================
-- 1. CHECK PRODUCTS DATA
-- ============================================================================
DO $$
DECLARE
  total_products INT;
  products_with_null_branch INT;
  products_with_branch INT;
  products_shared INT;
  current_branch_id UUID := '4cc81573-e86c-484b-a487-9d7a63a1b9e9'::UUID;
  products_in_current_branch INT;
  product_record RECORD;
  branch_record RECORD;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '1. PRODUCTS DIAGNOSIS';
  RAISE NOTICE '========================================';
  
  -- Count total products
  SELECT COUNT(*) INTO total_products FROM lats_products;
  RAISE NOTICE '📊 Total products in database: %', total_products;
  
  -- Count products with NULL branch_id
  SELECT COUNT(*) INTO products_with_null_branch 
  FROM lats_products 
  WHERE branch_id IS NULL;
  RAISE NOTICE '📊 Products with branch_id = NULL: %', products_with_null_branch;
  
  -- Count products with any branch_id
  SELECT COUNT(*) INTO products_with_branch 
  FROM lats_products 
  WHERE branch_id IS NOT NULL;
  RAISE NOTICE '📊 Products with branch_id assigned: %', products_with_branch;
  
  -- Count shared products
  SELECT COUNT(*) INTO products_shared 
  FROM lats_products 
  WHERE is_shared = true;
  RAISE NOTICE '📊 Products with is_shared = true: %', products_shared;
  
  -- Count products in current branch
  SELECT COUNT(*) INTO products_in_current_branch 
  FROM lats_products 
  WHERE branch_id = current_branch_id;
  RAISE NOTICE '📊 Products in current branch (%): %', current_branch_id, products_in_current_branch;
  
  -- Show sample products
  RAISE NOTICE '';
  RAISE NOTICE 'Sample products (first 5):';
  FOR product_record IN 
    SELECT id, name, branch_id, is_shared, is_active
    FROM lats_products 
    LIMIT 5
  LOOP
    RAISE NOTICE '  Product: % (ID: %)', product_record.name, product_record.id;
    RAISE NOTICE '    branch_id: %, is_shared: %, is_active: %',
      COALESCE(product_record.branch_id::TEXT, 'NULL'),
      COALESCE(product_record.is_shared::TEXT, 'NULL'),
      product_record.is_active;
  END LOOP;
  
  -- Show branch distribution
  RAISE NOTICE '';
  RAISE NOTICE 'Products by branch_id:';
  FOR branch_record IN 
    SELECT 
      COALESCE(branch_id::TEXT, 'NULL') as branch_id,
      COUNT(*) as count
    FROM lats_products
    GROUP BY branch_id
    ORDER BY count DESC
  LOOP
    RAISE NOTICE '  Branch %: % products', branch_record.branch_id, branch_record.count;
  END LOOP;
END $$;

-- ============================================================================
-- 2. CHECK SUPPLIERS DATA
-- ============================================================================
DO $$
DECLARE
  total_suppliers INT;
  suppliers_with_null_branch INT;
  suppliers_with_branch INT;
  suppliers_shared INT;
  current_branch_id UUID := '4cc81573-e86c-484b-a487-9d7a63a1b9e9'::UUID;
  suppliers_in_current_branch INT;
  supplier_record RECORD;
  branch_record RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '2. SUPPLIERS DIAGNOSIS';
  RAISE NOTICE '========================================';
  
  -- Count total suppliers
  SELECT COUNT(*) INTO total_suppliers FROM lats_suppliers;
  RAISE NOTICE '📊 Total suppliers in database: %', total_suppliers;
  
  -- Count suppliers with NULL branch_id
  SELECT COUNT(*) INTO suppliers_with_null_branch 
  FROM lats_suppliers 
  WHERE branch_id IS NULL;
  RAISE NOTICE '📊 Suppliers with branch_id = NULL: %', suppliers_with_null_branch;
  
  -- Count suppliers with any branch_id
  SELECT COUNT(*) INTO suppliers_with_branch 
  FROM lats_suppliers 
  WHERE branch_id IS NOT NULL;
  RAISE NOTICE '📊 Suppliers with branch_id assigned: %', suppliers_with_branch;
  
  -- Count shared suppliers
  SELECT COUNT(*) INTO suppliers_shared 
  FROM lats_suppliers 
  WHERE is_shared = true;
  RAISE NOTICE '📊 Suppliers with is_shared = true: %', suppliers_shared;
  
  -- Count suppliers in current branch
  SELECT COUNT(*) INTO suppliers_in_current_branch 
  FROM lats_suppliers 
  WHERE branch_id = current_branch_id;
  RAISE NOTICE '📊 Suppliers in current branch (%): %', current_branch_id, suppliers_in_current_branch;
  
  -- Show sample suppliers
  RAISE NOTICE '';
  RAISE NOTICE 'Sample suppliers (first 5):';
  FOR supplier_record IN 
    SELECT id, name, branch_id, is_shared, is_active
    FROM lats_suppliers 
    LIMIT 5
  LOOP
    RAISE NOTICE '  Supplier: % (ID: %)', supplier_record.name, supplier_record.id;
    RAISE NOTICE '    branch_id: %, is_shared: %, is_active: %',
      COALESCE(supplier_record.branch_id::TEXT, 'NULL'),
      COALESCE(supplier_record.is_shared::TEXT, 'NULL'),
      supplier_record.is_active;
  END LOOP;
  
  -- Show branch distribution
  RAISE NOTICE '';
  RAISE NOTICE 'Suppliers by branch_id:';
  FOR branch_record IN 
    SELECT 
      COALESCE(branch_id::TEXT, 'NULL') as branch_id,
      COUNT(*) as count
    FROM lats_suppliers
    GROUP BY branch_id
    ORDER BY count DESC
  LOOP
    RAISE NOTICE '  Branch %: % suppliers', branch_record.branch_id, branch_record.count;
  END LOOP;
END $$;

-- ============================================================================
-- 3. CHECK BRANCH SETTINGS
-- ============================================================================
DO $$
DECLARE
  branch_record RECORD;
  current_branch_id UUID := '4cc81573-e86c-484b-a487-9d7a63a1b9e9'::UUID;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '3. BRANCH SETTINGS FOR CURRENT BRANCH';
  RAISE NOTICE '========================================';
  
  SELECT * INTO branch_record
  FROM store_locations
  WHERE id = current_branch_id;
  
  IF branch_record IS NULL THEN
    RAISE WARNING '⚠️ Branch % not found in store_locations!', current_branch_id;
  ELSE
    RAISE NOTICE 'Branch: %', branch_record.name;
    RAISE NOTICE 'Isolation Mode: %', branch_record.data_isolation_mode;
    RAISE NOTICE 'share_products: %', branch_record.share_products;
    RAISE NOTICE 'share_suppliers: %', branch_record.share_suppliers;
    RAISE NOTICE '';
    RAISE NOTICE 'Expected filter for products:';
    IF branch_record.data_isolation_mode = 'shared' THEN
      RAISE NOTICE '  → No filter (show all products)';
    ELSIF branch_record.data_isolation_mode = 'isolated' THEN
      RAISE NOTICE '  → branch_id = % (isolated mode)', current_branch_id;
    ELSIF branch_record.data_isolation_mode = 'hybrid' THEN
      IF branch_record.share_products THEN
        RAISE NOTICE '  → branch_id = % OR is_shared = true OR branch_id IS NULL', current_branch_id;
      ELSE
        RAISE NOTICE '  → branch_id = % (NOT shared in hybrid mode)', current_branch_id;
      END IF;
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE 'Expected filter for suppliers:';
    IF branch_record.data_isolation_mode = 'shared' THEN
      RAISE NOTICE '  → No filter (show all suppliers)';
    ELSIF branch_record.data_isolation_mode = 'isolated' THEN
      RAISE NOTICE '  → branch_id = % (isolated mode)', current_branch_id;
    ELSIF branch_record.data_isolation_mode = 'hybrid' THEN
      IF branch_record.share_suppliers THEN
        RAISE NOTICE '  → branch_id = % OR is_shared = true OR branch_id IS NULL', current_branch_id;
      ELSE
        RAISE NOTICE '  → branch_id = % (NOT shared in hybrid mode)', current_branch_id;
      END IF;
    END IF;
  END IF;
END $$;

-- ============================================================================
-- 4. SUMMARY AND RECOMMENDATIONS
-- ============================================================================
DO $$
DECLARE
  total_products INT;
  products_in_branch INT;
  total_suppliers INT;
  suppliers_in_branch INT;
  current_branch_id UUID := '4cc81573-e86c-484b-a487-9d7a63a1b9e9'::UUID;
  branch_record RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '4. SUMMARY AND RECOMMENDATIONS';
  RAISE NOTICE '========================================';
  
  SELECT COUNT(*) INTO total_products FROM lats_products WHERE is_active = true;
  SELECT COUNT(*) INTO products_in_branch FROM lats_products 
    WHERE branch_id = current_branch_id AND is_active = true;
  
  SELECT COUNT(*) INTO total_suppliers FROM lats_suppliers WHERE is_active = true;
  SELECT COUNT(*) INTO suppliers_in_branch FROM lats_suppliers 
    WHERE branch_id = current_branch_id AND is_active = true;
  
  SELECT * INTO branch_record FROM store_locations WHERE id = current_branch_id;
  
  RAISE NOTICE 'Current situation:';
  RAISE NOTICE '  Products: % total active, % in current branch', total_products, products_in_branch;
  RAISE NOTICE '  Suppliers: % total active, % in current branch', total_suppliers, suppliers_in_branch;
  RAISE NOTICE '';
  
  IF branch_record.data_isolation_mode = 'hybrid' AND NOT branch_record.share_products THEN
    IF products_in_branch = 0 AND total_products > 0 THEN
      RAISE WARNING '⚠️ PROBLEM: Products exist but none are assigned to current branch!';
      RAISE NOTICE '💡 SOLUTION: Run FIX_ASSIGN_EXISTING_DATA_TO_BRANCH.sql to assign existing products';
    END IF;
  END IF;
  
  IF branch_record.data_isolation_mode = 'hybrid' AND NOT branch_record.share_suppliers THEN
    IF suppliers_in_branch = 0 AND total_suppliers > 0 THEN
      RAISE WARNING '⚠️ PROBLEM: Suppliers exist but none are assigned to current branch!';
      RAISE NOTICE '💡 SOLUTION: Run FIX_ASSIGN_EXISTING_DATA_TO_BRANCH.sql to assign existing suppliers';
    END IF;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Diagnosis complete!';
END $$;
