-- ============================================
-- COMPREHENSIVE 400 ERROR DIAGNOSTIC
-- Run this to find EXACTLY what's causing the 400 errors
-- ============================================

-- Step 1: Check all LATS tables exist and their structure
SELECT '========== CHECKING LATS TABLES STRUCTURE ==========' as status;

-- Check lats_categories table
SELECT 
  'lats_categories' as table_name,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'lats_categories')
    THEN '✅ Exists' ELSE '❌ Missing' END as table_status,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'lats_categories')
    THEN (SELECT string_agg(column_name, ', ' ORDER BY ordinal_position) 
          FROM information_schema.columns 
          WHERE table_schema = 'public' AND table_name = 'lats_categories')
    ELSE 'N/A' END as columns;

-- Check lats_suppliers table
SELECT 
  'lats_suppliers' as table_name,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'lats_suppliers')
    THEN '✅ Exists' ELSE '❌ Missing' END as table_status,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'lats_suppliers')
    THEN (SELECT string_agg(column_name, ', ' ORDER BY ordinal_position) 
          FROM information_schema.columns 
          WHERE table_schema = 'public' AND table_name = 'lats_suppliers')
    ELSE 'N/A' END as columns;

-- Check lats_products table
SELECT 
  'lats_products' as table_name,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'lats_products')
    THEN '✅ Exists' ELSE '❌ Missing' END as table_status,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'lats_products')
    THEN (SELECT string_agg(column_name, ', ' ORDER BY ordinal_position) 
          FROM information_schema.columns 
          WHERE table_schema = 'public' AND table_name = 'lats_products')
    ELSE 'N/A' END as columns;

-- Check lats_product_variants table
SELECT 
  'lats_product_variants' as table_name,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'lats_product_variants')
    THEN '✅ Exists' ELSE '❌ Missing' END as table_status,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'lats_product_variants')
    THEN (SELECT string_agg(column_name, ', ' ORDER BY ordinal_position) 
          FROM information_schema.columns 
          WHERE table_schema = 'public' AND table_name = 'lats_product_variants')
    ELSE 'N/A' END as columns;

-- Check lats_stock_movements table
SELECT 
  'lats_stock_movements' as table_name,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'lats_stock_movements')
    THEN '✅ Exists' ELSE '❌ Missing' END as table_status,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'lats_stock_movements')
    THEN (SELECT string_agg(column_name, ', ' ORDER BY ordinal_position) 
          FROM information_schema.columns 
          WHERE table_schema = 'public' AND table_name = 'lats_stock_movements')
    ELSE 'N/A' END as columns;

-- Check lats_sales table
SELECT 
  'lats_sales' as table_name,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'lats_sales')
    THEN '✅ Exists' ELSE '❌ Missing' END as table_status,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'lats_sales')
    THEN (SELECT string_agg(column_name, ', ' ORDER BY ordinal_position) 
          FROM information_schema.columns 
          WHERE table_schema = 'public' AND table_name = 'lats_sales')
    ELSE 'N/A' END as columns;

-- Check customers table
SELECT 
  'customers' as table_name,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'customers')
    THEN '✅ Exists' ELSE '❌ Missing' END as table_status,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'customers')
    THEN (SELECT string_agg(column_name, ', ' ORDER BY ordinal_position) 
          FROM information_schema.columns 
          WHERE table_schema = 'public' AND table_name = 'customers')
    ELSE 'N/A' END as columns;

-- Step 2: Check RLS status on all tables
SELECT '========== CHECKING RLS STATUS ==========' as status;

SELECT 
  tablename as table_name,
  rowsecurity as rls_enabled,
  CASE 
    WHEN rowsecurity THEN '⚠️ RLS Enabled' 
    ELSE '✅ RLS Disabled' 
  END as status
FROM pg_tables 
WHERE schemaname = 'public' 
  AND (tablename LIKE 'lats_%' OR tablename = 'customers')
ORDER BY tablename;

-- Step 3: Check RLS policies that might be blocking queries
SELECT '========== CHECKING RLS POLICIES ==========' as status;

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND (tablename LIKE 'lats_%' OR tablename = 'customers')
ORDER BY tablename, policyname;

-- Step 4: Test SELECT queries on each table to see which ones fail
SELECT '========== TESTING SELECT QUERIES ==========' as status;

-- Test lats_categories
DO $$
BEGIN
  BEGIN
    PERFORM 1 FROM lats_categories LIMIT 1;
    RAISE NOTICE '✅ lats_categories: Query works';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ lats_categories: Query failed - %', SQLERRM;
  END;
END $$;

