-- =====================================================
-- UPDATE: Add Spare Parts Support to PO Receive Function
-- =====================================================
-- This updates the complete_purchase_order_receive function
-- to handle spare parts stock updates when receiving POs
--
-- Date: 2025-01-07
-- Purpose: Enable stock updates for spare parts when PO is received

-- First, check if the function exists and get its current definition
-- You may need to adjust this based on your actual function structure

-- Example update pattern (adjust based on your actual function):
-- In the function, find the section that updates variant stock and add:

/*
-- Add this logic in the function where it processes items:

-- Check if item is a spare part
IF v_item_record.item_type = 'spare-part' THEN
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
    format('Received %s spare parts from PO %s', v_quantity, v_order_record.po_number),
    user_id_param,
    NOW()
  );

  RAISE NOTICE '✅ Updated spare part % stock: % -> % (+ %)',
    v_item_record.product_id,
    v_current_quantity,
    v_current_quantity + v_quantity,
    v_quantity;

ELSE
  -- Existing variant update logic for regular products
  -- (keep existing code here)
END IF;
*/

-- =====================================================
-- STEP 1: Backup current function
-- =====================================================
-- Before making changes, backup the current function:
-- 
-- SELECT pg_get_functiondef(oid) 
-- FROM pg_proc 
-- WHERE proname = 'complete_purchase_order_receive';
--
-- Save the output to a backup file

-- =====================================================
-- STEP 2: Update the function
-- =====================================================
-- You'll need to:
-- 1. Find the section in the function that processes items
-- 2. Add the spare parts check before the variant update
-- 3. Ensure item_type and part_number are selected from lats_purchase_order_items

-- Example SELECT statement update needed:
-- SELECT 
--   item.id,
--   item.product_id,
--   item.variant_id,
--   item.quantity_ordered,
--   item.quantity_received,
--   item.unit_cost,
--   item.item_type,  -- ADD THIS
--   item.part_number  -- ADD THIS
-- INTO v_item_record
-- FROM lats_purchase_order_items item
-- WHERE item.purchase_order_id = purchase_order_id_param
--   AND item.quantity_received < item.quantity_ordered;

-- =====================================================
-- STEP 3: Test the function
-- =====================================================
-- After updating:
-- 1. Create a PO with spare parts
-- 2. Receive the PO
-- 3. Verify spare parts stock is updated
-- 4. Check stock movements table for records

-- =====================================================
-- NOTES
-- =====================================================
-- - The function should handle both products and spare parts
-- - Spare parts use product_id to reference lats_spare_parts.id
-- - variant_id should be NULL for spare parts
-- - Stock movements should record the transaction
-- - Ensure proper error handling for both types
