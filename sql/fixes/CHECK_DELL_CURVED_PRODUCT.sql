-- =====================================================================
-- DELL CURVED PRODUCT CHECK - Complete Database Query
-- =====================================================================
-- Product: Dell Curved
-- SKU: SKU-1761042095003-Y6I-V01
-- Generated: November 8, 2025
-- =====================================================================

-- =====================================================================
-- 1. BASIC PRODUCT INFORMATION
-- =====================================================================
SELECT 
    '=== BASIC PRODUCT INFO ===' as section,
    p.id as product_id,
    p.name as product_name,
    p.sku as base_sku,
    p.description,
    p.status,
    p.is_active,
    p.created_at,
    p.updated_at,
    p.metadata
FROM lats_products p
WHERE p.id = '073d2ebf-12d1-478c-acb8-8da8a035b09d'
   OR p.sku LIKE '%SKU-1761042095003-Y6I%';

-- =====================================================================
-- 2. PRODUCT VARIANT DETAILS (ALL VARIANTS)
-- =====================================================================
SELECT 
    '=== PRODUCT VARIANTS ===' as section,
    pv.id as variant_id,
    pv.product_id,
    pv.sku as variant_sku,
    pv.variant_name,
    pv.quantity as total_stock,
    pv.reserved_quantity,
    (pv.quantity - pv.reserved_quantity) as available_stock,
    pv.price as selling_price,
    pv.cost_price,
    pv.min_quantity,
    pv.max_quantity,
    pv.is_active,
    pv.branch_id,
    pv.is_shared,
    pv.sharing_mode,
    pv.created_at,
    pv.updated_at
FROM lats_product_variants pv
WHERE pv.product_id = '073d2ebf-12d1-478c-acb8-8da8a035b09d'
   OR pv.sku = 'SKU-1761042095003-Y6I-V01'
   OR pv.id = 'a5bf483e-96a5-4c3b-bb6c-4fd75d82ee1e';

-- =====================================================================
-- 3. STOCK STATUS BY BRANCH
-- =====================================================================
SELECT 
    '=== STOCK BY BRANCH ===' as section,
    sl.name as branch_name,
    sl.code as branch_code,
    sl.city,
    sl.is_active as branch_active,
    p.name as product_name,
    pv.variant_name,
    pv.sku as variant_sku,
    pv.quantity as stock_quantity,
    pv.reserved_quantity,
    (pv.quantity - pv.reserved_quantity) as available_for_sale,
    pv.price as selling_price,
    pv.cost_price,
    CASE 
        WHEN pv.quantity > 0 THEN '✅ In Stock'
        WHEN pv.quantity = 0 THEN '❌ Out of Stock'
        ELSE '⚠️ Unknown'
    END as stock_status
FROM lats_products p
JOIN lats_product_variants pv ON p.id = pv.product_id
LEFT JOIN store_locations sl ON pv.branch_id = sl.id
WHERE p.id = '073d2ebf-12d1-478c-acb8-8da8a035b09d'
ORDER BY sl.name;

-- =====================================================================
-- 4. CHECK CATEGORY INFORMATION
-- =====================================================================
SELECT 
    '=== CATEGORY INFO ===' as section,
    c.id as category_id,
    c.name as category_name,
    c.description,
    c.icon,
    c.color,
    c.is_active,
    c.metadata
FROM lats_categories c
WHERE c.id = '1b2032d4-078e-4c14-b902-6ee4e8903bac';

-- =====================================================================
-- 5. CHECK INVENTORY ITEMS (Individual Serial/IMEI Tracking)
-- =====================================================================
SELECT 
    '=== INVENTORY ITEMS ===' as section,
    ii.id as item_id,
    ii.serial_number,
    ii.imei,
    ii.barcode,
    ii.status,
    ii.branch_id,
    sl.name as branch_name,
    ii.cost_price,
    ii.selling_price,
    ii.location,
    ii.shelf,
    ii.bin,
    ii.warranty_start,
    ii.warranty_end,
    ii.created_at,
    ii.metadata
