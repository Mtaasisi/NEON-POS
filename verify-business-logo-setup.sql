-- ============================================
-- Verify Business Logo Setup
-- ============================================
-- Run this script to verify that business logo feature is properly configured

-- Check 1: Verify general_settings table exists
SELECT 
  'general_settings table exists' as check_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'general_settings')
    THEN '✅ PASS'
    ELSE '❌ FAIL - Table does not exist'
  END as status;

-- Check 2: Verify all required columns exist
SELECT 
  'business_name column' as column_check,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'general_settings' AND column_name = 'business_name')
    THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
UNION ALL
SELECT 
  'business_address column',
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'general_settings' AND column_name = 'business_address')
    THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END
UNION ALL
SELECT 
  'business_phone column',
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'general_settings' AND column_name = 'business_phone')
    THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END
UNION ALL
SELECT 
  'business_email column',
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'general_settings' AND column_name = 'business_email')
    THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END
UNION ALL
SELECT 
  'business_website column',
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'general_settings' AND column_name = 'business_website')
    THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END
UNION ALL
SELECT 
  'business_logo column',
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'general_settings' AND column_name = 'business_logo')
    THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END;

-- Check 3: Show current business settings (if any exist)
SELECT 
  '=== Current Business Settings ===' as info,
  '' as value
UNION ALL
SELECT 
  'Business Name',
  COALESCE(business_name, 'NOT SET') as value
FROM general_settings
LIMIT 1
UNION ALL
SELECT 
  'Business Address',
  COALESCE(business_address, 'NOT SET')
FROM general_settings
LIMIT 1
UNION ALL
SELECT 
  'Business Phone',
  COALESCE(business_phone, 'NOT SET')
FROM general_settings
LIMIT 1
UNION ALL
SELECT 
  'Business Email',
  COALESCE(business_email, 'NOT SET')
FROM general_settings
LIMIT 1
UNION ALL
SELECT 
  'Business Website',
  COALESCE(business_website, 'NOT SET')
FROM general_settings
LIMIT 1
UNION ALL
SELECT 
  'Logo Status',
  CASE 
    WHEN business_logo IS NOT NULL THEN '✅ Logo Uploaded'
    ELSE '❌ No Logo'
  END
FROM general_settings
LIMIT 1;

-- Check 4: Test if we can insert/update (in a safe way)
DO $$ 
BEGIN
  -- Try to insert or update a test record
  INSERT INTO general_settings (business_name, business_address, business_phone)
  VALUES ('Test Store', 'Test Address', 'Test Phone')
  ON CONFLICT (id) DO NOTHING;
  
  RAISE NOTICE '✅ Database write permissions OK';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ Database write permissions FAILED: %', SQLERRM;
END $$;

-- Check 5: Show receipt_settings logo toggle (if exists)
SELECT 
  '=== Receipt Settings ===' as info,
  '' as value
UNION ALL
SELECT 
  'Show Business Logo',
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'receipt_settings' AND column_name = 'show_business_logo')
    THEN 
      CASE 
        WHEN (SELECT show_business_logo FROM receipt_settings LIMIT 1) THEN '✅ Enabled'
        ELSE '⚠️ Disabled'
      END
    ELSE '❌ Column does not exist'
  END;

-- Summary
SELECT 
  '=== SUMMARY ===' as summary,
  '' as recommendation
UNION ALL
SELECT 
  'If all checks show ✅',
  'You are ready to upload your business logo!'
UNION ALL
SELECT 
  'If any checks show ❌',
  'Run the migration: add-business-logo-fields.sql'
UNION ALL
SELECT 
  'Next Steps',
  '1. Go to Settings → POS Settings → General Settings'
UNION ALL
SELECT 
  '',
  '2. Upload your logo in Business Information section'
UNION ALL
SELECT 
  '',
  '3. Click Save Settings'
UNION ALL
SELECT 
  '',
  '4. Check a receipt to see your logo!';

