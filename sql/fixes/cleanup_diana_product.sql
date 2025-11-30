-- ============================================================================
-- CLEANUP DIANA PRODUCT VARIANTS
-- ============================================================================
-- This will consolidate Diana's 6 variants into 2 clean quantity variants
-- ============================================================================

-- Step 1: Check current state
SELECT '=== DIANA CURRENT STATE ===' as status;
SELECT 
  p.name,
  p.stock_quantity,
  COUNT(v.id) as total_variants,
  COUNT(CASE WHEN v.is_active = true THEN 1 END) as active_variants,
  SUM(CASE WHEN v.is_active = true THEN v.quantity ELSE 0 END) as active_quantity
FROM lats_products p
LEFT JOIN lats_product_variants v ON v.product_id = p.id
WHERE p.name ILIKE '%diana%'
GROUP BY p.id, p.name, p.stock_quantity;

-- Step 2: Show all current variants
SELECT '=== DIANA ALL VARIANTS ===' as status;
SELECT 
  v.name,
  v.variant_name,
  v.quantity,
  v.cost_price,
  v.selling_price,
  v.is_active,
  v.variant_attributes->>'imei' as imei
FROM lats_product_variants v
JOIN lats_products p ON p.id = v.product_id
WHERE p.name ILIKE '%diana%'
ORDER BY v.is_active DESC, v.cost_price ASC;

-- Step 3: Cleanup Diana variants
DO $$
DECLARE
  v_product_id UUID;
  v_variant_0000001_id UUID;
  v_variant_000002_id UUID;
  v_100k_count INTEGER := 0;
  v_200k_count INTEGER := 0;
BEGIN
  -- Get the Diana product ID
  SELECT id INTO v_product_id
  FROM lats_products
  WHERE name ILIKE '%diana%'
  LIMIT 1;
  
  IF v_product_id IS NOT NULL THEN
    RAISE NOTICE 'Starting cleanup for Diana product: %', v_product_id;
    
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
    SELECT id INTO v_variant_0000001_id
    FROM lats_product_variants
    WHERE product_id = v_product_id
      AND name = '0000001'
      AND variant_attributes->>'imei' IS NULL;
      
    SELECT id INTO v_variant_000002_id
    FROM lats_product_variants
    WHERE product_id = v_product_id
      AND name = '000002'
      AND variant_attributes->>'imei' IS NULL;
    
    -- Update variant 0000001 with correct quantity
    IF v_variant_0000001_id IS NOT NULL AND v_100k_count > 0 THEN
      UPDATE lats_product_variants
      SET 
        quantity = v_100k_count,
        is_active = true,
        selling_price = 200000,
        updated_at = NOW()
      WHERE id = v_variant_0000001_id;
      
      RAISE NOTICE 'Updated variant 0000001 with quantity: %', v_100k_count;
    END IF;
    
    -- Update variant 000002 with correct quantity
    IF v_variant_000002_id IS NOT NULL AND v_200k_count > 0 THEN
      UPDATE lats_product_variants
      SET 
        quantity = v_200k_count,
        is_active = true,
        selling_price = 400000,
        updated_at = NOW()
      WHERE id = v_variant_000002_id;
      
      RAISE NOTICE 'Updated variant 000002 with quantity: %', v_200k_count;
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
    
    RAISE NOTICE 'Updated Diana product stock to: %', v_100k_count + v_200k_count;
    RAISE NOTICE 'Diana cleanup finished successfully!';
  END IF;
END $$;

-- Step 4: Show final clean state
SELECT '=== DIANA FINAL CLEAN STATE ===' as status;
SELECT 
  p.name,
  p.stock_quantity,
  COUNT(v.id) as total_variants,
  COUNT(CASE WHEN v.is_active = true THEN 1 END) as active_variants,
  SUM(CASE WHEN v.is_active = true THEN v.quantity ELSE 0 END) as active_quantity
FROM lats_products p
LEFT JOIN lats_product_variants v ON v.product_id = p.id
WHERE p.name ILIKE '%diana%'
GROUP BY p.id, p.name, p.stock_quantity;

-- Step 5: Show final clean variants
SELECT '=== DIANA FINAL CLEAN VARIANTS ===' as status;
SELECT 
  v.name,
  v.variant_name,
  v.quantity,
  v.cost_price,
  v.selling_price,
  v.is_active,
  v.variant_attributes->>'imei' as imei
FROM lats_product_variants v
JOIN lats_products p ON p.id = v.product_id
WHERE p.name ILIKE '%diana%'
ORDER BY v.is_active DESC, v.cost_price ASC;

SELECT '=== DIANA CLEANUP COMPLETED ===' as status;