-- Test lats_suppliers
DO $$
BEGIN
  BEGIN
    PERFORM 1 FROM lats_suppliers LIMIT 1;
    RAISE NOTICE '✅ lats_suppliers: Query works';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ lats_suppliers: Query failed - %', SQLERRM;
  END;
END $$;

-- Test lats_products
DO $$
BEGIN
  BEGIN
    PERFORM 1 FROM lats_products LIMIT 1;
    RAISE NOTICE '✅ lats_products: Query works';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ lats_products: Query failed - %', SQLERRM;
  END;
END $$;

-- Test lats_product_variants
DO $$
BEGIN
  BEGIN
    PERFORM 1 FROM lats_product_variants LIMIT 1;
    RAISE NOTICE '✅ lats_product_variants: Query works';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ lats_product_variants: Query failed - %', SQLERRM;
  END;
END $$;

-- Test lats_stock_movements
DO $$
BEGIN
  BEGIN
    PERFORM 1 FROM lats_stock_movements LIMIT 1;
    RAISE NOTICE '✅ lats_stock_movements: Query works';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ lats_stock_movements: Query failed - %', SQLERRM;
  END;
END $$;

-- Test lats_sales
DO $$
BEGIN
  BEGIN
    PERFORM 1 FROM lats_sales LIMIT 1;
    RAISE NOTICE '✅ lats_sales: Query works';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ lats_sales: Query failed - %', SQLERRM;
  END;
END $$;

-- Test customers
DO $$
BEGIN
  BEGIN
    PERFORM 1 FROM customers LIMIT 1;
    RAISE NOTICE '✅ customers: Query works';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ customers: Query failed - %', SQLERRM;
  END;
END $$;

-- Step 5: Check for missing columns that might be referenced in queries
SELECT '========== CHECKING FOR COMMON COLUMN ISSUES ==========' as status;

-- Check if lats_products has required columns
SELECT 
  'lats_products' as table_name,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_products' AND column_name = 'name') 
    THEN '✅' ELSE '❌ Missing' END as has_name,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_products' AND column_name = 'sku') 
    THEN '✅' ELSE '❌ Missing' END as has_sku,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_products' AND column_name = 'category_id') 
    THEN '✅' ELSE '❌ Missing' END as has_category_id,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_products' AND column_name = 'supplier_id') 
    THEN '✅' ELSE '❌ Missing' END as has_supplier_id,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_products' AND column_name = 'is_active') 
    THEN '✅' ELSE '❌ Missing' END as has_is_active;

-- Check if lats_categories has required columns
SELECT 
  'lats_categories' as table_name,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_categories' AND column_name = 'name') 
    THEN '✅' ELSE '❌ Missing' END as has_name,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_categories' AND column_name = 'parent_id') 
    THEN '✅' ELSE '❌ Missing' END as has_parent_id,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_categories' AND column_name = 'is_active') 
    THEN '✅' ELSE '❌ Missing' END as has_is_active;

-- Check if customers has required columns
SELECT 
  'customers' as table_name,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'name') 
    THEN '✅' ELSE '❌ Missing' END as has_name,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'phone') 
    THEN '✅' ELSE '❌ Missing' END as has_phone,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'email') 
    THEN '✅' ELSE '❌ Missing' END as has_email,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'is_active') 
    THEN '✅' ELSE '❌ Missing' END as has_is_active;

-- Step 6: Check data counts
SELECT '========== CHECKING DATA COUNTS ==========' as status;

DO $$
DECLARE
  count_result INTEGER;
BEGIN
  -- Count categories
  BEGIN
    SELECT COUNT(*) INTO count_result FROM lats_categories;
    RAISE NOTICE '✅ lats_categories has % records', count_result;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ lats_categories count failed: %', SQLERRM;
  END;

  -- Count suppliers
  BEGIN
    SELECT COUNT(*) INTO count_result FROM lats_suppliers;
    RAISE NOTICE '✅ lats_suppliers has % records', count_result;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ lats_suppliers count failed: %', SQLERRM;
  END;

  -- Count products
  BEGIN
    SELECT COUNT(*) INTO count_result FROM lats_products;
    RAISE NOTICE '✅ lats_products has % records', count_result;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ lats_products count failed: %', SQLERRM;
  END;

  -- Count customers
  BEGIN
    SELECT COUNT(*) INTO count_result FROM customers;
    RAISE NOTICE '✅ customers has % records', count_result;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ customers count failed: %', SQLERRM;
  END;
END $$;

SELECT '🎯 DIAGNOSTIC COMPLETE! Check the output above for issues.' as summary;
