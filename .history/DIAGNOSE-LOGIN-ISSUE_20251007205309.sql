-- ============================================
-- DIAGNOSE LOGIN ISSUE
-- Check what users exist and their authentication setup
-- ============================================

SELECT '🔍 Checking authentication tables...' as status;

-- Check if auth_users table exists
SELECT '📋 AUTH_USERS table:' as info;

SELECT 
  id,
  email,
  username,
  name,
  role,
  is_active,
  last_login,
  created_at
FROM auth_users
ORDER BY created_at DESC
LIMIT 10;

-- Check if users table exists (alternative auth table)
SELECT '📋 USERS table (if exists):' as info;

SELECT 
  id,
  email,
  full_name,
  role,
  is_active,
  created_at
FROM users
ORDER BY created_at DESC
LIMIT 10;

-- Check for any admin users
SELECT '👑 Looking for admin users...' as info;

SELECT 
  id,
  email,
  username,
  name,
  role,
  is_active
FROM auth_users
WHERE role = 'admin' OR role = 'owner'
ORDER BY created_at DESC;

-- Count total users
SELECT '📊 User statistics:' as info;

SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN is_active = true THEN 1 END) as active_users,
  COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_users,
  COUNT(CASE WHEN role = 'owner' THEN 1 END) as owner_users
FROM auth_users;

-- ============================================
-- Summary
-- ============================================

SELECT '✅ DIAGNOSTIC COMPLETE!' as result;
SELECT 'Check the results above to see what users exist.' as info_1;
SELECT 'Look for the email/username you are trying to use.' as info_2;
SELECT 'If no users exist, we will create an admin user next.' as info_3;

