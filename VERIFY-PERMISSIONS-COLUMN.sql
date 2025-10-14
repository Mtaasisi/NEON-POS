-- ============================================
-- VERIFY PERMISSIONS COLUMN TYPE
-- ============================================
-- This script checks if the permissions column is properly set as TEXT[] type
-- Run this to verify the fix for the "permissions is of type text[] but expression is of type jsonb" error

\echo '🔍 Checking permissions column type...'

-- Check the data type of permissions column
SELECT 
    column_name,
    data_type,
    udt_name,
    CASE 
        WHEN data_type = 'ARRAY' THEN '✅ Correct (TEXT[] array)'
        WHEN data_type = 'jsonb' THEN '❌ Wrong (should be TEXT[])'
        ELSE '⚠️  Unexpected type: ' || data_type
    END as status
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'permissions';

\echo ''
\echo '📋 Sample permissions data:'

-- Show some sample permissions data
SELECT 
    id,
    email,
    role,
    permissions,
    CASE 
        WHEN permissions IS NULL THEN '⚠️  NULL'
        WHEN array_length(permissions, 1) IS NULL THEN '⚠️  Empty array'
        ELSE '✅ ' || array_length(permissions, 1)::TEXT || ' permission(s)'
    END as permissions_status
FROM users
LIMIT 5;

\echo ''
\echo '📊 Summary by role:'

-- Summary of permissions by role
SELECT 
    role,
    COUNT(*) as user_count,
    COUNT(CASE WHEN permissions IS NOT NULL AND array_length(permissions, 1) > 0 THEN 1 END) as with_permissions,
    COUNT(CASE WHEN permissions IS NULL OR array_length(permissions, 1) IS NULL THEN 1 END) as without_permissions
FROM users
GROUP BY role
ORDER BY role;

\echo ''
\echo '✨ Verification complete!'
\echo ''
\echo 'If the column type shows "TEXT[]" or "ARRAY", the database is configured correctly.'
\echo 'The application fix in supabaseClient.ts will now properly format arrays for this column.'

