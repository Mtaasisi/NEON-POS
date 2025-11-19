-- ================================================
-- DIAGNOSE AND FIX LOGIN ISSUES
-- ================================================
-- This script will help identify why login is failing
-- ================================================

\echo '=== STEP 1: CHECK IF USERS TABLE EXISTS ==='
SELECT 
    EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
    ) as users_table_exists;

\echo ''
\echo '=== STEP 2: CHECK USERS TABLE STRUCTURE ==='
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

\echo ''
\echo '=== STEP 3: COUNT TOTAL USERS ==='
SELECT COUNT(*) as total_users FROM users;

\echo ''
\echo '=== STEP 4: LIST ALL USERS ==='
SELECT 
    id,
    email,
    password,
    full_name,
    role,
    is_active,
    created_at
FROM users
ORDER BY created_at DESC;

\echo ''
\echo '=== STEP 5: CHECK SPECIFIC TEST USER (care@care.com) ==='
SELECT 
    id,
    email,
    password,
    full_name,
    role,
    is_active,
    LENGTH(password) as password_length,
    LENGTH(TRIM(password)) as trimmed_password_length
FROM users
WHERE email = 'care@care.com';

\echo ''
\echo '=== STEP 6: TEST LOGIN QUERY ==='
-- This simulates what the login function does
SELECT 
    id, 
    email, 
    full_name, 
    role, 
    is_active, 
    created_at, 
    updated_at 
FROM users 
WHERE email = 'care@care.com'
AND password = '123456'
AND is_active = true
LIMIT 1;

\echo ''
\echo '=== STEP 7: CHECK FOR PASSWORD ISSUES ==='
-- Check if password has extra spaces or special characters
SELECT 
    email,
    password,
    LENGTH(password) as length,
    OCTET_LENGTH(password) as bytes,
    password = '123456' as matches_plain,
    TRIM(password) = '123456' as matches_trimmed,
    encode(password::bytea, 'hex') as hex_representation
FROM users
WHERE email = 'care@care.com';

\echo ''
\echo '=== STEP 8: FIX - ENSURE TEST USERS EXIST WITH CORRECT PASSWORDS ==='
-- Delete existing care@care.com if it exists
DELETE FROM users WHERE email = 'care@care.com';

-- Insert fresh test user
INSERT INTO users (
    id,
    email,
    password,
    full_name,
    username,
    role,
    is_active,
    permissions,
    max_devices_allowed,
    branch_id,
    created_at,
    updated_at,
    require_approval,
    failed_login_attempts,
    two_factor_enabled
) VALUES (
    gen_random_uuid(),
    'care@care.com',
    '123456',
    'Admin User',
    'admin',
    'admin',
    true,
    ARRAY['all'],
    1000,
    '00000000-0000-0000-0000-000000000001',
    NOW(),
    NOW(),
    false,
    0,
    false
);

\echo ''
\echo '=== STEP 9: VERIFY TEST USER WAS CREATED ==='
SELECT 
    id,
    email,
    password,
    full_name,
    role,
    is_active,
    created_at
FROM users
WHERE email = 'care@care.com';

\echo ''
\echo '=== STEP 10: TEST LOGIN QUERY AGAIN ==='
SELECT 
    id, 
    email, 
    full_name, 
    role, 
    is_active, 
    created_at, 
    updated_at 
FROM users 
WHERE email = 'care@care.com'
AND password = '123456'
AND is_active = true
LIMIT 1;

\echo ''
\echo '=== STEP 11: CREATE ALL TEST USERS ==='
-- Insert admin@pos.com
INSERT INTO users (
    email, password, full_name, username, role, is_active, 
    permissions, max_devices_allowed, branch_id, 
    created_at, updated_at
) VALUES (
    'admin@pos.com', 'admin123', 'Admin User', 'admin', 'admin', true,
    ARRAY['all'], 1000, '00000000-0000-0000-0000-000000000001',
    NOW(), NOW()
) ON CONFLICT (email) DO UPDATE SET
    password = EXCLUDED.password,
    is_active = true,
    updated_at = NOW();

-- Insert tech@pos.com
INSERT INTO users (
    email, password, full_name, username, role, is_active,
    permissions, max_devices_allowed, branch_id,
    created_at, updated_at
) VALUES (
    'tech@pos.com', 'tech123', 'Tech User', 'tech', 'technician', true,
    ARRAY['all'], 1000, '00000000-0000-0000-0000-000000000001',
    NOW(), NOW()
) ON CONFLICT (email) DO UPDATE SET
    password = EXCLUDED.password,
    is_active = true,
    updated_at = NOW();

-- Insert manager@pos.com
INSERT INTO users (
    email, password, full_name, username, role, is_active,
    permissions, max_devices_allowed, branch_id,
    created_at, updated_at
) VALUES (
    'manager@pos.com', 'manager123', 'Manager User', 'manager', 'manager', true,
    ARRAY['all'], 1000, '00000000-0000-0000-0000-000000000001',
    NOW(), NOW()
) ON CONFLICT (email) DO UPDATE SET
    password = EXCLUDED.password,
    is_active = true,
    updated_at = NOW();

\echo ''
\echo '=== STEP 12: LIST ALL TEST USERS ==='
SELECT 
    email,
    password,
    full_name,
    role,
    is_active
FROM users
WHERE email IN ('care@care.com', 'admin@pos.com', 'tech@pos.com', 'manager@pos.com')
ORDER BY email;

\echo ''
\echo '=== CREDENTIALS TO TEST ==='
\echo 'Email: care@care.com | Password: 123456 | Role: admin'
\echo 'Email: admin@pos.com | Password: admin123 | Role: admin'
\echo 'Email: tech@pos.com | Password: tech123 | Role: technician'
\echo 'Email: manager@pos.com | Password: manager123 | Role: manager'
\echo ''
\echo '=== DIAGNOSIS COMPLETE ==='

