a -- ================================================================================
-- DIAGNOSE PAYMENT METHODS TABLE STRUCTURE
-- ================================================================================
-- This script checks the actual structure of finance_accounts table
-- Run this first to see what columns exist
-- ================================================================================

-- Check if finance_accounts table exists
SELECT 
    'Table Check' as info,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'finance_accounts'
        ) THEN 'finance_accounts table EXISTS'
        ELSE 'finance_accounts table DOES NOT EXIST'
    END as status;

-- Show all columns in finance_accounts table
SELECT 
    'Column Structure' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'finance_accounts'
ORDER BY ordinal_position;

-- Show sample data from finance_accounts (if any)
SELECT 
    'Sample Data' as info,
    *
FROM finance_accounts
LIMIT 5;

-- Count payment methods
SELECT 
    'Payment Method Count' as info,
    COUNT(*) as total_records,
    COUNT(CASE WHEN is_payment_method = true THEN 1 END) as payment_methods,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_records
FROM finance_accounts;

