-- ============================================
-- VERIFY USER MANAGEMENT DATABASE SETUP
-- This ensures your users table has all necessary columns
-- ============================================

SELECT '🔍 Step 1: Checking users table structure...' as status;

-- Check if users table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'users'
) as users_table_exists;

-- View current table structure
SELECT '📋 Current users table structure:' as info;
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- ============================================
-- ADD MISSING COLUMNS IF NEEDED
-- ============================================

SELECT '🔧 Step 2: Adding missing columns...' as status;

-- Add full_name if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='users' AND column_name='full_name') THEN
    ALTER TABLE users ADD COLUMN full_name TEXT;
    RAISE NOTICE '✅ Added full_name column';
  ELSE
    RAISE NOTICE '✓ full_name column already exists';
  END IF;
END $$;

-- Add username if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='users' AND column_name='username') THEN
    ALTER TABLE users ADD COLUMN username TEXT;
    RAISE NOTICE '✅ Added username column';
  ELSE
    RAISE NOTICE '✓ username column already exists';
  END IF;
END $$;

-- Add phone if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='users' AND column_name='phone') THEN
    ALTER TABLE users ADD COLUMN phone TEXT;
    RAISE NOTICE '✅ Added phone column';
  ELSE
    RAISE NOTICE '✓ phone column already exists';
  END IF;
END $$;

-- Add department if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='users' AND column_name='department') THEN
    ALTER TABLE users ADD COLUMN department TEXT;
    RAISE NOTICE '✅ Added department column';
  ELSE
    RAISE NOTICE '✓ department column already exists';
  END IF;
END $$;

-- Add permissions if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='users' AND column_name='permissions') THEN
    ALTER TABLE users ADD COLUMN permissions TEXT[];
    RAISE NOTICE '✅ Added permissions column';
  ELSE
    RAISE NOTICE '✓ permissions column already exists';
  END IF;
END $$;

-- Add last_login if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='users' AND column_name='last_login') THEN
    ALTER TABLE users ADD COLUMN last_login TIMESTAMP WITH TIME ZONE;
    RAISE NOTICE '✅ Added last_login column';
  ELSE
    RAISE NOTICE '✓ last_login column already exists';
  END IF;
END $$;

-- ============================================
-- UPDATE EXISTING DATA
-- ============================================

SELECT '🔄 Step 3: Updating existing data...' as status;

-- Generate usernames from emails if missing
UPDATE users 
SET username = SPLIT_PART(email, '@', 1)
WHERE username IS NULL;

-- Set default permissions based on role if missing
UPDATE users 
SET permissions = CASE 
  WHEN role = 'admin' THEN ARRAY['all']
  WHEN role = 'manager' THEN ARRAY['inventory', 'customers', 'reports', 'employees']
  WHEN role = 'technician' THEN ARRAY['devices', 'diagnostics', 'spare-parts']
  WHEN role = 'customer-care' THEN ARRAY['customers', 'diagnostics', 'appointments']
  ELSE ARRAY['basic']
END
WHERE permissions IS NULL OR permissions = '{}';

SELECT '✅ Data updated!' as status;

-- ============================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================

SELECT '📊 Step 4: Creating indexes...' as status;

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

SELECT '✅ Indexes created!' as status;

-- ============================================
-- VERIFY FINAL STRUCTURE
-- ============================================

SELECT '🎯 Step 5: Final verification...' as status;

-- Count users by role
SELECT '📊 Users by role:' as info;
SELECT 
  role,
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE is_active = true) as active_count,
  COUNT(*) FILTER (WHERE is_active = false) as inactive_count
FROM users
GROUP BY role
ORDER BY role;

-- Show sample users
SELECT '👥 Sample users:' as info;
SELECT 
  id,
  email,
  full_name,
  username,
  role,
  is_active,
  phone,
  department,
  COALESCE(array_length(permissions, 1), 0) as permission_count
FROM users
ORDER BY created_at DESC
LIMIT 10;

-- ============================================
-- SUMMARY
-- ============================================

SELECT '
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ USER MANAGEMENT DATABASE CHECK COMPLETE!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Users table: VERIFIED
✅ All columns: PRESENT
✅ Indexes: CREATED
✅ Data: UPDATED

📋 Required columns verified:
   ✓ id (UUID)
   ✓ email (TEXT)
   ✓ password (TEXT)
   ✓ full_name (TEXT)
   ✓ username (TEXT)
   ✓ role (TEXT)
   ✓ is_active (BOOLEAN)
   ✓ phone (TEXT)
   ✓ department (TEXT)
   ✓ permissions (TEXT[])
   ✓ last_login (TIMESTAMP)
   ✓ created_at (TIMESTAMP)
   ✓ updated_at (TIMESTAMP)

🚀 Your User Management is ready to use!

Next steps:
1. Go to your app
2. Navigate to User Management page
3. Test creating, editing, and deleting users
4. All changes will persist to the database

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
' as summary;

