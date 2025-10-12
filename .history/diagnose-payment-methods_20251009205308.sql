-- ================================================================================
-- DIAGNOSE PAYMENT METHODS TABLE STRUCTURE
-- ================================================================================
-- This script checks the actual structure of finance_accounts table
-- Run this FIRST to see what columns exist before running any fixes
-- ================================================================================

-- Step 1: Check if finance_accounts table exists
SELECT 
    '=== TABLE EXISTENCE CHECK ===' as section,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'finance_accounts'
        ) THEN '✅ finance_accounts table EXISTS'
        ELSE '❌ finance_accounts table DOES NOT EXIST'
    END as status;

-- Step 2: Show all columns in finance_accounts table
SELECT 
    '=== COLUMN STRUCTURE ===' as section,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'finance_accounts'
ORDER BY ordinal_position;

-- Step 3: Check for specific required columns
SELECT 
    '=== REQUIRED COLUMNS CHECK ===' as section,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'finance_accounts' AND column_name = 'name') 
        THEN '✅ name' ELSE '❌ name (missing)' END as name_column,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'finance_accounts' AND column_name = 'account_name') 
        THEN '✅ account_name' ELSE '❌ account_name (missing)' END as account_name_column,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'finance_accounts' AND column_name = 'type') 
        THEN '✅ type' ELSE '❌ type (missing)' END as type_column,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'finance_accounts' AND column_name = 'account_type') 
        THEN '✅ account_type' ELSE '❌ account_type (missing)' END as account_type_column,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'finance_accounts' AND column_name = 'balance') 
        THEN '✅ balance' ELSE '❌ balance (missing)' END as balance_column,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'finance_accounts' AND column_name = 'current_balance') 
        THEN '✅ current_balance' ELSE '❌ current_balance (missing)' END as current_balance_column,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'finance_accounts' AND column_name = 'is_payment_method') 
        THEN '✅ is_payment_method' ELSE '❌ is_payment_method (CRITICAL - missing)' END as is_payment_method_column,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'finance_accounts' AND column_name = 'is_active') 
        THEN '✅ is_active' ELSE '❌ is_active (missing)' END as is_active_column;

-- Step 4: Count records
SELECT 
    '=== RECORD COUNT ===' as section,
    COUNT(*) as total_records
FROM finance_accounts;

-- Step 5: Show sample data (first 5 records)
SELECT 
    '=== SAMPLE DATA ===' as section,
    *
FROM finance_accounts
LIMIT 5;

-- Step 6: Try to count payment methods (this might fail if column doesn't exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'finance_accounts' AND column_name = 'is_payment_method') THEN
        RAISE NOTICE '=== PAYMENT METHOD COUNT ===';
        PERFORM COUNT(*) FROM finance_accounts WHERE is_payment_method = true;
    ELSE
        RAISE NOTICE '❌ Cannot count payment methods - is_payment_method column does not exist';
    END IF;
END $$;

-- Step 7: Final summary
SELECT 
    '=== DIAGNOSTIC SUMMARY ===' as section,
    'Run this diagnostic output will help create the correct fix script' as next_step;

