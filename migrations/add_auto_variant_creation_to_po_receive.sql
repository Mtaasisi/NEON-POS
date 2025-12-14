-- =====================================================
-- ADD AUTO-VARIANT CREATION TO PO RECEIVE FUNCTION
-- =====================================================
-- This migration adds automatic variant creation when receiving
-- products without variants in purchase orders.
-- When a PO item has no variant, a default variant will be created
-- automatically during the receive process.

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
  v_current_quantity INTEGER;
  v_new_variant_id UUID;
  v_auto_created_variant BOOLEAN := false;
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
  IF v_order_record.status NOT IN ('shipped', 'partial_received', 'confirmed', 'sent', 'completed') THEN
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
        poi.selling_price as po_selling_price,
        p.name as product_name,
        p.sku as product_sku,
        pv.name as variant_name,
        pv.sku as variant_sku,
        COALESCE(pv.selling_price, pv.unit_price, 0) as selling_price,
        COALESCE(pv.quantity, 0) as current_variant_quantity
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
        -- ⭐ AUTO-CREATE VARIANT IF MISSING ⭐
        -- If product has no variant, create a default one automatically
        IF v_item_record.variant_id IS NULL AND v_item_record.product_id IS NOT NULL THEN
          RAISE NOTICE '🔄 Product % has no variant - creating default variant...', v_item_record.product_name;
          
          -- Check if product already has any variants
          SELECT id INTO v_new_variant_id
          FROM lats_product_variants
          WHERE product_id = v_item_record.product_id
          AND parent_variant_id IS NULL
          LIMIT 1;
          
          IF v_new_variant_id IS NULL THEN
            -- Create a default variant for this product
            INSERT INTO lats_product_variants (
              product_id,
              branch_id,
              name,
              variant_name,
              sku,
              cost_price,
              selling_price,
              unit_price,
              quantity,
              min_quantity,
              variant_attributes,
              attributes,
              is_active,
              created_at,
              updated_at
            ) VALUES (
              v_item_record.product_id,
              v_order_record.branch_id,
              'Default',
              'Default',
              COALESCE(v_item_record.product_sku, SUBSTRING(v_item_record.product_id::text, 1, 8)) || '-DEFAULT',
              COALESCE(v_item_record.unit_cost, 0),
              COALESCE(v_item_record.po_selling_price, v_item_record.selling_price, 0),
              COALESCE(v_item_record.po_selling_price, v_item_record.selling_price, 0),
              0, -- quantity will be updated below
              0, -- min_quantity
              jsonb_build_object(
                'auto_created', true,
                'created_from', 'purchase_order',
                'purchase_order_id', purchase_order_id_param::text,
                'created_at', NOW()
              ),
              jsonb_build_object(
                'auto_created', true,
                'source', 'purchase_order'
              ),
              true,
              NOW(),
              NOW()
            )
            RETURNING id INTO v_new_variant_id;
            
            v_auto_created_variant := true;
            
            RAISE NOTICE '✅ Auto-created default variant % for product %', v_new_variant_id, v_item_record.product_name;
            
            -- Update the purchase order item with the new variant_id
            UPDATE lats_purchase_order_items
            SET variant_id = v_new_variant_id,
                updated_at = NOW()
            WHERE id = v_item_record.item_id;
            
            -- Update the loop variable to use the new variant
            v_item_record.variant_id := v_new_variant_id;
            v_item_record.variant_name := 'Default';
            v_item_record.current_variant_quantity := 0;
          ELSE
            RAISE NOTICE '✅ Found existing variant % for product %', v_new_variant_id, v_item_record.product_name;
            
            -- Update the purchase order item with the existing variant_id
            UPDATE lats_purchase_order_items
            SET variant_id = v_new_variant_id,
                updated_at = NOW()
            WHERE id = v_item_record.item_id;
            
            v_item_record.variant_id := v_new_variant_id;
          END IF;
        END IF;
        
        -- Update product supplier_id if not already set
        IF v_item_record.product_id IS NOT NULL AND v_order_record.supplier_id IS NOT NULL THEN
          UPDATE lats_products
          SET 
            supplier_id = v_order_record.supplier_id,
            updated_at = NOW()
          WHERE id = v_item_record.product_id
            AND supplier_id IS NULL;
        END IF;
        
        -- ⭐ UPDATE VARIANT STOCK QUANTITY ⭐
        IF v_item_record.variant_id IS NOT NULL THEN
          -- Get current quantity
          SELECT COALESCE(quantity, 0) INTO v_current_quantity
          FROM lats_product_variants
          WHERE id = v_item_record.variant_id;
          
          -- Update variant quantity
          UPDATE lats_product_variants
          SET 
            quantity = COALESCE(quantity, 0) + v_quantity,
            updated_at = NOW()
          WHERE id = v_item_record.variant_id;
          
          -- Create stock movement record for tracking
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
            'Purchase Order Receipt',
            format('PO-%s', v_order_record.order_number),
            format('Received %s units from PO %s%s%s', 
              v_quantity, 
              v_order_record.order_number,
              CASE WHEN v_auto_created_variant THEN ' (Auto-created variant)' ELSE '' END,
              CASE WHEN receive_notes IS NOT NULL THEN ' - ' || receive_notes ELSE '' END
            ),
            user_id_param,
            NOW()
          );
          
          RAISE NOTICE '✅ Updated variant % stock: % -> % (+ %)', 
            v_item_record.variant_id, 
            v_current_quantity, 
            v_current_quantity + v_quantity,
            v_quantity;
        END IF;
        
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
            COALESCE(v_item_record.po_selling_price, v_item_record.selling_price, 0),
            format(
              'Received from PO %s - %s %s (Item %s of %s)%s%s',
              v_order_record.order_number,
              v_item_record.product_name,
              COALESCE(' - ' || v_item_record.variant_name, ''),
              v_i,
              v_quantity,
              CASE WHEN v_auto_created_variant THEN ' [Auto-created variant]' ELSE '' END,
              CASE WHEN receive_notes IS NOT NULL THEN ' - ' || receive_notes ELSE '' END
            ),
            jsonb_build_object(
              'purchase_order_id', purchase_order_id_param::text,
              'purchase_order_item_id', v_item_record.item_id::text,
              'order_number', v_order_record.order_number,
              'supplier_id', v_order_record.supplier_id::text,
              'batch_number', v_i,
              'received_by', user_id_param::text,
              'received_at', NOW(),
              'auto_generated', true,
              'auto_created_variant', v_auto_created_variant
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
        
        -- Reset auto-created flag for next iteration
        v_auto_created_variant := false;
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
'Completes the receive process for a purchase order. Automatically creates default variants for products without variants. Creates inventory items and updates order status.';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Auto-variant creation added to complete_purchase_order_receive function';
  RAISE NOTICE '📝 Products without variants will now automatically get a default variant when received in POs';
END $$;

