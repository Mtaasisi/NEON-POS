-- ================================================================================
-- VERIFY PAYMENT METHODS FIX
-- ================================================================================
-- This script verifies that payment methods are properly configured
-- Run this AFTER running fix-payment-methods-final.sql
-- ================================================================================

-- Verification 1: Check all required columns exist
SELECT 
    '=== COLUMN VERIFICATION ===' as section,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'finance_accounts' AND column_name = 'name') 
        THEN '✅ name exists' ELSE '❌ name MISSING' END as name_col,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'finance_accounts' AND column_name = 'type') 
        THEN '✅ type exists' ELSE '❌ type MISSING' END as type_col,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'finance_accounts' AND column_name = 'balance') 
        THEN '✅ balance exists' ELSE '❌ balance MISSING' END as balance_col,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'finance_accounts' AND column_name = 'is_payment_method') 
        THEN '✅ is_payment_method exists' ELSE '❌ is_payment_method MISSING (CRITICAL!)' END as is_payment_method_col,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'finance_accounts' AND column_name = 'is_active') 
        THEN '✅ is_active exists' ELSE '❌ is_active MISSING' END as is_active_col,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'finance_accounts' AND column_name = 'currency') 
        THEN '✅ currency exists' ELSE '❌ currency MISSING' END as currency_col,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'finance_accounts' AND column_name = 'icon') 
        THEN '✅ icon exists' ELSE '❌ icon MISSING' END as icon_col,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'finance_accounts' AND column_name = 'color') 
        THEN '✅ color exists' ELSE '❌ color MISSING' END as color_col;

-- Verification 2: Count payment methods
SELECT 
    '=== PAYMENT METHOD COUNTS ===' as section,
    COUNT(*) as total_accounts,
    COUNT(CASE WHEN is_payment_method = true THEN 1 END) as payment_methods,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_accounts,
    COUNT(CASE WHEN is_payment_method = true AND is_active = true THEN 1 END) as active_payment_methods
FROM finance_accounts;

-- Verification 3: Show all active payment methods (this is what the app queries)
SELECT 
    '=== ACTIVE PAYMENT METHODS (What POS Will Load) ===' as section,
    id,
    name,
    type,
    balance,
    currency,
    icon,
    color,
    is_active,
    is_payment_method,
    requires_reference,
    requires_account_number
FROM finance_accounts
WHERE is_payment_method = true 
  AND is_active = true
ORDER BY 
    CASE type
        WHEN 'cash' THEN 1
        WHEN 'mobile_money' THEN 2
        WHEN 'credit_card' THEN 3
        WHEN 'bank' THEN 4
        ELSE 5
    END,
    name;

-- Verification 4: Check for data quality issues
SELECT 
    '=== DATA QUALITY CHECK ===' as section,
    COUNT(CASE WHEN name IS NULL OR name = '' THEN 1 END) as missing_name,
    COUNT(CASE WHEN type IS NULL OR type = '' THEN 1 END) as missing_type,
    COUNT(CASE WHEN balance IS NULL THEN 1 END) as missing_balance,
    COUNT(CASE WHEN currency IS NULL OR currency = '' THEN 1 END) as missing_currency,
    COUNT(CASE WHEN icon IS NULL OR icon = '' THEN 1 END) as missing_icon,
    COUNT(CASE WHEN color IS NULL OR color = '' THEN 1 END) as missing_color
FROM finance_accounts
WHERE is_payment_method = true AND is_active = true;

-- Verification 5: Test the exact query the app uses
SELECT 
    '=== APP QUERY SIMULATION ===' as section,
    'This simulates: .from(finance_accounts).select(*).eq(is_active, true).eq(is_payment_method, true)' as query_info;

SELECT 
    id,
    name,
    type,
    balance,
    currency,
    is_active,
    is_payment_method
FROM finance_accounts
WHERE is_active = true 
  AND is_payment_method = true
ORDER BY name;

-- Verification 6: Payment method breakdown by type
SELECT 
    '=== PAYMENT METHODS BY TYPE ===' as section,
    type,
    COUNT(*) as count,
    array_agg(name ORDER BY name) as payment_names
FROM finance_accounts
WHERE is_payment_method = true AND is_active = true
GROUP BY type
ORDER BY type;

-- Final Status
DO $$
DECLARE
  payment_count INTEGER;
  all_have_icons BOOLEAN;
  all_have_colors BOOLEAN;
  all_have_names BOOLEAN;
BEGIN
  -- Count payment methods
  SELECT COUNT(*) INTO payment_count 
  FROM finance_accounts 
  WHERE is_payment_method = true AND is_active = true;
  
  -- Check data quality
  SELECT 
    COUNT(*) = COUNT(icon) AND COUNT(*) = COUNT(color) AND COUNT(*) = COUNT(name)
  INTO all_have_icons
  FROM finance_accounts 
  WHERE is_payment_method = true AND is_active = true;
  
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════════════════';
  RAISE NOTICE '           PAYMENT METHODS VERIFICATION RESULTS';
  RAISE NOTICE '════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  
  IF payment_count = 0 THEN
    RAISE NOTICE '❌ FAILED: No payment methods found!';
    RAISE NOTICE '';
    RAISE NOTICE 'The app query returned 0 records.';
    RAISE NOTICE 'This means payment methods will NOT load in POS.';
    RAISE NOTICE '';
    RAISE NOTICE 'Action Required:';
    RAISE NOTICE '  1. Run fix-payment-methods-final.sql again';
    RAISE NOTICE '  2. Check for errors during execution';
  ELSIF payment_count < 3 THEN
    RAISE NOTICE '⚠️  WARNING: Only % payment methods found', payment_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Payment methods will load, but you may want to add more.';
  ELSE
    RAISE NOTICE '✅ SUCCESS: % payment methods configured!', payment_count;
    RAISE NOTICE '';
    RAISE NOTICE 'All required columns: ✓';
    RAISE NOTICE 'Active payment methods: %', payment_count;
    RAISE NOTICE 'Data quality: %', CASE WHEN all_have_icons THEN '✓ Complete' ELSE '⚠ Some missing icons/colors' END;
    RAISE NOTICE '';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '  1. Restart your app: npm run dev';
    RAISE NOTICE '  2. Open POS and add item to cart';
    RAISE NOTICE '  3. Click "Process Payment"';
    RAISE NOTICE '  4. Payment modal should show % methods', payment_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Expected Console Log:';
    RAISE NOTICE '  ✅ Direct load successful: % methods', payment_count;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;

