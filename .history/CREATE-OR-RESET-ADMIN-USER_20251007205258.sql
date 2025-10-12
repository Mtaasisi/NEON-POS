-- ============================================
-- CREATE OR RESET ADMIN USER WITH PASSWORD
-- This creates/updates the admin user in the 'users' table
-- ============================================

SELECT '🔧 Creating/Resetting admin user...' as status;

-- First, check what users exist
SELECT '📋 Current users in database:' as info;

SELECT 
  id,
  email,
  full_name,
  role,
  is_active,
  created_at
FROM users
ORDER BY created_at DESC;

-- ============================================
-- Create or update admin user
-- ============================================

SELECT '🔧 Setting up admin user...' as status;

-- Delete old admin user if exists (to start fresh)
DELETE FROM users WHERE email = 'admin@pos.com';

-- Create new admin user with known password
INSERT INTO users (
  id,
  email,
  password,
  full_name,
  role,
  is_active,
  created_at,
  updated_at
) VALUES (
  '287ec561-d5f2-4113-840e-e9335b9d3f69', -- Use existing UUID from your logs
  'admin@pos.com',
  'admin123',  -- Simple password for testing
  'Admin User',
  'admin',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  email = 'admin@pos.com',
  password = 'admin123',
  full_name = 'Admin User',
  role = 'admin',
  is_active = true,
  updated_at = NOW();

-- Also ensure the user exists in auth_users table (for profile lookup)
INSERT INTO auth_users (
  id,
  email,
  username,
  name,
  role,
  is_active,
  permissions,
  max_devices_allowed,
  require_approval,
  failed_login_attempts,
  two_factor_enabled,
  created_at,
  updated_at
) VALUES (
  '287ec561-d5f2-4113-840e-e9335b9d3f69',
  'admin@pos.com',
  'admin@pos.com',
  'Admin User',
  'admin',
  true,
  ARRAY['all'],
  1000,
  false,
  0,
  false,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  email = 'admin@pos.com',
  username = 'admin@pos.com',
  name = 'Admin User',
  role = 'admin',
  is_active = true,
  updated_at = NOW();

-- ============================================
-- Verify the admin user
-- ============================================

SELECT '✅ Admin user created/updated!' as status;

SELECT '📋 User credentials:' as info;

SELECT 
  id,
  email,
  full_name,
  role,
  is_active,
  '✅ Active and ready' as status
FROM users
WHERE email = 'admin@pos.com';

-- ============================================
-- Login Instructions
-- ============================================

SELECT '🎉 ADMIN USER IS READY!' as result;
SELECT '' as blank;
SELECT '🔐 LOGIN CREDENTIALS:' as title;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;
SELECT '📧 Email:    admin@pos.com' as credential_1;
SELECT '🔑 Password: admin123' as credential_2;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator2;
SELECT '' as blank2;
SELECT '💡 Go to your login page and use these credentials!' as next_step;
SELECT '✅ The user is active and ready to use!' as final_message;

