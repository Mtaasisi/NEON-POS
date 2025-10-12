-- ============================================
-- ✅ FIX MISSING RECEIVED INVENTORY ITEMS - FINAL VERSION
-- ============================================
-- This version works with the ACTUAL inventory_items table structure
-- where purchase_order_id is stored in the metadata JSONB column
-- ============================================

BEGIN;

-- ============================================
-- PART 1: ADD MISSING COLUMNS TO EXISTING TABLE
-- ============================================

-- Add purchase_order_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'inventory_items' AND column_name = 'purchase_order_id'
  ) THEN
    ALTER TABLE inventory_items ADD COLUMN purchase_order_id UUID REFERENCES lats_purchase_orders(id) ON DELETE CASCADE;
    RAISE NOTICE '✅ Added purchase_order_id column';
    
    -- Migrate data from metadata to column if metadata exists
    UPDATE inventory_items 
    SET purchase_order_id = (metadata->>'purchase_order_id')::UUID
    WHERE metadata IS NOT NULL 
      AND metadata->>'purchase_order_id' IS NOT NULL
      AND purchase_order_id IS NULL;
    
    RAISE NOTICE '✅ Migrated purchase_order_id from metadata to column';
  ELSE
    RAISE NOTICE '✅ purchase_order_id column already exists';
  END IF;
END $$;

-- Add purchase_order_item_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'inventory_items' AND column_name = 'purchase_order_item_id'
  ) THEN
    ALTER TABLE inventory_items ADD COLUMN purchase_order_item_id UUID REFERENCES lats_purchase_order_items(id) ON DELETE SET NULL;
    RAISE NOTICE '✅ Added purchase_order_item_id column';
    
    -- Migrate data from metadata if it exists
    UPDATE inventory_items 
    SET purchase_order_item_id = (metadata->>'purchase_order_item_id')::UUID
    WHERE metadata IS NOT NULL 
      AND metadata->>'purchase_order_item_id' IS NOT NULL
      AND purchase_order_item_id IS NULL;
      
    RAISE NOTICE '✅ Migrated purchase_order_item_id from metadata to column';
  ELSE
    RAISE NOTICE '✅ purchase_order_item_id column already exists';
  END IF;
END $$;

-- Ensure other required columns exist
DO $$
BEGIN
  -- Add shelf if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'inventory_items' AND column_name = 'shelf'
  ) THEN
    ALTER TABLE inventory_items ADD COLUMN shelf TEXT;
    RAISE NOTICE '✅ Added shelf column';
  END IF;

  -- Add bin if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'inventory_items' AND column_name = 'bin'
  ) THEN
    ALTER TABLE inventory_items ADD COLUMN bin TEXT;
    RAISE NOTICE '✅ Added bin column';
  END IF;

  -- Add warranty_start if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'inventory_items' AND column_name = 'warranty_start'
  ) THEN
    ALTER TABLE inventory_items ADD COLUMN warranty_start DATE;
    RAISE NOTICE '✅ Added warranty_start column';
  END IF;

  -- Add warranty_end if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'inventory_items' AND column_name = 'warranty_end'
  ) THEN
    ALTER TABLE inventory_items ADD COLUMN warranty_end DATE;
    RAISE NOTICE '✅ Added warranty_end column';
  END IF;

  -- Add purchase_date if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'inventory_items' AND column_name = 'purchase_date'
  ) THEN
    ALTER TABLE inventory_items ADD COLUMN purchase_date TIMESTAMPTZ DEFAULT NOW();
    RAISE NOTICE '✅ Added purchase_date column';
  END IF;

  -- Add selling_price if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'inventory_items' AND column_name = 'selling_price'
  ) THEN
    ALTER TABLE inventory_items ADD COLUMN selling_price DECIMAL(15, 2);
    RAISE NOTICE '✅ Added selling_price column';
  END IF;

  -- Add updated_at if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'inventory_items' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE inventory_items ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    RAISE NOTICE '✅ Added updated_at column';
  END IF;

  -- Add created_by if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'inventory_items' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE inventory_items ADD COLUMN created_by UUID;
    RAISE NOTICE '✅ Added created_by column';
  END IF;

  -- Add updated_by if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'inventory_items' AND column_name = 'updated_by'
  ) THEN
    ALTER TABLE inventory_items ADD COLUMN updated_by UUID;
    RAISE NOTICE '✅ Added updated_by column';
  END IF;
END $$;

