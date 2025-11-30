-- ================================================
-- CHECK ALL INSTALLMENT DATA IN DATABASE
-- ================================================
-- Run these queries in your Supabase SQL Editor
-- ================================================

-- 1. INSTALLMENT PLANS OVERVIEW
-- ================================================
SELECT 
    cip.plan_number,
    c.name as customer_name,
    c.phone as customer_phone,
    lb.name as branch_name,
    ls.sale_number,
    cip.status,
    cip.total_amount,
    cip.down_payment,
    cip.amount_financed,
    cip.total_paid,
    cip.balance_due,
    cip.installment_amount,
    cip.number_of_installments,
    cip.installments_paid,
    cip.payment_frequency,
    cip.start_date,
    cip.next_payment_date,
    cip.end_date,
    cip.completion_date,
    cip.days_overdue,
    cip.late_fee_applied,
    cip.reminder_count,
    cip.last_reminder_sent,
    cip.notes,
    cip.created_at
FROM customer_installment_plans cip
LEFT JOIN customers c ON cip.customer_id = c.id
LEFT JOIN lats_branches lb ON cip.branch_id = lb.id
LEFT JOIN lats_sales ls ON cip.sale_id = ls.id
ORDER BY cip.created_at DESC;

-- 2. INSTALLMENT PAYMENTS OVERVIEW
-- ================================================
SELECT 
    ip.installment_number,
    cip.plan_number,
    c.name as customer_name,
    c.phone as customer_phone,
    ip.amount,
    ip.payment_method,
    ip.payment_date,
    ip.due_date,
    ip.status,
    ip.days_late,
    ip.late_fee,
    fa.account_name,
    ip.reference_number,
    ip.notification_sent,
    ip.notification_sent_at,
    ip.notes,
    ip.created_at
FROM installment_payments ip
LEFT JOIN customer_installment_plans cip ON ip.installment_plan_id = cip.id
LEFT JOIN customers c ON ip.customer_id = c.id
LEFT JOIN finance_accounts fa ON ip.account_id = fa.id
ORDER BY ip.payment_date DESC;

-- 3. SUMMARY STATISTICS
-- ================================================

-- Plans by Status
SELECT 
    status,
    COUNT(*) as count,
    SUM(total_amount) as total_amount,
    SUM(total_paid) as total_paid,
    SUM(balance_due) as balance_due
FROM customer_installment_plans
GROUP BY status
ORDER BY count DESC;

-- Overdue Plans
SELECT 
    plan_number,
    c.name as customer_name,
    c.phone as customer_phone,
    days_overdue,
    balance_due,
    late_fee_applied,
    next_payment_date
FROM customer_installment_plans cip
LEFT JOIN customers c ON cip.customer_id = c.id
WHERE days_overdue > 0
ORDER BY days_overdue DESC;

-- Payment Status Summary
SELECT 
    status,
    COUNT(*) as count,
    SUM(amount) as total_amount
FROM installment_payments
GROUP BY status
ORDER BY count DESC;

-- Overall Financial Summary
SELECT 
    COUNT(*) as total_plans,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_plans,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_plans,
    COUNT(CASE WHEN status = 'defaulted' THEN 1 END) as defaulted_plans,
    COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_plans,
    SUM(total_amount) as total_amount_financed,
    SUM(total_paid) as total_paid,
    SUM(balance_due) as total_balance_due,
    ROUND((SUM(total_paid) / NULLIF(SUM(total_amount), 0) * 100), 2) as collection_rate_percent,
    COUNT(CASE WHEN days_overdue > 0 THEN 1 END) as overdue_plans,
    SUM(late_fee_applied) as total_late_fees
FROM customer_installment_plans;

-- Recent Activity
SELECT 
    'Payment' as activity_type,
    cip.plan_number,
    c.name as customer_name,
    ip.amount as amount,
    ip.payment_date as activity_date
FROM installment_payments ip
LEFT JOIN customer_installment_plans cip ON ip.installment_plan_id = cip.id
LEFT JOIN customers c ON ip.customer_id = c.id
ORDER BY ip.payment_date DESC
LIMIT 10;

