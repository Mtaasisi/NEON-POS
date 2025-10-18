-- COMPLETE FIX for Stock Transfer Duplicate SKU Error
-- This includes ALL necessary functions

-- Drop existing functions
DROP FUNCTION IF EXISTS find_or_create_variant_at_branch(UUID, UUID);
DROP FUNCTION IF EXISTS complete_stock_transfer_transaction(UUID, UUID);
DROP FUNCTION IF EXISTS complete_stock_transfer_transaction(UUID);

-- Function 1: Find or Create Variant at Branch
CREATE OR REPLACE FUNCTION find_or_create_variant_at_branch(
  p_source_variant_id UUID,
  p_destination_branch_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_source_variant RECORD;
  v_destination_variant_id UUID;
  v_new_sku TEXT;
  v_sku_suffix TEXT;
  v_attempt INTEGER := 0;
  v_max_attempts INTEGER := 10;
BEGIN
  SELECT * INTO v_source_variant
  FROM lats_product_variants
  WHERE id = p_source_variant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source variant not found: %', p_source_variant_id;
  END IF;

  SELECT id INTO v_destination_variant_id
  FROM lats_product_variants
  WHERE product_id = v_source_variant.product_id
    AND branch_id = p_destination_branch_id
    AND variant_name = v_source_variant.variant_name
  LIMIT 1;

  IF FOUND THEN
    RETURN v_destination_variant_id;
  END IF;

  v_sku_suffix := LEFT(p_destination_branch_id::text, 8);
  
  WHILE v_attempt < v_max_attempts LOOP
    IF v_attempt = 0 THEN
      v_new_sku := v_source_variant.sku || '-' || v_sku_suffix;
    ELSE
      v_new_sku := v_source_variant.sku || '-' || v_sku_suffix || '-' || v_attempt::text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM lats_product_variants WHERE sku = v_new_sku) THEN
      EXIT;
    END IF;
    
    v_attempt := v_attempt + 1;
  END LOOP;
  
  IF v_attempt >= v_max_attempts THEN
    RAISE EXCEPTION 'Could not generate unique SKU after % attempts', v_max_attempts;
  END IF;

  BEGIN
    INSERT INTO lats_product_variants (
      product_id,
      branch_id,
      variant_name,
      sku,
      price,
      cost_price,
      quantity,
      reserved_quantity,
      low_stock_threshold,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      v_source_variant.product_id,
      p_destination_branch_id,
      v_source_variant.variant_name,
      v_new_sku,
      v_source_variant.price,
      v_source_variant.cost_price,
      0,
      0,
      v_source_variant.low_stock_threshold,
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_destination_variant_id;
    
  EXCEPTION
    WHEN unique_violation THEN
      SELECT id INTO v_destination_variant_id
      FROM lats_product_variants
      WHERE product_id = v_source_variant.product_id
        AND branch_id = p_destination_branch_id
        AND variant_name = v_source_variant.variant_name
      LIMIT 1;
      
      IF NOT FOUND THEN
        SELECT id INTO v_destination_variant_id
        FROM lats_product_variants
        WHERE sku = v_new_sku;
        
        IF NOT FOUND THEN
          RAISE EXCEPTION 'Unique violation but variant not found. SKU: %', v_new_sku;
        END IF;
      END IF;
  END;

  RETURN v_destination_variant_id;
END;
$$;

-- Function 2: Complete Stock Transfer Transaction
CREATE OR REPLACE FUNCTION complete_stock_transfer_transaction(
  p_transfer_id UUID,
  p_completed_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_transfer RECORD;
  v_destination_variant_id UUID;
  v_result JSONB;
BEGIN
  SELECT * INTO v_transfer
  FROM branch_transfers
  WHERE id = p_transfer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transfer not found: %', p_transfer_id;
  END IF;

  IF v_transfer.status NOT IN ('approved', 'in_transit') THEN
    RAISE EXCEPTION 'Transfer must be approved or in_transit. Current: %', v_transfer.status;
  END IF;

  v_destination_variant_id := find_or_create_variant_at_branch(
    v_transfer.entity_id,
    v_transfer.to_branch_id
  );

  PERFORM reduce_variant_stock(v_transfer.entity_id, v_transfer.quantity);

  PERFORM increase_variant_stock(v_destination_variant_id, v_transfer.quantity);

  UPDATE branch_transfers
  SET status = 'completed',
      completed_at = NOW(),
      updated_at = NOW()
  WHERE id = p_transfer_id;

  v_result := jsonb_build_object(
    'success', true,
    'transfer_id', p_transfer_id,
    'source_variant_id', v_transfer.entity_id,
    'destination_variant_id', v_destination_variant_id,
    'quantity_transferred', v_transfer.quantity
  );

  RETURN v_result;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION find_or_create_variant_at_branch TO PUBLIC;
GRANT EXECUTE ON FUNCTION complete_stock_transfer_transaction TO PUBLIC;

