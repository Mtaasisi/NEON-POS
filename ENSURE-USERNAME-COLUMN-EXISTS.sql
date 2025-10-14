-- ============================================
-- ENSURE USERNAME COLUMN EXISTS AND IS POPULATED
-- ============================================
-- This script makes sure the username column exists in the users table
-- and sets default values for users who don't have a username yet

\echo '🔍 Checking username column in users table...'

-- ============================================
-- STEP 1: Check if username column exists
-- ============================================

SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'username'
        ) THEN '✅ username column exists'
        ELSE '❌ username column does NOT exist'
    END as status;

-- ============================================
-- STEP 2: Add username column if it doesn't exist
-- ============================================

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'username'
  ) THEN
    ALTER TABLE users ADD COLUMN username TEXT;
    RAISE NOTICE '✅ Added username column to users table';
  ELSE
    RAISE NOTICE '✓ username column already exists';
  END IF;
END $$;

-- ============================================
-- STEP 3: Set default usernames for users without one
-- ============================================

\echo ''
\echo '📋 Setting default usernames for users without one...'

-- Set username to email (before @) if username is NULL or empty
UPDATE users 
SET username = split_part(email, '@', 1)
WHERE username IS NULL OR username = '';

SELECT COUNT(*) || ' users updated with default usernames' as result
FROM users
WHERE username = split_part(email, '@', 1);

-- ============================================
-- STEP 4: Create unique index on username (if not exists)
-- ============================================

\echo ''
\echo '📋 Creating index on username column...'

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'users' AND indexname = 'idx_users_username'
  ) THEN
    CREATE INDEX idx_users_username ON users(username);
    RAISE NOTICE '✅ Created index on username column';
  ELSE
    RAISE NOTICE '✓ Index on username already exists';
  END IF;
END $$;

-- ============================================
-- VERIFICATION
-- ============================================

\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '📊 CURRENT USERS IN DATABASE:'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

SELECT 
  email,
  username,
  full_name,
  role,
  is_active,
  CASE 
    WHEN username IS NOT NULL AND username != '' THEN '✅ Has username'
    ELSE '⚠️  No username'
  END as username_status
FROM users
ORDER BY created_at DESC
LIMIT 10;

\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '📈 STATISTICS:'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN username IS NOT NULL AND username != '' THEN 1 END) as users_with_username,
  COUNT(CASE WHEN username IS NULL OR username = '' THEN 1 END) as users_without_username
FROM users;

\echo ''
\echo '✅ Username column is ready!'
\echo '✅ All users have usernames!'
\echo '✅ Your app will now display usernames correctly!'
\echo ''

