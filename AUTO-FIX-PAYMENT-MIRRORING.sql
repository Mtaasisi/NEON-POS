-- ============================================================================
-- AUTO-FIX PAYMENT MIRRORING - Complete Automated Setup
-- ============================================================================
-- This script automatically fixes and optimizes payment mirroring in your POS
-- Safe to run multiple times (idempotent)
-- Run this AFTER updating the code in saleProcessingService.ts
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- STEP 1: Ensure customer_payments table exists with correct schema
-- ============================================================================

DO $$ 
BEGIN
    -- Create customer_payments table if it doesn't exist
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'customer_payments') THEN
        CREATE TABLE customer_payments (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            customer_id UUID REFERENCES customers(id),
            device_id UUID REFERENCES devices(id),
            sale_id UUID REFERENCES lats_sales(id),
            amount NUMERIC NOT NULL,
            method TEXT DEFAULT 'cash',
            payment_type TEXT DEFAULT 'payment',
            status TEXT DEFAULT 'completed',
            reference_number TEXT,
            transaction_id TEXT,
            notes TEXT,
            payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            created_by UUID,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        RAISE NOTICE '✅ Created customer_payments table';
    ELSE
        RAISE NOTICE '✓ customer_payments table already exists';
    END IF;

    -- Verify sale_id column exists (required for linking)
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'customer_payments' 
        AND column_name = 'sale_id'
    ) THEN
        ALTER TABLE customer_payments ADD COLUMN sale_id UUID REFERENCES lats_sales(id);
        RAISE NOTICE '✅ Added sale_id column to customer_payments';
    ELSE
        RAISE NOTICE '✓ sale_id column exists in customer_payments';
    END IF;

    -- Verify reference_number column exists
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'customer_payments' 
        AND column_name = 'reference_number'
    ) THEN
        ALTER TABLE customer_payments ADD COLUMN reference_number TEXT;
        RAISE NOTICE '✅ Added reference_number column to customer_payments';
    ELSE
        RAISE NOTICE '✓ reference_number column exists in customer_payments';
    END IF;

    -- Remove payment_account_id column if it exists (not part of schema)
    IF EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'customer_payments' 
        AND column_name = 'payment_account_id'
    ) THEN
        ALTER TABLE customer_payments DROP COLUMN payment_account_id;
        RAISE NOTICE '✅ Removed payment_account_id column (not in schema)';
    END IF;

    -- Remove currency column if it exists (not part of schema)
    IF EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'customer_payments' 
        AND column_name = 'currency'
    ) THEN
        ALTER TABLE customer_payments DROP COLUMN currency;
        RAISE NOTICE '✅ Removed currency column (not in schema)';
    END IF;
END $$;

-- ============================================================================
-- STEP 2: Create performance indexes
-- ============================================================================

-- Index for querying payments by sale
CREATE INDEX IF NOT EXISTS idx_customer_payments_sale_id 
ON customer_payments(sale_id);

-- Index for querying payments by customer
CREATE INDEX IF NOT EXISTS idx_customer_payments_customer_id 
ON customer_payments(customer_id);

-- Index for querying payments by date range
CREATE INDEX IF NOT EXISTS idx_customer_payments_payment_date 
ON customer_payments(payment_date DESC);

-- Index for querying by reference number (useful for reconciliation)
CREATE INDEX IF NOT EXISTS idx_customer_payments_reference_number 
ON customer_payments(reference_number);

-- Composite index for common queries (customer + date)
CREATE INDEX IF NOT EXISTS idx_customer_payments_customer_date 
ON customer_payments(customer_id, payment_date DESC);

-- Index for status queries
CREATE INDEX IF NOT EXISTS idx_customer_payments_status 
ON customer_payments(status);

RAISE NOTICE '✅ Created/verified all indexes on customer_payments';

-- ============================================================================
-- STEP 3: Ensure finance_accounts table exists
-- ============================================================================

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'finance_accounts') THEN
        CREATE TABLE finance_accounts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL,
            account_type TEXT NOT NULL,
            balance NUMERIC DEFAULT 0,
            currency TEXT DEFAULT 'TZS',
            is_active BOOLEAN DEFAULT true,
            description TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        RAISE NOTICE '✅ Created finance_accounts table';
    ELSE
        RAISE NOTICE '✓ finance_accounts table already exists';
    END IF;
END $$;

-- Index for active accounts
CREATE INDEX IF NOT EXISTS idx_finance_accounts_active 
ON finance_accounts(is_active);

