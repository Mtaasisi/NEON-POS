-- Check if the inventory sync trigger exists
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'inventory_items'
  AND trigger_name LIKE '%sync%';

-- Check recent inventory items to see if they're accumulating
SELECT 
    vi.variant_id,
    pv.name as variant_name,
    pv.quantity as variant_qty,
    COUNT(*) as actual_inventory_count
FROM inventory_items vi
LEFT JOIN lats_product_variants pv ON pv.id = vi.variant_id
WHERE vi.status = 'available'
  AND vi.variant_id IS NOT NULL
GROUP BY vi.variant_id, pv.name, pv.quantity
ORDER BY actual_inventory_count DESC
LIMIT 20;

-- Show sample of inventory items for one variant
SELECT 
    ii.id,
    ii.purchase_order_id,
    ii.status,
    ii.created_at,
    po.order_number
FROM inventory_items ii
LEFT JOIN lats_purchase_orders po ON po.id = ii.purchase_order_id
WHERE ii.variant_id = (
    SELECT variant_id 
    FROM inventory_items 
    WHERE variant_id IS NOT NULL 
    GROUP BY variant_id 
    ORDER BY COUNT(*) DESC 
    LIMIT 1
)
  AND ii.status = 'available'
ORDER BY ii.created_at DESC
LIMIT 10;


