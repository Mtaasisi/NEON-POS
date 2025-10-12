-- ============================================
-- UPDATE ADMIN USER CREDENTIALS
-- Changes admin user to care@care.com with password 123456
-- ============================================

SELECT '🔧 Updating admin user credentials...' as status;

-- Update the existing admin user
UPDATE users
SET 
  email = 'care@care.com',
  password = '123456',
  full_name = 'Admin User',
  role = 'admin',
  is_active = true,
  updated_at = NOW()
WHERE id = '287ec561-d5f2-4113-840e-e9335b9d3f69'
  OR email = 'admin@pos.com';

-- Also update in auth_users table if it exists
UPDATE auth_users
SET 
  email = 'care@care.com',
  username = 'care@care.com',
  name = 'Admin User',
  role = 'admin',
  is_active = true,
  updated_at = NOW()
WHERE id = '287ec561-d5f2-4113-840e-e9335b9d3f69'
  OR email = 'admin@pos.com';

SELECT '✅ Admin user updated!' as status;

-- ============================================
-- Verify the update
-- ============================================

SELECT '🔍 Verifying updated admin user...' as status;

SELECT 
  id,
  email,
  password,
  full_name,
  role,
  is_active,
  '✅ Updated' as status
FROM users
WHERE email = 'care@care.com';

-- ============================================
-- Show all current users
-- ============================================

SELECT '📋 All users in database:' as info;

SELECT 
  email,
  password,
  full_name,
  role,
  is_active
FROM users
ORDER BY 
  CASE role
    WHEN 'admin' THEN 1
    WHEN 'manager' THEN 2
    WHEN 'technician' THEN 3
    WHEN 'customer-care' THEN 4
    ELSE 5
  END;

-- ============================================
-- Done!
-- ============================================

SELECT '🎉 ADMIN USER UPDATE COMPLETE!' as result;
SELECT '' as blank;
SELECT '🔐 NEW LOGIN CREDENTIALS:' as title;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;
SELECT '📧 Email:    care@care.com' as credential_1;
SELECT '🔑 Password: 123456' as credential_2;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator2;
SELECT '' as blank2;
SELECT '💡 Refresh your app and use these credentials to log in!' as next_step;