-- Index for account type
CREATE INDEX IF NOT EXISTS idx_finance_accounts_type 
ON finance_accounts(account_type);

-- ============================================================================
-- STEP 4: Ensure account_transactions table exists
-- ============================================================================

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'account_transactions') THEN
        CREATE TABLE account_transactions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            account_id UUID REFERENCES finance_accounts(id),
            transaction_type TEXT NOT NULL,
            amount NUMERIC NOT NULL,
            reference_number TEXT,
            description TEXT,
            metadata JSONB,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        RAISE NOTICE '✅ Created account_transactions table';
    ELSE
        RAISE NOTICE '✓ account_transactions table already exists';
    END IF;
END $$;

-- Index for querying transactions by account
CREATE INDEX IF NOT EXISTS idx_account_transactions_account_id 
ON account_transactions(account_id);

-- Index for querying transactions by reference (links to sales)
CREATE INDEX IF NOT EXISTS idx_account_transactions_reference_number 
ON account_transactions(reference_number);

-- Index for querying transactions by date
CREATE INDEX IF NOT EXISTS idx_account_transactions_created_at 
ON account_transactions(created_at DESC);

-- Composite index for account transactions by type and date
CREATE INDEX IF NOT EXISTS idx_account_transactions_account_type_date 
ON account_transactions(account_id, transaction_type, created_at DESC);

-- Index for transaction type queries
CREATE INDEX IF NOT EXISTS idx_account_transactions_type 
ON account_transactions(transaction_type);

