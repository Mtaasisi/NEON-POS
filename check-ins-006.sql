-- =================================================================
-- VERIFICATION SCRIPT FOR INSTALLMENT PLAN INS-006
-- Run this in your Neon Database SQL Editor
-- =================================================================

-- 1. Check if INS-006 exists
SELECT '=== 📋 Plan INS-006 Details ===' as section;
SELECT 
    plan_number,
    status,
    customer_id,
    sale_id,
    branch_id,
    total_amount,
    down_payment,
    amount_financed,
    total_paid,
    balance_due,
    installment_amount,
    number_of_installments,
    installments_paid,
    payment_frequency,
    start_date,
    next_payment_date,
    end_date,
    late_fee_amount,
    late_fee_applied,
    days_overdue,
    reminder_count,
    terms_accepted,
    terms_accepted_date,
    notes,
    created_at,
    updated_at
FROM customer_installment_plans 
WHERE plan_number = 'INS-006';

-- 2. Check customer information
SELECT '=== 👤 Customer Information ===' as section;
SELECT 
    c.id,
    c.name,
    c.phone,
    c.email,
    c.whatsapp,
    c.city,
    c.address,
    c.total_spent,
    c.created_at
FROM customers c
INNER JOIN customer_installment_plans p ON p.customer_id = c.id
WHERE p.plan_number = 'INS-006';

-- 3. Check sale information
SELECT '=== 🛒 Sale Information ===' as section;
SELECT 
    s.id,
    s.sale_number,
    s.total_amount,
    s.status,
    s.payment_status,
    s.created_at
FROM lats_sales s
INNER JOIN customer_installment_plans p ON p.sale_id = s.id
WHERE p.plan_number = 'INS-006';

-- 4. Check installment payments
SELECT '=== 💳 Payments ===' as section;
SELECT 
    ip.installment_number,
    ip.amount,
    ip.payment_method,
    ip.payment_date,
    ip.due_date,
    ip.status,
    ip.days_late,
    ip.late_fee,
    ip.reference_number,
    ip.notes,
    ip.created_at
FROM installment_payments ip
INNER JOIN customer_installment_plans p ON p.id = ip.installment_plan_id
WHERE p.plan_number = 'INS-006'
ORDER BY ip.installment_number ASC;

-- 5. Check installment schedule (if exists)
SELECT '=== 📅 Installment Schedule ===' as section;
SELECT 
    s.installment_number,
    s.due_date,
    s.amount,
    s.status,
    s.is_paid,
    s.paid_amount,
    s.paid_date,
    s.late_days,
    s.late_fee
FROM installment_schedules s
INNER JOIN customer_installment_plans p ON p.id = s.installment_plan_id
WHERE p.plan_number = 'INS-006'
ORDER BY s.installment_number ASC;

-- 6. Check all installment plans (to see if INS-006 is missing)
SELECT '=== 📋 All Recent Plans (if INS-006 not found) ===' as section;
SELECT 
    plan_number,
    status,
    customer_id,
    total_amount,
    number_of_installments,
    installments_paid,
    created_at
FROM customer_installment_plans 
ORDER BY created_at DESC 
LIMIT 20;

-- 7. Count total plans
SELECT '=== 📊 Summary ===' as section;
SELECT 
    COUNT(*) as total_plans,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_plans,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_plans,
    COUNT(CASE WHEN status = 'defaulted' THEN 1 END) as defaulted_plans,
    COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_plans,
    COUNT(CASE WHEN plan_number = 'INS-006' THEN 1 END) as ins_006_exists
FROM customer_installment_plans;

-- 8. Search for plans with similar numbers
SELECT '=== 🔍 Similar Plans ===' as section;
SELECT 
    plan_number,
    customer_id,
    status,
    created_at
FROM customer_installment_plans 
WHERE plan_number LIKE 'INS-00%'
ORDER BY plan_number;