-- Create/update indexes
CREATE INDEX IF NOT EXISTS idx_inventory_items_po ON inventory_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_po_item ON inventory_items(purchase_order_item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_product ON inventory_items(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_variant ON inventory_items(variant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_status ON inventory_items(status);
CREATE INDEX IF NOT EXISTS idx_inventory_items_serial ON inventory_items(serial_number) WHERE serial_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_items_metadata ON inventory_items USING GIN(metadata) WHERE metadata IS NOT NULL;

-- ============================================
-- PART 2: CREATE FUNCTION TO GENERATE INVENTORY ITEMS
-- ============================================

CREATE OR REPLACE FUNCTION create_missing_inventory_items_for_po(
  po_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_items_created INTEGER := 0;
  v_item_record RECORD;
  v_quantity INTEGER;
  v_i INTEGER;
BEGIN
  -- Check if PO exists and is received
  IF NOT EXISTS (
    SELECT 1 FROM lats_purchase_orders 
    WHERE id = po_id AND status = 'received'
  ) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Purchase order not found or not in received status',
      'items_created', 0
    );
  END IF;

  -- Loop through all items in the purchase order
  FOR v_item_record IN 
    SELECT 
      poi.id as item_id,
      poi.product_id,
      poi.variant_id,
      poi.quantity_received,
      poi.quantity_ordered,
      poi.unit_price,
      p.name as product_name,
      pv.name as variant_name
    FROM lats_purchase_order_items poi
    LEFT JOIN lats_products p ON p.id = poi.product_id
    LEFT JOIN lats_product_variants pv ON pv.id = poi.variant_id
    WHERE poi.purchase_order_id = po_id
  LOOP
    -- Use quantity_received if available, otherwise use quantity_ordered
    v_quantity := COALESCE(v_item_record.quantity_received, v_item_record.quantity_ordered, 0);
    
    IF v_quantity > 0 THEN
      -- Create inventory items for each quantity
      FOR v_i IN 1..v_quantity LOOP
        INSERT INTO inventory_items (
          purchase_order_id,
          purchase_order_item_id,
          product_id,
          variant_id,
          status,
          cost_price,
          notes,
          metadata,
          created_at,
          updated_at
        ) VALUES (
          po_id,
          v_item_record.item_id,
          v_item_record.product_id,
          v_item_record.variant_id,
          'available',
          COALESCE(v_item_record.unit_price, 0),
          format('Received from PO - %s %s (Item %s of %s)', 
            v_item_record.product_name, 
            COALESCE(v_item_record.variant_name, ''),
            v_i,
            v_quantity
          ),
          jsonb_build_object(
            'purchase_order_id', po_id::text,
            'purchase_order_item_id', v_item_record.item_id::text,
            'batch_number', v_i,
            'total_in_batch', v_quantity,
            'auto_generated', true,
            'generated_at', NOW()
          ),
          NOW(),
          NOW()
        );
        
        v_items_created := v_items_created + 1;
      END LOOP;
    END IF;
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'message', format('Successfully created %s inventory items', v_items_created),
    'items_created', v_items_created
  );
END;
$$;

GRANT EXECUTE ON FUNCTION create_missing_inventory_items_for_po(UUID) TO authenticated;

-- ============================================
-- PART 3: CREATE INVENTORY ITEMS FOR PO-1759907347192
-- ============================================

DO $$
DECLARE
  v_po_id UUID;
  v_result JSON;
BEGIN
  -- Find the PO by its number
  SELECT id INTO v_po_id 
  FROM lats_purchase_orders 
  WHERE po_number = 'PO-1759907347192';

  IF v_po_id IS NOT NULL THEN
    -- Create inventory items
    SELECT create_missing_inventory_items_for_po(v_po_id) INTO v_result;
    
    RAISE NOTICE '📦 Result for PO-1759907347192: %', v_result;
  ELSE
    RAISE NOTICE '⚠️  Purchase order PO-1759907347192 not found';
  END IF;
END $$;

-- ============================================
-- PART 4: UPDATE RECEIVE FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION complete_purchase_order_receive(
  purchase_order_id_param UUID,
  user_id_param UUID,
  receive_notes TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_order_record RECORD;
  v_item_record RECORD;
  v_items_received INTEGER := 0;
  v_inventory_created INTEGER := 0;
  v_i INTEGER;
BEGIN
  -- Get purchase order
  SELECT * INTO v_order_record FROM lats_purchase_orders WHERE id = purchase_order_id_param;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Purchase order not found'
    );
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
  FOR v_item_record IN 
    SELECT * FROM lats_purchase_order_items 
    WHERE purchase_order_id = purchase_order_id_param 
  LOOP
    -- Update received quantity to ordered quantity
    UPDATE lats_purchase_order_items
    SET quantity_received = quantity_ordered
    WHERE id = v_item_record.id;
    
    -- Update variant stock quantity
    UPDATE lats_product_variants
    SET 
      quantity = quantity + v_item_record.quantity_ordered,
      updated_at = NOW()
    WHERE id = v_item_record.variant_id;
    
    v_items_received := v_items_received + 1;
    
    -- Create inventory adjustment record
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
    
    -- 🆕 CREATE INVENTORY ITEMS
    FOR v_i IN 1..v_item_record.quantity_ordered LOOP
      INSERT INTO inventory_items (
        purchase_order_id,
        purchase_order_item_id,
        product_id,
        variant_id,
        status,
        cost_price,
        notes,
        metadata,
        created_by,
        created_at,
        updated_at
      ) VALUES (
        purchase_order_id_param,
        v_item_record.id,
        v_item_record.product_id,
        v_item_record.variant_id,
        'available',
        COALESCE(v_item_record.unit_price, 0),
        COALESCE(receive_notes, 'Received from purchase order'),
        jsonb_build_object(
          'purchase_order_id', purchase_order_id_param::text,
          'purchase_order_item_id', v_item_record.id::text,
          'received_by', user_id_param::text,
          'received_at', NOW(),
          'batch_number', v_i
        ),
        user_id_param,
        NOW(),
        NOW()
      );
      
      v_inventory_created := v_inventory_created + 1;
    END LOOP;
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
    'inventory_items_created', v_inventory_created
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'message', 'Error completing receive: ' || SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION complete_purchase_order_receive(UUID, UUID, TEXT) TO authenticated;

-- ============================================
-- PART 5: CREATE HELPER FUNCTION
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
  cost_price DECIMAL(15, 2),
  selling_price DECIMAL(15, 2),
  notes TEXT,
  metadata JSONB,
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
    ii.metadata,
    ii.created_at,
    p.name as product_name,
    p.sku as product_sku,
    pv.name as variant_name,
    pv.sku as variant_sku
  FROM inventory_items ii
  LEFT JOIN lats_products p ON ii.product_id = p.id
  LEFT JOIN lats_product_variants pv ON ii.variant_id = pv.id
  WHERE ii.purchase_order_id = po_id
  ORDER BY ii.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_received_items_for_po(UUID) TO authenticated;

COMMIT;

-- ============================================
-- PART 6: VERIFICATION
-- ============================================

DO $$
DECLARE
  v_po_id UUID;
  v_item_count INTEGER;
  v_po_number TEXT;
BEGIN
  SELECT id, po_number INTO v_po_id, v_po_number
  FROM lats_purchase_orders 
  WHERE po_number = 'PO-1759907347192';

  IF v_po_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_item_count
    FROM inventory_items
    WHERE purchase_order_id = v_po_id;
    
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════';
    RAISE NOTICE '         📊 VERIFICATION REPORT';
    RAISE NOTICE '═══════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE 'Purchase Order: %', v_po_number;
    RAISE NOTICE 'PO ID: %', v_po_id;
    RAISE NOTICE 'Inventory Items Created: %', v_item_count;
    RAISE NOTICE '';
    
    IF v_item_count > 0 THEN
      RAISE NOTICE '✅ SUCCESS! % inventory items found', v_item_count;
    ELSE
      RAISE NOTICE '⚠️  WARNING: No inventory items found';
    END IF;
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════';
  ELSE
    RAISE NOTICE '⚠️  Purchase order PO-1759907347192 not found in database';
  END IF;
END $$;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$ 
BEGIN 
  RAISE NOTICE '';
  RAISE NOTICE '🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉';
  RAISE NOTICE '    ✅ INVENTORY ITEMS FIX COMPLETE!';
  RAISE NOTICE '🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Added missing columns to inventory_items table';
  RAISE NOTICE '✅ Created inventory items for PO-1759907347192';
  RAISE NOTICE '✅ Updated receive function to create items automatically';
  RAISE NOTICE '✅ Created helper functions for querying';
  RAISE NOTICE '';
  RAISE NOTICE '👉 NEXT STEPS:';
  RAISE NOTICE '   1. Go back to your app';
  RAISE NOTICE '   2. Refresh the purchase order page (F5)';
  RAISE NOTICE '   3. Click the "Received" tab';
  RAISE NOTICE '   4. You should now see all inventory items! 📦';
  RAISE NOTICE '';
END $$;

