-- ================================================
-- DIAGNOSE: Why getProducts() Returns No Products
-- ================================================
-- This script helps identify why the getProducts() function
-- is returning no products. Run this in Supabase SQL Editor.
-- ================================================

-- Replace this with your current branch ID from localStorage
-- You can find it in browser console: localStorage.getItem('current_branch_id')
DO $$
DECLARE
  current_branch_id UUID := NULL; -- Set this to your branch ID or leave NULL to check all
  total_products INT;
  active_products INT;
  inactive_products INT;
  branch_products INT;
  active_branch_products INT;
  null_branch_products INT;
  active_null_branch_products INT;
  shared_products INT;
  active_shared_products INT;
  rec RECORD;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'PRODUCT DIAGNOSIS - Why getProducts() Returns Empty';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  
  -- 1. Total products count
  SELECT COUNT(*) INTO total_products FROM lats_products;
  RAISE NOTICE '📊 TOTAL PRODUCTS IN DATABASE: %', total_products;
  
  -- 2. Active vs Inactive
  SELECT COUNT(*) INTO active_products FROM lats_products WHERE is_active = true;
  SELECT COUNT(*) INTO inactive_products FROM lats_products WHERE is_active = false;
  RAISE NOTICE '✅ ACTIVE PRODUCTS: %', active_products;
  RAISE NOTICE '⏸️  INACTIVE PRODUCTS: %', inactive_products;
  RAISE NOTICE '';
  
  -- 3. Products by branch_id
  SELECT COUNT(*) INTO null_branch_products FROM lats_products WHERE branch_id IS NULL;
  SELECT COUNT(*) INTO active_null_branch_products FROM lats_products WHERE branch_id IS NULL AND is_active = true;
  RAISE NOTICE '❓ PRODUCTS WITH NULL branch_id: %', null_branch_products;
  RAISE NOTICE '✅ ACTIVE PRODUCTS WITH NULL branch_id: %', active_null_branch_products;
  RAISE NOTICE '';
  
  -- 4. If branch_id is provided, check products in that branch
  IF current_branch_id IS NOT NULL THEN
    SELECT COUNT(*) INTO branch_products FROM lats_products WHERE branch_id = current_branch_id;
    SELECT COUNT(*) INTO active_branch_products FROM lats_products WHERE branch_id = current_branch_id AND is_active = true;
    RAISE NOTICE '🏪 PRODUCTS IN BRANCH %: %', current_branch_id, branch_products;
    RAISE NOTICE '✅ ACTIVE PRODUCTS IN BRANCH %: %', current_branch_id, active_branch_products;
    RAISE NOTICE '';
  ELSE
    RAISE NOTICE '⚠️  No branch_id provided. Checking all branches...';
    RAISE NOTICE '';
    
    -- Show distribution by branch
    RAISE NOTICE '📊 PRODUCTS BY BRANCH:';
    FOR rec IN 
      SELECT 
        COALESCE(branch_id::TEXT, 'NULL') as branch_id,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE is_active = true) as active
      FROM lats_products
      GROUP BY branch_id
      ORDER BY total DESC
      LIMIT 10
    LOOP
      RAISE NOTICE '   Branch %: % total (% active)', rec.branch_id, rec.total, rec.active;
    END LOOP;
    RAISE NOTICE '';
  END IF;
  
  -- 5. Shared products
  SELECT COUNT(*) INTO shared_products FROM lats_products WHERE is_shared = true;
  SELECT COUNT(*) INTO active_shared_products FROM lats_products WHERE is_shared = true AND is_active = true;
  RAISE NOTICE '🔗 SHARED PRODUCTS (is_shared = true): %', shared_products;
  RAISE NOTICE '✅ ACTIVE SHARED PRODUCTS: %', active_shared_products;
  RAISE NOTICE '';
  
  -- 6. Sample products to verify data
  RAISE NOTICE '📋 SAMPLE PRODUCTS (first 5):';
  FOR rec IN 
    SELECT id, name, branch_id, is_active, is_shared
    FROM lats_products
    ORDER BY created_at DESC
    LIMIT 5
  LOOP
    RAISE NOTICE '   - % (ID: %)', rec.name, rec.id;
    RAISE NOTICE '     branch_id: %, is_active: %, is_shared: %',
      COALESCE(rec.branch_id::TEXT, 'NULL'),
      rec.is_active,
      COALESCE(rec.is_shared::TEXT, 'NULL');
  END LOOP;
  RAISE NOTICE '';
  
  -- 7. Check branch settings
  RAISE NOTICE '⚙️  BRANCH SETTINGS:';
  IF current_branch_id IS NOT NULL THEN
    FOR rec IN 
      SELECT id, name, code, data_isolation_mode, share_products, share_inventory
      FROM store_locations
      WHERE id = current_branch_id
    LOOP
      RAISE NOTICE '   Branch: % (%)', rec.name, rec.code;
      RAISE NOTICE '   data_isolation_mode: %', COALESCE(rec.data_isolation_mode, 'NULL');
      RAISE NOTICE '   share_products: %', COALESCE(rec.share_products::TEXT, 'NULL');
      RAISE NOTICE '   share_inventory: %', COALESCE(rec.share_inventory::TEXT, 'NULL');
    END LOOP;
  ELSE
    RAISE NOTICE '   (No branch_id provided - cannot check branch settings)';
  END IF;
  RAISE NOTICE '';
  
  -- 8. Recommendations
  RAISE NOTICE '💡 RECOMMENDATIONS:';
  IF active_products = 0 THEN
    RAISE NOTICE '   ❌ All products are inactive. Set is_active = true for products you want to show.';
  ELSIF current_branch_id IS NOT NULL AND active_branch_products = 0 AND active_null_branch_products = 0 THEN
    RAISE NOTICE '   ❌ No active products match your branch filter.';
    RAISE NOTICE '      - Check if products have correct branch_id';
    RAISE NOTICE '      - Check branch data_isolation_mode setting';
    RAISE NOTICE '      - Consider assigning products to branch or setting is_shared = true';
  ELSIF total_products = 0 THEN
    RAISE NOTICE '   ❌ No products exist in database. Import or create products first.';
  ELSE
    RAISE NOTICE '   ✅ Products exist. Check branch filtering logic in getProducts() function.';
  END IF;
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  
END $$;

-- ================================================
-- QUICK FIXES (Uncomment to apply)
-- ================================================

-- Fix 1: Activate all products (if they're all inactive)
-- UPDATE lats_products SET is_active = true WHERE is_active = false;

-- Fix 2: Assign NULL branch_id products to a specific branch
-- UPDATE lats_products 
-- SET branch_id = 'YOUR_BRANCH_ID_HERE'::UUID
-- WHERE branch_id IS NULL AND is_active = true;

-- Fix 3: Make all products shared (if using shared mode)
-- UPDATE lats_products SET is_shared = true WHERE is_shared IS NULL OR is_shared = false;

-- Fix 4: Check and update branch settings
-- UPDATE store_locations 
-- SET data_isolation_mode = 'shared', share_products = true
-- WHERE id = 'YOUR_BRANCH_ID_HERE'::UUID;
