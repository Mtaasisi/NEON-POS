-- ===================================
-- PAYMENT DATA DIAGNOSTIC QUERIES
-- Run these to check if you have payment data
-- ===================================

-- 1. Check POS Sales (lats_sales table)
SELECT 
    'POS Sales' as source,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE payment_status = 'completed') as completed,
    COUNT(*) FILTER (WHERE payment_status = 'pending') as pending,
    COUNT(*) FILTER (WHERE payment_status = 'failed') as failed,
    SUM(total_amount) as total_amount,
    MIN(created_at) as earliest_sale,
    MAX(created_at) as latest_sale
FROM lats_sales;

-- 2. Check Customer Payments
SELECT 
    'Customer Payments' as source,
    COUNT(*) as total_count,
    SUM(amount) as total_amount,
    MIN(payment_date) as earliest_payment,
    MAX(payment_date) as latest_payment,
    COUNT(DISTINCT payment_method) as unique_methods
FROM customer_payments;

-- 3. Check Payment Transactions
SELECT 
    'Payment Transactions' as source,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE status = 'SUCCESS') as success_count,
    COUNT(*) FILTER (WHERE status = 'PENDING') as pending_count,
    COUNT(*) FILTER (WHERE status = 'FAILED') as failed_count,
    SUM(amount) as total_amount,
    MIN(created_at) as earliest_transaction,
    MAX(created_at) as latest_transaction
FROM payment_transactions;

-- 4. Check Purchase Order Payments
SELECT 
    'Purchase Order Payments' as source,
    COUNT(*) as total_count,
    SUM(amount_paid) as total_amount,
    MIN(payment_date) as earliest_payment,
    MAX(payment_date) as latest_payment
FROM purchase_order_payments;

-- 5. Check Payment Methods Distribution
SELECT 
    payment_method,
    COUNT(*) as transaction_count,
    SUM(total_amount) as total_amount,
    ROUND(AVG(total_amount), 2) as avg_amount
FROM lats_sales
WHERE payment_status = 'completed'
GROUP BY payment_method
ORDER BY total_amount DESC;

-- 6. Check Payment Status Distribution
SELECT 
    payment_status,
    COUNT(*) as count,
    SUM(total_amount) as total_amount,
    ROUND(AVG(total_amount), 2) as avg_amount,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage
FROM lats_sales
GROUP BY payment_status
ORDER BY count DESC;

-- 7. Check Daily Payment Trends (Last 30 days)
SELECT 
    DATE(created_at) as payment_date,
    COUNT(*) as transaction_count,
    SUM(total_amount) as daily_total,
    ROUND(AVG(total_amount), 2) as avg_transaction
FROM lats_sales
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY payment_date DESC;

-- 8. Check Hourly Payment Distribution
SELECT 
    EXTRACT(HOUR FROM created_at) as hour,
    COUNT(*) as transaction_count,
    SUM(total_amount) as hourly_total
FROM lats_sales
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY EXTRACT(HOUR FROM created_at)
ORDER BY hour;

-- 9. Check Top Customers by Payment Amount
SELECT 
    customer_name,
    customer_email,
    COUNT(*) as transaction_count,
    SUM(total_amount) as total_spent,
    ROUND(AVG(total_amount), 2) as avg_transaction,
    MAX(created_at) as last_purchase
FROM lats_sales
WHERE payment_status = 'completed'
GROUP BY customer_name, customer_email
ORDER BY total_spent DESC
LIMIT 10;

-- 10. Check Finance Accounts
SELECT 
    name,
    type,
    balance,
    currency,
    is_active,
    created_at
FROM finance_accounts
ORDER BY balance DESC;

-- 11. Check Payment Providers
SELECT 
    name,
    type,
    is_active,
    created_at
FROM payment_providers
ORDER BY name;

-- 12. Overall Summary
SELECT 
    'OVERALL SUMMARY' as category,
    (SELECT COUNT(*) FROM lats_sales) as pos_sales,
    (SELECT COUNT(*) FROM customer_payments) as customer_payments,
    (SELECT COUNT(*) FROM payment_transactions) as payment_transactions,
    (SELECT COUNT(*) FROM purchase_order_payments) as po_payments,
    (SELECT SUM(total_amount) FROM lats_sales WHERE payment_status = 'completed') as total_revenue,
    (SELECT COUNT(DISTINCT customer_id) FROM lats_sales) as unique_customers,
    (SELECT COUNT(*) FROM finance_accounts WHERE is_active = true) as active_accounts;

-- 13. Check for Recent Payments (Last 24 hours)
SELECT 
    'Recent Payments (24h)' as timeframe,
    COUNT(*) as count,
    SUM(total_amount) as total
FROM lats_sales
WHERE created_at >= NOW() - INTERVAL '24 hours';

-- 14. Check if tables exist and have rows
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
AND table_name IN ('lats_sales', 'customer_payments', 'payment_transactions', 'purchase_order_payments', 'finance_accounts', 'payment_providers')
ORDER BY table_name;