FROM inventory_items ii
LEFT JOIN store_locations sl ON ii.branch_id = sl.id
WHERE ii.product_id = '073d2ebf-12d1-478c-acb8-8da8a035b09d'
   OR ii.variant_id = 'a5bf483e-96a5-4c3b-bb6c-4fd75d82ee1e'
ORDER BY ii.created_at DESC;

-- =====================================================================
-- 6. CHECK STOCK MOVEMENTS HISTORY
-- =====================================================================
SELECT 
    '=== STOCK MOVEMENTS ===' as section,
    sm.id as movement_id,
    sm.movement_type,
    sm.quantity,
    sm.quantity_before,
    sm.quantity_after,
    sm.reference,
    sm.notes,
    sm.created_at,
    sm.created_by,
    sl.name as branch_name
FROM lats_stock_movements sm
LEFT JOIN store_locations sl ON sm.branch_id = sl.id
WHERE sm.product_id = '073d2ebf-12d1-478c-acb8-8da8a035b09d'
   OR sm.variant_id = 'a5bf483e-96a5-4c3b-bb6c-4fd75d82ee1e'
ORDER BY sm.created_at DESC
LIMIT 50;

-- =====================================================================
-- 7. CHECK SALES HISTORY
-- =====================================================================
SELECT 
    '=== SALES HISTORY ===' as section,
    s.id as sale_id,
    s.invoice_number,
    s.total_amount,
    s.payment_status,
    s.sale_date,
    si.quantity as quantity_sold,
    si.unit_price,
    si.subtotal,
    c.name as customer_name,
    sl.name as branch_name
FROM sales s
JOIN sale_items si ON s.id = si.sale_id
LEFT JOIN customers c ON s.customer_id = c.id
LEFT JOIN store_locations sl ON s.branch_id = sl.id
WHERE si.product_id = '073d2ebf-12d1-478c-acb8-8da8a035b09d'
   OR si.variant_id = 'a5bf483e-96a5-4c3b-bb6c-4fd75d82ee1e'
ORDER BY s.sale_date DESC
LIMIT 20;

-- =====================================================================
-- 8. CHECK PURCHASE ORDER HISTORY
-- =====================================================================
SELECT 
    '=== PURCHASE ORDERS ===' as section,
    po.id as po_id,
    po.po_number,
    po.status,
    po.total_amount,
    po.order_date,
    po.expected_delivery_date,
    po.received_date,
    poi.quantity as ordered_quantity,
    poi.received_quantity,
    poi.unit_price,
    s.name as supplier_name,
    sl.name as branch_name
FROM purchase_orders po
JOIN purchase_order_items poi ON po.id = poi.purchase_order_id
LEFT JOIN suppliers s ON po.supplier_id = s.id
LEFT JOIN store_locations sl ON po.branch_id = sl.id
WHERE poi.product_id = '073d2ebf-12d1-478c-acb8-8da8a035b09d'
   OR poi.variant_id = 'a5bf483e-96a5-4c3b-bb6c-4fd75d82ee1e'
ORDER BY po.order_date DESC;

-- =====================================================================
-- 9. CHECK BRANCH TRANSFERS
-- =====================================================================
SELECT 
    '=== BRANCH TRANSFERS ===' as section,
    bt.id as transfer_id,
    bt.transfer_number,
    bt.status,
    bt.quantity,
    from_loc.name as from_branch,
    to_loc.name as to_branch,
    bt.transfer_date,
    bt.received_date,
    bt.notes,
    bt.created_by
FROM branch_transfers bt
LEFT JOIN store_locations from_loc ON bt.from_branch_id = from_loc.id
LEFT JOIN store_locations to_loc ON bt.to_branch_id = to_loc.id
WHERE bt.product_id = '073d2ebf-12d1-478c-acb8-8da8a035b09d'
   OR bt.variant_id = 'a5bf483e-96a5-4c3b-bb6c-4fd75d82ee1e'
ORDER BY bt.transfer_date DESC;

