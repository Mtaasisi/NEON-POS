-- =====================================================
-- CREATE COMPLETE PURCHASE ORDER RECEIVE FUNCTION
-- =====================================================
-- This function handles the receive process for purchase orders (both full and partial)
-- It creates inventory items for remaining items and updates the order status automatically
-- Option B Workflow: Supports incremental partial receives

CREATE OR REPLACE FUNCTION complete_purchase_order_receive(
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
  v_items_created INTEGER := 0;
  v_quantity INTEGER;
  v_i INTEGER;
  v_total_items INTEGER := 0;
  v_total_ordered INTEGER := 0;
  v_total_received INTEGER := 0;
  v_all_received BOOLEAN;
  v_new_status VARCHAR;
  v_result JSON;
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
    -- Process each purchase order item
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
        -- Create inventory items for the quantity to receive
        FOR v_i IN 1..v_quantity LOOP
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
            purchase_order_id_param,
            v_item_record.item_id,
            v_item_record.product_id,
            v_item_record.variant_id,
            'available',
            COALESCE(v_item_record.unit_cost, 0),
            COALESCE(v_item_record.selling_price, 0),
            format(
              'Received from PO %s - %s %s (Item %s of %s)%s',
              v_order_record.order_number,
              v_item_record.product_name,
              COALESCE(' - ' || v_item_record.variant_name, ''),
              v_i,
              v_quantity,
              CASE WHEN receive_notes IS NOT NULL THEN ' - ' || receive_notes ELSE '' END
            ),
            jsonb_build_object(
              'purchase_order_id', purchase_order_id_param::text,
              'purchase_order_item_id', v_item_record.item_id::text,
              'order_number', v_order_record.order_number,
              'batch_number', v_i,
              'received_by', user_id_param::text,
              'received_at', NOW(),
              'auto_generated', true
            ),
            NOW(),
            NOW(),
            NOW()
          );
          
          v_items_created := v_items_created + 1;
        END LOOP;

        -- Update the purchase order item with received quantity (increment, not replace)
        UPDATE lats_purchase_order_items
        SET 
          quantity_received = COALESCE(quantity_received, 0) + v_quantity,
          updated_at = NOW()
        WHERE id = v_item_record.item_id;
      END IF;
    END LOOP;

    -- Check if all items are fully received
    SELECT NOT EXISTS (
      SELECT 1 
      FROM lats_purchase_order_items 
      WHERE purchase_order_id = purchase_order_id_param 
      AND COALESCE(quantity_received, 0) < quantity_ordered
    ) INTO v_all_received;
    
    -- Calculate total received for summary
    SELECT COALESCE(SUM(quantity_received), 0)
    INTO v_total_received
    FROM lats_purchase_order_items
    WHERE purchase_order_id = purchase_order_id_param;
    
    -- Calculate total ordered for summary
    SELECT COALESCE(SUM(quantity_ordered), 0)
    INTO v_total_ordered
    FROM lats_purchase_order_items
    WHERE purchase_order_id = purchase_order_id_param;
    
    -- Set appropriate status
    IF v_all_received THEN
      v_new_status := 'received';
    ELSE
      v_new_status := 'partial_received';
    END IF;
    
    -- Update purchase order status
    UPDATE lats_purchase_orders
    SET 
      status = v_new_status,
      received_date = CASE WHEN v_all_received THEN NOW() ELSE received_date END,
      updated_at = NOW()
    WHERE id = purchase_order_id_param;

    -- Create audit log entry
    INSERT INTO lats_purchase_order_audit_log (
      purchase_order_id,
      action,
      old_status,
      new_status,
      user_id,
      notes,
      created_at
    ) VALUES (
      purchase_order_id_param,
      CASE WHEN v_all_received THEN 'receive_complete' ELSE 'receive_partial' END,
      v_order_record.status,
      v_new_status,
      user_id_param,
      format('%s: Created %s inventory items (%s/%s received)%s', 
        CASE WHEN v_all_received THEN 'Complete receive' ELSE 'Partial receive' END,
        v_items_created,
        v_total_received,
        v_total_ordered,
        CASE WHEN receive_notes IS NOT NULL THEN ' - ' || receive_notes ELSE '' END
      ),
      NOW()
    );

    -- Build success response with complete summary
    v_result := json_build_object(
      'success', true,
      'message', format('Successfully received %s items from purchase order', v_items_created),
      'data', json_build_object(
        'purchase_order_id', purchase_order_id_param,
        'order_number', v_order_record.order_number,
        'items_created', v_items_created,
        'total_items', v_total_items,
        'total_ordered', v_total_ordered,
        'total_received', v_total_received,
        'is_complete', v_all_received,
        'new_status', v_new_status,
        'received_date', NOW(),
        'received_by', user_id_param
      ),
      'summary', json_build_object(
        'total_ordered', v_total_ordered,
        'total_received', v_total_received,
        'percent_received', CASE WHEN v_total_ordered > 0 THEN ROUND((v_total_received::NUMERIC / v_total_ordered::NUMERIC) * 100) ELSE 0 END,
        'is_complete', v_all_received,
        'items_this_batch', v_items_created
      )
    );

    RETURN v_result;

  EXCEPTION
    WHEN OTHERS THEN
      -- Roll back and return error
      RAISE WARNING 'Error in complete_purchase_order_receive: %', SQLERRM;
      RETURN json_build_object(
        'success', false,
        'message', format('Error receiving purchase order: %s', SQLERRM),
        'error_code', 'RECEIVE_ERROR'
      );
  END;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION complete_purchase_order_receive(UUID, UUID, TEXT) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION complete_purchase_order_receive IS 
'Completes the receive process for a purchase order by creating inventory items for all ordered items and updating the order status to received';

