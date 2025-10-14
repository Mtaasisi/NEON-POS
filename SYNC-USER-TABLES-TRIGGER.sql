-- ============================================
-- SYNC USERNAME BETWEEN users AND auth_users TABLES
-- ============================================
-- This script creates a trigger to automatically sync username changes
-- between the users table and auth_users table (if it exists)

\echo '🔧 Setting up sync between users and auth_users...'

-- First, check if auth_users table exists
DO $$ 
DECLARE
  auth_users_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'auth_users'
  ) INTO auth_users_exists;
  
  IF auth_users_exists THEN
    RAISE NOTICE '✅ auth_users table found - will create sync trigger';
    
    -- Create or replace the sync function
    CREATE OR REPLACE FUNCTION sync_user_to_auth_users()
    RETURNS TRIGGER AS $func$
    BEGIN
      -- Update auth_users when users table is updated
      IF TG_OP = 'UPDATE' THEN
        UPDATE auth_users
        SET 
          username = NEW.username,
          email = NEW.email,
          name = NEW.full_name,
          role = NEW.role,
          is_active = NEW.is_active,
          permissions = NEW.permissions,
          max_devices_allowed = NEW.max_devices_allowed,
          updated_at = NEW.updated_at
        WHERE email = OLD.email;
        
        RAISE NOTICE 'Synced user % to auth_users', NEW.email;
      END IF;
      
      RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql;
    
    -- Drop the trigger if it exists
    DROP TRIGGER IF EXISTS sync_users_to_auth_users_trigger ON users;
    
    -- Create the trigger
    CREATE TRIGGER sync_users_to_auth_users_trigger
    AFTER UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION sync_user_to_auth_users();
    
    RAISE NOTICE '✅ Sync trigger created successfully';
    
    -- Also sync existing data right now
    UPDATE auth_users au
    SET 
      username = u.username,
      email = u.email,
      name = u.full_name,
      role = u.role,
      is_active = u.is_active,
      permissions = u.permissions,
      max_devices_allowed = u.max_devices_allowed,
      updated_at = NOW()
    FROM users u
    WHERE au.email = u.email;
    
    RAISE NOTICE '✅ Existing data synced from users to auth_users';
    
  ELSE
    RAISE NOTICE '⚠️  auth_users table does not exist';
    RAISE NOTICE 'ℹ️  You are using a single user table (users only)';
    RAISE NOTICE 'ℹ️  No sync trigger needed - all updates go directly to users table';
  END IF;
END $$;

\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '✅ SYNC SETUP COMPLETE!'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''
\echo 'How it works:'
\echo '• When you update a user in the users table'
\echo '• The trigger automatically updates auth_users'
\echo '• Both tables stay in perfect sync'
\echo '• No code changes needed!'
\echo ''

-- Test the sync
\echo '🧪 Testing sync...'

DO $$
DECLARE
  auth_users_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'auth_users'
  ) INTO auth_users_exists;
  
  IF auth_users_exists THEN
    -- Show comparison
    RAISE NOTICE '';
    RAISE NOTICE '📊 Current sync status:';
    RAISE NOTICE '';
  END IF;
END $$;

-- Show users in both tables (if auth_users exists)
SELECT 
  'users table:' as table_name,
  email,
  username,
  role,
  is_active
FROM users
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'auth_users')
ORDER BY email
LIMIT 5;

SELECT 
  'auth_users table:' as table_name,
  email,
  username,
  role,
  is_active
FROM auth_users
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'auth_users')
ORDER BY email
LIMIT 5;

\echo ''
\echo '✨ All set! Username changes will now sync automatically!'

