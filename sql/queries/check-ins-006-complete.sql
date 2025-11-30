-- =================================================================
-- COMPLETE WORKING SQL QUERY FOR INS-006 VERIFICATION
-- All queries tested and working - no errors
-- Copy and run each query one by one or all together
-- =================================================================

-- ============================================================
-- 1. MAIN PLAN DETAILS
-- ============================================================
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


-- ============================================================
-- 2. CUSTOMER INFORMATION
-- ============================================================
SELECT 
    c.id,
    c.name,
    c.phone,
    c.email,
    c.whatsapp,
    c.city,
    c.country,
    c.location_description,
    c.total_spent,
    c.total_purchases,
    c.loyalty_level,
    c.joined_date,
    c.created_at
FROM customers c
INNER JOIN customer_installment_plans p ON p.customer_id = c.id
WHERE p.plan_number = 'INS-006';


-- ============================================================
-- 3. SALE INFORMATION
-- ============================================================
SELECT 
    s.id,
    s.sale_number,
    s.total_amount,
    s.status,
    s.payment_status,
    s.payment_method,
    s.amount_paid,
    s.change_amount,
    s.created_at,
    s.created_by
FROM lats_sales s
INNER JOIN customer_installment_plans p ON p.sale_id = s.id
WHERE p.plan_number = 'INS-006';


-- ============================================================
-- 4. SALE ITEMS (Products sold in this plan)
-- ============================================================
SELECT 
    si.id,
    si.product_name,
    si.variant_name,
    si.quantity,
    si.unit_price,
    si.subtotal,
    si.discount_amount,
    si.total_price,
    si.sku
FROM lats_sale_items si
INNER JOIN customer_installment_plans p ON p.sale_id = si.sale_id
WHERE p.plan_number = 'INS-006';


-- ============================================================
-- 5. PAYMENTS MADE
-- ============================================================
SELECT 
    ip.id,
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
    ip.created_at,
    ip.created_by
FROM installment_payments ip
INNER JOIN customer_installment_plans p ON p.id = ip.installment_plan_id
WHERE p.plan_number = 'INS-006'
ORDER BY ip.installment_number ASC;


-- ============================================================
-- 6. INSTALLMENT SCHEDULE
-- ============================================================
SELECT 
    s.id,
    s.installment_number,
    s.due_date,
    s.amount,
    s.status,
    s.is_paid,
    s.paid_amount,
    s.paid_date,
    s.late_days,
    s.late_fee,
    s.created_at
FROM installment_schedules s
INNER JOIN customer_installment_plans p ON p.id = s.installment_plan_id
WHERE p.plan_number = 'INS-006'
ORDER BY s.installment_number ASC;


-- ============================================================
-- 7. BRANCH INFORMATION
-- ============================================================
SELECT 
    b.id,
    b.name,
    b.location,
    b.phone,
    b.email
FROM lats_branches b
INNER JOIN customer_installment_plans p ON p.branch_id = b.id
WHERE p.plan_number = 'INS-006';


-- ============================================================
-- 8. SUMMARY CHECK
-- ============================================================
SELECT 
    COUNT(*) as total_count,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ INS-006 EXISTS IN DATABASE'
        ELSE '❌ INS-006 NOT FOUND'
    END as status
FROM customer_installment_plans 
WHERE plan_number = 'INS-006';


-- ============================================================
-- 9. ALL RECENT INSTALLMENT PLANS (for comparison)
-- ============================================================
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


-- ============================================================
-- 10. COMPLETE DATA IN ONE QUERY (with all joins)
-- ============================================================
SELECT 
    p.plan_number,
    p.status as plan_status,
    p.total_amount,
    p.balance_due,
    p.installment_amount,
    p.number_of_installments,
    p.installments_paid,
    p.payment_frequency,
    p.start_date,
    p.next_payment_date,
    p.end_date,
    c.name as customer_name,
    c.phone as customer_phone,
    c.email as customer_email,
    s.sale_number,
    s.total_amount as sale_total,
    b.name as branch_name,
    p.created_at,
    p.updated_at
FROM customer_installment_plans p
LEFT JOIN customers c ON p.customer_id = c.id
LEFT JOIN lats_sales s ON p.sale_id = s.id
LEFT JOIN lats_branches b ON p.branch_id = b.id
WHERE p.plan_number = 'INS-006';

