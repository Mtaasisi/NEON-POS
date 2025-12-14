-- Create Purchase Order PO-1761424582968 for IMEI Testing
-- Run this SQL in your database or via Supabase dashboard

-- Step 1: Create the Purchase Order
INSERT INTO lats_purchase_orders (
  id,
  po_number,
  supplier_id,
  branch_id,
  status,
  total_amount,
  notes,
  created_by,
  created_at
)
SELECT 
  gen_random_uuid() as id,
  'PO-1761424582968' as po_number,
  s.id as supplier_id,
  b.id as branch_id,
  'sent' as status,
  0 as total_amount,
  'Test PO for IMEI automated testing - Created via SQL script' as notes,
  u.id as created_by,
  NOW() as created_at
FROM (SELECT id FROM lats_suppliers LIMIT 1) s
CROSS JOIN (SELECT id FROM lats_branches LIMIT 1) b
CROSS JOIN (SELECT id FROM lats_users LIMIT 1) u
WHERE NOT EXISTS (
  SELECT 1 FROM lats_purchase_orders WHERE po_number = 'PO-1761424582968'
)
RETURNING id, po_number;

-- Step 2: Add Items to the Purchase Order (3 units for 3 IMEI numbers)
WITH po AS (
  SELECT id FROM lats_purchase_orders WHERE po_number = 'PO-1761424582968'
),
product AS (
  SELECT p.id as product_id, pv.id as variant_id
  FROM lats_products p
  INNER JOIN lats_product_variants pv ON pv.product_id = p.id
  WHERE pv.parent_variant_id IS NULL  -- Get parent variants only
  LIMIT 1
)
INSERT INTO lats_purchase_order_items (
  id,
  purchase_order_id,
  product_id,
  variant_id,
  quantity,
  unit_cost,
  total_cost,
  created_at
)
SELECT 
  gen_random_uuid(),
  po.id,
  product.product_id,
  product.variant_id,
  3 as quantity,  -- 3 units for 3 IMEI numbers
  150.00 as unit_cost,
  450.00 as total_cost,
  NOW()
FROM po, product;

-- Step 3: Update total amount on PO
UPDATE lats_purchase_orders
SET total_amount = (
  SELECT COALESCE(SUM(total_cost), 0)
  FROM lats_purchase_order_items
  WHERE purchase_order_id = lats_purchase_orders.id
)
WHERE po_number = 'PO-1761424582968';

-- Step 4: Verify creation
SELECT 
  po.id,
  po.po_number,
  po.status,
  po.total_amount,
  poi.quantity,
  p.name as product_name,
  pv.name as variant_name
FROM lats_purchase_orders po
LEFT JOIN lats_purchase_order_items poi ON poi.purchase_order_id = po.id
LEFT JOIN lats_products p ON p.id = poi.product_id
LEFT JOIN lats_product_variants pv ON pv.id = poi.variant_id
WHERE po.po_number = 'PO-1761424582968';

-- ✅ Expected Result:
-- - PO-1761424582968 created with status "sent"
-- - 1 item with quantity 3
-- - Total amount: $450.00
-- - Ready to be received with IMEI numbers!