-- =====================================================================
-- 10. CHECK ALL BRANCHES IN SYSTEM
-- =====================================================================
SELECT 
    '=== ALL BRANCHES ===' as section,
    id as branch_id,
    name as branch_name,
    code as branch_code,
    city,
    address,
    phone,
    email,
    manager_name,
    is_main as is_main_branch,
    is_active,
    data_isolation_mode,
    opening_time,
    closing_time
FROM store_locations
WHERE is_active = true
ORDER BY is_main DESC, name;

-- =====================================================================
-- 11. COMPREHENSIVE SUMMARY
-- =====================================================================
SELECT 
    '=== COMPREHENSIVE SUMMARY ===' as section,
    p.name as product_name,
    p.sku as base_sku,
    COUNT(DISTINCT pv.id) as total_variants,
    SUM(pv.quantity) as total_stock_all_branches,
    SUM(pv.reserved_quantity) as total_reserved,
    SUM(pv.quantity - pv.reserved_quantity) as total_available,
    COUNT(DISTINCT pv.branch_id) as number_of_branches_with_stock,
    MIN(pv.price) as min_price,
    MAX(pv.price) as max_price,
    AVG(pv.cost_price) as avg_cost_price
FROM lats_products p
LEFT JOIN lats_product_variants pv ON p.id = pv.product_id
WHERE p.id = '073d2ebf-12d1-478c-acb8-8da8a035b09d'
GROUP BY p.id, p.name, p.sku;

-- =====================================================================
-- 12. CHECK IF PRODUCT EXISTS IN OTHER BRANCHES
-- =====================================================================
-- This will show you if there are any other variants in different branches
SELECT 
    '=== BRANCH AVAILABILITY ===' as section,
    sl.name as branch_name,
    sl.code as branch_code,
    CASE 
        WHEN pv.id IS NOT NULL THEN '✅ Product exists in this branch'
        ELSE '❌ Product NOT in this branch'
    END as availability,
    COALESCE(pv.quantity, 0) as stock_quantity,
    COALESCE(pv.price, 0) as selling_price
FROM store_locations sl
LEFT JOIN lats_product_variants pv ON sl.id = pv.branch_id 
    AND pv.product_id = '073d2ebf-12d1-478c-acb8-8da8a035b09d'
WHERE sl.is_active = true
ORDER BY sl.is_main DESC, sl.name;

-- =====================================================================
-- 13. QUICK DIAGNOSTIC CHECK
-- =====================================================================
SELECT 
    '=== DIAGNOSTIC CHECK ===' as section,
    (SELECT COUNT(*) FROM lats_products WHERE id = '073d2ebf-12d1-478c-acb8-8da8a035b09d') as product_exists,
    (SELECT COUNT(*) FROM lats_product_variants WHERE product_id = '073d2ebf-12d1-478c-acb8-8da8a035b09d') as variant_count,
    (SELECT SUM(quantity) FROM lats_product_variants WHERE product_id = '073d2ebf-12d1-478c-acb8-8da8a035b09d') as total_stock,
    (SELECT COUNT(*) FROM inventory_items WHERE product_id = '073d2ebf-12d1-478c-acb8-8da8a035b09d') as inventory_items_count,
    (SELECT COUNT(*) FROM lats_stock_movements WHERE product_id = '073d2ebf-12d1-478c-acb8-8da8a035b09d') as stock_movements_count,
    (SELECT COUNT(*) FROM branch_transfers WHERE product_id = '073d2ebf-12d1-478c-acb8-8da8a035b09d') as transfer_count;

-- =====================================================================
-- END OF QUERIES
-- =====================================================================

-- =====================================================================
-- HOW TO USE THESE QUERIES:
-- =====================================================================
-- 1. Connect to your Neon database
-- 2. Run all queries or individual sections
-- 3. Review the results for each section
-- 4. Check if product exists, stock levels, and branch availability
-- 
-- COMMON ISSUES TO CHECK:
-- - Is product active? (is_active = true)
-- - Is variant active? (pv.is_active = true)
-- - Is price set? (price > 0)
-- - Is there available stock? (quantity > reserved_quantity)
-- - Is product in the correct branch?
-- - Are there any reserved quantities blocking sales?
-- =====================================================================

