-- ============================================
-- ⚠️ CLEAN ALL TRANSACTIONS - USE WITH CAUTION
-- ============================================
-- This script will DELETE ALL transaction data
-- Make sure you have a backup before running!
-- ============================================

-- 🔴 IMPORTANT: Uncomment the lines below ONLY when you're ready to delete data

-- Step 1: Clean sales-related transactions (order matters due to foreign keys)
-- TRUNCATE TABLE lats_sale_items CASCADE;
-- TRUNCATE TABLE lats_sales CASCADE;

-- Step 2: Clean payment transactions
-- TRUNCATE TABLE customer_payments CASCADE;
-- TRUNCATE TABLE payment_transactions CASCADE;
-- TRUNCATE TABLE purchase_order_payments CASCADE;

-- Step 3: Clean account transactions
-- TRUNCATE TABLE account_transactions CASCADE;

-- Step 4: Clean financial transactions
-- TRUNCATE TABLE finance_expenses CASCADE;
-- TRUNCATE TABLE finance_transfers CASCADE;

-- Step 5: Reset account balances (optional - uncomment if needed)
-- UPDATE finance_accounts SET current_balance = 0 WHERE id IS NOT NULL;

-- Step 6: Reset customer total_spent (optional - uncomment if needed)
-- UPDATE customers SET total_spent = 0 WHERE id IS NOT NULL;

-- ============================================
-- VERIFICATION QUERIES (Safe to run anytime)
-- ============================================

-- Check how many records exist before deleting
SELECT 
  'lats_sales' as table_name, 
  COUNT(*) as record_count 
FROM lats_sales
UNION ALL
SELECT 
  'lats_sale_items', 
  COUNT(*) 
FROM lats_sale_items
UNION ALL
SELECT 
  'customer_payments', 
  COUNT(*) 
FROM customer_payments
UNION ALL
SELECT 
  'payment_transactions', 
  COUNT(*) 
FROM payment_transactions
UNION ALL
SELECT 
  'account_transactions', 
  COUNT(*) 
FROM account_transactions
UNION ALL
SELECT 
  'finance_expenses', 
  COUNT(*) 
FROM finance_expenses
UNION ALL
SELECT 
  'finance_transfers', 
  COUNT(*) 
FROM finance_transfers;

-- ============================================
-- USAGE INSTRUCTIONS
-- ============================================
-- 
-- 1. First, run the verification query above to see how many records exist
-- 2. Make a backup of your database (IMPORTANT!)
-- 3. Uncomment ONLY the tables you want to clean
-- 4. Run the script
-- 5. Run the verification query again to confirm
-- 
-- ============================================

