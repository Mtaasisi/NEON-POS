-- ============================================================================
-- FIX IMEI VARIANTS FOR INAUZWA PRODUCT
-- ============================================================================
-- Your inauzwa product uses IMEI variants (individual devices), not quantity variants
-- This fix will consolidate them properly
-- ============================================================================

-- Check current state
SELECT '=== CURRENT STATE ===' as status;
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

-- Show all variants
SELECT '=== ALL VARIANTS ===' as status;
SELECT 
  v.id,
  v.name,
  v.variant_name,
  v.quantity,
  v.cost_price,
  v.selling_price,
  v.is_active,
  v.variant_attributes->>'imei' as imei,
  v.created_at
FROM lats_product_variants v
JOIN lats_products p ON p.id = v.product_id
WHERE p.name ILIKE '%inauzwa%'
ORDER BY v.created_at ASC;

-- Fix the product stock quantity to match actual variant quantities
DO $$
DECLARE
  v_product_id UUID;
  v_total_stock INTEGER;
  v_imei_count INTEGER;
BEGIN
  -- Get the inauzwa product ID
  SELECT id INTO v_product_id
  FROM lats_products
  WHERE name ILIKE '%inauzwa%'
  LIMIT 1;
  
  IF v_product_id IS NOT NULL THEN
    RAISE NOTICE 'Found inauzwa product: %', v_product_id;
    
    -- Calculate total stock from active variants
    SELECT 
      SUM(quantity) as total_stock,
      COUNT(*) as imei_count
    INTO v_total_stock, v_imei_count
    FROM lats_product_variants
    WHERE product_id = v_product_id
      AND is_active = true;
    
    RAISE NOTICE 'Total stock from variants: %, IMEI variants: %', v_total_stock, v_imei_count;
    
    -- Update product stock quantity
    UPDATE lats_products
    SET 
      stock_quantity = COALESCE(v_total_stock, 0),
      updated_at = NOW()
    WHERE id = v_product_id;
    
    RAISE NOTICE 'Updated product stock_quantity to: %', COALESCE(v_total_stock, 0);
  END IF;
END $$;

-- Show final state
SELECT '=== FINAL STATE ===' as status;
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
SELECT '=== FINAL VARIANTS ===' as status;
SELECT 
  v.id,
  v.name,
  v.variant_name,
  v.quantity,
  v.cost_price,
  v.selling_price,
  v.is_active,
  v.variant_attributes->>'imei' as imei,
  v.created_at
FROM lats_product_variants v
JOIN lats_products p ON p.id = v.product_id
WHERE p.name ILIKE '%inauzwa%'
ORDER BY v.is_active DESC, v.created_at ASC;

SELECT '=== IMEI VARIANTS FIXED ===' as status;
