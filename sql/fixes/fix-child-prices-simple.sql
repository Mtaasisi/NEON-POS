-- Simple price fix - Update child devices to inherit parent prices
UPDATE lats_product_variants child
SET 
  selling_price = parent.selling_price,
  cost_price = CASE 
    WHEN child.cost_price = 0 OR child.cost_price IS NULL 
    THEN parent.cost_price 
    ELSE child.cost_price 
  END,
  updated_at = NOW()
FROM lats_product_variants parent
WHERE child.parent_variant_id = parent.id
  AND child.variant_type = 'imei_child'
  AND (child.selling_price = 0 OR child.selling_price IS NULL)
  AND parent.sku LIKE 'SKU-1761465747854-0E5%';

