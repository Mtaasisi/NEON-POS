-- ============================================
-- FIX DUPLICATE INVENTORY ITEMS ISSUE
-- ============================================
-- This script addresses the issue where inventory items
-- without serial numbers appear as exact duplicates
-- ============================================

-- PART 1: Add unique identifier column to inventory_items
-- ============================================

DO $$
BEGIN
  -- Add a unique item number column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'inventory_items' 
    AND column_name = 'item_number'
  ) THEN
    ALTER TABLE inventory_items 
    ADD COLUMN item_number TEXT;
    
    RAISE NOTICE 'Added item_number column to inventory_items';
  END IF;

  -- Add index for better performance
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'inventory_items' 
    AND indexname = 'idx_inventory_items_item_number'
  ) THEN
    CREATE INDEX idx_inventory_items_item_number 
    ON inventory_items(item_number);
    
    RAISE NOTICE 'Created index on item_number';
  END IF;
END $$;

-- ============================================
-- PART 2: Generate unique item numbers for existing items
-- ============================================

-- Generate unique item numbers for items that don't have them
-- Format: {PO_NUMBER}-{PRODUCT_SKU}-{BATCH_NUMBER}
WITH numbered_items AS (
  SELECT 
    ii.id,
    ii.purchase_order_id,
    ii.purchase_order_item_id,
    ii.product_id,
    po.po_number,
    p.sku as product_sku,
    COALESCE((ii.metadata->>'batch_number')::INTEGER, 
      ROW_NUMBER() OVER (
        PARTITION BY ii.purchase_order_item_id 
        ORDER BY ii.created_at
      )) as batch_num
  FROM inventory_items ii
  LEFT JOIN lats_purchase_orders po ON po.id = ii.purchase_order_id
  LEFT JOIN lats_products p ON p.id = ii.product_id
  WHERE ii.item_number IS NULL
)
UPDATE inventory_items ii
SET 
  item_number = COALESCE(
    ni.po_number || '-' || COALESCE(ni.product_sku, 'PRODUCT') || '-' || LPAD(ni.batch_num::TEXT, 3, '0'),
    'ITEM-' || SUBSTRING(ii.id::TEXT FROM 1 FOR 8)
  ),
  metadata = COALESCE(ii.metadata, '{}'::jsonb) || 
    jsonb_build_object('batch_number', ni.batch_num, 'updated_at', NOW())
FROM numbered_items ni
WHERE ii.id = ni.id;

-- Log the update
DO $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_updated_count
  FROM inventory_items
  WHERE item_number IS NOT NULL;
  
  RAISE NOTICE 'Updated % inventory items with unique item numbers', v_updated_count;
END $$;

-- ============================================
-- PART 3: Update the inventory creation function
-- ============================================

