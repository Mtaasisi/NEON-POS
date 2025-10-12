-- ============================================
-- COMPLETE PURCHASE ORDER WORKFLOW - ALL REQUIRED FUNCTIONS
-- ============================================
-- This SQL file creates ALL missing functions needed for the
-- complete purchase order receive workflow and inventory import
-- ============================================

-- 1. Ensure lats_inventory_items table exists
-- ============================================
CREATE TABLE IF NOT EXISTS lats_inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID REFERENCES lats_purchase_orders(id) ON DELETE CASCADE,
  purchase_order_item_id UUID REFERENCES lats_purchase_order_items(id) ON DELETE SET NULL,
  product_id UUID REFERENCES lats_products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES lats_product_variants(id) ON DELETE CASCADE,
  
  -- Unique identifiers
  serial_number TEXT,
  imei TEXT,
  mac_address TEXT,
  barcode TEXT,
  
  -- Status and location
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'received', 'in_stock', 'sold', 'returned', 'damaged', 'quality_checked')),
  location TEXT,
  shelf TEXT,
  bin TEXT,
  
  -- Dates
  purchase_date TIMESTAMPTZ DEFAULT NOW(),
  warranty_start DATE,
  warranty_end DATE,
  
  -- Pricing
  cost_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  selling_price DECIMAL(10, 2),
  
  -- Quality check
  quality_check_status TEXT DEFAULT 'pending' CHECK (quality_check_status IN ('pending', 'passed', 'failed')),
  quality_check_notes TEXT,
  quality_checked_at TIMESTAMPTZ,
  quality_checked_by UUID,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  updated_by UUID
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_inventory_items_po ON lats_inventory_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_product ON lats_inventory_items(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_variant ON lats_inventory_items(variant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_serial ON lats_inventory_items(serial_number) WHERE serial_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_items_status ON lats_inventory_items(status);

-- ============================================
-- 2. DROP EXISTING FUNCTIONS (to avoid conflicts)
-- ============================================
DROP FUNCTION IF EXISTS complete_purchase_order_receive(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS mark_po_as_received(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS get_received_items_for_po(UUID);
DROP FUNCTION IF EXISTS get_purchase_order_receive_summary(UUID);
DROP FUNCTION IF EXISTS process_purchase_order_return(UUID, UUID, TEXT, INTEGER, TEXT, UUID);
DROP FUNCTION IF EXISTS get_purchase_order_returns(UUID);

-- ============================================
-- 3. CREATE FUNCTION: complete_purchase_order_receive
-- Complete receive of all items in a purchase order
-- ============================================
CREATE OR REPLACE FUNCTION complete_purchase_order_receive(
  purchase_order_id_param UUID,
  user_id_param UUID,
  receive_notes TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_order_record RECORD;
  v_items_cursor CURSOR FOR 
    SELECT * FROM lats_purchase_order_items WHERE purchase_order_id = purchase_order_id_param;
  v_item_record RECORD;
  v_items_received INTEGER := 0;
  v_inventory_created INTEGER := 0;
BEGIN
  -- Get purchase order
  SELECT * INTO v_order_record FROM lats_purchase_orders WHERE id = purchase_order_id_param;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Purchase order not found';
  END IF;
  
  -- Check if already received
  IF v_order_record.status = 'received' THEN
    RETURN json_build_object(
      'success', true,
      'message', 'Purchase order already received',
      'items_processed', 0
    );
  END IF;
  
  -- Process each item
  FOR v_item_record IN SELECT * FROM lats_purchase_order_items WHERE purchase_order_id = purchase_order_id_param LOOP
    -- Update received quantity to ordered quantity
    UPDATE lats_purchase_order_items
    SET 
      quantity_received = quantity_ordered
    WHERE id = v_item_record.id;
    
    -- Update variant stock quantity
    UPDATE lats_product_variants
    SET 
      quantity = quantity + v_item_record.quantity_ordered,
      updated_at = NOW()
    WHERE id = v_item_record.variant_id;
    
    v_items_received := v_items_received + 1;
    
    -- Create inventory adjustment record for tracking
    INSERT INTO lats_inventory_adjustments (
      product_id,
      variant_id,
      quantity,
      type,
      reason,
      notes,
      created_by,
      created_at
    ) VALUES (
      v_item_record.product_id,
      v_item_record.variant_id,
      v_item_record.quantity_ordered,
      'purchase_order',
      'Received from purchase order ' || purchase_order_id_param::TEXT,
      receive_notes,
      user_id_param,
      NOW()
    );
    
    v_inventory_created := v_inventory_created + 1;
  END LOOP;
  
  -- Update purchase order status
  UPDATE lats_purchase_orders
  SET 
    status = 'received',
    received_date = NOW(),
    updated_at = NOW()
  WHERE id = purchase_order_id_param;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Purchase order received successfully',
    'items_received', v_items_received,
    'inventory_created', v_inventory_created
  );
  
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error completing receive: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 4. CREATE FUNCTION: mark_po_as_received
-- Simple mark as received (without processing each item)
-- ============================================
CREATE OR REPLACE FUNCTION mark_po_as_received(
  purchase_order_id_param UUID,
  user_id_param UUID,
  received_notes TEXT DEFAULT NULL
)
RETURNS JSON AS $$
BEGIN
  -- Update purchase order status
  UPDATE lats_purchase_orders
  SET 
    status = 'received',
    received_date = NOW(),
    notes = COALESCE(notes || E'\n\n', '') || COALESCE('Received: ' || received_notes, ''),
    updated_at = NOW()
  WHERE id = purchase_order_id_param;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Purchase order not found';
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Purchase order marked as received'
  );
  
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error marking as received: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 5. CREATE FUNCTION: get_received_items_for_po
-- Get all received items (inventory items + adjustments)
-- ============================================
CREATE OR REPLACE FUNCTION get_received_items_for_po(po_id UUID)
RETURNS TABLE (
  id UUID,
  purchase_order_id UUID,
  product_id UUID,
  variant_id UUID,
  serial_number TEXT,
  imei TEXT,
  mac_address TEXT,
  barcode TEXT,
  status TEXT,
  location TEXT,
  shelf TEXT,
  bin TEXT,
  purchase_date TIMESTAMPTZ,
  warranty_start DATE,
  warranty_end DATE,
  cost_price DECIMAL(10, 2),
  selling_price DECIMAL(10, 2),
  notes TEXT,
  created_at TIMESTAMPTZ,
  product_name TEXT,
  product_sku TEXT,
  variant_name TEXT,
  variant_sku TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ii.id,
    ii.purchase_order_id,
    ii.product_id,
    ii.variant_id,
    ii.serial_number,
    ii.imei,
    ii.mac_address,
    ii.barcode,
    ii.status,
    ii.location,
    ii.shelf,
    ii.bin,
    ii.purchase_date,
    ii.warranty_start,
    ii.warranty_end,
    ii.cost_price,
    ii.selling_price,
    ii.notes,
    ii.created_at,
    p.name as product_name,
    p.sku as product_sku,
    pv.variant_name as variant_name,
    pv.sku as variant_sku
  FROM lats_inventory_items ii
  LEFT JOIN lats_products p ON ii.product_id = p.id
  LEFT JOIN lats_product_variants pv ON ii.variant_id = pv.id
  WHERE ii.purchase_order_id = po_id
  ORDER BY ii.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 6. CREATE FUNCTION: get_purchase_order_receive_summary
-- Get summary of received vs ordered items
-- ============================================
CREATE OR REPLACE FUNCTION get_purchase_order_receive_summary(
  purchase_order_id_param UUID
)
RETURNS TABLE (
  total_items BIGINT,
  total_ordered BIGINT,
  total_received BIGINT,
  total_pending BIGINT,
  percent_received NUMERIC,
  items_detail JSON
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_items,
    SUM(quantity_ordered)::BIGINT as total_ordered,
    SUM(quantity_received)::BIGINT as total_received,
    SUM(quantity_ordered - COALESCE(quantity_received, 0))::BIGINT as total_pending,
    CASE 
      WHEN SUM(quantity_ordered) > 0 THEN 
        ROUND((SUM(COALESCE(quantity_received, 0))::NUMERIC / SUM(quantity_ordered)::NUMERIC) * 100, 2)
      ELSE 0
    END as percent_received,
    json_agg(
      json_build_object(
        'item_id', id,
        'product_id', product_id,
        'variant_id', variant_id,
        'ordered', quantity_ordered,
        'received', quantity_received,
        'pending', quantity_ordered - COALESCE(quantity_received, 0)
      )
    ) as items_detail
  FROM lats_purchase_order_items
  WHERE purchase_order_id = purchase_order_id_param
  GROUP BY purchase_order_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 7. CREATE FUNCTION: process_purchase_order_return
-- Process returns for damaged/wrong items
-- ============================================
CREATE OR REPLACE FUNCTION process_purchase_order_return(
  purchase_order_id_param UUID,
  item_id_param UUID,
  return_type_param TEXT,
  return_quantity_param INTEGER,
  return_reason_param TEXT,
  user_id_param UUID
)
RETURNS JSON AS $$
DECLARE
  v_item_record RECORD;
BEGIN
  -- Get the item
  SELECT * INTO v_item_record 
  FROM lats_purchase_order_items 
  WHERE id = item_id_param AND purchase_order_id = purchase_order_id_param;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Purchase order item not found';
  END IF;
  
  -- Validate return quantity
  IF return_quantity_param > v_item_record.quantity_received THEN
    RAISE EXCEPTION 'Cannot return more than received quantity';
  END IF;
  
  -- Update received quantity (subtract return)
  UPDATE lats_purchase_order_items
  SET 
    quantity_received = quantity_received - return_quantity_param,
    updated_at = NOW()
  WHERE id = item_id_param;
  
  -- Update variant stock (subtract return)
  UPDATE lats_product_variants
  SET 
    quantity = quantity - return_quantity_param,
    updated_at = NOW()
  WHERE id = v_item_record.variant_id;
  
  -- Create adjustment record for the return
  INSERT INTO lats_inventory_adjustments (
    product_id,
    variant_id,
    quantity,
    type,
    reason,
    notes,
    created_by,
    created_at
  ) VALUES (
    v_item_record.product_id,
    v_item_record.variant_id,
    -return_quantity_param, -- Negative for return
    'return',
    'Return: ' || return_type_param,
    return_reason_param,
    user_id_param,
    NOW()
  );
  
  RETURN json_build_object(
    'success', true,
    'message', 'Return processed successfully',
    'returned_quantity', return_quantity_param
  );
  
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error processing return: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 8. CREATE FUNCTION: get_purchase_order_returns
-- Get all returns for a purchase order
-- ============================================
CREATE OR REPLACE FUNCTION get_purchase_order_returns(
  purchase_order_id_param UUID
)
RETURNS TABLE (
  id UUID,
  product_id UUID,
  variant_id UUID,
  quantity INTEGER,
  reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ,
  created_by UUID,
  product_name TEXT,
  variant_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ia.id,
    ia.product_id,
    ia.variant_id,
    ia.quantity,
    ia.reason,
    ia.notes,
    ia.created_at,
    ia.created_by,
    p.name as product_name,
    pv.variant_name as variant_name
  FROM lats_inventory_adjustments ia
  LEFT JOIN lats_products p ON ia.product_id = p.id
  LEFT JOIN lats_product_variants pv ON ia.variant_id = pv.id
  WHERE ia.type = 'return'
    AND ia.reason LIKE '%' || purchase_order_id_param::TEXT || '%'
  ORDER BY ia.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 9. SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ All purchase order workflow functions created successfully!';
  RAISE NOTICE '📦 Old functions dropped (if they existed)';
  RAISE NOTICE '📦 New functions created:';
  RAISE NOTICE '   1. complete_purchase_order_receive';
  RAISE NOTICE '   2. mark_po_as_received';
  RAISE NOTICE '   3. get_received_items_for_po';
  RAISE NOTICE '   4. get_purchase_order_receive_summary';
  RAISE NOTICE '   5. process_purchase_order_return';
  RAISE NOTICE '   6. get_purchase_order_returns';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Next steps:';
  RAISE NOTICE '   1. Test purchase order creation';
  RAISE NOTICE '   2. Test receiving items';
  RAISE NOTICE '   3. Verify inventory updates';
END $$;

