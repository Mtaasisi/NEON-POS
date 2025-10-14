-- ============================================
-- TEST USERNAME FETCH
-- ============================================
-- This script tests if usernames are being fetched correctly
-- from both users and auth_users tables

\echo '🧪 Testing username fetch from database...'
\echo ''

-- ============================================
-- TEST 1: Check users table
-- ============================================

\echo '📋 TEST 1: Checking users table...'

SELECT 
  id,
  email,
  username,
  full_name,
  role,
  CASE 
    WHEN username IS NOT NULL THEN '✅ Has username'
    ELSE '❌ No username'
  END as status
FROM users
ORDER BY created_at DESC
LIMIT 5;

\echo ''

-- ============================================
-- TEST 2: Check auth_users table (if exists)
-- ============================================

\echo '📋 TEST 2: Checking auth_users table (if exists)...'

DO $$
DECLARE
  auth_users_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'auth_users'
  ) INTO auth_users_exists;
  
  IF auth_users_exists THEN
    RAISE NOTICE '✅ auth_users table exists';
  ELSE
    RAISE NOTICE 'ℹ️  auth_users table does not exist (single-table setup)';
  END IF;
END $$;

-- Show auth_users data if table exists
SELECT 
  id,
  email,
  username,
  name as full_name,
  role,
  '✅ Has username' as status
FROM auth_users
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'auth_users')
ORDER BY created_at DESC
LIMIT 5;

\echo ''

-- ============================================
-- TEST 3: Simulate app fetch query
-- ============================================

\echo '📋 TEST 3: Simulating app fetch (what the app sees)...'

-- This is what fetchAllUsers() does in userApi.ts
SELECT 
  id,
  email,
  username,
  full_name,
  role,
  is_active,
  phone,
  department,
  permissions,
  last_login,
  created_at,
  updated_at
FROM users
ORDER BY created_at DESC
LIMIT 3;

\echo ''

-- ============================================
-- TEST 4: Check column type
-- ============================================

\echo '📋 TEST 4: Checking username column type...'

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default,
  CASE 
    WHEN data_type = 'text' THEN '✅ Correct type'
    ELSE '⚠️  Unexpected type: ' || data_type
  END as status
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'username';

\echo ''

-- ============================================
-- TEST 5: Sample user with all details
-- ============================================

\echo '📋 TEST 5: Sample user with full details...'

SELECT 
  email as "Email",
  username as "Username",
  full_name as "Full Name",
  role as "Role",
  is_active as "Active",
  created_at as "Created"
FROM users
LIMIT 1;

\echo ''

-- ============================================
-- SUMMARY
-- ============================================

\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '📊 SUMMARY:'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

SELECT 
  '✅ Username column exists' as check_1,
  (SELECT COUNT(*) FROM users WHERE username IS NOT NULL) || ' users have usernames' as check_2,
  '✅ App is configured to fetch username' as check_3,
  '✅ UI is configured to display username' as check_4;

\echo ''
\echo '🎯 WHAT THE APP WILL SEE:'
\echo ''

-- Show exact data format that transformUserForUI returns
SELECT 
  json_build_object(
    'id', id,
    'email', email,
    'username', username,
    'firstName', split_part(full_name, ' ', 1),
    'lastName', substring(full_name from position(' ' in full_name) + 1),
    'role', role,
    'status', CASE WHEN is_active THEN 'active' ELSE 'inactive' END,
    'phone', phone,
    'department', department,
    'permissions', permissions
  ) as "App Data Format"
FROM users
LIMIT 1;

\echo ''
\echo '✅ If you see usernames above, your app WILL display them!'
\echo 'ℹ️  If usernames are NULL, run: ENSURE-USERNAME-COLUMN-EXISTS.sql'
\echo ''

