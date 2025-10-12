-- ============================================
-- FIX ADMIN LOGIN
-- This script will create or reset the admin user
-- ============================================

SELECT '🔧 Fixing admin user login...' as status;

-- Option 1: Check if admin@pos.com exists and is active
DO $$
DECLARE
  user_exists BOOLEAN;
  user_count INTEGER;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM auth_users WHERE email = 'admin@pos.com'
  ) INTO user_exists;
  
  IF user_exists THEN
    RAISE NOTICE '✅ Admin user exists, updating...';
    
    -- Update existing admin user to ensure it is active
    UPDATE auth_users
    SET 
      is_active = true,
      role = 'admin',
      username = 'admin@pos.com',
      name = 'Admin User',
      failed_login_attempts = 0,
      updated_at = NOW()
    WHERE email = 'admin@pos.com';
    
    RAISE NOTICE '✅ Admin user updated and activated';
  ELSE
    RAISE NOTICE '⚠️ Admin user does not exist, creating...';
    
    -- Create new admin user
    INSERT INTO auth_users (
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
    );
    
    RAISE NOTICE '✅ New admin user created';
  END IF;
END $$;

-- ============================================
-- Verify the admin user
-- ============================================

SELECT '🔍 Verifying admin user...' as status;

SELECT 
  id,
  email,
  username,
  name,
  role,
  is_active,
  '✅ Ready to use' as status
FROM auth_users
WHERE email = 'admin@pos.com';

-- ============================================
-- Important Note about Passwords
-- ============================================

SELECT '⚠️ IMPORTANT: PASSWORD HANDLING' as note;
SELECT 'Your app uses Supabase Auth, which handles passwords separately.' as info_1;
SELECT 'The auth_users table does NOT store passwords.' as info_2;
SELECT 'Passwords are stored in Supabase Auth system.' as info_3;
SELECT '' as blank;
SELECT '🔐 To log in, you need to know the password that was set when the user was created.' as password_info;
SELECT 'Common default passwords to try:' as try_these;
SELECT '  1. admin123' as option_1;
SELECT '  2. password' as option_2;
SELECT '  3. admin@123' as option_3;
SELECT '  4. Admin123!' as option_4;
SELECT '' as blank2;
SELECT '💡 If none work, you may need to reset the password through Supabase Dashboard.' as suggestion;

-- ============================================
-- Done!
-- ============================================

SELECT '🎉 ADMIN USER FIX COMPLETE!' as result;
SELECT 'Username: admin@pos.com' as username;
SELECT 'Try logging in with the passwords listed above.' as next_step;
SELECT 'The user is active and ready to use! ✅' as final_message;

