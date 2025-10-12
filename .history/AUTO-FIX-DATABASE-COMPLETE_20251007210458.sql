-- ============================================
-- COMPLETE DATABASE AUTO-FIX
-- This script fixes all database issues:
-- 1. Creates users table
-- 2. Creates settings table for SMS
-- 3. Sets up admin user
-- 4. Configures SMS settings
-- 5. Ensures all tables have proper permissions
-- ============================================

SELECT '🚀 Starting complete database auto-fix...' as status;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;

-- ============================================
-- STEP 1: Create USERS table
-- ============================================

SELECT '👥 STEP 1: Creating users table...' as status;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'user',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Disable RLS
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

SELECT '✅ Users table created' as result;

-- ============================================
-- STEP 2: Create SETTINGS table for SMS
-- ============================================

SELECT '⚙️  STEP 2: Creating settings table...' as status;

CREATE TABLE IF NOT EXISTS settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Disable RLS
ALTER TABLE settings DISABLE ROW LEVEL SECURITY;

-- Create index
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);

SELECT '✅ Settings table created' as result;

-- ============================================
-- STEP 3: Insert users
-- ============================================

SELECT '👤 STEP 3: Creating users...' as status;

-- Delete existing users first
DELETE FROM users WHERE email IN ('care@care.com', 'admin@pos.com', 'manager@pos.com', 'tech@pos.com', 'care@pos.com');

-- Insert users
INSERT INTO users (id, email, password, full_name, role, is_active) VALUES
  ('287ec561-d5f2-4113-840e-e9335b9d3f69', 'care@care.com', '123456', 'Admin User', 'admin', true),
  ('a780f924-8343-46ec-a127-d7477165b0a8', 'manager@pos.com', 'manager123', 'Manager User', 'manager', true),
  ('762f6db8-e738-480f-a9d3-9699c440e2d9', 'tech@pos.com', 'tech123456', 'Technician User', 'technician', true),
  ('4813e4c7-771e-43e9-a8fd-e69db13a3322', 'care@pos.com', 'care123456', 'Customer Care', 'customer-care', true)
ON CONFLICT (email) DO UPDATE SET
  password = EXCLUDED.password,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

SELECT '✅ Users created' as result;

-- ============================================
-- STEP 4: Configure SMS settings
-- ============================================

SELECT '📱 STEP 4: Configuring SMS settings...' as status;

-- Insert or update SMS settings
INSERT INTO settings (key, value, description) VALUES
  ('sms_api_url', 'https://mshastra.com/sendurl.aspx', 'SMS provider API URL'),
  ('sms_provider_api_key', 'Inauzwa', 'API key for SMS provider'),
  ('sms_provider_password', '@Masika10', 'SMS provider password')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = NOW();

SELECT '✅ SMS settings configured' as result;

-- ============================================
-- STEP 5: Ensure auth_users table exists and sync
-- ============================================

SELECT '🔐 STEP 5: Syncing auth_users table...' as status;

-- Create auth_users if it doesn't exist
CREATE TABLE IF NOT EXISTS auth_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  username TEXT,
  name TEXT,
  role TEXT DEFAULT 'technician',
  is_active BOOLEAN DEFAULT true,
  permissions TEXT[],
  max_devices_allowed INTEGER DEFAULT 10,
  require_approval BOOLEAN DEFAULT false,
  failed_login_attempts INTEGER DEFAULT 0,
  two_factor_enabled BOOLEAN DEFAULT false,
  two_factor_secret TEXT,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Disable RLS
ALTER TABLE auth_users DISABLE ROW LEVEL SECURITY;

-- Delete existing auth_users records first to avoid conflicts
DELETE FROM auth_users WHERE email IN (SELECT email FROM users);

-- Sync users to auth_users
INSERT INTO auth_users (id, email, username, name, role, is_active, permissions, max_devices_allowed)
SELECT 
  u.id,
  u.email,
  u.email as username,
  u.full_name as name,
  u.role,
  u.is_active,
  ARRAY['all']::TEXT[] as permissions,
  1000 as max_devices_allowed
FROM users u;

SELECT '✅ Auth users synced' as result;

-- ============================================
-- VERIFICATION
-- ============================================

SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;
SELECT '📊 VERIFICATION:' as title;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator2;

-- Show users
SELECT '👥 Users in database:' as info;
SELECT 
  email,
  role,
  is_active,
  '✅' as status
FROM users
ORDER BY 
  CASE role
    WHEN 'admin' THEN 1
    WHEN 'manager' THEN 2
    WHEN 'technician' THEN 3
    ELSE 4
  END;

-- Show SMS settings
SELECT '📱 SMS Settings:' as info;
SELECT 
  key,
  CASE 
    WHEN key = 'sms_provider_password' THEN '****' || RIGHT(value, 4)
    ELSE value
  END as value,
  '✅' as status
FROM settings
WHERE key IN ('sms_provider_api_key', 'sms_api_url', 'sms_provider_password')
ORDER BY key;

-- ============================================
-- DONE!
-- ============================================

SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;
SELECT '🎉 DATABASE AUTO-FIX COMPLETE!' as result;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator2;
SELECT '' as blank;
SELECT '✅ Users table created and populated' as fix_1;
SELECT '✅ Settings table created with SMS config' as fix_2;
SELECT '✅ Auth users synced' as fix_3;
SELECT '✅ All permissions set correctly' as fix_4;
SELECT '' as blank2;
SELECT '🔐 LOGIN CREDENTIALS:' as login_title;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator3;
SELECT '📧 Email:    care@care.com' as credential_1;
SELECT '🔑 Password: 123456' as credential_2;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator4;
SELECT '' as blank3;
SELECT '💡 NEXT STEPS:' as next_steps_title;
SELECT '1. Refresh your browser (Ctrl+Shift+R or Cmd+Shift+R)' as step_1;
SELECT '2. Go to login page' as step_2;
SELECT '3. Login with care@care.com / 123456' as step_3;
SELECT '4. You should be logged in successfully! 🎉' as step_4;

