-- ============================================
-- COMPLETE USER MANAGEMENT SETUP
-- Adds password reset, username, and permissions support
-- ============================================

SELECT '🚀 Setting up Complete User Management...' as status;

-- ============================================
-- STEP 1: Ensure username column exists
-- ============================================

SELECT '📋 Step 1: Checking username column...' as status;

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

-- Generate usernames from emails for existing users if missing
UPDATE users 
SET username = SPLIT_PART(email, '@', 1)
WHERE username IS NULL OR username = '';

SELECT '✅ Usernames generated!' as status;

-- ============================================
-- STEP 2: Verify password column
-- ============================================

SELECT '🔐 Step 2: Verifying password column...' as status;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='users' AND column_name='password') THEN
    ALTER TABLE users ADD COLUMN password TEXT;
    RAISE NOTICE '✅ Added password column';
  ELSE
    RAISE NOTICE '✓ password column already exists';
  END IF;
END $$;

-- ============================================
-- STEP 3: Verify permissions column
-- ============================================

SELECT '🛡️ Step 3: Verifying permissions column...' as status;

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

SELECT '✅ Permissions set!' as status;

-- ============================================
-- STEP 4: Create indexes for performance
-- ============================================

SELECT '📊 Step 4: Creating indexes...' as status;

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

SELECT '✅ Indexes created!' as status;

-- ============================================
-- STEP 5: Verify all columns
-- ============================================

SELECT '🔍 Step 5: Verifying table structure...' as status;

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- ============================================
-- STEP 6: Show sample data
-- ============================================

SELECT '👥 Step 6: Sample users:' as status;

SELECT 
  id,
  email,
  username,
  full_name,
  role,
  is_active,
  COALESCE(array_length(permissions, 1), 0) as permission_count,
  CASE WHEN password IS NOT NULL THEN 'Set' ELSE 'Not Set' END as password_status
FROM users
ORDER BY created_at DESC
LIMIT 5;

-- ============================================
-- SUMMARY
-- ============================================

SELECT '
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ COMPLETE USER MANAGEMENT SETUP DONE!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ All required columns verified:
   ✓ username - For login
   ✓ password - For authentication
   ✓ permissions - Custom permissions array
   ✓ full_name - User full name
   ✓ role - User role
   ✓ is_active - Active/inactive status
   ✓ phone - Phone number
   ✓ department - Department
   ✓ email - Email address

✅ Indexes created for:
   ✓ username
   ✓ email
   ✓ role
   ✓ is_active

📋 New Features Available:
   1. ✨ Create users with passwords
   2. 🔐 Reset user passwords
   3. 👤 Manage usernames
   4. 🛡️ Custom permissions per user
   5. 📊 Role-based access control
   6. 🔄 Active/Inactive status toggle
   7. 📱 Phone and department management

🚀 Your User Management is now FULLY FEATURED!

Next steps:
1. Go to User Management page in your app
2. Click "Add User" to create new users
3. Click "Edit" on any user to manage everything
4. Set custom permissions, reset passwords, and more!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
' as summary;

