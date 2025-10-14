-- ============================================================================
-- 🔍 DIAGNOSE STOCK TRANSFER ISSUE
-- ============================================================================
-- Run this script FIRST to see what's wrong with your database
-- This will show you exactly what's missing or misconfigured
-- ============================================================================

-- Check 1: Does the branch_transfers table exist?
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_name = 'branch_transfers'
    ) 
    THEN '✅ Table EXISTS'
    ELSE '❌ Table MISSING - Run 🔧-FIX-STOCK-TRANSFER-TABLE-NOW.sql'
  END as table_status;

-- Check 2: Show table structure if it exists
SELECT 
  column_name, 
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'branch_transfers'
ORDER BY ordinal_position;

-- Check 3: Check for required foreign keys
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'branch_transfers';

-- Check 4: Check RLS status
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'branch_transfers';

-- Check 5: Check existing policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'branch_transfers';

-- Check 6: Check if helper functions exist
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'reduce_variant_stock',
    'increase_variant_stock',
    'update_branch_transfer_timestamp',
    'complete_stock_transfer_transaction'
  )
ORDER BY routine_name;

-- Check 7: Check indexes
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'branch_transfers'
ORDER BY indexname;

-- Check 8: Check permissions
SELECT 
  grantee, 
  privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'branch_transfers'
ORDER BY grantee, privilege_type;

-- Check 9: Count existing transfers (if table exists)
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'branch_transfers') THEN
    SELECT COUNT(*) INTO v_count FROM branch_transfers;
    RAISE NOTICE '';
    RAISE NOTICE '📊 Existing transfers: %', v_count;
    RAISE NOTICE '';
  END IF;
END $$;

-- Check 10: Check store_locations table (required for foreign keys)
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_name = 'store_locations'
    ) 
    THEN '✅ store_locations table EXISTS'
    ELSE '❌ store_locations table MISSING - This is required!'
  END as store_locations_status;

-- Check 11: Check lats_product_variants table (required for transfers)
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_name = 'lats_product_variants'
    ) 
    THEN '✅ lats_product_variants table EXISTS'
    ELSE '❌ lats_product_variants table MISSING - This is required!'
  END as variants_status;

-- Check 12: Sample data availability
DO $$
DECLARE
  v_branches INTEGER;
  v_variants INTEGER;
BEGIN
  -- Count branches
  SELECT COUNT(*) INTO v_branches FROM store_locations WHERE is_active = true;
  
  -- Count variants with stock
  SELECT COUNT(*) INTO v_variants FROM lats_product_variants WHERE quantity > 0;
  
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '📊 DIAGNOSTIC SUMMARY';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  RAISE NOTICE 'Available Branches: %', v_branches;
  RAISE NOTICE 'Available Variants with Stock: %', v_variants;
  RAISE NOTICE '';
  
  IF v_branches < 2 THEN
    RAISE NOTICE '⚠️  WARNING: You need at least 2 branches for transfers!';
  END IF;
  
  IF v_variants = 0 THEN
    RAISE NOTICE '⚠️  WARNING: You need products with stock to transfer!';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Error checking sample data: %', SQLERRM;
END $$;

-- Final recommendation
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'branch_transfers')
    THEN '✅ Table exists - Check RLS policies and permissions above'
    ELSE '❌ Table missing - Run 🔧-FIX-STOCK-TRANSFER-TABLE-NOW.sql to create it'
  END as recommendation;

