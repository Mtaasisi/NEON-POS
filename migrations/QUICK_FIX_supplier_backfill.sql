-- =====================================================
-- QUICK FIX: Backfill supplier_id for products
-- =====================================================
-- Run this SQL directly in your Neon database console
-- This will update products with supplier information from their purchase orders

-- Step 1: Update products that have NULL supplier_id with data from purchase orders
-- Includes all relevant statuses: received, partial_received, completed, shipped, sent, confirmed
UPDATE lats_products p
SET 
  supplier_id = po.supplier_id,
  updated_at = NOW()
FROM (
  SELECT DISTINCT 
    poi.product_id,
    po.supplier_id
  FROM lats_purchase_order_items poi
  JOIN lats_purchase_orders po ON po.id = poi.purchase_order_id
  WHERE po.supplier_id IS NOT NULL
    AND po.status IN ('received', 'partial_received', 'completed', 'shipped', 'sent', 'confirmed')
) po
WHERE p.id = po.product_id
  AND p.supplier_id IS NULL
  AND po.supplier_id IS NOT NULL;

-- Step 2: Verify the update
SELECT 
  COUNT(*) FILTER (WHERE supplier_id IS NOT NULL) as products_with_supplier,
  COUNT(*) FILTER (WHERE supplier_id IS NULL) as products_without_supplier,
  COUNT(*) as total_products
FROM lats_products
WHERE is_active = true;

-- Step 3: Show sample of products with suppliers
SELECT 
  p.id,
  p.name,
  p.sku,
  s.name as supplier_name
FROM lats_products p
LEFT JOIN lats_suppliers s ON s.id = p.supplier_id
WHERE p.is_active = true
LIMIT 20;

