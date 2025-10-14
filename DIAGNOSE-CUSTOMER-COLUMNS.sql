-- ============================================================================
-- DIAGNOSTIC: Check Which Columns Exist in Customers Table
-- ============================================================================
-- Run this in your Neon SQL Editor to see exactly which columns are missing
-- ============================================================================

-- Show all columns that currently exist in the customers table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'customers'
ORDER BY ordinal_position;

-- Check for specific columns that the app needs
SELECT 
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'whatsapp') 
        THEN '✅ whatsapp exists' 
        ELSE '❌ whatsapp MISSING' END,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'country') 
        THEN '✅ country exists' 
        ELSE '❌ country MISSING' END,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'branch_id') 
        THEN '✅ branch_id exists' 
        ELSE '❌ branch_id MISSING' END,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'profile_image') 
        THEN '✅ profile_image exists' 
        ELSE '❌ profile_image MISSING' END,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'whatsapp_opt_out') 
        THEN '✅ whatsapp_opt_out exists' 
        ELSE '❌ whatsapp_opt_out MISSING' END,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'birthday') 
        THEN '✅ birthday exists' 
        ELSE '❌ birthday MISSING' END,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'referred_by') 
        THEN '✅ referred_by exists' 
        ELSE '❌ referred_by MISSING' END,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'created_by') 
        THEN '✅ created_by exists' 
        ELSE '❌ created_by MISSING' END,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'last_purchase_date') 
        THEN '✅ last_purchase_date exists' 
        ELSE '❌ last_purchase_date MISSING' END,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'total_purchases') 
        THEN '✅ total_purchases exists' 
        ELSE '❌ total_purchases MISSING' END,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'total_calls') 
        THEN '✅ total_calls exists' 
        ELSE '❌ total_calls MISSING' END,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'is_shared') 
        THEN '✅ is_shared exists' 
        ELSE '❌ is_shared MISSING' END,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'created_by_branch_id') 
        THEN '✅ created_by_branch_id exists' 
        ELSE '❌ created_by_branch_id MISSING' END,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'created_by_branch_name') 
        THEN '✅ created_by_branch_name exists' 
        ELSE '❌ created_by_branch_name MISSING' END;

-- Count total columns
SELECT 
    COUNT(*) as total_columns,
    CASE 
        WHEN COUNT(*) >= 46 THEN '✅ Sufficient columns (46+)'
        WHEN COUNT(*) >= 24 THEN '⚠️  Missing columns (has ' || COUNT(*) || ', needs 46+)'
        ELSE '❌ Critically low columns (has ' || COUNT(*) || ', needs 46+)'
    END as status
FROM information_schema.columns
WHERE table_name = 'customers';

