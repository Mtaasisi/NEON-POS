-- =====================================================================
-- USEFUL INVENTORY & TRANSFER QUERIES
-- =====================================================================
-- Quick reference queries for checking inventory and transfers
-- =====================================================================

-- =====================================================================
-- 1. CHECK INVENTORY BY BRANCH
-- =====================================================================
-- Shows all products with their stock levels per branch
SELECT 
    p.id as product_id,
    p.name as product_name,
    p.sku as product_sku,
    b.name as branch_name,
    pv.variant_name,
    pv.sku as variant_sku,
    pv.quantity as available_stock,
    pv.reserved_quantity as reserved,
    pv.cost_price,
    pv.selling_price,
    pv.is_active
FROM lats_products p
JOIN lats_product_variants pv ON p.id = pv.product_id
LEFT JOIN lats_branches b ON pv.branch_id = b.id
WHERE pv.is_active = true
  AND p.is_active = true
ORDER BY p.name, b.name;

-- =====================================================================
-- 2. CHECK SPECIFIC PRODUCT INVENTORY (iPhone 15)
-- =====================================================================
SELECT 
    p.name as product_name,
    b.name as branch,
    pv.variant_name,
    pv.sku,
    pv.quantity as stock,
    pv.reserved_quantity,
    pv.is_active
FROM lats_products p
JOIN lats_product_variants pv ON p.id = pv.product_id
LEFT JOIN lats_branches b ON pv.branch_id = b.id
WHERE p.id = 'fb454bc0-e59e-42f2-8e6b-0fd30ae6798d'  -- iPhone 15 ID
  AND pv.is_active = true
ORDER BY b.name;

-- =====================================================================
-- 3. CHECK ALL RECENT TRANSFERS
-- =====================================================================
SELECT 
    bt.id as transfer_id,
    bt.status,
    bt.quantity,
    fb.name as from_branch,
    tb.name as to_branch,
    p.name as product_name,
    bt.created_at,
    bt.completed_at,
    bt.notes
FROM branch_transfers bt
JOIN lats_branches fb ON bt.from_branch_id = fb.id
JOIN lats_branches tb ON bt.to_branch_id = tb.id
LEFT JOIN lats_product_variants pv ON bt.entity_id = pv.id
LEFT JOIN lats_products p ON pv.product_id = p.id
ORDER BY bt.created_at DESC
LIMIT 20;

-- =====================================================================
-- 4. CHECK SPECIFIC TRANSFER DETAILS
-- =====================================================================
SELECT 
    bt.id as transfer_id,
    bt.status,
    bt.entity_type,
    bt.entity_id,
    bt.quantity,
    fb.name as from_branch,
    tb.name as to_branch,
    p.name as product_name,
    pv.variant_name,
    bt.requested_at,
    bt.approved_at,
    bt.completed_at,
    bt.notes
FROM branch_transfers bt
LEFT JOIN lats_branches fb ON bt.from_branch_id = fb.id
LEFT JOIN lats_branches tb ON bt.to_branch_id = tb.id
LEFT JOIN lats_product_variants pv ON bt.entity_id = pv.id
LEFT JOIN lats_products p ON pv.product_id = p.id
WHERE bt.id = 'c18cca76-4af2-4ae6-86ba-b300ff49e4a3';  -- Your transfer ID

-- =====================================================================
-- 5. CHECK INVENTORY USING EXISTING VIEW (EASIEST)
-- =====================================================================
SELECT 
    id,
    name,
    sku,
    category,
    supplier,
    selling_price,
    stock_quantity,
    status,
    variant_count,
    variants
FROM simple_inventory_view
WHERE name ILIKE '%iPhone%'
ORDER BY name;

-- =====================================================================
-- 6. CHECK LOW STOCK ITEMS
-- =====================================================================
SELECT 
    p.name as product_name,
    b.name as branch,
    pv.quantity as current_stock,
    pv.min_quantity as min_required,
    (pv.min_quantity - pv.quantity) as shortage
FROM lats_product_variants pv
JOIN lats_products p ON pv.product_id = p.id
LEFT JOIN lats_branches b ON pv.branch_id = b.id
WHERE pv.is_active = true
  AND pv.quantity < pv.min_quantity
ORDER BY shortage DESC;

-- =====================================================================
-- 7. CHECK PENDING TRANSFERS
-- =====================================================================
SELECT 
    bt.id,
    bt.status,
    bt.quantity,
    fb.name || ' → ' || tb.name as route,
    p.name as product,
    bt.requested_at,
    EXTRACT(DAY FROM NOW() - bt.requested_at) as days_pending
