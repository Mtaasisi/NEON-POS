-- =====================================================
-- UPDATE: Add Spare Parts Support to PO Receive Function
-- =====================================================
-- This updates the complete_purchase_order_receive function
-- to handle spare parts stock updates when receiving POs
--
-- Date: 2025-01-07
-- Purpose: Enable stock updates for spare parts when PO is received
-- Database: PostgreSQL (Neon)
-- =====================================================

-- First, let's check the current function structure
-- Then we'll create an updated version that handles both products and spare parts

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
  v_stock_updated INTEGER := 0;
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
    -- UPDATED: Include item_type and part_number in the SELECT
    FOR v_item_record IN 
      SELECT 
        poi.id as item_id,
        poi.product_id,
        poi.variant_id,
        poi.quantity_ordered,
        COALESCE(poi.quantity_received, 0) as quantity_received,
        poi.unit_cost,
        poi.item_type,  -- NEW: For spare parts
        poi.part_number,  -- NEW: For spare parts
        p.name as product_name,
        pv.name as variant_name,
        p.sku as product_sku,
        pv.sku as variant_sku,
        COALESCE(pv.selling_price, pv.unit_price, 0) as selling_price
      FROM lats_purchase_order_items poi
      LEFT JOIN lats_products p ON p.id = poi.product_id AND (poi.item_type IS NULL OR poi.item_type = 'product')
      LEFT JOIN lats_product_variants pv ON pv.id = poi.variant_id
      WHERE poi.purchase_order_id = purchase_order_id_param
        AND COALESCE(poi.quantity_received, 0) < poi.quantity_ordered
    LOOP
      v_total_items := v_total_items + 1;
      v_total_ordered := v_total_ordered + v_item_record.quantity_ordered;
      
      -- Calculate quantity to receive (total ordered - already received)
      v_quantity := v_item_record.quantity_ordered - v_item_record.quantity_received;
      
      IF v_quantity > 0 THEN
        -- ✅ NEW: Check if this is a spare part
        IF COALESCE(v_item_record.item_type, 'product') = 'spare-part' THEN
          -- Handle spare part stock update
          
          -- Get current spare part quantity
          SELECT COALESCE(quantity, 0) INTO v_current_quantity
          FROM lats_spare_parts
          WHERE id = v_item_record.product_id;
          
          -- Update spare part quantity
          UPDATE lats_spare_parts
          SET 
            quantity = COALESCE(quantity, 0) + v_quantity,
            updated_at = NOW()
          WHERE id = v_item_record.product_id;
          
          -- Create stock movement record for spare part
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
            NULL, -- No variant for spare parts
            'in',
            v_quantity,
            v_current_quantity,
            v_current_quantity + v_quantity,
            'Purchase Order Receipt',
            format('PO-%s', v_order_record.po_number),
            format('Received %s spare parts from PO %s%s',
              v_quantity,
              v_order_record.po_number,
              CASE WHEN receive_notes IS NOT NULL THEN ' - ' || receive_notes ELSE '' END
            ),
            user_id_param,
            NOW()
          );
          
          v_stock_updated := v_stock_updated + v_quantity;
          
          RAISE NOTICE '✅ Updated spare part % stock: % -> % (+ %)',
            v_item_record.product_id,
            v_current_quantity,
            v_current_quantity + v_quantity,
            v_quantity;
            
        ELSE
          -- Handle regular product variant stock update (existing logic)
          
          -- Update product supplier_id if not already set
          IF v_item_record.product_id IS NOT NULL AND v_order_record.supplier_id IS NOT NULL THEN
            UPDATE lats_products
            SET
              supplier_id = v_order_record.supplier_id,
              updated_at = NOW()
            WHERE id = v_item_record.product_id
              AND supplier_id IS NULL;
          END IF;

          -- Update variant stock quantity
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
              format('PO-%s', v_order_record.po_number),
              format('Received %s units from PO %s%s',
                v_quantity,
                v_order_record.po_number,
                CASE WHEN receive_notes IS NOT NULL THEN ' - ' || receive_notes ELSE '' END
              ),
              user_id_param,
              NOW()
            );

            v_stock_updated := v_stock_updated + v_quantity;
            
            RAISE NOTICE '✅ Updated variant % stock: % -> % (+ %)',
              v_item_record.variant_id,
              v_current_quantity,
              v_current_quantity + v_quantity,
              v_quantity;
          END IF;
        END IF;
        
        -- ✅ Update the purchase order item with received quantity
        UPDATE lats_purchase_order_items
        SET 
          quantity_received = COALESCE(quantity_received, 0) + v_quantity,
          updated_at = NOW()
        WHERE id = v_item_record.item_id;
        
        v_items_created := v_items_created + v_quantity;
        v_total_received := v_total_received + v_quantity;
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
    SELECT COALESCE(SUM(quantity_received), 0), COALESCE(SUM(quantity_ordered), 0)
    INTO v_total_received, v_total_ordered
    FROM lats_purchase_order_items
    WHERE purchase_order_id = purchase_order_id_param;
    
    -- Set appropriate status
    IF v_all_received THEN
      v_new_status := 'received';
    ELSE
      v_new_status := 'partial_received';
    END IF;
    
    -- ✅ Update purchase order status
    UPDATE lats_purchase_orders
    SET 
      status = v_new_status,
      received_date = CASE WHEN v_all_received THEN NOW() ELSE received_date END,
      updated_at = NOW()
    WHERE id = purchase_order_id_param;

    -- ✅ Create audit log entry
    INSERT INTO lats_purchase_order_audit_log (
      purchase_order_id,
      action,
      previous_status,
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
      format('%s: Updated stock for %s items (%s products, %s spare parts)%s', 
        CASE WHEN v_all_received THEN 'Complete receive' ELSE 'Partial receive' END,
        v_items_created,
        v_stock_updated,
        v_stock_updated,
        CASE WHEN receive_notes IS NOT NULL THEN ' - ' || receive_notes ELSE '' END
      ),
      NOW()
    );

    -- Build success response with complete summary
    v_result := json_build_object(
      'success', true,
      'message', format('Successfully received %s items from purchase order and updated stock', v_items_created),
      'data', json_build_object(
        'purchase_order_id', purchase_order_id_param,
        'order_number', v_order_record.po_number,
        'items_created', v_items_created,
        'total_items', v_total_items,
        'total_ordered', v_total_ordered,
        'total_received', v_total_received,
        'stock_updated', v_stock_updated,
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
        'items_this_batch', v_items_created,
        'stock_updated', v_stock_updated
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
'Receives purchase order items and updates stock for both products and spare parts. 
Handles item_type field to distinguish between products and spare parts.
For spare parts: Updates lats_spare_parts.quantity directly.
For products: Updates lats_product_variants.quantity as before.';

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- After running this migration, verify with:

-- 1. Check function exists and has correct signature
-- SELECT proname, pg_get_function_arguments(oid) 
-- FROM pg_proc 
-- WHERE proname = 'complete_purchase_order_receive';

-- 2. Test with a PO that has spare parts
-- SELECT complete_purchase_order_receive(
--   'your-po-id-here'::UUID,
--   'your-user-id-here'::UUID,
--   'Test receive with spare parts'
-- );

-- 3. Verify spare parts stock was updated
-- SELECT id, name, part_number, quantity 
-- FROM lats_spare_parts 
-- WHERE id IN (SELECT product_id FROM lats_purchase_order_items WHERE purchase_order_id = 'your-po-id-here' AND item_type = 'spare-part');

-- =====================================================
-- ROLLBACK (if needed)
-- =====================================================
-- If you need to rollback, restore the previous version of the function
-- from your backup or version control
