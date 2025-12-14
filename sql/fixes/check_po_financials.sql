-- Check purchase order details first
SELECT id, po_number, supplier_id, total_amount, currency, payment_status, created_at 
FROM lats_purchase_orders 
WHERE po_number = 'PO-1763231644894';

-- Check payments in purchase_order_payments table
SELECT 
    pop.*,
    po.po_number,
    s.name as supplier_name
FROM purchase_order_payments pop
JOIN lats_purchase_orders po ON pop.purchase_order_id = po.id
LEFT JOIN lats_suppliers s ON po.supplier_id = s.id
WHERE po.po_number = 'PO-1763231644894'
ORDER BY pop.created_at DESC;

-- Check expenses in account_transactions table
SELECT 
    at.*,
    po.po_number,
    fa.name as account_name,
    fa.type as account_type,
    s.name as supplier_name
FROM account_transactions at
JOIN finance_accounts fa ON at.account_id = fa.id
LEFT JOIN lats_purchase_orders po ON (at.metadata->>'purchase_order_id')::uuid = po.id
LEFT JOIN lats_suppliers s ON po.supplier_id = s.id
WHERE at.transaction_type = 'expense' 
AND at.metadata->>'purchase_order_id' = (SELECT id::text FROM lats_purchase_orders WHERE po_number = 'PO-1763231644894')
ORDER BY at.created_at DESC;

-- Summary of all financial transactions for this PO
SELECT 
    'PAYMENT' as type,
    pop.payment_method as method,
    pop.amount,
    pop.currency,
    pop.status,
    pop.created_at as transaction_date,
    pop.reference
FROM purchase_order_payments pop
WHERE pop.purchase_order_id = (SELECT id FROM lats_purchase_orders WHERE po_number = 'PO-1763231644894')

UNION ALL

SELECT 
    'EXPENSE' as type,
    at.metadata->>'category' as method,
    at.amount,
    fa.currency,
    'completed' as status,
    at.created_at as transaction_date,
    at.reference_number as reference
FROM account_transactions at
JOIN finance_accounts fa ON at.account_id = fa.id
WHERE at.transaction_type = 'expense' 
AND at.metadata->>'purchase_order_id' = (SELECT id::text FROM lats_purchase_orders WHERE po_number = 'PO-1763231644894')

ORDER BY transaction_date DESC;
