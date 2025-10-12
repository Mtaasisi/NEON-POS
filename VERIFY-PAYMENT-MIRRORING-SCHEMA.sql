-- ============================================================================
-- VERIFY AND OPTIMIZE PAYMENT MIRRORING SCHEMA
-- ============================================================================
-- This script verifies the customer_payments table structure and adds
-- performance indexes for payment mirroring functionality.
--
-- Run this to ensure your database is properly configured for payment tracking.
-- ============================================================================

-- 1. Verify customer_payments table structure
-- ============================================================================
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'customer_payments'
ORDER BY ordinal_position;

-- Expected columns:
-- - id (UUID)
-- - customer_id (UUID) - FK to customers
-- - device_id (UUID) - FK to devices
-- - sale_id (UUID) - FK to lats_sales
-- - amount (NUMERIC)
-- - method (TEXT)
-- - payment_type (TEXT)
-- - status (TEXT)
-- - reference_number (TEXT)
-- - transaction_id (TEXT)
-- - notes (TEXT)
-- - payment_date (TIMESTAMP WITH TIME ZONE)
-- - created_by (UUID)
-- - created_at (TIMESTAMP WITH TIME ZONE)
-- - updated_at (TIMESTAMP WITH TIME ZONE)

-- 2. Create missing indexes for better query performance
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

-- 3. Verify finance_accounts table structure
-- ============================================================================
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'finance_accounts'
ORDER BY ordinal_position;

-- 4. Verify account_transactions table structure
-- ============================================================================
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'account_transactions'
ORDER BY ordinal_position;

-- 5. Create indexes for account_transactions
-- ============================================================================

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

-- 6. Verify foreign key constraints
-- ============================================================================
SELECT
  tc.constraint_name,
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
  AND tc.table_name = 'customer_payments';

-- 7. Test query: Recent payments with sale information
-- ============================================================================
SELECT 
  cp.id,
  cp.sale_id,
  ls.sale_number,
  cp.customer_id,
  c.name as customer_name,
  cp.amount,
  cp.method,
  cp.payment_type,
  cp.status,
  cp.reference_number,
  cp.notes,
  cp.payment_date,
  cp.created_at
FROM customer_payments cp
LEFT JOIN lats_sales ls ON cp.sale_id = ls.id
LEFT JOIN customers c ON cp.customer_id = c.id
ORDER BY cp.created_at DESC
LIMIT 10;

-- 8. Test query: Finance account balances with recent activity
-- ============================================================================
SELECT 
  fa.id,
  fa.name,
  fa.account_type,
  fa.balance,
  fa.currency,
  fa.updated_at,
  COUNT(at.id) as transaction_count,
  SUM(CASE WHEN at.transaction_type = 'payment_received' THEN at.amount ELSE 0 END) as total_received
FROM finance_accounts fa
LEFT JOIN account_transactions at ON fa.id = at.account_id
WHERE fa.is_active = true
GROUP BY fa.id, fa.name, fa.account_type, fa.balance, fa.currency, fa.updated_at
ORDER BY fa.name;

-- 9. Test query: Payment reconciliation (sales vs payments)
-- ============================================================================
SELECT 
  ls.id as sale_id,
  ls.sale_number,
  ls.total_amount as sale_total,
  ls.payment_status,
  COALESCE(SUM(cp.amount), 0) as payments_total,
  ls.total_amount - COALESCE(SUM(cp.amount), 0) as difference,
  CASE 
    WHEN ls.total_amount = COALESCE(SUM(cp.amount), 0) THEN '✅ Matched'
    ELSE '⚠️ Mismatch'
  END as status
FROM lats_sales ls
LEFT JOIN customer_payments cp ON ls.id = cp.sale_id
WHERE ls.created_at >= NOW() - INTERVAL '7 days'
GROUP BY ls.id, ls.sale_number, ls.total_amount, ls.payment_status
HAVING ls.total_amount != COALESCE(SUM(cp.amount), 0)
ORDER BY ls.created_at DESC
LIMIT 20;

-- 10. Performance check: Table statistics
-- ============================================================================
SELECT 
  'customer_payments' as table_name,
  COUNT(*) as total_records,
  COUNT(DISTINCT customer_id) as unique_customers,
  COUNT(DISTINCT sale_id) as unique_sales,
  MIN(payment_date) as earliest_payment,
  MAX(payment_date) as latest_payment,
  SUM(amount) as total_amount
FROM customer_payments

UNION ALL

SELECT 
  'account_transactions' as table_name,
  COUNT(*) as total_records,
  COUNT(DISTINCT account_id) as unique_accounts,
  0 as unique_sales,
  MIN(created_at) as earliest_transaction,
  MAX(created_at) as latest_transaction,
  SUM(amount) as total_amount
FROM account_transactions
WHERE transaction_type = 'payment_received';

-- ============================================================================
-- VERIFICATION CHECKLIST
-- ============================================================================
-- 
-- ✅ customer_payments table exists with correct columns
-- ✅ sale_id column exists in customer_payments
-- ✅ reference_number column exists (not payment_account_id)
-- ✅ No currency column exists in customer_payments
-- ✅ All indexes are created
-- ✅ Foreign key constraints are in place
-- ✅ Sample queries return data correctly
-- 
-- ============================================================================

