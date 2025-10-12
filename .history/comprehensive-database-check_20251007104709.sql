-- ============================================
-- COMPREHENSIVE DATABASE DIAGNOSTIC CHECK
-- ============================================
-- Run this entire script to get a complete picture
-- of your database state before fixing anything

-- ============================================
-- SECTION 1: Check if all required tables exist
-- ============================================
SELECT '========== SECTION 1: TABLE EXISTENCE CHECK ==========' as section;

SELECT 
  t.table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = t.table_name
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM (
  VALUES 
    ('auth_users'),
    ('customers'),
    ('devices'),
    ('lats_categories'),
    ('lats_suppliers'),
    ('lats_products'),
    ('lats_product_variants'),
    ('lats_pos_general_settings'),
    ('lats_pos_receipt_settings'),
    ('lats_pos_advanced_settings'),
    ('lats_pos_dynamic_pricing_settings'),
    ('lats_pos_barcode_scanner_settings'),
    ('lats_pos_delivery_settings'),
    ('lats_pos_search_filter_settings'),
    ('lats_pos_user_permissions_settings'),
    ('lats_pos_loyalty_customer_settings'),
    ('lats_pos_analytics_reporting_settings'),
    ('lats_pos_notification_settings')
) AS t(table_name)
ORDER BY table_name;

-- ============================================
-- SECTION 2: Check column structure of settings tables
-- ============================================
SELECT '========== SECTION 2: COLUMN STRUCTURE CHECK ==========' as section;

-- Check lats_pos_general_settings structure
SELECT 
  'lats_pos_general_settings' as table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'lats_pos_general_settings'
ORDER BY ordinal_position;

-- Check lats_pos_receipt_settings structure
SELECT 
  'lats_pos_receipt_settings' as table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'lats_pos_receipt_settings'
ORDER BY ordinal_position;

-- Check lats_pos_advanced_settings structure
SELECT 
  'lats_pos_advanced_settings' as table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'lats_pos_advanced_settings'
ORDER BY ordinal_position;

-- Check lats_pos_dynamic_pricing_settings structure
SELECT 
  'lats_pos_dynamic_pricing_settings' as table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'lats_pos_dynamic_pricing_settings'
ORDER BY ordinal_position;

-- ============================================
-- SECTION 3: Check RLS status on all settings tables
-- ============================================
SELECT '========== SECTION 3: ROW LEVEL SECURITY STATUS ==========' as section;

SELECT 
  schemaname,
  tablename,
  CASE WHEN rowsecurity THEN '🔒 ENABLED' ELSE '🔓 DISABLED' END as rls_status
FROM pg_tables 
WHERE tablename LIKE 'lats_pos%'
ORDER BY tablename;

-- ============================================
-- SECTION 4: Check for RLS policies
-- ============================================
SELECT '========== SECTION 4: RLS POLICIES ==========' as section;

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as operation
FROM pg_policies 
WHERE tablename LIKE 'lats_pos%'
ORDER BY tablename, policyname;

-- ============================================
-- SECTION 5: Check record counts in settings tables
-- ============================================
SELECT '========== SECTION 5: RECORD COUNTS ==========' as section;

DO $$
DECLARE
  table_name text;
  record_count bigint;
BEGIN
  FOR table_name IN 
    SELECT t FROM (VALUES 
      ('lats_pos_general_settings'),
      ('lats_pos_receipt_settings'),
      ('lats_pos_advanced_settings'),
      ('lats_pos_dynamic_pricing_settings'),
      ('lats_pos_barcode_scanner_settings'),
      ('lats_pos_delivery_settings'),
      ('lats_pos_search_filter_settings'),
      ('lats_pos_user_permissions_settings'),
      ('lats_pos_loyalty_customer_settings'),
      ('lats_pos_analytics_reporting_settings'),
      ('lats_pos_notification_settings')
    ) AS tables(t)
  LOOP
    EXECUTE format('SELECT COUNT(*) FROM %I', table_name) INTO record_count;
    RAISE NOTICE '% : % records', table_name, record_count;
  END LOOP;
END $$;

-- ============================================
-- SECTION 6: Check indexes on settings tables
-- ============================================
SELECT '========== SECTION 6: INDEXES ==========' as section;

SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename LIKE 'lats_pos%'
ORDER BY tablename, indexname;

-- ============================================
-- SECTION 7: Check foreign key constraints
-- ============================================
SELECT '========== SECTION 7: FOREIGN KEY CONSTRAINTS ==========' as section;

SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name LIKE 'lats_pos%'
ORDER BY tc.table_name;

-- ============================================
-- SECTION 8: Check auth_users table for your user
-- ============================================
SELECT '========== SECTION 8: USER CHECK ==========' as section;

SELECT 
  id,
  email,
  username,
  role,
  is_active,
  created_at
FROM auth_users 
WHERE email LIKE '%admin%' OR email LIKE '%pos%'
ORDER BY created_at DESC
LIMIT 5;

-- ============================================
-- SECTION 9: Try to query settings tables directly
-- ============================================
SELECT '========== SECTION 9: DIRECT QUERY TEST ==========' as section;

-- Try to select from general settings
DO $$
BEGIN
  BEGIN
    PERFORM * FROM lats_pos_general_settings LIMIT 1;
    RAISE NOTICE '✅ lats_pos_general_settings: Query successful';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ lats_pos_general_settings: %', SQLERRM;
  END;
  
  BEGIN
    PERFORM * FROM lats_pos_receipt_settings LIMIT 1;
    RAISE NOTICE '✅ lats_pos_receipt_settings: Query successful';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ lats_pos_receipt_settings: %', SQLERRM;
  END;
  
  BEGIN
    PERFORM * FROM lats_pos_advanced_settings LIMIT 1;
    RAISE NOTICE '✅ lats_pos_advanced_settings: Query successful';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ lats_pos_advanced_settings: %', SQLERRM;
  END;
  
  BEGIN
    PERFORM * FROM lats_pos_dynamic_pricing_settings LIMIT 1;
    RAISE NOTICE '✅ lats_pos_dynamic_pricing_settings: Query successful';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ lats_pos_dynamic_pricing_settings: %', SQLERRM;
  END;
END $$;

-- ============================================
-- SECTION 10: Summary and recommendations
-- ============================================
SELECT '========== SECTION 10: SUMMARY ==========' as section;

SELECT 
  '📊 Diagnostic check complete!' as message,
  'Review the results above to identify any issues' as next_step;

-- ============================================
-- WHAT TO LOOK FOR:
-- ============================================
-- 1. Section 1: All tables should show '✅ EXISTS'
-- 2. Section 2: Check if general/receipt/advanced have 'key' column (OLD) or 'theme/language' columns (NEW)
-- 3. Section 3: RLS should be DISABLED (🔓) for all settings tables
-- 4. Section 4: Should show NO policies or only simple ones
-- 5. Section 5: Record counts - check if data exists
-- 6. Section 8: Your admin user should be listed
-- 7. Section 9: All queries should be successful (✅)

