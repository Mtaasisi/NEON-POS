-- ============================================
-- DIAGNOSE SMS 400 ERROR
-- This script checks everything related to the SMS settings
-- ============================================

SELECT '🔍 Checking if settings table exists...' as status;

-- Check if settings table exists
SELECT 
  table_name,
  '✅ Table exists' as status
FROM information_schema.tables
WHERE table_schema = 'public' 
  AND table_name = 'settings';

-- Check table structure
SELECT '🔍 Checking settings table structure...' as status;

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'settings'
ORDER BY ordinal_position;

-- Check if settings table has data
SELECT '🔍 Checking settings table data...' as status;

SELECT 
  COUNT(*) as total_settings,
  COUNT(CASE WHEN key = 'sms_provider_api_key' THEN 1 END) as has_api_key,
  COUNT(CASE WHEN key = 'sms_api_url' THEN 1 END) as has_api_url,
  COUNT(CASE WHEN key = 'sms_provider_password' THEN 1 END) as has_password
FROM settings;

-- Show actual SMS settings (with masked password)
SELECT '📋 Current SMS settings:' as status;

SELECT 
  key,
  CASE 
    WHEN key = 'sms_provider_password' THEN 
      CASE 
        WHEN value IS NULL THEN 'NULL'
        ELSE '****' || RIGHT(value, 4)
      END
    WHEN value IS NULL THEN 'NULL'
    ELSE value
  END as value,
  created_at,
  updated_at
FROM settings
WHERE key IN ('sms_provider_api_key', 'sms_api_url', 'sms_provider_password')
ORDER BY key;

-- Check RLS status
SELECT '🔒 Checking Row Level Security status...' as status;

SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'settings';

-- Try the exact query that the SMS service uses
SELECT '🔍 Testing the exact SMS service query...' as status;

SELECT key, value
FROM settings
WHERE key = 'sms_provider_api_key' 
   OR key = 'sms_api_url' 
   OR key = 'sms_provider_password';

-- Alternative: Check if the issue is with the OR syntax
SELECT '🔍 Testing alternative query syntax...' as status;

SELECT key, value
FROM settings
WHERE key IN ('sms_provider_api_key', 'sms_api_url', 'sms_provider_password');

-- ============================================
-- Summary
-- ============================================

SELECT '✅ DIAGNOSTIC COMPLETE!' as result;
SELECT 'If you see settings data above, the table is working correctly.' as info_1;
SELECT 'If RLS is enabled (true), that might be causing the 400 error.' as info_2;
SELECT 'Check the query results above to see if data is accessible.' as info_3;