-- Drop and recreate the function with proper unique identifiers
CREATE OR REPLACE FUNCTION create_missing_inventory_items_for_po(po_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_items_created INTEGER := 0;
  v_item_record RECORD;
  v_quantity INTEGER;
  v_i INTEGER;
  v_po_number TEXT;
  v_product_sku TEXT;
  v_item_number TEXT;
BEGIN
  -- Get PO number
  SELECT po_number INTO v_po_number
  FROM lats_purchase_orders
  WHERE id = po_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false, 
      'message', 'Purchase order not found',
      'items_created', 0
    );
  END IF;

  -- Only process received or completed POs
  IF NOT EXISTS (
    SELECT 1 FROM lats_purchase_orders 
    WHERE id = po_id 
    AND status IN ('received', 'completed')
  ) THEN
    RETURN json_build_object(
      'success', false, 
      'message', 'PO not in received/completed status',
      'items_created', 0
    );
  END IF;

  -- Process each purchase order item
  FOR v_item_record IN 
    SELECT 
      poi.id as item_id, 
      poi.product_id, 
      poi.variant_id, 
      poi.quantity_received,
      poi.quantity_ordered, 
      poi.unit_cost as unit_price,
      p.name as product_name,
      p.sku as product_sku,
      pv.name as variant_name
    FROM lats_purchase_order_items poi
    LEFT JOIN lats_products p ON p.id = poi.product_id
    LEFT JOIN lats_product_variants pv ON pv.id = poi.variant_id
    WHERE poi.purchase_order_id = po_id
  LOOP
    -- Use received quantity or fall back to ordered quantity
    v_quantity := COALESCE(v_item_record.quantity_received, v_item_record.quantity_ordered, 0);
    v_product_sku := COALESCE(v_item_record.product_sku, 'PRODUCT');
    
    IF v_quantity > 0 THEN
      -- Create one inventory item for each unit
      FOR v_i IN 1..v_quantity LOOP
        -- Generate unique item number
        v_item_number := v_po_number || '-' || v_product_sku || '-' || LPAD(v_i::TEXT, 3, '0');
        
        -- Check if item already exists with this item_number
        IF NOT EXISTS (
          SELECT 1 FROM inventory_items 
          WHERE item_number = v_item_number
        ) THEN
          INSERT INTO inventory_items (
            purchase_order_id,
            purchase_order_item_id,
            product_id,
            variant_id,
            status,
            cost_price,
            item_number,
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
            v_item_number,
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

GRANT EXECUTE ON FUNCTION create_missing_inventory_items_for_po(UUID) TO authenticated;

-- ============================================
-- PART 4: Update get_received_items_for_po to show item numbers
-- ============================================

CREATE OR REPLACE FUNCTION get_received_items_for_po(po_id UUID)
RETURNS TABLE (
  id UUID,
  purchase_order_id UUID,
  product_id UUID,
  variant_id UUID,
  serial_number TEXT,
  item_number TEXT,
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
  cost_price NUMERIC,
  selling_price NUMERIC,
  notes TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ,
  product_name TEXT,
  product_sku TEXT,
  variant_name TEXT,
  variant_sku TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ii.id,
    ii.purchase_order_id,
    ii.product_id,
    ii.variant_id,
    ii.serial_number,
    ii.item_number,
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
  LEFT JOIN lats_products p ON p.id = ii.product_id
  LEFT JOIN lats_product_variants pv ON pv.id = ii.variant_id
  WHERE ii.purchase_order_id = po_id
  ORDER BY ii.created_at DESC, ii.item_number ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_received_items_for_po(UUID) TO authenticated;

-- ============================================
-- PART 5: Check for actual duplicates and log them
-- ============================================

DO $$
DECLARE
  v_duplicate_count INTEGER;
  v_duplicate_record RECORD;
BEGIN
  -- Find true duplicates (same PO, same product, same variant, same timestamp)
  SELECT COUNT(*) INTO v_duplicate_count
  FROM (
    SELECT 
      purchase_order_id,
      product_id,
      variant_id,
      cost_price,
      created_at,
      COUNT(*) as dup_count
    FROM inventory_items
    WHERE purchase_order_id IS NOT NULL
    GROUP BY 
      purchase_order_id,
      product_id,
      variant_id,
      cost_price,
      created_at
    HAVING COUNT(*) > 1
  ) duplicates;

  IF v_duplicate_count > 0 THEN
    RAISE WARNING '⚠️ Found % sets of potential duplicate inventory items', v_duplicate_count;
    RAISE NOTICE '❗ Review inventory_items table for items with identical purchase_order_id, product_id, variant_id, and created_at';
    RAISE NOTICE '❗ Consider using item_number to differentiate items in the UI';
  ELSE
    RAISE NOTICE '✅ No duplicate inventory items found';
  END IF;
END $$;

-- ============================================
-- VERIFICATION
-- ============================================

-- Show sample of items with their unique identifiers
SELECT 
  ii.item_number,
  ii.serial_number,
  po.po_number,
  p.name as product,
  pv.name as variant,
  ii.status,
  ii.cost_price,
  ii.metadata->>'batch_number' as batch_number,
  ii.created_at
FROM inventory_items ii
LEFT JOIN lats_purchase_orders po ON po.id = ii.purchase_order_id
LEFT JOIN lats_products p ON p.id = ii.product_id
LEFT JOIN lats_product_variants pv ON pv.id = ii.variant_id
WHERE ii.purchase_order_id IS NOT NULL
ORDER BY ii.created_at DESC, ii.item_number ASC
LIMIT 20;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ ============================================';
  RAISE NOTICE '✅ DUPLICATE INVENTORY ITEMS FIX COMPLETE';
  RAISE NOTICE '✅ ============================================';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Changes made:';
  RAISE NOTICE '   1. Added item_number column to inventory_items';
  RAISE NOTICE '   2. Generated unique identifiers for existing items';
  RAISE NOTICE '   3. Updated creation function to prevent duplicates';
  RAISE NOTICE '   4. Updated get_received_items_for_po to include item_number';
  RAISE NOTICE '';
  RAISE NOTICE '🔍 Next steps:';
  RAISE NOTICE '   - Update UI to display item_number for items without serial numbers';
  RAISE NOTICE '   - Consider showing batch_number from metadata in the UI';
  RAISE NOTICE '   - Each item should now have a unique identifier';
  RAISE NOTICE '';
END $$;

