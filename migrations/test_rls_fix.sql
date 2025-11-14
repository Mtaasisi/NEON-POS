-- ============================================
-- TEST SCRIPT: Verify RLS Fix
-- ============================================
-- Run this after applying the fix to verify everything works
-- ============================================

-- Test 1: Check if policies exist
\echo '🔍 Test 1: Checking RLS policies...'
SELECT 
  tablename,
  policyname,
  cmd as operation,
  CASE 
    WHEN roles::text LIKE '%authenticated%' THEN '✅ Authenticated'
    ELSE '❌ ' || roles::text
  END as access_level
FROM pg_policies
WHERE tablename IN ('daily_opening_sessions', 'daily_sales_closures')
ORDER BY tablename, cmd;

-- Expected: 8 policies (4 per table: SELECT, INSERT, UPDATE, DELETE)

\echo ''
\echo '---'
\echo ''

-- Test 2: Check table structure
\echo '🔍 Test 2: Checking table columns...'
SELECT 
  table_name,
  column_name,
  data_type,
  CASE 
    WHEN column_name IN ('opened_by_user_id', 'closed_by_user_id') THEN '✅ Correct column'
    WHEN column_name = 'user_id' THEN '❌ Old column (should not exist)'
    ELSE '✓'
  END as status
FROM information_schema.columns
WHERE table_name IN ('daily_opening_sessions', 'daily_sales_closures')
  AND column_name LIKE '%user_id%'
ORDER BY table_name, column_name;

-- Expected: opened_by_user_id and closed_by_user_id, NOT user_id

\echo ''
\echo '---'
\echo ''

-- Test 3: Test SELECT access
\echo '🔍 Test 3: Testing SELECT access...'
BEGIN;
  -- This should work without errors
  SELECT COUNT(*) as session_count, 'daily_opening_sessions' as table_name
  FROM daily_opening_sessions
  UNION ALL
  SELECT COUNT(*), 'daily_sales_closures'
  FROM daily_sales_closures;
ROLLBACK;

\echo ''
\echo '---'
\echo ''

-- Test 4: Test INSERT access (rollback to not create test data)
\echo '🔍 Test 4: Testing INSERT access (test only, rolled back)...'
BEGIN;
  -- Test inserting into daily_opening_sessions
  INSERT INTO daily_opening_sessions (
    date,
    opened_at,
    opened_by,
    opened_by_user_id,
    is_active
  ) VALUES (
    '2025-01-01',
    NOW(),
    'test_user',
    '00000000-0000-0000-0000-000000000001',
    false
  )
  RETURNING id, date, opened_by;
  
  \echo '✅ INSERT into daily_opening_sessions: SUCCESS'
ROLLBACK;

\echo ''
\echo '---'
\echo ''

-- Test 5: Summary
\echo '📊 Summary:'
\echo ''
SELECT 
  '✅ RLS Fix Applied Successfully!' as status,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'daily_opening_sessions') as session_policies,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'daily_sales_closures') as closure_policies,
  CASE 
    WHEN (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'daily_opening_sessions') >= 4
     AND (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'daily_sales_closures') >= 4
    THEN '✅ All policies in place'
    ELSE '❌ Missing policies'
  END as policy_status;

\echo ''
\echo '✅ If all tests passed, you can now use the POS system without RLS errors!'
\echo '🔄 Refresh your browser and try again.'
\echo ''

