-- ============================================================================
-- CLEANUP ALL PRODUCTS WITH MIXED VARIANT TYPES
-- ============================================================================
-- This will clean up all products that have both empty quantity variants
-- and IMEI variants, consolidating them into clean quantity variants
-- ============================================================================

-- Step 1: Check all products that need cleanup
SELECT '=== PRODUCTS NEEDING CLEANUP ===' as status;
SELECT 
  p.name,
  p.stock_quantity,
  COUNT(v.id) as total_variants,
  COUNT(CASE WHEN v.is_active = true THEN 1 END) as active_variants,
  SUM(CASE WHEN v.is_active = true THEN v.quantity ELSE 0 END) as active_quantity,
  COUNT(CASE WHEN v.is_active = true AND v.variant_attributes->>'imei' IS NOT NULL THEN 1 END) as imei_variants,
  COUNT(CASE WHEN v.is_active = true AND v.variant_attributes->>'imei' IS NULL AND v.quantity = 0 THEN 1 END) as empty_variants
FROM lats_products p
LEFT JOIN lats_product_variants v ON v.product_id = p.id
GROUP BY p.id, p.name, p.stock_quantity
HAVING COUNT(CASE WHEN v.is_active = true AND v.variant_attributes->>'imei' IS NOT NULL THEN 1 END) > 0
  AND COUNT(CASE WHEN v.is_active = true AND v.variant_attributes->>'imei' IS NULL AND v.quantity = 0 THEN 1 END) > 0
ORDER BY p.name;

-- Step 2: Cleanup Mtaasissi product
DO $$
DECLARE
  v_product_id UUID;
  v_variant_kibonge_id UUID;
  v_variant_mwembamba_id UUID;
  v_100k_count INTEGER := 0;
  v_200k_count INTEGER := 0;
BEGIN
  -- Get the Mtaasissi product ID
  SELECT id INTO v_product_id
  FROM lats_products
  WHERE name ILIKE '%mtaasissi%'
  LIMIT 1;
  
  IF v_product_id IS NOT NULL THEN
    RAISE NOTICE 'Starting cleanup for Mtaasissi product: %', v_product_id;
    
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
    
    RAISE NOTICE 'Found % IMEI variants at 100k cost and % at 200k cost', v_100k_count, v_200k_count;
    
    -- Get the existing empty variants
    SELECT id INTO v_variant_kibonge_id
    FROM lats_product_variants
    WHERE product_id = v_product_id
      AND name ILIKE '%kibonge%'
      AND variant_attributes->>'imei' IS NULL;
      
    SELECT id INTO v_variant_mwembamba_id
    FROM lats_product_variants
    WHERE product_id = v_product_id
      AND name ILIKE '%mwembamba%'
      AND variant_attributes->>'imei' IS NULL;
    
    -- Update Kibonge variant with correct quantity
    IF v_variant_kibonge_id IS NOT NULL AND v_100k_count > 0 THEN
      UPDATE lats_product_variants
      SET 
        quantity = v_100k_count,
        is_active = true,
        updated_at = NOW()
      WHERE id = v_variant_kibonge_id;
      
      RAISE NOTICE 'Updated Kibonge variant with quantity: %', v_100k_count;
    END IF;
    
    -- Update Mwembamba variant with correct quantity
    IF v_variant_mwembamba_id IS NOT NULL AND v_200k_count > 0 THEN
      UPDATE lats_product_variants
      SET 
        quantity = v_200k_count,
        is_active = true,
        updated_at = NOW()
      WHERE id = v_variant_mwembamba_id;
      
      RAISE NOTICE 'Updated Mwembamba variant with quantity: %', v_200k_count;
    END IF;
    
    -- Deactivate all IMEI variants
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
    
    RAISE NOTICE 'Updated Mtaasissi product stock to: %', v_100k_count + v_200k_count;
    RAISE NOTICE 'Mtaasissi cleanup finished!';
  END IF;
END $$;

-- Step 3: Cleanup Embe product
DO $$
DECLARE
  v_product_id UUID;
  v_variant_1_id UUID;
  v_imei_count INTEGER := 0;
BEGIN
  -- Get the Embe product ID
  SELECT id INTO v_product_id
  FROM lats_products
  WHERE name ILIKE '%embe%'
  LIMIT 1;
  
  IF v_product_id IS NOT NULL THEN
    RAISE NOTICE 'Starting cleanup for Embe product: %', v_product_id;
    
    -- Count active IMEI variants
    SELECT COUNT(*) INTO v_imei_count
    FROM lats_product_variants
    WHERE product_id = v_product_id
      AND is_active = true
      AND variant_attributes->>'imei' IS NOT NULL
      AND quantity > 0;
    
    RAISE NOTICE 'Found % active IMEI variants', v_imei_count;
    
    -- Get the empty variant
    SELECT id INTO v_variant_1_id
    FROM lats_product_variants
    WHERE product_id = v_product_id
      AND name ILIKE '%variant 1%'
      AND variant_attributes->>'imei' IS NULL;
    
    -- Update variant with correct quantity
    IF v_variant_1_id IS NOT NULL AND v_imei_count > 0 THEN
      UPDATE lats_product_variants
      SET 
        quantity = v_imei_count,
        is_active = true,
        updated_at = NOW()
      WHERE id = v_variant_1_id;
      
      RAISE NOTICE 'Updated Variant 1 with quantity: %', v_imei_count;
    END IF;
    
    -- Deactivate all IMEI variants
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
      stock_quantity = v_imei_count,
      updated_at = NOW()
    WHERE id = v_product_id;
    
    RAISE NOTICE 'Updated Embe product stock to: %', v_imei_count;
    RAISE NOTICE 'Embe cleanup finished!';
  END IF;
END $$;

-- Step 4: Show final results for all cleaned products
SELECT '=== FINAL RESULTS FOR ALL PRODUCTS ===' as status;
SELECT 
  p.name,
  p.stock_quantity,
  COUNT(v.id) as total_variants,
  COUNT(CASE WHEN v.is_active = true THEN 1 END) as active_variants,
  SUM(CASE WHEN v.is_active = true THEN v.quantity ELSE 0 END) as active_quantity
FROM lats_products p
LEFT JOIN lats_product_variants v ON v.product_id = p.id
WHERE p.name ILIKE '%inauzwa%' 
   OR p.name ILIKE '%diana%'
   OR p.name ILIKE '%mtaasissi%'
   OR p.name ILIKE '%embe%'
GROUP BY p.id, p.name, p.stock_quantity
ORDER BY p.name;

SELECT '=== ALL PRODUCTS CLEANUP COMPLETED ===' as status;
