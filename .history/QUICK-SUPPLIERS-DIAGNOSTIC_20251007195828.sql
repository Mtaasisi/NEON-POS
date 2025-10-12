-- ============================================
-- QUICK SUPPLIERS DIAGNOSTIC
-- Run this to find out what's wrong
-- ============================================

-- Check 1: Does the table exist?
SELECT 
  '✅ CHECK 1: Table Existence' as check_name;

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename = 'lats_suppliers'
    ) 
    THEN '✅ lats_suppliers table EXISTS'
    ELSE '❌ lats_suppliers table DOES NOT EXIST!'
  END as table_status;

-- Check 2: Is RLS enabled and blocking?
SELECT 
  '✅ CHECK 2: RLS Status' as check_name;

SELECT 
  tablename,
  CASE 
    WHEN rowsecurity THEN '❌ RLS IS ENABLED (might be blocking)'
    ELSE '✅ RLS IS DISABLED'
  END as rls_status
FROM pg_tables 
WHERE tablename = 'lats_suppliers';

-- Check 3: What policies exist?
SELECT 
  '✅ CHECK 3: Active Policies' as check_name;

SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'lats_suppliers';

-- Check 4: Can we access the table?
SELECT 
  '✅ CHECK 4: Data Access Test' as check_name;

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'lats_suppliers') THEN
    RAISE NOTICE '✅ Table exists, testing access...';
    
    DECLARE
      supplier_count INTEGER;
    BEGIN
      SELECT COUNT(*) INTO supplier_count FROM lats_suppliers;
      RAISE NOTICE '✅ SUCCESS! Found % suppliers', supplier_count;
      
      IF supplier_count = 0 THEN
        RAISE WARNING '⚠️ Table is EMPTY - you need to add suppliers!';
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '❌ CANNOT ACCESS TABLE: %', SQLERRM;
    END;
  ELSE
    RAISE WARNING '❌ Table does not exist!';
  END IF;
END $$;

-- Check 5: Table structure
SELECT 
  '✅ CHECK 5: Table Structure' as check_name;

SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'lats_suppliers'
ORDER BY ordinal_position;

-- ============================================
-- RESULTS SUMMARY
-- ============================================
SELECT 
  '🎯 DIAGNOSTIC COMPLETE - Check results above' as summary;

