-- ============================================================================
-- COMPLETE VARIANT CLEANUP FOR INAUZWA PRODUCT
-- ============================================================================
-- This will consolidate all variants into 2 clean variants based on pricing
-- ============================================================================

-- Step 1: Check current state
SELECT '=== CURRENT STATE ===' as status;
SELECT 
  p.name,
  p.stock_quantity,
  COUNT(v.id) as total_variants,
  COUNT(CASE WHEN v.is_active = true THEN 1 END) as active_variants,
  SUM(v.quantity) as total_quantity
FROM lats_products p
LEFT JOIN lats_product_variants v ON v.product_id = p.id
WHERE p.name ILIKE '%inauzwa%'
GROUP BY p.id, p.name, p.stock_quantity;

-- Step 2: Show all current variants
SELECT '=== ALL CURRENT VARIANTS ===' as status;
SELECT 
  v.id,
  v.name,
  v.variant_name,
  v.quantity,
  v.cost_price,
  v.selling_price,
  v.is_active,
  v.variant_attributes->>'imei' as imei
FROM lats_product_variants v
JOIN lats_products p ON p.id = v.product_id
WHERE p.name ILIKE '%inauzwa%'
ORDER BY v.is_active DESC, v.created_at ASC;

-- Step 3: Complete cleanup - consolidate into 2 clean variants
DO $$
DECLARE
  v_product_id UUID;
  v_variant_100k_id UUID;
  v_variant_200k_id UUID;
  v_100k_count INTEGER := 0;
  v_200k_count INTEGER := 0;
BEGIN
  -- Get the inauzwa product ID
  SELECT id INTO v_product_id
  FROM lats_products
  WHERE name ILIKE '%inauzwa%'
  LIMIT 1;
  
  IF v_product_id IS NOT NULL THEN
    RAISE NOTICE 'Starting complete cleanup for inauzwa product: %', v_product_id;
    
    -- Count variants by cost price
    SELECT COUNT(*) INTO v_100k_count
    FROM lats_product_variants
    WHERE product_id = v_product_id
      AND is_active = true
      AND cost_price = 100000;
      
    SELECT COUNT(*) INTO v_200k_count
    FROM lats_product_variants
    WHERE product_id = v_product_id
      AND is_active = true
      AND cost_price = 200000;
    
    RAISE NOTICE 'Found % variants at 100k cost and % variants at 200k cost', v_100k_count, v_200k_count;
    
    -- Deactivate ALL existing variants
    UPDATE lats_product_variants
    SET 
      is_active = false,
      updated_at = NOW()
    WHERE product_id = v_product_id;
    
    RAISE NOTICE 'Deactivated all existing variants';
    
    -- Create 2 new clean variants
    -- Variant 1: 100k cost variants
    IF v_100k_count > 0 THEN
      INSERT INTO lats_product_variants (
        product_id,
        name,
        variant_name,
        sku,
        cost_price,
        selling_price,
        quantity,
        is_active,
        variant_attributes,
        created_at,
        updated_at
      ) VALUES (
        v_product_id,
        'inauzwa Variant: 001',
        'inauzwa Variant: 001',
        'SKU-1761241822820-0V0-V01',
        100000,
        200000,
        v_100k_count,
        true,
        jsonb_build_object(
          'source', 'consolidated',
          'original_count', v_100k_count,
          'consolidated_at', NOW()
        ),
        NOW(),
        NOW()
      ) RETURNING id INTO v_variant_100k_id;
      
      RAISE NOTICE 'Created consolidated variant for 100k cost: %, quantity: %', v_variant_100k_id, v_100k_count;
    END IF;
    
    -- Variant 2: 200k cost variants
    IF v_200k_count > 0 THEN
      INSERT INTO lats_product_variants (
        product_id,
        name,
        variant_name,
        sku,
        cost_price,
        selling_price,
        quantity,
        is_active,
        variant_attributes,
        created_at,
        updated_at
      ) VALUES (
        v_product_id,
        'inauzwa Variant: 002',
        'inauzwa Variant: 002',
        'SKU-1761241822820-0V0-V02',
        200000,
        400000,
        v_200k_count,
        true,
        jsonb_build_object(
          'source', 'consolidated',
          'original_count', v_200k_count,
          'consolidated_at', NOW()
        ),
        NOW(),
        NOW()
      ) RETURNING id INTO v_variant_200k_id;
      
      RAISE NOTICE 'Created consolidated variant for 200k cost: %, quantity: %', v_variant_200k_id, v_200k_count;
    END IF;
    
    -- Update product stock
    UPDATE lats_products
    SET 
      stock_quantity = v_100k_count + v_200k_count,
      updated_at = NOW()
    WHERE id = v_product_id;
    
    RAISE NOTICE 'Updated product stock to: %', v_100k_count + v_200k_count;
    RAISE NOTICE 'Complete cleanup finished successfully!';
  END IF;
END $$;

-- Step 4: Show final clean state
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

-- Step 5: Show final clean variants
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
  v.variant_attributes->>'source' as source,
  v.created_at
FROM lats_product_variants v
JOIN lats_products p ON p.id = v.product_id
WHERE p.name ILIKE '%inauzwa%'
ORDER BY v.is_active DESC, v.cost_price ASC;

SELECT '=== COMPLETE CLEANUP FINISHED ===' as status;
