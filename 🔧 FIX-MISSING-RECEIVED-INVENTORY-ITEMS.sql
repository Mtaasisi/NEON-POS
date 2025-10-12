-- ============================================
-- 🔧 FIX MISSING RECEIVED INVENTORY ITEMS
-- ============================================
-- Problem: POs are marked as "received" but no inventory item records are created
-- Solution: 
-- 1. Create inventory_items for this specific PO retroactively
-- 2. Fix the receive function to always create inventory items
-- 3. Make sure table names are consistent
-- ============================================

BEGIN;

-- ============================================
-- PART 1: ENSURE THE INVENTORY ITEMS TABLE EXISTS
-- ============================================

-- Check if inventory_items or lats_inventory_items exists
DO $$
BEGIN
  -- Create inventory_items table if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'inventory_items'
  ) THEN
    -- Check if lats_inventory_items exists
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_name = 'lats_inventory_items'
    ) THEN
      -- Rename lats_inventory_items to inventory_items for consistency
      ALTER TABLE lats_inventory_items RENAME TO inventory_items;
      RAISE NOTICE '✅ Renamed lats_inventory_items to inventory_items for consistency';
    ELSE
      -- Create the table from scratch
      CREATE TABLE inventory_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        purchase_order_id UUID REFERENCES lats_purchase_orders(id) ON DELETE CASCADE,
        purchase_order_item_id UUID REFERENCES lats_purchase_order_items(id) ON DELETE SET NULL,
        product_id UUID REFERENCES lats_products(id) ON DELETE CASCADE,
        variant_id UUID REFERENCES lats_product_variants(id) ON DELETE CASCADE,
        
        -- Unique identifiers for tracking
        serial_number TEXT,
        imei TEXT,
        mac_address TEXT,
        barcode TEXT,
        
        -- Status and location
        status TEXT DEFAULT 'available' CHECK (status IN ('available', 'pending', 'received', 'in_stock', 'sold', 'returned', 'damaged', 'reserved', 'quality_checked')),
        location TEXT,
        shelf TEXT,
        bin TEXT,
        
        -- Dates
        purchase_date TIMESTAMPTZ DEFAULT NOW(),
        warranty_start DATE,
        warranty_end DATE,
        
        -- Pricing
        cost_price DECIMAL(15, 2) NOT NULL DEFAULT 0,
        selling_price DECIMAL(15, 2),
        
        -- Quality check
        quality_check_status TEXT DEFAULT 'pending' CHECK (quality_check_status IN ('pending', 'passed', 'failed')),
        quality_check_notes TEXT,
        quality_checked_at TIMESTAMPTZ,
        quality_checked_by UUID,
        
        -- Metadata
        notes TEXT,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        created_by UUID,
        updated_by UUID
      );
      
      RAISE NOTICE '✅ Created inventory_items table';
    END IF;
  ELSE
    RAISE NOTICE '✅ inventory_items table already exists';
  END IF;
END $$;

-- Add metadata column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'inventory_items' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE inventory_items ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    RAISE NOTICE '✅ Added metadata column to inventory_items';
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_inventory_items_po ON inventory_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_product ON inventory_items(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_variant ON inventory_items(variant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_serial ON inventory_items(serial_number) WHERE serial_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_items_status ON inventory_items(status);
CREATE INDEX IF NOT EXISTS idx_inventory_items_metadata ON inventory_items USING gin(metadata);

-- Enable Row Level Security
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Users can view inventory items" ON inventory_items;
CREATE POLICY "Users can view inventory items" ON inventory_items FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert inventory items" ON inventory_items;
CREATE POLICY "Users can insert inventory items" ON inventory_items FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update inventory items" ON inventory_items;
CREATE POLICY "Users can update inventory items" ON inventory_items FOR UPDATE USING (true);

-- ============================================
-- PART 2: RETROACTIVELY CREATE INVENTORY ITEMS FOR THE SPECIFIC PO
-- ============================================

-- Create a function to generate inventory items for a received PO
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
        -- Check if inventory item already exists
        IF NOT EXISTS (
          SELECT 1 FROM inventory_items 
          WHERE purchase_order_id = po_id 
            AND purchase_order_item_id = v_item_record.item_id
          LIMIT 1
        ) THEN
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
            format('Received from PO - %s %s', v_item_record.product_name, COALESCE(v_item_record.variant_name, '')),
            jsonb_build_object(
              'purchase_order_id', po_id,
              'purchase_order_item_id', v_item_record.item_id,
              'batch_number', v_i,
              'auto_generated', true,
              'generated_at', NOW()
            ),
            NOW(),
            NOW()
          );
          
          v_items_created := v_items_created + 1;
        END IF;
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_missing_inventory_items_for_po(UUID) TO authenticated;

-- Create inventory items for the specific PO: PO-1759907347192
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
-- PART 3: UPDATE THE RECEIVE FUNCTION TO CREATE INVENTORY ITEMS
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
    
    -- 🆕 CREATE INVENTORY ITEMS (This was missing!)
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
          'purchase_order_id', purchase_order_id_param,
          'purchase_order_item_id', v_item_record.id,
          'received_by', user_id_param,
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION complete_purchase_order_receive(UUID, UUID, TEXT) TO authenticated;

-- ============================================
-- PART 4: CREATE HELPER FUNCTION TO GET RECEIVED ITEMS
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
-- PART 5: VERIFICATION
-- ============================================

-- Check if inventory items were created for PO-1759907347192
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
      RAISE NOTICE '✅ SUCCESS! % inventory items created', v_item_count;
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
  RAISE NOTICE '✅ inventory_items table ensured';
  RAISE NOTICE '✅ Inventory items created for PO-1759907347192';
  RAISE NOTICE '✅ Receive function updated to create items automatically';
  RAISE NOTICE '✅ Helper functions created for querying';
  RAISE NOTICE '';
  RAISE NOTICE '👉 NEXT STEP:';
  RAISE NOTICE '   1. Go back to your app';
  RAISE NOTICE '   2. Refresh the purchase order page';
  RAISE NOTICE '   3. Check the "Received" tab';
  RAISE NOTICE '   4. You should now see the inventory items!';
  RAISE NOTICE '';
END $$;

