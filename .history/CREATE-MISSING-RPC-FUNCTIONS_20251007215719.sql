-- ============================================
-- CREATE MISSING RPC FUNCTIONS FOR PURCHASE ORDERS
-- ============================================
-- Run this in your Neon database to fix the 400 errors
-- ============================================

-- 1. Create get_received_items_for_po function
-- This function fetches all received items for a purchase order
-- ============================================
CREATE OR REPLACE FUNCTION get_received_items_for_po(po_id UUID)
RETURNS TABLE (
  id UUID,
  purchase_order_id UUID,
  product_id UUID,
  variant_id UUID,
  quantity INTEGER,
  received_quantity INTEGER,
  cost_price DECIMAL(10, 2),
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
  selling_price DECIMAL(10, 2),
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ii.id,
    ii.purchase_order_id,
    ii.product_id,
    ii.variant_id,
    poi.quantity,
    poi.received_quantity,
    ii.cost_price,
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
    ii.selling_price,
    ii.created_at
  FROM lats_inventory_items ii
  JOIN lats_purchase_order_items poi ON poi.id = ii.purchase_order_item_id
  WHERE ii.purchase_order_id = po_id
    AND ii.status IN ('received', 'in_stock', 'quality_checked')
  ORDER BY ii.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_received_items_for_po(UUID) TO authenticated;


-- 2. Create get_quality_check_summary function
-- This function provides a summary of quality checks for a purchase order
-- ============================================
CREATE OR REPLACE FUNCTION get_quality_check_summary(po_id UUID)
RETURNS TABLE (
  total_items BIGINT,
  checked_items BIGINT,
  passed_items BIGINT,
  failed_items BIGINT,
  pending_items BIGINT,
  pass_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH item_counts AS (
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE ii.status = 'quality_checked') as checked,
      COUNT(*) FILTER (WHERE ii.status = 'quality_checked' AND ii.quality_check_status = 'passed') as passed,
      COUNT(*) FILTER (WHERE ii.status = 'quality_checked' AND ii.quality_check_status = 'failed') as failed,
      COUNT(*) FILTER (WHERE ii.status = 'received' OR ii.status IS NULL) as pending
    FROM lats_inventory_items ii
    WHERE ii.purchase_order_id = po_id
  )
  SELECT 
    total::BIGINT,
    checked::BIGINT,
    passed::BIGINT,
    failed::BIGINT,
    pending::BIGINT,
    CASE 
      WHEN checked > 0 THEN ROUND((passed::NUMERIC / checked::NUMERIC) * 100, 2)
      ELSE 0
    END as pass_rate
  FROM item_counts;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_quality_check_summary(UUID) TO authenticated;


-- 3. Create get_inventory_items function
-- This function fetches inventory items with optional filters
-- ============================================
CREATE OR REPLACE FUNCTION get_inventory_items(
  filter_po_id UUID DEFAULT NULL,
  filter_product_id UUID DEFAULT NULL,
  filter_status TEXT DEFAULT NULL,
  limit_count INTEGER DEFAULT 100
)
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
  quality_check_status TEXT,
  quality_check_notes TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
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
    ii.quality_check_status,
    ii.quality_check_notes,
    ii.created_at,
    ii.updated_at
  FROM lats_inventory_items ii
  WHERE 
    (filter_po_id IS NULL OR ii.purchase_order_id = filter_po_id)
    AND (filter_product_id IS NULL OR ii.product_id = filter_product_id)
    AND (filter_status IS NULL OR ii.status = filter_status)
  ORDER BY ii.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_inventory_items(UUID, UUID, TEXT, INTEGER) TO authenticated;


-- 4. Add quality_check_status column to lats_inventory_items if it doesn't exist
-- ============================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_inventory_items' 
    AND column_name = 'quality_check_status'
  ) THEN
    ALTER TABLE lats_inventory_items 
    ADD COLUMN quality_check_status TEXT DEFAULT 'pending';
    
    COMMENT ON COLUMN lats_inventory_items.quality_check_status IS 'Quality check status: pending, passed, failed';
  END IF;
END $$;

-- 5. Add quality_check_notes column to lats_inventory_items if it doesn't exist
-- ============================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_inventory_items' 
    AND column_name = 'quality_check_notes'
  ) THEN
    ALTER TABLE lats_inventory_items 
    ADD COLUMN quality_check_notes TEXT;
    
    COMMENT ON COLUMN lats_inventory_items.quality_check_notes IS 'Notes from quality check inspection';
  END IF;
END $$;

-- 6. Add purchase_order_item_id column to lats_inventory_items if it doesn't exist
-- ============================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_inventory_items' 
    AND column_name = 'purchase_order_item_id'
  ) THEN
    ALTER TABLE lats_inventory_items 
    ADD COLUMN purchase_order_item_id UUID REFERENCES lats_purchase_order_items(id) ON DELETE SET NULL;
    
    COMMENT ON COLUMN lats_inventory_items.purchase_order_item_id IS 'Reference to the purchase order item this inventory item came from';
  END IF;
END $$;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Verify the functions were created successfully
SELECT 
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'get_received_items_for_po',
    'get_quality_check_summary',
    'get_inventory_items'
  )
ORDER BY routine_name;

-- Check if all required columns exist
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'lats_inventory_items'
  AND column_name IN (
    'quality_check_status',
    'quality_check_notes',
    'purchase_order_item_id'
  )
ORDER BY column_name;

-- ============================================
-- SUMMARY
-- ============================================
-- This script creates 3 missing RPC functions:
-- 1. get_received_items_for_po - Fetches received items for a PO
-- 2. get_quality_check_summary - Provides quality check statistics
-- 3. get_inventory_items - Fetches inventory items with filters
--
-- It also adds missing columns to lats_inventory_items table
-- ============================================

