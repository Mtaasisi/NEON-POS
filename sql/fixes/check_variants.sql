-- Check for products with parent-child variant structure
SELECT 
  p.name as product_name,
  pv.variant_name as parent_variant,
  pv.quantity,
  pv.is_parent,
  pv.variant_type,
  (SELECT COUNT(*) 
   FROM lats_product_variants child 
   WHERE child.parent_variant_id = pv.id 
   AND child.variant_type = 'imei_child'
   AND child.is_active = true
  ) as child_count
FROM lats_products p
JOIN lats_product_variants pv ON p.id = pv.product_id
WHERE pv.is_parent = true 
   OR pv.variant_type = 'parent'
LIMIT 5;
