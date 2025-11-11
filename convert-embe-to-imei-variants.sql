-- ============================================
-- Convert Embe product to IMEI variants
-- IMPORTANT: Replace the IMEI numbers with actual IMEIs
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Get the product ID
DO $$
DECLARE
  v_product_id UUID;
  v_old_variant_id UUID;
  v_branch_id UUID;
  v_cost_price NUMERIC;
  v_selling_price NUMERIC;
BEGIN
  -- Find the Embe product and variant
  SELECT 
    v.product_id,
    v.id,
    v.branch_id,
    v.cost_price,
    v.selling_price
  INTO 
    v_product_id,
    v_old_variant_id,
    v_branch_id,
    v_cost_price,
    v_selling_price
  FROM lats_product_variants v
  WHERE v.sku = 'SKU-1761224833317-0KI-V01';

  IF v_product_id IS NULL THEN
    RAISE NOTICE '❌ Product not found!';
    RETURN;
  END IF;

  RAISE NOTICE '✅ Found product ID: %', v_product_id;
  RAISE NOTICE '✅ Old variant ID: %', v_old_variant_id;
  RAISE NOTICE '✅ Cost Price: %', v_cost_price;
  RAISE NOTICE '✅ Selling Price: %', v_selling_price;

  -- Step 2: Deactivate the old variant (don't delete, just deactivate)
  UPDATE lats_product_variants
  SET 
    is_active = false,
    quantity = 0,
    updated_at = NOW()
  WHERE id = v_old_variant_id;

  RAISE NOTICE '✅ Deactivated old variant';

  -- Step 3: Create 4 new IMEI variants
  -- ⚠️ IMPORTANT: Replace these IMEI numbers with the actual IMEIs!
  
  -- Variant 1
  INSERT INTO lats_product_variants (
    product_id,
    variant_name,
    sku,
    cost_price,
    selling_price,
    quantity,
    is_active,
    branch_id,
    variant_attributes
  ) VALUES (
    v_product_id,
    'IMEI: 111111111111111',  -- ⚠️ REPLACE WITH ACTUAL IMEI
    v_product_id::text || '-IMEI-1',
    v_cost_price,
    v_selling_price,
    1,
    true,
    v_branch_id,
    jsonb_build_object(
      'imei', '111111111111111',  -- ⚠️ REPLACE WITH ACTUAL IMEI
      'condition', 'new',
      'source', 'manual_conversion',
      'notes', 'Converted from regular variant to IMEI variant'
    )
  );

  -- Variant 2
  INSERT INTO lats_product_variants (
    product_id,
    variant_name,
    sku,
    cost_price,
    selling_price,
    quantity,
    is_active,
    branch_id,
    variant_attributes
  ) VALUES (
    v_product_id,
    'IMEI: 222222222222222',  -- ⚠️ REPLACE WITH ACTUAL IMEI
    v_product_id::text || '-IMEI-2',
    v_cost_price,
    v_selling_price,
    1,
    true,
    v_branch_id,
    jsonb_build_object(
      'imei', '222222222222222',  -- ⚠️ REPLACE WITH ACTUAL IMEI
      'condition', 'new',
      'source', 'manual_conversion',
      'notes', 'Converted from regular variant to IMEI variant'
    )
  );

  -- Variant 3
  INSERT INTO lats_product_variants (
    product_id,
    variant_name,
    sku,
    cost_price,
    selling_price,
    quantity,
    is_active,
    branch_id,
    variant_attributes
  ) VALUES (
    v_product_id,
    'IMEI: 333333333333333',  -- ⚠️ REPLACE WITH ACTUAL IMEI
    v_product_id::text || '-IMEI-3',
    v_cost_price,
    v_selling_price,
    1,
    true,
    v_branch_id,
    jsonb_build_object(
      'imei', '333333333333333',  -- ⚠️ REPLACE WITH ACTUAL IMEI
      'condition', 'new',
      'source', 'manual_conversion',
      'notes', 'Converted from regular variant to IMEI variant'
    )
  );

  -- Variant 4
  INSERT INTO lats_product_variants (
    product_id,
    variant_name,
    sku,
    cost_price,
    selling_price,
    quantity,
    is_active,
    branch_id,
    variant_attributes
  ) VALUES (
    v_product_id,
    'IMEI: 444444444444444',  -- ⚠️ REPLACE WITH ACTUAL IMEI
    v_product_id::text || '-IMEI-4',
    v_cost_price,
    v_selling_price,
    1,
    true,
    v_branch_id,
    jsonb_build_object(
      'imei', '444444444444444',  -- ⚠️ REPLACE WITH ACTUAL IMEI
      'condition', 'new',
      'source', 'manual_conversion',
      'notes', 'Converted from regular variant to IMEI variant'
    )
  );

  RAISE NOTICE '✅ Created 4 IMEI variants';

  -- Step 4: Update product stock (should still be 4)
  UPDATE lats_products
  SET 
    stock_quantity = 4,
    updated_at = NOW()
  WHERE id = v_product_id;

  RAISE NOTICE '✅ Updated product stock to 4';
  RAISE NOTICE '🎉 Conversion complete!';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANT: Edit the IMEI numbers in this script with actual IMEIs before running!';

END $$;

-- Verify the conversion
SELECT 
  p.name as product_name,
  p.stock_quantity as product_stock,
  v.variant_name,
  v.sku,
  v.quantity,
  v.variant_attributes->>'imei' as imei,
  v.is_active
FROM lats_products p
JOIN lats_product_variants v ON v.product_id = p.id
WHERE p.name ILIKE '%Embe%'
ORDER BY v.is_active DESC, v.created_at;

