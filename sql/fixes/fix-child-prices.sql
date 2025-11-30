-- ============================================
-- FIX CHILD IMEI DEVICES WITH ZERO PRICES
-- ============================================
-- This script updates child IMEI devices that have TSh 0 prices
-- to inherit the selling price from their parent variant

-- Step 1: Check current state
DO $$
DECLARE
  v_zero_price_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_zero_price_count
  FROM lats_product_variants child
  WHERE child.variant_type = 'imei_child'
    AND (child.selling_price = 0 OR child.selling_price IS NULL)
    AND child.parent_variant_id IS NOT NULL;
    
  RAISE NOTICE '🔍 Found % child devices with TSh 0 or NULL prices', v_zero_price_count;
END $$;

-- Step 2: Show affected devices for SKU-1761465747854-0E5
SELECT 
  parent.sku as parent_sku,
  parent.variant_name as parent_name,
  parent.selling_price as parent_price,
  child.variant_attributes->>'imei' as imei,
  child.selling_price as current_child_price
FROM lats_product_variants child
JOIN lats_product_variants parent ON parent.id = child.parent_variant_id
WHERE child.variant_type = 'imei_child'
  AND (child.selling_price = 0 OR child.selling_price IS NULL)
  AND parent.sku LIKE 'SKU-1761465747854-0E5%'
ORDER BY parent.sku;

-- Step 3: Update child devices to inherit parent prices (only for TSh 0 prices)
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

-- Step 4: Verify the fix
DO $$
DECLARE
  v_result RECORD;
BEGIN
  RAISE NOTICE '📊 After Fix - Checking SKU-1761465747854-0E5:';
  
  FOR v_result IN
    SELECT 
      parent.sku,
      parent.variant_name,
      parent.selling_price as parent_price,
      COUNT(child.id) as total_children,
      COUNT(*) FILTER (WHERE child.selling_price = 0 OR child.selling_price IS NULL) as zero_price_count
    FROM lats_product_variants parent
    LEFT JOIN lats_product_variants child ON child.parent_variant_id = parent.id AND child.variant_type = 'imei_child'
    WHERE parent.sku LIKE 'SKU-1761465747854-0E5%'
      AND parent.parent_variant_id IS NULL
    GROUP BY parent.id, parent.sku, parent.variant_name, parent.selling_price
    ORDER BY parent.sku
  LOOP
    RAISE NOTICE '  % (%): Parent Price = TSh %, Children with TSh 0 = %/%',
      v_result.sku,
      v_result.variant_name,
      v_result.parent_price,
      v_result.zero_price_count,
      v_result.total_children;
  END LOOP;
END $$;

-- ✅ Done!
SELECT '✅ Child prices updated successfully!' as status;

