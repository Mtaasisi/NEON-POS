-- ============================================================================
-- CLEANUP MIXED VARIANT TYPES FOR INAUZWA PRODUCT
-- ============================================================================
-- Your inauzwa product has both quantity-based variants (001, 002) and IMEI variants
-- This creates confusion. Let's clean this up by removing empty quantity variants
-- and keeping only the IMEI variants which represent actual devices
-- ============================================================================

-- Check current state
SELECT '=== CURRENT MIXED VARIANTS ===' as status;
SELECT 
  v.id,
  v.name,
  v.variant_name,
  v.quantity,
  v.cost_price,
  v.selling_price,
  v.is_active,
  v.variant_attributes->>'imei' as imei,
  CASE 
    WHEN v.variant_attributes->>'imei' IS NOT NULL THEN 'IMEI Variant'
    WHEN v.quantity > 0 THEN 'Quantity Variant'
    ELSE 'Empty Variant'
  END as variant_type
FROM lats_product_variants v
JOIN lats_products p ON p.id = v.product_id
WHERE p.name ILIKE '%inauzwa%'
ORDER BY variant_type, v.created_at ASC;

-- Clean up by removing empty quantity variants (keep only IMEI variants)
DO $$
DECLARE
  v_product_id UUID;
  v_removed_count INTEGER := 0;
  v_imei_count INTEGER := 0;
BEGIN
  -- Get the inauzwa product ID
  SELECT id INTO v_product_id
  FROM lats_products
  WHERE name ILIKE '%inauzwa%'
  LIMIT 1;
  
  IF v_product_id IS NOT NULL THEN
    RAISE NOTICE 'Cleaning up mixed variants for inauzwa product: %', v_product_id;
    
    -- Count IMEI variants
    SELECT COUNT(*) INTO v_imei_count
    FROM lats_product_variants
    WHERE product_id = v_product_id
      AND variant_attributes->>'imei' IS NOT NULL
      AND is_active = true;
    
    RAISE NOTICE 'Found % IMEI variants', v_imei_count;
    
    -- Remove empty quantity variants (variants without IMEI and with 0 quantity)
    DELETE FROM lats_product_variants
    WHERE product_id = v_product_id
      AND variant_attributes->>'imei' IS NULL
      AND quantity = 0;
    
    GET DIAGNOSTICS v_removed_count = ROW_COUNT;
    RAISE NOTICE 'Removed % empty quantity variants', v_removed_count;
    
    -- Update product stock to match IMEI variants
    UPDATE lats_products
    SET 
      stock_quantity = v_imei_count,
      updated_at = NOW()
    WHERE id = v_product_id;
    
    RAISE NOTICE 'Updated product stock to: %', v_imei_count;
  END IF;
END $$;

-- Show final clean state
SELECT '=== FINAL CLEAN STATE ===' as status;
SELECT 
  p.name,
  p.stock_quantity,
  COUNT(v.id) as total_variants,
  COUNT(CASE WHEN v.is_active = true THEN 1 END) as active_variants,
  SUM(v.quantity) as total_quantity,
  COUNT(CASE WHEN v.variant_attributes->>'imei' IS NOT NULL THEN 1 END) as imei_variants
FROM lats_products p
LEFT JOIN lats_product_variants v ON v.product_id = p.id
WHERE p.name ILIKE '%inauzwa%'
GROUP BY p.id, p.name, p.stock_quantity;

-- Show final variants
SELECT '=== FINAL CLEAN VARIANTS ===' as status;
SELECT 
  v.id,
  v.name,
  v.variant_name,
  v.quantity,
  v.cost_price,
  v.selling_price,
  v.is_active,
  v.variant_attributes->>'imei' as imei,
  'IMEI Variant' as variant_type
FROM lats_product_variants v
JOIN lats_products p ON p.id = v.product_id
WHERE p.name ILIKE '%inauzwa%'
ORDER BY v.created_at ASC;

SELECT '=== CLEANUP COMPLETED ===' as status;
