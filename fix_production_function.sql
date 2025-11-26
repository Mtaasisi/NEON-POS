-- Fix the broken partial_purchase_order_receive function in PRODUCTION
-- This replaces the incorrect version that tries to use non-existent inventory table columns

CREATE OR REPLACE FUNCTION public.partial_purchase_order_receive(purchase_order_id_param uuid, received_items jsonb, user_id_param uuid, receive_notes text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_order_record RECORD;
  v_item_record RECORD;
  v_received_item JSONB;
  v_items_created INTEGER := 0;
  v_quantity INTEGER;
  v_i INTEGER;
  v_total_received INTEGER := 0;
  v_total_ordered INTEGER := 0;
  v_all_received BOOLEAN;
  v_new_status VARCHAR;
  v_result JSON;
  v_current_quantity INTEGER;
BEGIN
  -- Check if purchase order exists
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

  -- Begin transaction
  BEGIN
    -- Process each received item
    FOR v_received_item IN SELECT * FROM jsonb_array_elements(received_items)
    LOOP
      -- Get the PO item details
      SELECT
        poi.id as item_id,
        poi.product_id,
        poi.variant_id,
        poi.quantity_ordered,
        COALESCE(poi.quantity_received, 0) as quantity_received,
        poi.unit_cost,
        p.name as product_name,
        pv.name as variant_name,
        COALESCE(pv.selling_price, pv.unit_price, 0) as selling_price,
        COALESCE(pv.quantity, 0) as current_variant_quantity
      INTO v_item_record
      FROM lats_purchase_order_items poi
      LEFT JOIN lats_products p ON p.id = poi.product_id
      LEFT JOIN lats_product_variants pv ON pv.id = poi.variant_id
      WHERE poi.id = (v_received_item->>'item_id')::UUID
        AND poi.purchase_order_id = purchase_order_id_param;

      IF NOT FOUND THEN
        RAISE WARNING 'PO item not found: %', v_received_item->>'item_id';
        CONTINUE;
      END IF;

      -- Get quantity to receive for this item
      v_quantity := (v_received_item->>'quantity')::INTEGER;

      IF v_quantity > 0 THEN
        -- Validate quantity doesn't exceed ordered amount
        IF (v_item_record.quantity_received + v_quantity) > v_item_record.quantity_ordered THEN
          RETURN json_build_object(
            'success', false,
            'message', format('Cannot receive %s units for item %s. Already received: %s, Ordered: %s, Remaining: %s',
              v_quantity,
              v_item_record.item_id,
              v_item_record.quantity_received,
              v_item_record.quantity_ordered,
              v_item_record.quantity_ordered - v_item_record.quantity_received
            ),
            'error_code', 'QUANTITY_EXCEEDED',
            'item_id', v_item_record.item_id::text,
            'requested_quantity', v_quantity,
            'already_received', v_item_record.quantity_received,
            'ordered_quantity', v_item_record.quantity_ordered,
            'remaining_quantity', v_item_record.quantity_ordered - v_item_record.quantity_received
          );
        END IF;

        -- Validate quantity is positive
        IF v_quantity <= 0 THEN
          RETURN json_build_object(
            'success', false,
            'message', format('Received quantity must be greater than 0 for item %s', v_item_record.item_id),
            'error_code', 'INVALID_QUANTITY',
            'item_id', v_item_record.item_id::text
          );
        END IF;

        -- Get current variant quantity
        IF v_item_record.variant_id IS NOT NULL THEN
          SELECT COALESCE(quantity, 0) INTO v_current_quantity
          FROM lats_product_variants
          WHERE id = v_item_record.variant_id;
        END IF;

        -- Create inventory items with status='available'
        -- The trigger will automatically update variant.quantity
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
            'available',  -- ⭐ KEY: Status must be 'available' for trigger to count it
            COALESCE(v_item_record.unit_cost, 0),
            COALESCE(v_item_record.selling_price, 0),
            format(
              'Partial receive from PO %s - %s %s (Item %s of %s)%s',
              v_order_record.po_number,
              v_item_record.product_name,
              COALESCE(' - ' || v_item_record.variant_name, ''),
              v_i,
              v_quantity,
              CASE WHEN receive_notes IS NOT NULL THEN ' - ' || receive_notes ELSE '' END
            ),
            jsonb_build_object(
              'purchase_order_id', purchase_order_id_param::text,
              'purchase_order_item_id', v_item_record.item_id::text,
              'po_number', v_order_record.po_number,
              'supplier_id', v_order_record.supplier_id::text,
              'batch_number', v_i,
              'received_by', user_id_param::text,
              'received_at', NOW(),
              'partial_receive', true
            ),
            NOW(),
            NOW(),
            NOW()
          );

          v_items_created := v_items_created + 1;
        END LOOP;

        -- Create stock movement record
        IF v_item_record.variant_id IS NOT NULL THEN
          INSERT INTO lats_stock_movements (
            product_id,
            variant_id,
            movement_type,
            quantity,
            previous_quantity,
            new_quantity,
            reason,
            reference,
            notes,
            created_by,
            created_at
          ) VALUES (
            v_item_record.product_id,
            v_item_record.variant_id,
            'in',
            v_quantity,
            v_current_quantity,
            v_current_quantity + v_quantity,
            'Purchase Order Receipt (Partial)',
            format('PO-%s', v_order_record.po_number),
            format('Partial receive: %s units from PO %s%s',
              v_quantity,
              v_order_record.po_number,
              CASE WHEN receive_notes IS NOT NULL THEN ' - ' || receive_notes ELSE '' END
            ),
            user_id_param,
            NOW()
          );
        END IF;

        -- Update the purchase order item with received quantity (increment)
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

    -- Calculate totals
    SELECT
      COALESCE(SUM(quantity_received), 0),
      COALESCE(SUM(quantity_ordered), 0)
    INTO v_total_received, v_total_ordered
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

    -- Build success response
    v_result := json_build_object(
      'success', true,
      'message', format('Successfully received %s items (stock updated by trigger)', v_items_created),
      'data', json_build_object(
        'purchase_order_id', purchase_order_id_param,
        'po_number', v_order_record.po_number,
        'items_created', v_items_created,
        'total_received', v_total_received,
        'total_ordered', v_total_ordered,
        'is_complete', v_all_received,
        'new_status', v_new_status,
        'received_date', NOW(),
        'received_by', user_id_param
      )
    );

    RETURN v_result;

  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error in partial_purchase_order_receive: %', SQLERRM;
      RETURN json_build_object(
        'success', false,
        'message', format('Error receiving purchase order: %s', SQLERRM),
        'error_code', 'RECEIVE_ERROR'
      );
  END;
END;
$function$;

-- Grant necessary permissions
GRANT ALL ON FUNCTION public.partial_purchase_order_receive(uuid, jsonb, uuid, text) TO authenticated;