FROM branch_transfers bt
JOIN lats_branches fb ON bt.from_branch_id = fb.id
JOIN lats_branches tb ON bt.to_branch_id = tb.id
LEFT JOIN lats_product_variants pv ON bt.entity_id = pv.id
LEFT JOIN lats_products p ON pv.product_id = p.id
WHERE bt.status IN ('pending', 'approved', 'in_transit')
ORDER BY bt.requested_at;

-- =====================================================================
-- 8. INVENTORY SUMMARY BY BRANCH
-- =====================================================================
SELECT 
    b.name as branch_name,
    COUNT(DISTINCT pv.product_id) as unique_products,
    COUNT(pv.id) as total_variants,
    SUM(pv.quantity) as total_items,
    SUM(pv.reserved_quantity) as reserved_items,
    SUM(pv.quantity * pv.cost_price) as total_cost_value,
    SUM(pv.quantity * pv.selling_price) as total_selling_value
FROM lats_product_variants pv
JOIN lats_branches b ON pv.branch_id = b.id
WHERE pv.is_active = true
GROUP BY b.id, b.name
ORDER BY b.name;

-- =====================================================================
-- 9. CHECK STOCK MOVEMENTS (If you ran the improvement script)
-- =====================================================================
SELECT 
    sm.id,
    sm.movement_type,
    sm.quantity,
    sm.previous_quantity,
    sm.new_quantity,
    p.name as product_name,
    b.name as branch_name,
    sm.reference_type,
    sm.notes,
    sm.created_at
FROM lats_stock_movements sm
LEFT JOIN lats_product_variants pv ON sm.variant_id = pv.id
LEFT JOIN lats_products p ON sm.product_id = p.id
LEFT JOIN lats_branches b ON sm.branch_id = b.id
WHERE sm.reference_type = 'branch_transfer'
ORDER BY sm.created_at DESC
LIMIT 50;

-- =====================================================================
-- 10. CHECK TRANSFER AUDIT TRAIL (If you ran the improvement script)
-- =====================================================================
-- SELECT * FROM v_transfer_audit_trail 
-- WHERE transfer_id = 'c18cca76-4af2-4ae6-86ba-b300ff49e4a3';

-- Or check all recent transfers with audit trail
-- SELECT 
--   transfer_id,
--   transfer_status,
--   product_name,
--   from_branch || ' → ' || to_branch as route,
--   transfer_quantity,
--   source_previous_qty,
--   source_new_qty,
--   dest_previous_qty,
--   dest_new_qty,
--   transfer_completed
-- FROM v_transfer_audit_trail
-- ORDER BY transfer_created DESC
-- LIMIT 20;

-- =====================================================================
-- 11. SEARCH PRODUCTS ACROSS ALL BRANCHES
-- =====================================================================
SELECT 
    p.id,
    p.name,
    p.sku,
    p.category_id,
    STRING_AGG(
        b.name || ': ' || pv.quantity::text, 
        ', ' 
        ORDER BY b.name
    ) as stock_by_branch,
    SUM(pv.quantity) as total_stock
FROM lats_products p
JOIN lats_product_variants pv ON p.id = pv.product_id
LEFT JOIN lats_branches b ON pv.branch_id = b.id
WHERE p.is_active = true
  AND pv.is_active = true
  AND p.name ILIKE '%search_term%'  -- Replace with your search
GROUP BY p.id, p.name, p.sku, p.category_id
ORDER BY p.name;

-- =====================================================================
-- 12. CHECK OUT OF STOCK ITEMS
-- =====================================================================
SELECT 
    p.name as product_name,
    b.name as branch,
    pv.quantity as current_stock,
    pv.selling_price,
    pv.updated_at as last_updated
FROM lats_product_variants pv
JOIN lats_products p ON pv.product_id = p.id
LEFT JOIN lats_branches b ON pv.branch_id = b.id
WHERE pv.is_active = true
  AND p.is_active = true
  AND pv.quantity = 0
ORDER BY p.name, b.name;

-- =====================================================================
-- 13. CHECK COMPLETED TRANSFERS TODAY
-- =====================================================================
SELECT 
    bt.id,
    p.name as product,
    bt.quantity,
    fb.name as from_branch,
    tb.name as to_branch,
    bt.completed_at
