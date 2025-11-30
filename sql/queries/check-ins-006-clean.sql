-- =================================================================
-- WORKING SQL QUERY FOR INS-006 VERIFICATION
-- Copy and paste this entire file into Neon SQL Editor
-- =================================================================

-- Query 1: Check if INS-006 exists and get all details
SELECT 
    '📋 PLAN DETAILS' as info_type,
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
    created_at,
    updated_at
FROM customer_installment_plans 
WHERE plan_number = 'INS-006';

-- Query 2: Get customer information
SELECT 
    '👤 CUSTOMER INFO' as info_type,
    c.id,
    c.name,
    c.phone,
    c.email,
    c.city,
    c.country,
    c.total_spent,
    c.location_description
FROM customers c
INNER JOIN customer_installment_plans p ON p.customer_id = c.id
WHERE p.plan_number = 'INS-006';

-- Query 3: Get sale information
SELECT 
    '🛒 SALE INFO' as info_type,
    s.id,
    s.sale_number,
    s.total_amount,
    s.status,
    s.payment_status,
    s.created_at
FROM lats_sales s
INNER JOIN customer_installment_plans p ON p.sale_id = s.id
WHERE p.plan_number = 'INS-006';

-- Query 4: Get all payments for this plan
SELECT 
    '💳 PAYMENTS' as info_type,
    ip.installment_number,
    ip.amount,
    ip.payment_method,
    ip.payment_date,
    ip.due_date,
    ip.status,
    ip.days_late,
    ip.late_fee,
    ip.created_at
FROM installment_payments ip
INNER JOIN customer_installment_plans p ON p.id = ip.installment_plan_id
WHERE p.plan_number = 'INS-006'
ORDER BY ip.installment_number ASC;

-- Query 5: Get installment schedule
SELECT 
    '📅 SCHEDULE' as info_type,
    s.installment_number,
    s.due_date,
    s.amount,
    s.status,
    s.is_paid,
    s.paid_amount,
    s.paid_date
FROM installment_schedules s
INNER JOIN customer_installment_plans p ON p.id = s.installment_plan_id
WHERE p.plan_number = 'INS-006'
ORDER BY s.installment_number ASC;

-- Query 6: Summary - Does INS-006 exist?
SELECT 
    COUNT(*) as ins_006_exists,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ INS-006 EXISTS IN DATABASE'
        ELSE '❌ INS-006 NOT FOUND'
    END as result
FROM customer_installment_plans 
WHERE plan_number = 'INS-006';

