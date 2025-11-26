-- ============================================
-- VERIFY SALE REVERSAL DATABASE SETUP
-- ============================================
-- Run this script to verify all required columns and constraints
-- are in place for the sale reversal functionality
-- ============================================

\echo '🔍 Checking database schema for sale reversal...'
\echo ''

-- 1. Check lats_sales table structure
\echo '1️⃣ Checking lats_sales table...'
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'lats_sales'
    AND column_name IN ('id', 'status', 'payment_status', 'notes', 'sale_number', 'total_amount')
ORDER BY ordinal_position;

\echo ''
\echo '✅ Required columns for lats_sales:'
\echo '   - id (uuid)'
\echo '   - status (text) - should support "reversed"'
\echo '   - payment_status (text) - should support "cancelled"'
\echo '   - notes (text) - for storing reversal info'
\echo '   - sale_number (text) - for finding transactions'
\echo ''

-- 2. Check payment_transactions status constraint
\echo '2️⃣ Checking payment_transactions status constraint...'
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'payment_transactions'::regclass
    AND conname = 'payment_transactions_status_check';

\echo ''
\echo '✅ payment_transactions status should allow: pending, completed, failed, cancelled'
\echo ''

-- 3. Check account_transactions table structure
\echo '3️⃣ Checking account_transactions table...'
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'account_transactions'
    AND column_name IN ('id', 'account_id', 'transaction_type', 'amount', 'metadata', 'reference_number')
ORDER BY ordinal_position;

\echo ''
\echo '✅ Required columns for account_transactions:'
\echo '   - id (uuid)'
\echo '   - account_id (uuid) - for reversing balances'
\echo '   - transaction_type (text) - should include "payment_received"'
\echo '   - amount (numeric) - for calculating reversals'
\echo '   - metadata (jsonb) - for storing reversal flags'
\echo '   - reference_number (text) - for finding by sale_number'
\echo ''

-- 4. Check lats_product_variants table structure
\echo '4️⃣ Checking lats_product_variants table...'
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'lats_product_variants'
    AND column_name IN ('id', 'quantity', 'product_id', 'updated_at')
ORDER BY ordinal_position;

\echo ''
\echo '✅ Required columns for lats_product_variants:'
\echo '   - id (uuid)'
\echo '   - quantity (integer) - for stock restoration'
\echo '   - product_id (uuid) - for stock movements'
\echo '   - updated_at (timestamp) - for tracking updates'
\echo ''

-- 5. Check lats_stock_movements table exists
\echo '5️⃣ Checking lats_stock_movements table...'
SELECT EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_name = 'lats_stock_movements'
) AS table_exists;

\echo ''
\echo '✅ lats_stock_movements should exist for tracking stock restoration'
\echo ''

-- 6. Check finance_accounts table structure
\echo '6️⃣ Checking finance_accounts table...'
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'finance_accounts'
    AND column_name IN ('id', 'balance', 'updated_at')
ORDER BY ordinal_position;

\echo ''
\echo '✅ Required columns for finance_accounts:'
\echo '   - id (uuid)'
\echo '   - balance (numeric) - for reversing payment amounts'
\echo '   - updated_at (timestamp) - for tracking updates'
\echo ''

-- 7. Check for trigger that syncs sales to payment_transactions
\echo '7️⃣ Checking for sync trigger...'
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_sync_sale_payment'
    AND event_object_table = 'lats_sales';

\echo ''
\echo '✅ trigger_sync_sale_payment should exist to sync sales to payment_transactions'
\echo ''

-- 8. Check customers table for stats reversal
\echo '8️⃣ Checking customers table...'
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'customers'
    AND column_name IN ('id', 'total_spent', 'points', 'updated_at')
ORDER BY ordinal_position;

\echo ''
\echo '✅ Required columns for customers:'
\echo '   - id (uuid)'
\echo '   - total_spent (numeric) - for reversing customer stats'
\echo '   - points (integer) - for reversing loyalty points'
\echo '   - updated_at (timestamp) - for tracking updates'
\echo ''

-- 9. Sample check: Find any sales with status='reversed'
\echo '9️⃣ Checking for existing reversed sales...'
SELECT COUNT(*) AS reversed_sales_count
FROM lats_sales
WHERE status = 'reversed';

\echo ''
\echo '📊 Found reversed sales: ' || (SELECT COUNT(*)::text FROM lats_sales WHERE status = 'reversed');
\echo ''

-- 10. Sample check: Find transactions with reversed metadata
\echo '🔟 Checking for reversed transactions...'
SELECT COUNT(*) AS reversed_transactions_count
FROM account_transactions
WHERE metadata->>'reversed' = 'true';

\echo ''
\echo '📊 Found reversed transactions: ' || (SELECT COUNT(*)::text FROM account_transactions WHERE metadata->>'reversed' = 'true');
\echo ''

-- 11. Verify payment_status constraint allows 'cancelled'
\echo '1️⃣1️⃣ Verifying payment_status can be set to "cancelled"...'
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM pg_constraint 
            WHERE conrelid = 'lats_sales'::regclass 
            AND conname LIKE '%payment_status%'
            AND pg_get_constraintdef(oid) LIKE '%cancelled%'
        ) THEN '✅ payment_status constraint allows "cancelled"'
        WHEN NOT EXISTS (
            SELECT 1 
            FROM pg_constraint 
            WHERE conrelid = 'lats_sales'::regclass 
            AND conname LIKE '%payment_status%'
        ) THEN '⚠️ No payment_status constraint found (should be OK)'
        ELSE '❌ payment_status constraint may not allow "cancelled"'
    END AS payment_status_check;

\echo ''
\echo '============================================'
\echo '✅ VERIFICATION COMPLETE'
\echo '============================================'
\echo ''
\echo 'If all checks passed, your database is ready for sale reversal!'
\echo ''

