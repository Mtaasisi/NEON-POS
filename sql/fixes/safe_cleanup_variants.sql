-- ============================================================================
-- SAFE CLEANUP OF MIXED VARIANT TYPES FOR INAUZWA PRODUCT
-- ============================================================================
-- Since we can't delete variants that are referenced by purchase orders,
-- we'll deactivate the empty quantity variants instead
-- ============================================================================

-- Check current state
SELECT '=== CURRENT STATE ===' as status;
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

-- Safely deactivate empty quantity variants
DO $$
DECLARE
  v_product_id UUID;
  v_deactivated_count INTEGER := 0;
  v_imei_count INTEGER := 0;
BEGIN
  -- Get the inauzwa product ID
  SELECT id INTO v_product_id
  FROM lats_products
  WHERE name ILIKE '%inauzwa%'
  LIMIT 1;
  
  IF v_product_id IS NOT NULL THEN
    RAISE NOTICE 'Safely cleaning up mixed variants for inauzwa product: %', v_product_id;
    
    -- Count active IMEI variants
    SELECT COUNT(*) INTO v_imei_count
    FROM lats_product_variants
    WHERE product_id = v_product_id
      AND variant_attributes->>'imei' IS NOT NULL
      AND is_active = true;
    
    RAISE NOTICE 'Found % active IMEI variants', v_imei_count;
    
    -- Deactivate empty quantity variants (don't delete due to foreign key constraints)
    UPDATE lats_product_variants
    SET 
      is_active = false,
      updated_at = NOW()
    WHERE product_id = v_product_id
      AND variant_attributes->>'imei' IS NULL
      AND quantity = 0;
    
    GET DIAGNOSTICS v_deactivated_count = ROW_COUNT;
    RAISE NOTICE 'Deactivated % empty quantity variants', v_deactivated_count;
    
    -- Update product stock to match only active IMEI variants
    UPDATE lats_products
    SET 
      stock_quantity = v_imei_count,
      updated_at = NOW()
    WHERE id = v_product_id;
    
    RAISE NOTICE 'Updated product stock to: %', v_imei_count;
  END IF;
END $$;

-- Show final state
SELECT '=== FINAL STATE ===' as status;
SELECT 
  p.name,
  p.stock_quantity,
  COUNT(v.id) as total_variants,
  COUNT(CASE WHEN v.is_active = true THEN 1 END) as active_variants,
  SUM(CASE WHEN v.is_active = true THEN v.quantity ELSE 0 END) as active_quantity,
  COUNT(CASE WHEN v.variant_attributes->>'imei' IS NOT NULL AND v.is_active = true THEN 1 END) as active_imei_variants
FROM lats_products p
LEFT JOIN lats_product_variants v ON v.product_id = p.id
WHERE p.name ILIKE '%inauzwa%'
GROUP BY p.id, p.name, p.stock_quantity;

-- Show final variants (active and inactive)
SELECT '=== FINAL VARIANTS (ACTIVE AND INACTIVE) ===' as status;
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
  END as variant_type,
  CASE 
    WHEN v.is_active THEN 'ACTIVE'
    ELSE 'INACTIVE'
  END as status
FROM lats_product_variants v
JOIN lats_products p ON p.id = v.product_id
WHERE p.name ILIKE '%inauzwa%'
ORDER BY v.is_active DESC, variant_type, v.created_at ASC;

SELECT '=== SAFE CLEANUP COMPLETED ===' as status;
