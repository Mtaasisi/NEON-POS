-- ============================================
-- CHECK IF IMEI WAS SAVED
-- ============================================
-- Verify if the IMEI 356645465444445 was saved

-- Check for IMEI child variants
SELECT 
  v.id,
  v.name,
  v.variant_name,
  v.sku,
  v.variant_type,
  v.parent_variant_id,
  v.quantity,
  v.cost_price,
  v.selling_price,
  v.is_active,
  v.variant_attributes->>'imei' as imei,
  v.variant_attributes->>'serial_number' as serial_number,
  v.variant_attributes->>'imei_status' as status,
  v.variant_attributes->>'condition' as condition,
  pv.name as parent_name,
  pv.variant_name as parent_variant_name
FROM lats_product_variants v
LEFT JOIN lats_product_variants pv ON v.parent_variant_id = pv.id
WHERE v.variant_type = 'imei_child'
  AND (v.variant_attributes->>'imei' = '356645465444445'
       OR v.attributes->>'imei' = '356645465444445')
ORDER BY v.created_at DESC;

-- If no results, check all IMEI children for iPhone X
SELECT 
  v.id,
  v.name,
  v.variant_name,
  v.variant_type,
  v.parent_variant_id,
  v.variant_attributes->>'imei' as imei,
  v.variant_attributes->>'imei_status' as status,
  pv.name as parent_name,
  p.name as product_name
FROM lats_product_variants v
LEFT JOIN lats_product_variants pv ON v.parent_variant_id = pv.id
LEFT JOIN lats_products p ON v.product_id = p.id
WHERE v.variant_type = 'imei_child'
  AND p.name = 'iPhone X'
ORDER BY v.created_at DESC
LIMIT 10;

-- Check parent variant stock
SELECT 
  name,
  variant_name,
  sku,
  quantity,
  variant_type,
  is_parent,
  (SELECT COUNT(*) 
   FROM lats_product_variants child 
   WHERE child.parent_variant_id = v.id 
     AND child.variant_type = 'imei_child') as child_count
FROM lats_product_variants v
WHERE sku IN ('SKU-1761461887260-H7J-V01', 'SKU-1761461887260-H7J-V02')
ORDER BY name;

-- Summary
DO $$
DECLARE
  v_imei_count INTEGER;
  v_parent_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_imei_count
  FROM lats_product_variants v
  JOIN lats_products p ON v.product_id = p.id
  WHERE v.variant_type = 'imei_child'
    AND p.name = 'iPhone X';
    
  SELECT COUNT(*) INTO v_parent_count
  FROM lats_product_variants
  WHERE sku LIKE 'SKU-1761461887260-H7J-V%'
    AND is_parent = true;
  
  RAISE NOTICE '';
  RAISE NOTICE '📊 iPhone X IMEI Status:';
  RAISE NOTICE '   Parent variants: %', v_parent_count;
  RAISE NOTICE '   IMEI children: %', v_imei_count;
  RAISE NOTICE '';
  
  IF v_imei_count = 0 THEN
    RAISE NOTICE '❌ No IMEIs saved yet';
    RAISE NOTICE '🎯 Action: Try receiving PO again with hard refresh';
  ELSE
    RAISE NOTICE '✅ IMEIs found!';
  END IF;
  RAISE NOTICE '';
END $$;

