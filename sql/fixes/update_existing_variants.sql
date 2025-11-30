-- ============================================================================
-- UPDATE EXISTING VARIANTS TO CLEAN UP INAUZWA PRODUCT
-- ============================================================================
-- This will update the existing empty variants with the correct quantities
-- ============================================================================

-- Step 1: Check current state
SELECT '=== CURRENT STATE ===' as status;
SELECT 
  p.name,
  p.stock_quantity,
  COUNT(v.id) as total_variants,
  COUNT(CASE WHEN v.is_active = true THEN 1 END) as active_variants,
  SUM(CASE WHEN v.is_active = true THEN v.quantity ELSE 0 END) as active_quantity
FROM lats_products p
LEFT JOIN lats_product_variants v ON v.product_id = p.id
WHERE p.name ILIKE '%inauzwa%'
GROUP BY p.id, p.name, p.stock_quantity;

-- Step 2: Update existing variants with correct quantities
DO $$
DECLARE
  v_product_id UUID;
  v_variant_001_id UUID;
  v_variant_002_id UUID;
  v_100k_count INTEGER := 0;
  v_200k_count INTEGER := 0;
BEGIN
  -- Get the inauzwa product ID
  SELECT id INTO v_product_id
  FROM lats_products
  WHERE name ILIKE '%inauzwa%'
  LIMIT 1;
  
  IF v_product_id IS NOT NULL THEN
    RAISE NOTICE 'Starting variant update for inauzwa product: %', v_product_id;
    
    -- Count IMEI variants by cost price
    SELECT COUNT(*) INTO v_100k_count
    FROM lats_product_variants
    WHERE product_id = v_product_id
      AND is_active = true
      AND cost_price = 100000
      AND variant_attributes->>'imei' IS NOT NULL;
      
    SELECT COUNT(*) INTO v_200k_count
    FROM lats_product_variants
    WHERE product_id = v_product_id
      AND is_active = true
      AND cost_price = 200000
      AND variant_attributes->>'imei' IS NOT NULL;
    
    RAISE NOTICE 'Found % IMEI variants at 100k cost and % IMEI variants at 200k cost', v_100k_count, v_200k_count;
    
    -- Get the existing empty variants
    SELECT id INTO v_variant_001_id
    FROM lats_product_variants
    WHERE product_id = v_product_id
      AND name = '001'
      AND variant_attributes->>'imei' IS NULL;
      
    SELECT id INTO v_variant_002_id
    FROM lats_product_variants
    WHERE product_id = v_product_id
      AND name = '002'
      AND variant_attributes->>'imei' IS NULL;
    
    -- Update variant 001 with correct quantity
    IF v_variant_001_id IS NOT NULL AND v_100k_count > 0 THEN
      UPDATE lats_product_variants
      SET 
        quantity = v_100k_count,
        is_active = true,
        selling_price = 200000,
        updated_at = NOW()
      WHERE id = v_variant_001_id;
      
      RAISE NOTICE 'Updated variant 001 with quantity: %', v_100k_count;
    END IF;
    
    -- Update variant 002 with correct quantity
    IF v_variant_002_id IS NOT NULL AND v_200k_count > 0 THEN
      UPDATE lats_product_variants
      SET 
        quantity = v_200k_count,
        is_active = true,
        selling_price = 400000,
        updated_at = NOW()
      WHERE id = v_variant_002_id;
      
      RAISE NOTICE 'Updated variant 002 with quantity: %', v_200k_count;
    END IF;
    
    -- Deactivate all IMEI variants since we're consolidating into quantity variants
    UPDATE lats_product_variants
    SET 
      is_active = false,
      updated_at = NOW()
    WHERE product_id = v_product_id
      AND variant_attributes->>'imei' IS NOT NULL;
    
    RAISE NOTICE 'Deactivated all IMEI variants';
    
    -- Update product stock
    UPDATE lats_products
    SET 
      stock_quantity = v_100k_count + v_200k_count,
      updated_at = NOW()
    WHERE id = v_product_id;
    
    RAISE NOTICE 'Updated product stock to: %', v_100k_count + v_200k_count;
    RAISE NOTICE 'Variant update finished successfully!';
  END IF;
END $$;

-- Step 3: Show final clean state
SELECT '=== FINAL CLEAN STATE ===' as status;
SELECT 
  p.name,
  p.stock_quantity,
  COUNT(v.id) as total_variants,
  COUNT(CASE WHEN v.is_active = true THEN 1 END) as active_variants,
  SUM(CASE WHEN v.is_active = true THEN v.quantity ELSE 0 END) as active_quantity
FROM lats_products p
LEFT JOIN lats_product_variants v ON v.product_id = p.id
WHERE p.name ILIKE '%inauzwa%'
GROUP BY p.id, p.name, p.stock_quantity;

-- Step 4: Show final clean variants
SELECT '=== FINAL CLEAN VARIANTS ===' as status;
SELECT 
  v.id,
  v.name,
  v.variant_name,
  v.sku,
  v.quantity,
  v.cost_price,
  v.selling_price,
  v.is_active,
  v.variant_attributes->>'imei' as imei,
  v.created_at
FROM lats_product_variants v
JOIN lats_products p ON p.id = v.product_id
WHERE p.name ILIKE '%inauzwa%'
ORDER BY v.is_active DESC, v.cost_price ASC;

SELECT '=== CLEANUP COMPLETED ===' as status;
