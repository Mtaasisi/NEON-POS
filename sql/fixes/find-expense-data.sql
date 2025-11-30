-- Find Your Expense Data
-- Use this to locate the exact tables and records for your expenses

-- ============================================================================
-- QUERY 1: Check which expense table has data
-- ============================================================================

-- Check expenses table
SELECT 
    'expenses' as table_name,
    COUNT(*) as row_count,
    SUM(amount) as total_amount,
    MAX(created_at) as latest_expense
FROM expenses
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days';

-- Check finance_expenses table
SELECT 
    'finance_expenses' as table_name,
    COUNT(*) as row_count,
    SUM(amount) as total_amount,
    MAX(created_at) as latest_expense
FROM finance_expenses
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days';

-- ============================================================================
-- QUERY 2: Find your specific PO Payment expenses
-- ============================================================================

-- Look for expenses around TSh 50M and 3.5M from Nov 7, 2024
SELECT 
    id,
    description,
    amount,
    category,
    created_at,
    payment_method
FROM expenses
WHERE created_at::date = '2024-11-07'
  AND (
    amount >= 49000000 AND amount <= 51000000  -- 50M range
    OR amount >= 3400000 AND amount <= 3600000  -- 3.5M range
  )
ORDER BY created_at DESC;

-- Try finance_expenses if above returns nothing
SELECT 
    id,
    description,
    amount,
    category,
    created_at,
    payment_method
FROM finance_expenses
WHERE created_at::date = '2024-11-07'
  AND (
    amount >= 49000000 AND amount <= 51000000  -- 50M range
    OR amount >= 3400000 AND amount <= 3600000  -- 3.5M range
  )
ORDER BY created_at DESC;

-- ============================================================================
-- QUERY 3: Find PO Payments linked to expenses
-- ============================================================================

-- Check purchase_order_payments
SELECT 
    id,
    purchase_order_id,
    amount,
    payment_date,
    payment_method,
    reference_number
FROM purchase_order_payments
WHERE payment_date::date = '2024-11-07'
ORDER BY payment_date DESC;

-- Check lats_purchase_order_payments
SELECT 
    id,
    purchase_order_id,
    amount,
    payment_date,
    payment_method,
    notes
FROM lats_purchase_order_payments
WHERE payment_date::date = '2024-11-07'
ORDER BY payment_date DESC;

-- ============================================================================
-- QUERY 4: Get TODAY's total (TSh 53.5M)
-- ============================================================================

-- Today's expenses from expenses table
SELECT 
    COUNT(*) as expense_count,
    SUM(amount) as total_today,
    MIN(created_at) as first_expense,
    MAX(created_at) as last_expense
FROM expenses
WHERE created_at::date = CURRENT_DATE;

-- Today's expenses from finance_expenses table
SELECT 
    COUNT(*) as expense_count,
    SUM(amount) as total_today,
    MIN(created_at) as first_expense,
    MAX(created_at) as last_expense
FROM finance_expenses
WHERE created_at::date = CURRENT_DATE;

-- ============================================================================
-- QUERY 5: Get THIS MONTH's total (TSh 53.7M)
-- ============================================================================

-- This month from expenses
SELECT 
    COUNT(*) as expense_count,
    SUM(amount) as total_this_month
FROM expenses
WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE);

-- This month from finance_expenses
SELECT 
    COUNT(*) as expense_count,
    SUM(amount) as total_this_month
FROM finance_expenses
WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE);

-- ============================================================================
-- QUERY 6: Get expense categories (find "Other")
-- ============================================================================

-- From expense_categories
SELECT * FROM expense_categories ORDER BY name;

-- From finance_expense_categories
SELECT * FROM finance_expense_categories ORDER BY name;

-- ============================================================================
-- QUERY 7: Get top category breakdown
-- ============================================================================

-- By category from expenses
SELECT 
    category,
    COUNT(*) as expense_count,
    SUM(amount) as total_amount
FROM expenses
WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)
GROUP BY category
ORDER BY total_amount DESC;

-- By category from finance_expenses
SELECT 
    category,
    COUNT(*) as expense_count,
    SUM(amount) as total_amount
FROM finance_expenses
WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)
GROUP BY category
ORDER BY total_amount DESC;

-- ============================================================================
-- QUERY 8: Find expenses with "PO Payment" in description
-- ============================================================================

-- Search in expenses
SELECT 
    id,
    description,
    amount,
    category,
    created_at,
    SUBSTRING(id::text, 1, 8) as short_id
FROM expenses
WHERE description ILIKE '%PO Payment%'
   OR description ILIKE '%Payment%'
ORDER BY created_at DESC
LIMIT 20;

-- Search in finance_expenses
SELECT 
    id,
    description,
    amount,
    category,
    created_at,
    SUBSTRING(id::text, 1, 8) as short_id
FROM finance_expenses
WHERE description ILIKE '%PO Payment%'
   OR description ILIKE '%Payment%'
ORDER BY created_at DESC
LIMIT 20;

-- ============================================================================
-- QUERY 9: Complete expense record with all details
-- ============================================================================

-- Get full expense details (expenses table)
SELECT 
    e.*,
    ec.name as category_name,
    fa.name as account_name
FROM expenses e
LEFT JOIN expense_categories ec ON e.category = ec.id::text
LEFT JOIN finance_accounts fa ON e.account_id = fa.id
WHERE e.created_at >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY e.created_at DESC
LIMIT 10;

-- Get full expense details (finance_expenses table)
SELECT 
    fe.*,
    fec.name as category_name,
    fa.name as account_name
FROM finance_expenses fe
LEFT JOIN finance_expense_categories fec ON fe.category_id = fec.id
LEFT JOIN finance_accounts fa ON fe.account_id = fa.id
WHERE fe.created_at >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY fe.created_at DESC
LIMIT 10;

-- ============================================================================
-- QUERY 10: Find the source code location
-- ============================================================================

-- This is just for reference - search your codebase for:
-- - "Recent Expenses"
-- - "Track your spending"
-- - Expenses page component
-- Likely in: src/features/expenses/ or src/features/finance/

-- ============================================================================
-- USAGE INSTRUCTIONS
-- ============================================================================

/*
To run these queries:

1. Connect to your database:
   psql 'postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'

2. Run queries one by one to find your data

3. Look for:
   - Amounts matching TSh 50.0M, 3.5M
   - Dates: November 7, 2024
   - Descriptions with "PO Payment"
   - Payment IDs: 9208fd49, 2301b206, 375abe39

4. Once you find the table, you'll know where to clean!
*/

