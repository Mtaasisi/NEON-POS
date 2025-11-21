-- ============================================================================
-- TEST: Create IMEI Variant
-- ============================================================================
-- This script tests the add_imei_to_parent_variant function to ensure
-- it works correctly after the stock_quantity fix
-- ============================================================================

-- Step 1: Find or create a test parent variant
DO $$
DECLARE
  v_parent_id UUID;
  v_product_id UUID;
  v_test_imei TEXT := '123456789012345'; -- Test IMEI
  v_result RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '╔════════════════════════════════════════════════════╗';
  RAISE NOTICE '║  🧪 TESTING IMEI VARIANT CREATION                 ║';
  RAISE NOTICE '╚════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  
  -- Find an existing parent variant or create one
  SELECT id, product_id INTO v_parent_id, v_product_id
  FROM lats_product_variants
  WHERE (is_parent = TRUE OR variant_type = 'parent')
    AND is_active = TRUE
  LIMIT 1;
  
  IF v_parent_id IS NULL THEN
    RAISE NOTICE '⚠️  No parent variant found. Creating a test one...';
    
    -- Find any product to use
    SELECT id INTO v_product_id
    FROM lats_products
    WHERE is_active = TRUE
    LIMIT 1;
    
    IF v_product_id IS NULL THEN
      RAISE EXCEPTION '❌ No active products found. Please create a product first.';
    END IF;
    
    -- Create a test parent variant
    INSERT INTO lats_product_variants (
      product_id,
      variant_name,
      name,
      sku,
      quantity,
      cost_price,
      selling_price,
      is_active,
      is_parent,
      variant_type,
      created_at,
      updated_at
    ) VALUES (
      v_product_id,
      'Test Parent Variant',
      'Test Parent Variant',
      'TEST-PARENT-' || TO_CHAR(NOW(), 'YYYYMMDDHH24MISS'),
      0,
      100.00,
      200.00,
      TRUE,
      TRUE,
      'parent',
      NOW(),
      NOW()
    ) RETURNING id INTO v_parent_id;
    
    RAISE NOTICE '✅ Created test parent variant: %', v_parent_id;
  ELSE
    RAISE NOTICE '✅ Using existing parent variant: %', v_parent_id;
  END IF;
  
  -- Step 2: Test adding an IMEI
  RAISE NOTICE '';
  RAISE NOTICE '📝 Testing add_imei_to_parent_variant function...';
  RAISE NOTICE '   Parent Variant ID: %', v_parent_id;
  RAISE NOTICE '   Test IMEI: %', v_test_imei;
  RAISE NOTICE '';
  
  -- Call the function
  SELECT * INTO v_result
  FROM add_imei_to_parent_variant(
    v_parent_id::UUID,
    v_test_imei,
    v_test_imei, -- serial_number (same as IMEI)
    NULL, -- mac_address
    150.00, -- cost_price
    250.00, -- selling_price
    'new', -- condition
    'Test IMEI created by verification script' -- notes
  );
  
  -- Step 3: Check results
  RAISE NOTICE '📊 Function Result:';
  RAISE NOTICE '   Success: %', v_result.success;
  RAISE NOTICE '   Child Variant ID: %', v_result.child_variant_id;
  RAISE NOTICE '   Error Message: %', COALESCE(v_result.error_message, 'None');
  RAISE NOTICE '';
  
  IF v_result.success THEN
    RAISE NOTICE '✅ SUCCESS! IMEI variant created successfully!';
    RAISE NOTICE '';
    
    -- Verify the child variant was created
    SELECT 
      id,
      variant_name,
      quantity,
      cost_price,
      selling_price,
      variant_attributes->>'imei' as imei,
      variant_attributes->>'serial_number' as serial_number,
      variant_attributes->>'condition' as condition,
      is_active
    INTO v_result
    FROM lats_product_variants
    WHERE id = v_result.child_variant_id;
    
    IF FOUND THEN
      RAISE NOTICE '✅ Verified child variant exists:';
      RAISE NOTICE '   ID: %', v_result.id;
      RAISE NOTICE '   Name: %', v_result.variant_name;
      RAISE NOTICE '   IMEI: %', v_result.imei;
      RAISE NOTICE '   Serial: %', v_result.serial_number;
      RAISE NOTICE '   Quantity: %', v_result.quantity;
      RAISE NOTICE '   Cost Price: %', v_result.cost_price;
      RAISE NOTICE '   Selling Price: %', v_result.selling_price;
      RAISE NOTICE '   Condition: %', v_result.condition;
      RAISE NOTICE '   Active: %', v_result.is_active;
    END IF;
    
    -- Check parent variant quantity was updated
    SELECT quantity INTO v_result.quantity
    FROM lats_product_variants
    WHERE id = v_parent_id;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ Parent variant quantity updated to: %', v_result.quantity;
    
  ELSE
    RAISE EXCEPTION '❌ FAILED! Error: %', v_result.error_message;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '╔════════════════════════════════════════════════════╗';
  RAISE NOTICE '║  ✅ TEST PASSED - IMEI CREATION WORKS!            ║';
  RAISE NOTICE '╚════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  
END $$;

-- Step 4: Show summary of created IMEI variants
SELECT 
  '📊 IMEI Variants Summary' as report,
  COUNT(*) as total_imei_variants,
  COUNT(*) FILTER (WHERE is_active = TRUE) as active_imei_variants,
  SUM(quantity) FILTER (WHERE is_active = TRUE) as total_active_stock
FROM lats_product_variants
WHERE variant_type = 'imei_child';

-- Step 5: Show recent IMEI variants
SELECT 
  '📋 Recent IMEI Variants' as report,
  pv.id,
  pv.variant_name,
  pv.variant_attributes->>'imei' as imei,
  pv.quantity,
  pv.cost_price,
  pv.selling_price,
  pv.is_active,
  parent.variant_name as parent_name,
  p.name as product_name
FROM lats_product_variants pv
LEFT JOIN lats_product_variants parent ON parent.id = pv.parent_variant_id
LEFT JOIN lats_products p ON p.id = pv.product_id
WHERE pv.variant_type = 'imei_child'
ORDER BY pv.created_at DESC
LIMIT 5;

