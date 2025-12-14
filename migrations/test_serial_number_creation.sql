-- ============================================================================
-- TEST: Create Variant with Serial Number (No IMEI)
-- ============================================================================
-- This script tests creating a variant using serial numbers instead of IMEI
-- ============================================================================

DO $$
DECLARE
  v_parent_id UUID;
  v_product_id UUID;
  v_test_serial TEXT := 'SN-TEST-' || TO_CHAR(NOW(), 'YYYYMMDDHH24MISS');
  v_result RECORD;
  v_child_id UUID;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '╔════════════════════════════════════════════════════╗';
  RAISE NOTICE '║  🧪 TESTING SERIAL NUMBER VARIANT CREATION         ║';
  RAISE NOTICE '╚════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  
  -- Find an existing parent variant
  SELECT id, product_id INTO v_parent_id, v_product_id
  FROM lats_product_variants
  WHERE (is_parent = TRUE OR variant_type = 'parent')
    AND is_active = TRUE
  LIMIT 1;
  
  IF v_parent_id IS NULL THEN
    RAISE EXCEPTION '❌ No parent variant found. Please create a parent variant first.';
  END IF;
  
  RAISE NOTICE '✅ Using parent variant: %', v_parent_id;
  RAISE NOTICE '📝 Test Serial Number: %', v_test_serial;
  RAISE NOTICE '';
  
  -- Test 1: Try using serial number as IMEI (unified approach)
  -- Since the system unifies IMEI and serial number, we can use serial number
  RAISE NOTICE '📝 Test 1: Creating variant with serial number as IMEI...';
  
  SELECT * INTO v_result
  FROM add_imei_to_parent_variant(
    v_parent_id::UUID,
    v_test_serial, -- Using serial as IMEI (unified field)
    v_test_serial, -- serial_number (same value)
    NULL, -- mac_address
    100.00, -- cost_price
    200.00, -- selling_price
    'new', -- condition
    'Test variant created with serial number' -- notes
  );
  
  IF v_result.success THEN
    v_child_id := v_result.child_variant_id;
    RAISE NOTICE '✅ SUCCESS! Variant created with ID: %', v_child_id;
    
    -- Verify the variant
    SELECT 
      id,
      variant_name,
      quantity,
      variant_attributes->>'imei' as imei,
      variant_attributes->>'serial_number' as serial_number,
      variant_attributes->>'condition' as condition,
      is_active
    INTO v_result
    FROM lats_product_variants
    WHERE id = v_child_id;
    
    IF FOUND THEN
      RAISE NOTICE '';
      RAISE NOTICE '✅ Verified variant details:';
      RAISE NOTICE '   ID: %', v_result.id;
      RAISE NOTICE '   Name: %', v_result.variant_name;
      RAISE NOTICE '   IMEI (stored): %', v_result.imei;
      RAISE NOTICE '   Serial Number (stored): %', v_result.serial_number;
      RAISE NOTICE '   Condition: %', v_result.condition;
      RAISE NOTICE '   Quantity: %', v_result.quantity;
      RAISE NOTICE '   Active: %', v_result.is_active;
    END IF;
  ELSE
    RAISE EXCEPTION '❌ FAILED! Error: %', v_result.error_message;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '╔════════════════════════════════════════════════════╗';
  RAISE NOTICE '║  ✅ SERIAL NUMBER TEST PASSED!                     ║';
  RAISE NOTICE '╚════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  RAISE NOTICE '📌 Note: The system unifies IMEI and Serial Number';
  RAISE NOTICE '   Both fields store the same value for consistency.';
  RAISE NOTICE '';
  
END $$;

-- Show variants with serial numbers
SELECT 
  '📋 Variants with Serial Numbers' as report,
  pv.id,
  pv.variant_name,
  pv.variant_attributes->>'imei' as imei_or_serial,
  pv.variant_attributes->>'serial_number' as serial_number,
  pv.quantity,
  pv.is_active,
  parent.variant_name as parent_name,
  p.name as product_name
FROM lats_product_variants pv
LEFT JOIN lats_product_variants parent ON parent.id = pv.parent_variant_id
LEFT JOIN lats_products p ON p.id = pv.product_id
WHERE pv.variant_type = 'imei_child'
  AND (pv.variant_attributes->>'serial_number' IS NOT NULL 
       OR pv.variant_attributes->>'imei' IS NOT NULL)
ORDER BY pv.created_at DESC
LIMIT 10;

