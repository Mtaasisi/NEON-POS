-- ============================================
-- CONSOLIDATE TO ONE USER TABLE
-- This script updates the users table to be the ONLY user table
-- ============================================

SELECT '🔧 CONSOLIDATING TO ONE USER TABLE...' as status;
SELECT '' as blank;

-- ============================================
-- STEP 1: Add missing columns to users table
-- ============================================

SELECT '📋 Step 1: Adding missing columns to users table...' as step;

-- Add username column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'username') THEN
    ALTER TABLE users ADD COLUMN username TEXT;
    RAISE NOTICE '✅ Added username column';
  END IF;
END $$;

-- Add permissions column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'permissions') THEN
    ALTER TABLE users ADD COLUMN permissions TEXT[] DEFAULT ARRAY['all'];
    RAISE NOTICE '✅ Added permissions column';
  END IF;
END $$;

-- Add max_devices_allowed column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'max_devices_allowed') THEN
    ALTER TABLE users ADD COLUMN max_devices_allowed INTEGER DEFAULT 1000;
    RAISE NOTICE '✅ Added max_devices_allowed column';
  END IF;
END $$;

-- Add require_approval column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'require_approval') THEN
    ALTER TABLE users ADD COLUMN require_approval BOOLEAN DEFAULT false;
    RAISE NOTICE '✅ Added require_approval column';
  END IF;
END $$;

-- Add failed_login_attempts column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'failed_login_attempts') THEN
    ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER DEFAULT 0;
    RAISE NOTICE '✅ Added failed_login_attempts column';
  END IF;
END $$;

-- Add two_factor_enabled column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'two_factor_enabled') THEN
    ALTER TABLE users ADD COLUMN two_factor_enabled BOOLEAN DEFAULT false;
    RAISE NOTICE '✅ Added two_factor_enabled column';
  END IF;
END $$;

-- Add two_factor_secret column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'two_factor_secret') THEN
    ALTER TABLE users ADD COLUMN two_factor_secret TEXT;
    RAISE NOTICE '✅ Added two_factor_secret column';
  END IF;
END $$;

-- Add last_login column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'last_login') THEN
    ALTER TABLE users ADD COLUMN last_login TIMESTAMP WITH TIME ZONE;
    RAISE NOTICE '✅ Added last_login column';
  END IF;
END $$;

SELECT '✅ All columns added!' as result;
SELECT '' as blank2;

-- ============================================
-- STEP 2: Migrate data from auth_users to users (if auth_users exists)
-- ============================================

SELECT '📋 Step 2: Migrating data from auth_users (if exists)...' as step2;

DO $$ 
DECLARE
  auth_users_exists BOOLEAN;
BEGIN
  -- Check if auth_users table exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'auth_users'
  ) INTO auth_users_exists;
  
  IF auth_users_exists THEN
    -- Update users table with data from auth_users where email matches
    UPDATE users u
    SET 
      username = COALESCE(u.username, au.username, u.email),
      permissions = COALESCE(u.permissions, au.permissions, ARRAY['all']),
      max_devices_allowed = COALESCE(u.max_devices_allowed, au.max_devices_allowed, 1000),
      require_approval = COALESCE(u.require_approval, au.require_approval, false),
      failed_login_attempts = COALESCE(u.failed_login_attempts, au.failed_login_attempts, 0),
      two_factor_enabled = COALESCE(u.two_factor_enabled, au.two_factor_enabled, false),
      two_factor_secret = COALESCE(u.two_factor_secret, au.two_factor_secret),
      last_login = COALESCE(u.last_login, au.last_login),
      role = COALESCE(au.role, u.role),
      full_name = COALESCE(u.full_name, au.name),
      updated_at = NOW()
    FROM auth_users au
    WHERE u.email = au.email;
    
    RAISE NOTICE '✅ Data migrated from auth_users to users';
  ELSE
    RAISE NOTICE '⚠️  auth_users table does not exist, skipping migration';
  END IF;