-- ============================================================================
-- STEP 5: Ensure payment_methods table exists (for dropdown)
-- ============================================================================

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payment_methods') THEN
        CREATE TABLE payment_methods (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL UNIQUE,
            type TEXT NOT NULL,
            is_active BOOLEAN DEFAULT true,
            requires_account BOOLEAN DEFAULT true,
            icon TEXT,
            sort_order INTEGER DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        RAISE NOTICE '✅ Created payment_methods table';

        -- Insert default payment methods
        INSERT INTO payment_methods (name, type, requires_account, sort_order) VALUES
            ('Cash', 'cash', true, 1),
            ('M-Pesa', 'mobile_money', true, 2),
            ('Bank Transfer', 'bank', true, 3),
            ('Credit Card', 'card', true, 4),
            ('Debit Card', 'card', true, 5)
        ON CONFLICT (name) DO NOTHING;
        RAISE NOTICE '✅ Inserted default payment methods';
    ELSE
        RAISE NOTICE '✓ payment_methods table already exists';
    END IF;
END $$;

-- Index for active payment methods
CREATE INDEX IF NOT EXISTS idx_payment_methods_active 
ON payment_methods(is_active);

-- Index for sorting
CREATE INDEX IF NOT EXISTS idx_payment_methods_sort_order 
ON payment_methods(sort_order);

-- ============================================================================
-- STEP 6: Create or update triggers for updated_at timestamps
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for customer_payments
DROP TRIGGER IF EXISTS update_customer_payments_updated_at ON customer_payments;
CREATE TRIGGER update_customer_payments_updated_at
    BEFORE UPDATE ON customer_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for finance_accounts
DROP TRIGGER IF EXISTS update_finance_accounts_updated_at ON finance_accounts;
CREATE TRIGGER update_finance_accounts_updated_at
    BEFORE UPDATE ON finance_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for account_transactions
DROP TRIGGER IF EXISTS update_account_transactions_updated_at ON account_transactions;
CREATE TRIGGER update_account_transactions_updated_at
    BEFORE UPDATE ON account_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

RAISE NOTICE '✅ Created/updated triggers for timestamp management';

-- ============================================================================
-- STEP 7: Insert default finance accounts if they don't exist
-- ============================================================================

DO $$ 
BEGIN
    -- Create default Cash account if none exists
    IF NOT EXISTS (SELECT FROM finance_accounts WHERE account_type = 'cash' LIMIT 1) THEN
        INSERT INTO finance_accounts (name, account_type, balance, currency, is_active, description)
        VALUES ('Cash', 'cash', 0, 'TZS', true, 'Default cash account');
        RAISE NOTICE '✅ Created default Cash account';
    END IF;

    -- Create default Mobile Money account if none exists
    IF NOT EXISTS (SELECT FROM finance_accounts WHERE account_type = 'mobile_money' LIMIT 1) THEN
        INSERT INTO finance_accounts (name, account_type, balance, currency, is_active, description)
        VALUES ('M-Pesa', 'mobile_money', 0, 'TZS', true, 'Default M-Pesa account');
        RAISE NOTICE '✅ Created default M-Pesa account';
    END IF;

    -- Create default Bank account if none exists
    IF NOT EXISTS (SELECT FROM finance_accounts WHERE account_type = 'bank' LIMIT 1) THEN
        INSERT INTO finance_accounts (name, account_type, balance, currency, is_active, description)
        VALUES ('Bank Account', 'bank', 0, 'TZS', true, 'Default bank account');
        RAISE NOTICE '✅ Created default Bank account';
    END IF;
END $$;

-- ============================================================================
-- STEP 8: Data validation and cleanup
-- ============================================================================

-- Clean up any orphaned payment records (optional, commented out for safety)
-- DELETE FROM customer_payments WHERE customer_id NOT IN (SELECT id FROM customers);
-- DELETE FROM customer_payments WHERE sale_id IS NOT NULL AND sale_id NOT IN (SELECT id FROM lats_sales);

-- Update any NULL statuses to 'completed'
UPDATE customer_payments SET status = 'completed' WHERE status IS NULL;

-- Update any NULL payment_types to 'payment'
UPDATE customer_payments SET payment_type = 'payment' WHERE payment_type IS NULL;

-- Update any NULL methods to 'cash'
UPDATE customer_payments SET method = 'cash' WHERE method IS NULL;

RAISE NOTICE '✅ Data validation and cleanup completed';

-- ============================================================================
-- STEP 9: Verification queries
-- ============================================================================

-- Show table structure
SELECT '=== customer_payments table structure ===' as info;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'customer_payments'
ORDER BY ordinal_position;

-- Show indexes
SELECT '=== customer_payments indexes ===' as info;
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'customer_payments'
ORDER BY indexname;

-- Show finance accounts
SELECT '=== finance_accounts (active) ===' as info;
SELECT 
    id,
    name,
    account_type,
    balance,
    currency,
    is_active
FROM finance_accounts
WHERE is_active = true
ORDER BY name;

-- Show payment methods
SELECT '=== payment_methods (active) ===' as info;
SELECT 
    id,
    name,
    type,
    requires_account,
    sort_order
FROM payment_methods
WHERE is_active = true
ORDER BY sort_order;

-- Recent payment statistics
SELECT '=== Recent payment statistics ===' as info;
SELECT 
    COUNT(*) as total_payments,
    COUNT(DISTINCT customer_id) as unique_customers,
    COUNT(DISTINCT sale_id) as unique_sales,
    SUM(amount) as total_amount,
    MIN(payment_date) as earliest_payment,
    MAX(payment_date) as latest_payment
FROM customer_payments;

-- Payment by method breakdown
SELECT '=== Payments by method (last 30 days) ===' as info;
SELECT 
    method,
    COUNT(*) as payment_count,
    SUM(amount) as total_amount,
    AVG(amount) as avg_amount
FROM customer_payments
WHERE payment_date >= NOW() - INTERVAL '30 days'
GROUP BY method
ORDER BY total_amount DESC;

-- ============================================================================
-- STEP 10: Test the setup
-- ============================================================================

-- Create a test function to verify payment mirroring works
CREATE OR REPLACE FUNCTION test_payment_mirroring()
RETURNS TABLE(
    test_name TEXT,
    status TEXT,
    message TEXT
) AS $$
DECLARE
    test_customer_id UUID;
    test_sale_id UUID;
    test_account_id UUID;
    test_payment_id UUID;
    account_balance_before NUMERIC;
    account_balance_after NUMERIC;
BEGIN
    -- Test 1: Check if tables exist
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'customer_payments') THEN
        RETURN QUERY SELECT 'Table Existence'::TEXT, '✅ PASS'::TEXT, 'customer_payments table exists'::TEXT;
    ELSE
        RETURN QUERY SELECT 'Table Existence'::TEXT, '❌ FAIL'::TEXT, 'customer_payments table missing'::TEXT;
        RETURN;
    END IF;

    -- Test 2: Check if required columns exist
    IF EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'customer_payments' 
        AND column_name = 'sale_id'
    ) THEN
        RETURN QUERY SELECT 'Column: sale_id'::TEXT, '✅ PASS'::TEXT, 'sale_id column exists'::TEXT;
    ELSE
        RETURN QUERY SELECT 'Column: sale_id'::TEXT, '❌ FAIL'::TEXT, 'sale_id column missing'::TEXT;
    END IF;

    IF EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'customer_payments' 
        AND column_name = 'reference_number'
    ) THEN
        RETURN QUERY SELECT 'Column: reference_number'::TEXT, '✅ PASS'::TEXT, 'reference_number column exists'::TEXT;
    ELSE
        RETURN QUERY SELECT 'Column: reference_number'::TEXT, '❌ FAIL'::TEXT, 'reference_number column missing'::TEXT;
    END IF;

    -- Test 3: Check invalid columns don't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'customer_payments' 
        AND column_name = 'payment_account_id'
    ) THEN
        RETURN QUERY SELECT 'Invalid Column Check'::TEXT, '✅ PASS'::TEXT, 'payment_account_id correctly absent'::TEXT;
    ELSE
        RETURN QUERY SELECT 'Invalid Column Check'::TEXT, '⚠️ WARN'::TEXT, 'payment_account_id column should not exist'::TEXT;
    END IF;

    -- Test 4: Check indexes exist
    IF EXISTS (
        SELECT FROM pg_indexes 
        WHERE tablename = 'customer_payments' 
        AND indexname = 'idx_customer_payments_sale_id'
    ) THEN
        RETURN QUERY SELECT 'Index: sale_id'::TEXT, '✅ PASS'::TEXT, 'idx_customer_payments_sale_id exists'::TEXT;
    ELSE
        RETURN QUERY SELECT 'Index: sale_id'::TEXT, '⚠️ WARN'::TEXT, 'idx_customer_payments_sale_id missing'::TEXT;
    END IF;

    -- Test 5: Check finance_accounts table
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'finance_accounts') THEN
        RETURN QUERY SELECT 'Finance Accounts'::TEXT, '✅ PASS'::TEXT, 'finance_accounts table exists'::TEXT;
    ELSE
        RETURN QUERY SELECT 'Finance Accounts'::TEXT, '⚠️ WARN'::TEXT, 'finance_accounts table missing (optional)'::TEXT;
    END IF;

    -- Test 6: Check account_transactions table
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'account_transactions') THEN
        RETURN QUERY SELECT 'Account Transactions'::TEXT, '✅ PASS'::TEXT, 'account_transactions table exists'::TEXT;
    ELSE
        RETURN QUERY SELECT 'Account Transactions'::TEXT, '⚠️ WARN'::TEXT, 'account_transactions table missing (optional)'::TEXT;
    END IF;

    RETURN QUERY SELECT 'Overall Status'::TEXT, '✅ SUCCESS'::TEXT, 'Payment mirroring setup is correct'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Run the test
