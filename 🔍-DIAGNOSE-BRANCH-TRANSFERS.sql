-- ============================================================================
-- DIAGNOSE BRANCH_TRANSFERS TABLE - Check for Missing Columns
-- ============================================================================
-- Run this first to see what's missing
-- ============================================================================

-- Check if branch_transfers table exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'branch_transfers'
    ) 
    THEN '✅ Table branch_transfers exists'
    ELSE '❌ Table branch_transfers DOES NOT EXIST'
  END as table_status;

-- List ALL columns currently in branch_transfers table
SELECT 
  '📋 Current Columns:' as info,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'branch_transfers'
ORDER BY ordinal_position;

-- Check for REQUIRED columns that might be missing
SELECT 
  '🔍 Required Column Check:' as check_type,
  required_column,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'branch_transfers' 
      AND column_name = required_column
    ) 
    THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM (
  VALUES 
    ('id'),
    ('from_branch_id'),
    ('to_branch_id'),
    ('transfer_type'),
    ('entity_type'),
    ('entity_id'),
    ('quantity'),
    ('status'),
    ('requested_by'),
    ('approved_by'),
    ('notes'),
    ('rejection_reason'),  -- This is often missing
    ('metadata'),          -- This might be missing
    ('requested_at'),
    ('approved_at'),
    ('completed_at'),
    ('created_at'),
    ('updated_at')
) AS required(required_column);

-- Check related tables
SELECT 
  '🔍 Related Tables:' as info,
  table_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = t.table_name
    ) 
    THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM (
  VALUES 
    ('store_locations'),
    ('lats_product_variants'),
    ('lats_products'),
    ('lats_stock_movements')
) AS t(table_name);

-- Check if reserved_quantity column exists in lats_product_variants
SELECT 
  '🔍 Stock Reservation Column:' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'lats_product_variants' 
      AND column_name = 'reserved_quantity'
    ) 
    THEN '✅ reserved_quantity EXISTS in lats_product_variants'
    ELSE '❌ reserved_quantity MISSING from lats_product_variants'
  END as status;

-- Check database functions
SELECT 
  '🔍 Database Functions:' as check_type,
  routine_name,
  '✅ EXISTS' as status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'reserve_variant_stock',
    'release_variant_stock',
    'reduce_variant_stock',
    'increase_variant_stock',
    'complete_stock_transfer_transaction',
    'find_or_create_variant_at_branch',
    'check_duplicate_transfer'
  )
ORDER BY routine_name;

-- List missing functions
SELECT 
  '❌ MISSING Functions:' as check_type,
  required_function
FROM (
  VALUES 
    ('reserve_variant_stock'),
    ('release_variant_stock'),
    ('reduce_variant_stock'),
    ('increase_variant_stock'),
    ('complete_stock_transfer_transaction'),
    ('find_or_create_variant_at_branch'),
    ('check_duplicate_transfer')
) AS required(required_function)
WHERE NOT EXISTS (
  SELECT 1 FROM information_schema.routines
  WHERE routine_schema = 'public'
  AND routine_name = required_function
);

-- ============================================================================
-- SUMMARY
-- ============================================================================

DO $$
DECLARE
  missing_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO missing_count
  FROM (
    VALUES 
      ('rejection_reason'),
      ('metadata')
  ) AS required(required_column)
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'branch_transfers' 
    AND column_name = required_column
  );

  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '📊 BRANCH_TRANSFERS DIAGNOSTIC COMPLETE';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  
  IF missing_count > 0 THEN
    RAISE NOTICE '❌ Found % missing column(s)', missing_count;
    RAISE NOTICE '⚠️  Run the FIX script next: 🔧-FIX-BRANCH-TRANSFERS-COLUMNS.sql';
  ELSE
    RAISE NOTICE '✅ All required columns exist!';
  END IF;
  
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;