FROM branch_transfers bt
JOIN lats_branches fb ON bt.from_branch_id = fb.id
JOIN lats_branches tb ON bt.to_branch_id = tb.id
LEFT JOIN lats_product_variants pv ON bt.entity_id = pv.id
LEFT JOIN lats_products p ON pv.product_id = p.id
WHERE bt.status = 'completed'
  AND DATE(bt.completed_at) = CURRENT_DATE
ORDER BY bt.completed_at DESC;

-- =====================================================================
-- 14. CHECK RESERVED STOCK
-- =====================================================================
SELECT 
    p.name as product_name,
    b.name as branch,
    pv.quantity as available,
    pv.reserved_quantity as reserved,
    (pv.quantity - COALESCE(pv.reserved_quantity, 0)) as actually_available
FROM lats_product_variants pv
JOIN lats_products p ON pv.product_id = p.id
LEFT JOIN lats_branches b ON pv.branch_id = b.id
WHERE pv.is_active = true
  AND pv.reserved_quantity > 0
ORDER BY pv.reserved_quantity DESC;

-- =====================================================================
-- 15. CHECK ALL BRANCHES
-- =====================================================================
SELECT 
    id,
    name,
    is_active,
    created_at
FROM lats_branches
ORDER BY name;

-- =====================================================================
-- 16. DETAILED VARIANT INFORMATION
-- =====================================================================
SELECT 
    pv.id as variant_id,
    p.id as product_id,
    p.name as product_name,
    pv.variant_name,
    pv.sku,
    b.name as branch,
    pv.quantity,
    pv.reserved_quantity,
    pv.cost_price,
    pv.unit_price,
    pv.selling_price,
    pv.min_quantity,
    pv.is_active,
    pv.variant_type,
    pv.parent_variant_id,
    pv.created_at,
    pv.updated_at
FROM lats_product_variants pv
JOIN lats_products p ON pv.product_id = p.id
LEFT JOIN lats_branches b ON pv.branch_id = b.id
WHERE pv.id IN (
    '02ab4c3f-a0d0-49b5-a6b5-805184f11757',  -- ARUSHA variant
    'da86d156-37ea-40d7-b5a1-08b29762d346'   -- DAR variant
);

-- =====================================================================
-- 17. CHECK TRANSFER FUNCTIONS EXIST
-- =====================================================================
SELECT 
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    pg_get_function_result(p.oid) as returns
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'complete_stock_transfer_transaction',
    'reduce_variant_stock',
    'increase_variant_stock',
    'find_or_create_variant_at_branch'
  )
ORDER BY p.proname;

-- =====================================================================
-- 18. CHECK RLS POLICIES
-- =====================================================================
SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename IN ('lats_product_variants', 'branch_transfers', 'lats_stock_movements')
ORDER BY tablename, policyname;

-- =====================================================================
-- 19. INVENTORY VALUE BY PRODUCT
-- =====================================================================
SELECT 
    p.name as product_name,
    SUM(pv.quantity) as total_quantity,
    AVG(pv.cost_price) as avg_cost_price,
    AVG(pv.selling_price) as avg_selling_price,
    SUM(pv.quantity * pv.cost_price) as total_cost_value,
    SUM(pv.quantity * pv.selling_price) as total_selling_value,
    SUM(pv.quantity * (pv.selling_price - pv.cost_price)) as potential_profit
FROM lats_products p
JOIN lats_product_variants pv ON p.id = pv.product_id
WHERE pv.is_active = true
  AND p.is_active = true
GROUP BY p.id, p.name
HAVING SUM(pv.quantity) > 0
ORDER BY total_selling_value DESC;

-- =====================================================================
-- 20. TRANSFER SUCCESS RATE
-- =====================================================================
SELECT 
    bt.status,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM branch_transfers bt
WHERE bt.created_at >= NOW() - INTERVAL '30 days'
GROUP BY bt.status
ORDER BY count DESC;

-- =====================================================================
-- NOTES:
-- =====================================================================
-- 1. Replace 'fb454bc0-e59e-42f2-8e6b-0fd30ae6798d' with your actual product ID
-- 2. Replace 'c18cca76-4af2-4ae6-86ba-b300ff49e4a3' with your actual transfer ID
-- 3. Uncomment queries 10 if you've applied the improvement script
-- 4. Modify date ranges and filters as needed
-- 5. Use \x in psql for better formatting of wide results
-- =====================================================================