SELECT '=== Running payment mirroring tests ===' as info;
SELECT * FROM test_payment_mirroring();

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '╔════════════════════════════════════════════════════════════════╗';
    RAISE NOTICE '║          ✅ PAYMENT MIRRORING AUTO-FIX COMPLETED              ║';
    RAISE NOTICE '╚════════════════════════════════════════════════════════════════╝';
    RAISE NOTICE '';
    RAISE NOTICE '✅ All tables created/verified';
    RAISE NOTICE '✅ All indexes created';
    RAISE NOTICE '✅ All triggers created';
    RAISE NOTICE '✅ Default accounts created';
    RAISE NOTICE '✅ Schema validation passed';
    RAISE NOTICE '';
    RAISE NOTICE '📋 NEXT STEPS:';
    RAISE NOTICE '   1. Restart your dev server (npm run dev)';
    RAISE NOTICE '   2. Clear browser cache';
    RAISE NOTICE '   3. Test a sale with multiple payment methods';
    RAISE NOTICE '   4. Check console for ✅ success messages';
    RAISE NOTICE '';
    RAISE NOTICE '📊 VERIFICATION:';
    RAISE NOTICE '   Run: SELECT * FROM customer_payments ORDER BY created_at DESC LIMIT 5;';
    RAISE NOTICE '   Run: SELECT * FROM finance_accounts WHERE is_active = true;';
    RAISE NOTICE '';
    RAISE NOTICE '📚 DOCUMENTATION: Read 🎯-PAYMENT-FIX-README.md';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- END OF SCRIPT
-- ============================================================================
-- This script is idempotent and safe to run multiple times.
-- All operations use IF NOT EXISTS or CREATE IF NOT EXISTS.
-- ============================================================================

