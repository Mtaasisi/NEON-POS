-- ============================================================================
-- FIX PURCHASE ORDER VARIANT MERGING - DATABASE LEVEL
-- ============================================================================
-- Problem: Database functions still create separate inventory_items instead of 
--          merging with existing variants when receiving purchase orders
-- Solution: Update database functions to use smart variant merging logic
-- ============================================================================

-- Step 1: Create function to check if product has existing variants
CREATE OR REPLACE FUNCTION check_existing_variants(product_id_param UUID)
RETURNS TABLE(
  has_variants BOOLEAN,
  has_imei_variants BOOLEAN,
  has_quantity_variants BOOLEAN,
  existing_variants_count INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE WHEN COUNT(*) > 0 THEN TRUE ELSE FALSE END as has_variants,
    CASE WHEN COUNT(*) FILTER (WHERE variant_attributes->>'imei' IS NOT NULL) > 0 THEN TRUE ELSE FALSE END as has_imei_variants,
    CASE WHEN COUNT(*) FILTER (WHERE variant_attributes->>'imei' IS NULL AND quantity > 1) > 0 THEN TRUE ELSE FALSE END as has_quantity_variants,
    COUNT(*)::INTEGER as existing_variants_count
  FROM lats_product_variants
  WHERE product_id = product_id_param
    AND is_active = true;
END;
$$;

-- Step 2: Create function to merge quantities with existing variants
CREATE OR REPLACE FUNCTION merge_with_existing_variant(
  product_id_param UUID,
  variant_id_param UUID,
  quantity_to_add INTEGER,
  cost_price_param DECIMAL DEFAULT NULL,
  selling_price_param DECIMAL DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_target_variant RECORD;
  v_new_quantity INTEGER;
  v_result JSONB;
BEGIN
  -- Get the target variant
  SELECT * INTO v_target_variant
  FROM lats_product_variants
  WHERE id = variant_id_param AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Target variant not found'
    );
  END IF;
  
  -- Calculate new quantity
  v_new_quantity := v_target_variant.quantity + quantity_to_add;
  
  -- Update the variant
  UPDATE lats_product_variants
  SET 
    quantity = v_new_quantity,
    cost_price = COALESCE(cost_price_param, cost_price),
    selling_price = COALESCE(selling_price_param, selling_price),
    updated_at = NOW()
  WHERE id = variant_id_param;
  
  -- Update product stock
  UPDATE lats_products
  SET 
    stock_quantity = v_new_quantity,
    updated_at = NOW()
  WHERE id = product_id_param;
  
  RETURN jsonb_build_object(
    'success', true,
    'merged_quantity', quantity_to_add,
    'new_total_quantity', v_new_quantity,
    'variant_id', variant_id_param
  );
END;
$$;

-- Step 3: Create smart variant creation function
CREATE OR REPLACE FUNCTION create_smart_variants_for_po(
  purchase_order_item_id_param UUID,
  quantity_to_receive INTEGER,
  user_id_param UUID
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_item_record RECORD;
  v_variant_info RECORD;
  v_target_variant_id UUID;
  v_result JSONB;
  v_merged BOOLEAN := FALSE;
  v_created_variants INTEGER := 0;
BEGIN
  -- Get purchase order item details
  SELECT 
    poi.product_id,
    poi.variant_id,
    poi.unit_cost,
    poi.selling_price,
    p.name as product_name
  INTO v_item_record
  FROM lats_purchase_order_items poi
  JOIN lats_products p ON p.id = poi.product_id
  WHERE poi.id = purchase_order_item_id_param;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Purchase order item not found'
    );
  END IF;
  
  -- Check existing variants
  SELECT * INTO v_variant_info
  FROM check_existing_variants(v_item_record.product_id);
  
  -- Determine strategy based on existing variants
  IF v_variant_info.has_variants THEN
    IF v_variant_info.has_quantity_variants THEN
      -- Product has quantity-based variants - merge with existing
      SELECT id INTO v_target_variant_id
      FROM lats_product_variants
      WHERE product_id = v_item_record.product_id
        AND is_active = true
        AND variant_attributes->>'imei' IS NULL
        AND quantity > 1
      ORDER BY created_at ASC
      LIMIT 1;
      
      IF v_target_variant_id IS NOT NULL THEN
        -- Merge with existing variant
        v_result := merge_with_existing_variant(
          v_item_record.product_id,
          v_target_variant_id,
          quantity_to_receive,
          v_item_record.unit_cost,
          v_item_record.selling_price
        );
        v_merged := TRUE;
      END IF;
    END IF;
  END IF;
  
  -- If not merged and has existing variant_id, use that variant
  IF NOT v_merged AND v_item_record.variant_id IS NOT NULL THEN
    v_result := merge_with_existing_variant(
      v_item_record.product_id,
      v_item_record.variant_id,
      quantity_to_receive,
      v_item_record.unit_cost,
      v_item_record.selling_price
    );
    v_merged := TRUE;
  END IF;
  
  -- If still not merged, create new inventory items (legacy behavior)
  IF NOT v_merged THEN
    -- Create inventory items for each unit
    FOR i IN 1..quantity_to_receive LOOP
      INSERT INTO inventory_items (
        purchase_order_id,
        purchase_order_item_id,
        product_id,
        variant_id,
        status,
        cost_price,
        selling_price,
        notes,
        metadata,
        purchase_date,
        created_at,
        updated_at
      ) VALUES (
        (SELECT purchase_order_id FROM lats_purchase_order_items WHERE id = purchase_order_item_id_param),
        purchase_order_item_id_param,
        v_item_record.product_id,
        v_item_record.variant_id,
        'available',
        COALESCE(v_item_record.unit_cost, 0),
        COALESCE(v_item_record.selling_price, 0),
        format('Received from PO - %s (Item %s of %s)', v_item_record.product_name, i, quantity_to_receive),
        jsonb_build_object(
          'purchase_order_item_id', purchase_order_item_id_param::text,
          'batch_number', i,
          'received_by', user_id_param::text,
          'received_at', NOW(),
          'auto_generated', true,
          'smart_merge', false
        ),
        NOW(),
        NOW(),
        NOW()
      );
      v_created_variants := v_created_variants + 1;
    END LOOP;
  END IF;
  
  -- Update received quantity
  UPDATE lats_purchase_order_items
  SET 
    quantity_received = COALESCE(quantity_received, 0) + quantity_to_receive,
    updated_at = NOW()
  WHERE id = purchase_order_item_id_param;
  
  RETURN jsonb_build_object(
    'success', true,
    'merged', v_merged,
    'created_inventory_items', v_created_variants,
    'quantity_processed', quantity_to_receive,
    'merge_result', COALESCE(v_result, 'null'::jsonb)
  );
END;
$$;

-- Step 4: Update the main purchase order receive function
CREATE OR REPLACE FUNCTION complete_purchase_order_receive_v2(
  purchase_order_id_param UUID,
  user_id_param UUID,
  receive_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_record RECORD;
  v_item_record RECORD;
  v_items_processed INTEGER := 0;
  v_quantity INTEGER;
  v_result JSONB;
  v_total_items INTEGER := 0;
  v_total_ordered INTEGER := 0;
  v_all_received BOOLEAN;
  v_new_status VARCHAR;
BEGIN
  -- Check if purchase order exists and is in correct status
  SELECT * INTO v_order_record
  FROM lats_purchase_orders
  WHERE id = purchase_order_id_param;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Purchase order not found',
      'error_code', 'PO_NOT_FOUND'
    );
  END IF;

  -- Check if order is in a receivable status
  IF v_order_record.status NOT IN ('shipped', 'partial_received', 'confirmed', 'sent') THEN
    RETURN json_build_object(
      'success', false,
      'message', format('Cannot receive order in status: %s', v_order_record.status),
      'error_code', 'INVALID_STATUS'
    );
  END IF;

  -- Begin transaction
  BEGIN
    -- Process each purchase order item with smart merging
    FOR v_item_record IN 
      SELECT 
        poi.id as item_id,
        poi.product_id,
        poi.variant_id,
        poi.quantity_ordered,
        COALESCE(poi.quantity_received, 0) as quantity_received,
        poi.unit_cost,
        p.name as product_name,
        pv.name as variant_name,
        p.sku as product_sku,
        pv.sku as variant_sku,
        COALESCE(pv.selling_price, pv.unit_price, 0) as selling_price
      FROM lats_purchase_order_items poi
      LEFT JOIN lats_products p ON p.id = poi.product_id
      LEFT JOIN lats_product_variants pv ON pv.id = poi.variant_id
      WHERE poi.purchase_order_id = purchase_order_id_param
    LOOP
      v_total_items := v_total_items + 1;
      v_total_ordered := v_total_ordered + v_item_record.quantity_ordered;
      
      -- Calculate quantity to receive (total ordered - already received)
      v_quantity := v_item_record.quantity_ordered - v_item_record.quantity_received;
      
      IF v_quantity > 0 THEN
        -- Use smart variant creation/merging
        v_result := create_smart_variants_for_po(
          v_item_record.item_id,
          v_quantity,
          user_id_param
        );
        
        IF (v_result->>'success')::BOOLEAN THEN
          v_items_processed := v_items_processed + 1;
        END IF;
      END IF;
    END LOOP;

    -- Check if all items are fully received
    SELECT 
      COUNT(*) = COUNT(*) FILTER (WHERE COALESCE(quantity_received, 0) >= quantity_ordered)
    INTO v_all_received
    FROM lats_purchase_order_items
    WHERE purchase_order_id = purchase_order_id_param;

    -- Update purchase order status
    IF v_all_received THEN
      v_new_status := 'completed';
    ELSE
      v_new_status := 'partial_received';
    END IF;

    UPDATE lats_purchase_orders
    SET 
      status = v_new_status,
      updated_at = NOW()
    WHERE id = purchase_order_id_param;

    -- Commit transaction
    COMMIT;

    RETURN json_build_object(
      'success', true,
      'message', format('Successfully processed %s items with smart variant merging', v_items_processed),
      'items_processed', v_items_processed,
      'total_items', v_total_items,
      'total_ordered', v_total_ordered,
      'new_status', v_new_status,
      'order_number', v_order_record.order_number
    );

  EXCEPTION
    WHEN OTHERS THEN
      -- Rollback transaction on error
      ROLLBACK;
      RETURN json_build_object(
        'success', false,
        'message', format('Error processing purchase order: %s', SQLERRM),
        'error_code', 'PROCESSING_ERROR'
      );
  END;
END;
$$;

-- Step 5: Grant permissions
GRANT EXECUTE ON FUNCTION check_existing_variants(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION merge_with_existing_variant(UUID, UUID, INTEGER, DECIMAL, DECIMAL) TO authenticated;
GRANT EXECUTE ON FUNCTION create_smart_variants_for_po(UUID, INTEGER, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION complete_purchase_order_receive_v2(UUID, UUID, TEXT) TO authenticated;

-- Step 6: Create trigger to automatically use smart merging
CREATE OR REPLACE FUNCTION trigger_smart_po_receive()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- This trigger can be used to automatically call the smart receive function
  -- when certain conditions are met (optional enhancement)
  RETURN NEW;
END;
$$;

-- Step 7: Update existing functions to use smart merging (optional)
-- You can replace calls to the old complete_purchase_order_receive function
-- with complete_purchase_order_receive_v2 for automatic smart merging

-- Step 8: Create a migration function to fix existing data
CREATE OR REPLACE FUNCTION fix_existing_duplicate_variants()
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_product RECORD;
  v_duplicate_count INTEGER := 0;
  v_fixed_count INTEGER := 0;
BEGIN
  -- Find products with multiple variants that could be merged
  FOR v_product IN
    SELECT 
      product_id,
      COUNT(*) as variant_count,
      ARRAY_AGG(id ORDER BY created_at) as variant_ids
    FROM lats_product_variants
    WHERE is_active = true
      AND variant_attributes->>'imei' IS NULL  -- Non-IMEI variants
      AND quantity > 0
    GROUP BY product_id
    HAVING COUNT(*) > 1
  LOOP
    -- For each product with multiple variants, merge them
    -- Keep the first variant and merge others into it
    IF array_length(v_product.variant_ids, 1) > 1 THEN
      -- Update first variant with total quantity
      UPDATE lats_product_variants
      SET 
        quantity = (
          SELECT SUM(quantity)
          FROM lats_product_variants
          WHERE product_id = v_product.product_id
            AND is_active = true
            AND variant_attributes->>'imei' IS NULL
        ),
        updated_at = NOW()
      WHERE id = v_product.variant_ids[1];
      
      -- Deactivate other variants
      UPDATE lats_product_variants
      SET 
        is_active = false,
        quantity = 0,
        updated_at = NOW()
      WHERE product_id = v_product.product_id
        AND id != v_product.variant_ids[1]
        AND variant_attributes->>'imei' IS NULL;
      
      v_fixed_count := v_fixed_count + 1;
    END IF;
    
    v_duplicate_count := v_duplicate_count + 1;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'duplicates_found', v_duplicate_count,
    'variants_merged', v_fixed_count,
    'message', format('Fixed %s products with duplicate variants', v_fixed_count)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION fix_existing_duplicate_variants() TO authenticated;

-- ============================================================================
-- USAGE INSTRUCTIONS
-- ============================================================================
-- 
-- 1. Apply this migration to your database
-- 2. Use complete_purchase_order_receive_v2 instead of the old function
-- 3. Optionally run fix_existing_duplicate_variants() to clean up existing data
-- 4. The system will now automatically merge variants instead of creating duplicates
--
-- Example usage:
-- SELECT complete_purchase_order_receive_v2('your-po-id', 'user-id', 'notes');
-- SELECT fix_existing_duplicate_variants();
-- ============================================================================
