-- ============================================
-- CREATE add_imei_to_parent_variant FUNCTION
-- ============================================
-- This function is called when receiving Purchase Orders with IMEI tracking
-- It creates a child variant for each IMEI under a parent variant

CREATE OR REPLACE FUNCTION add_imei_to_parent_variant(
  parent_variant_id_param UUID,
  imei_param TEXT,
  serial_number_param TEXT DEFAULT NULL,
  mac_address_param TEXT DEFAULT NULL,
  cost_price_param NUMERIC DEFAULT 0,
  selling_price_param NUMERIC DEFAULT 0,
  condition_param TEXT DEFAULT 'new',
  branch_id_param UUID DEFAULT NULL,
  notes_param TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  child_variant_id UUID,
  error_message TEXT
) AS $$
DECLARE
  v_parent_variant RECORD;
  v_product_id UUID;
  v_new_sku TEXT;
  v_child_id UUID;
  v_timestamp TEXT;
BEGIN
  -- Get parent variant info
  SELECT * INTO v_parent_variant
  FROM lats_product_variants
  WHERE id = parent_variant_id_param;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 'Parent variant not found';
    RETURN;
  END IF;
  
  -- Check for duplicate IMEI
  IF EXISTS (
    SELECT 1 FROM lats_product_variants
    WHERE variant_attributes->>'imei' = imei_param
  ) THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 'Device with IMEI ' || imei_param || ' already exists in inventory';
    RETURN;
  END IF;
  
  -- Get product ID
  v_product_id := v_parent_variant.product_id;
  
  -- Generate unique SKU for child IMEI variant
  v_timestamp := EXTRACT(EPOCH FROM NOW())::TEXT;
  v_new_sku := COALESCE(v_parent_variant.sku, 'VAR') || '-IMEI-' || SUBSTRING(imei_param, 1, 8) || '-' || SUBSTRING(v_timestamp, 1, 10);
  
  -- Mark parent as parent type if not already
  UPDATE lats_product_variants
  SET 
    is_parent = TRUE,
    variant_type = 'parent',
    updated_at = NOW()
  WHERE id = parent_variant_id_param
    AND variant_type != 'parent';
  
  -- Create child IMEI variant
  INSERT INTO lats_product_variants (
    product_id,
    parent_variant_id,
    name,
    variant_name,
    sku,
    cost_price,
    selling_price,
    quantity,
    is_active,
    is_parent,
    variant_type,
    variant_attributes,
    branch_id
  ) VALUES (
    v_product_id,
    parent_variant_id_param,
    'IMEI: ' || imei_param,
    'IMEI: ' || imei_param,
    v_new_sku,
    COALESCE(cost_price_param, v_parent_variant.cost_price),
    COALESCE(selling_price_param, v_parent_variant.selling_price),
    1, -- Each IMEI is quantity 1
    TRUE,
    FALSE,
    'imei_child',
    jsonb_build_object(
      'imei', imei_param,
      'serial_number', serial_number_param,
      'mac_address', mac_address_param,
      'condition', condition_param,
      'notes', notes_param,
      'source', 'purchase',
      'created_at', NOW()
    ),
    COALESCE(branch_id_param, v_parent_variant.branch_id)
  )
  RETURNING id INTO v_child_id;
  
  -- Create stock movement record
  INSERT INTO lats_stock_movements (
    product_id,
    variant_id,
    branch_id,
    movement_type,
    quantity,
    reference_type,
    notes,
    created_at
  ) VALUES (
    v_product_id,
    v_child_id,
    COALESCE(branch_id_param, v_parent_variant.branch_id),
    'purchase',
    1,
    'imei_receive',
    'Received IMEI ' || imei_param || ' for variant ' || COALESCE(v_parent_variant.variant_name, v_parent_variant.name),
    NOW()
  );
  
  RETURN QUERY SELECT TRUE, v_child_id, NULL::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Add comment for documentation
COMMENT ON FUNCTION add_imei_to_parent_variant IS 'Add a new IMEI as a child of a parent variant during PO receiving';

-- Verify function creation
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'add_imei_to_parent_variant'
  ) THEN
    RAISE NOTICE '✅ Function add_imei_to_parent_variant created successfully!';
  ELSE
    RAISE EXCEPTION '❌ Function creation failed';
  END IF;
END $$;