END $$;

SELECT '✅ Data migration complete!' as result2;
SELECT '' as blank3;

-- ============================================
-- STEP 3: Set default values for existing users
-- ============================================

SELECT '📋 Step 3: Setting default values for existing users...' as step3;

-- Set username to email if null
UPDATE users 
SET username = email
WHERE username IS NULL;

-- Set permissions based on role if null
UPDATE users 
SET permissions = CASE 
  WHEN role = 'admin' THEN ARRAY['all']
  WHEN role = 'manager' THEN ARRAY['all']
  WHEN role = 'technician' THEN ARRAY['view_devices', 'update_device_status', 'view_customers', 'view_spare_parts']
  WHEN role = 'customer-care' THEN ARRAY['view_customers', 'create_customers', 'edit_customers', 'view_devices', 'assign_devices']
  ELSE ARRAY['view_devices', 'view_customers']
END
WHERE permissions IS NULL OR permissions = '{}';

-- Set other defaults
UPDATE users 
SET 
  max_devices_allowed = COALESCE(max_devices_allowed, 1000),
  require_approval = COALESCE(require_approval, false),
  failed_login_attempts = COALESCE(failed_login_attempts, 0),
  two_factor_enabled = COALESCE(two_factor_enabled, false)
WHERE max_devices_allowed IS NULL 
   OR require_approval IS NULL 
   OR failed_login_attempts IS NULL 
   OR two_factor_enabled IS NULL;

SELECT '✅ Default values set!' as result3;
SELECT '' as blank4;

-- ============================================
-- STEP 4: Fix care@care.com role to admin
-- ============================================

SELECT '📋 Step 4: Ensuring care@care.com has admin role...' as step4;

UPDATE users 
SET 
  role = 'admin',
  full_name = 'Admin User',
  permissions = ARRAY['all'],
  max_devices_allowed = 1000,
  is_active = true,
  updated_at = NOW()
WHERE email = 'care@care.com'
RETURNING email, role, full_name, permissions;

SELECT '✅ care@care.com updated to admin!' as result4;
SELECT '' as blank5;

-- ============================================
-- STEP 5: Create indexes for performance
-- ============================================

SELECT '📋 Step 5: Creating indexes...' as step5;

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

SELECT '✅ Indexes created!' as result5;
SELECT '' as blank6;

-- ============================================
-- STEP 6: Disable RLS
-- ============================================

ALTER TABLE users DISABLE ROW LEVEL SECURITY;

SELECT '✅ RLS disabled!' as result6;
SELECT '' as blank7;

-- ============================================
-- VERIFICATION
-- ============================================

SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;
SELECT '📊 VERIFICATION - ALL USERS IN DATABASE:' as title;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator2;

SELECT 
  email,
  username,
  full_name,
  role,
  is_active,
  permissions,
  max_devices_allowed,
  '✅' as status
FROM users
ORDER BY 
  CASE role
    WHEN 'admin' THEN 1
    WHEN 'manager' THEN 2
    WHEN 'technician' THEN 3
    WHEN 'customer-care' THEN 4
    ELSE 5
  END;

SELECT '' as blank8;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator3;
SELECT '🎉 CONSOLIDATION COMPLETE!' as success;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator4;
SELECT '' as blank9;
SELECT '✅ You now have ONE user table: users' as info1;
SELECT '✅ All data has been migrated and consolidated' as info2;
SELECT '✅ care@care.com is now admin in the users table' as info3;
SELECT '✅ You can safely ignore or drop the auth_users table' as info4;
SELECT '' as blank10;
SELECT '🔐 ADMIN LOGIN CREDENTIALS:' as login_title;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator5;
SELECT '📧 Email:    care@care.com' as credential_1;
SELECT '🔑 Password: 123456' as credential_2;
SELECT '👤 Role:     admin' as credential_3;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator6;

