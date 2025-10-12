-- ============================================
-- QUICK CHECK: What users exist?
-- ============================================

SELECT '📋 Checking USERS table...' as status;

-- Show all users
SELECT 
  id,
  email,
  password,
  full_name,
  role,
  is_active
FROM users
ORDER BY created_at DESC;

-- Check if admin@pos.com exists
SELECT '🔍 Looking for admin@pos.com...' as status;

SELECT 
  id,
  email,
  password,
  full_name,
  role,
  is_active,
  CASE 
    WHEN is_active = true THEN '✅ Active'
    ELSE '❌ Inactive'
  END as status
FROM users
WHERE email = 'admin@pos.com';

-- Count total users
SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN is_active = true THEN 1 END) as active_users
FROM users;

