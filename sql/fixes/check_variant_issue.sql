-- Check the specific product and its variants
SELECT 
    pv.id,
    pv.sku,
    pv.variant_name,
    pv.quantity,
    pv.is_parent,
    pv.variant_type,
    pv.parent_variant_id,
    pv.is_active,
    pv.variant_attributes->>'imei' as imei
FROM lats_product_variants pv
WHERE pv.sku LIKE 'SKU-1761465747854-0E5%'
ORDER BY pv.created_at;

-- Check children count
SELECT 
    parent.sku as parent_sku,
    parent.variant_name,
    parent.quantity as parent_quantity,
    COUNT(child.id) as total_children,
    COUNT(child.id) FILTER (WHERE child.is_active = TRUE AND child.quantity > 0) as available_children
FROM lats_product_variants parent
LEFT JOIN lats_product_variants child ON child.parent_variant_id = parent.id AND child.variant_type = 'imei_child'
WHERE parent.sku LIKE 'SKU-1761465747854-0E5%'
GROUP BY parent.id, parent.sku, parent.variant_name, parent.quantity;
