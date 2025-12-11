# Purchase Order - Spare Parts Stock Update

## Status
The `receivePurchaseOrder` function calls the RPC `complete_purchase_order_receive` which currently only handles product variants.

## Required Update
The database function `complete_purchase_order_receive` needs to be updated to:
1. Check if `item_type = 'spare-part'`
2. If spare part, update `lats_spare_parts.quantity` instead of variant quantity
3. Create stock movement for spare parts

## SQL Update Needed
```sql
-- In the complete_purchase_order_receive function, add:
IF v_item_record.item_type = 'spare-part' THEN
  -- Update spare part quantity
  UPDATE lats_spare_parts
  SET 
    quantity = COALESCE(quantity, 0) + v_quantity,
    updated_at = NOW()
  WHERE id = v_item_record.product_id;
  
  -- Create stock movement for spare part
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
ELSE
  -- Existing variant update logic
END IF;
```

## Note
This requires a database migration. For now, the frontend integration is complete.
