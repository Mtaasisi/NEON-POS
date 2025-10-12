-- ============================================
-- CREATE INVENTORY ITEMS TABLE AND RPC FUNCTIONS
-- ============================================
-- This creates the missing lats_inventory_items table first,
-- then creates the RPC functions that depend on it
-- ============================================

-- 1. Create lats_inventory_items table
-- ============================================
CREATE TABLE IF NOT EXISTS lats_inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID REFERENCES lats_purchase_orders(id) ON DELETE CASCADE,
  purchase_order_item_id UUID REFERENCES lats_purchase_order_items(id) ON DELETE SET NULL,
  product_id UUID REFERENCES lats_products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES lats_product_variants(id) ON DELETE CASCADE,
  
  -- Unique identifiers for tracking individual items
  serial_number TEXT,
  imei TEXT,
  mac_address TEXT,
  barcode TEXT,
  
  -- Item status and location
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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  updated_by UUID
);

-- Add comments
COMMENT ON TABLE lats_inventory_items IS 'Individual inventory items received from purchase orders';
COMMENT ON COLUMN lats_inventory_items.serial_number IS 'Serial number for trackable items';
COMMENT ON COLUMN lats_inventory_items.imei IS 'IMEI for mobile devices';
COMMENT ON COLUMN lats_inventory_items.mac_address IS 'MAC address for network devices';
COMMENT ON COLUMN lats_inventory_items.barcode IS 'Barcode for scanning';
COMMENT ON COLUMN lats_inventory_items.status IS 'Current status of the inventory item';
COMMENT ON COLUMN lats_inventory_items.quality_check_status IS 'Quality check result: pending, passed, failed';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_inventory_items_po ON lats_inventory_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_product ON lats_inventory_items(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_variant ON lats_inventory_items(variant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_status ON lats_inventory_items(status);
CREATE INDEX IF NOT EXISTS idx_inventory_items_serial ON lats_inventory_items(serial_number) WHERE serial_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_items_imei ON lats_inventory_items(imei) WHERE imei IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_items_barcode ON lats_inventory_items(barcode) WHERE barcode IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE lats_inventory_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view inventory items" ON lats_inventory_items;
DROP POLICY IF EXISTS "Users can insert inventory items" ON lats_inventory_items;
DROP POLICY IF EXISTS "Users can update inventory items" ON lats_inventory_items;
DROP POLICY IF EXISTS "Users can delete inventory items" ON lats_inventory_items;

-- Create RLS policies (permissive for now - adjust based on your auth setup)
CREATE POLICY "Users can view inventory items" 
  ON lats_inventory_items FOR SELECT 
  USING (true);

CREATE POLICY "Users can insert inventory items" 
  ON lats_inventory_items FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Users can update inventory items" 
  ON lats_inventory_items FOR UPDATE 
  USING (true);

CREATE POLICY "Users can delete inventory items" 
  ON lats_inventory_items FOR DELETE 
  USING (true);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_inventory_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS inventory_items_updated_at ON lats_inventory_items;
CREATE TRIGGER inventory_items_updated_at
  BEFORE UPDATE ON lats_inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION update_inventory_items_updated_at();


-- ============================================
-- 2. Create get_received_items_for_po function
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
    COALESCE(poi.quantity, 1) as quantity,
    COALESCE(poi.received_quantity, 1) as received_quantity,
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
  LEFT JOIN lats_purchase_order_items poi ON poi.id = ii.purchase_order_item_id
  WHERE ii.purchase_order_id = po_id
    AND ii.status IN ('received', 'in_stock', 'quality_checked')
  ORDER BY ii.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_received_items_for_po(UUID) TO authenticated;


-- ============================================
-- 3. Create get_quality_check_summary function
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
      COUNT(*) FILTER (WHERE ii.quality_check_status = 'passed') as passed,
      COUNT(*) FILTER (WHERE ii.quality_check_status = 'failed') as failed,
      COUNT(*) FILTER (WHERE ii.quality_check_status = 'pending') as pending
    FROM lats_inventory_items ii
    WHERE ii.purchase_order_id = po_id
  )
  SELECT 
    COALESCE(total, 0)::BIGINT,
    COALESCE(checked, 0)::BIGINT,
    COALESCE(passed, 0)::BIGINT,
    COALESCE(failed, 0)::BIGINT,
    COALESCE(pending, 0)::BIGINT,
    CASE 
      WHEN COALESCE(checked, 0) > 0 THEN ROUND((COALESCE(passed, 0)::NUMERIC / checked::NUMERIC) * 100, 2)
      ELSE 0
    END as pass_rate
  FROM item_counts;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_quality_check_summary(UUID) TO authenticated;


-- ============================================
-- 4. Create get_inventory_items function
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

GRANT EXECUTE ON FUNCTION get_inventory_items(UUID, UUID, TEXT, INTEGER) TO authenticated;


-- ============================================
-- 5. Create get_payments function
-- ============================================
CREATE OR REPLACE FUNCTION get_payments(po_id UUID)
RETURNS TABLE (
  id UUID,
  purchase_order_id UUID,
  amount DECIMAL(10, 2),
  payment_method TEXT,
  payment_date TIMESTAMPTZ,
  reference_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ,
  created_by UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.purchase_order_id,
    p.amount,
    p.payment_method,
    p.payment_date,
    p.reference_number,
    p.notes,
    p.created_at,
    p.created_by
  FROM lats_purchase_order_payments p
  WHERE p.purchase_order_id = po_id
  ORDER BY p.payment_date DESC, p.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_payments(UUID) TO authenticated;


-- ============================================
-- 6. Create lats_purchase_order_payments table if it doesn't exist
-- ============================================
CREATE TABLE IF NOT EXISTS lats_purchase_order_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES lats_purchase_orders(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  payment_method TEXT NOT NULL,
  payment_date TIMESTAMPTZ DEFAULT NOW(),
  reference_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  updated_by UUID
);

-- Add comments
COMMENT ON TABLE lats_purchase_order_payments IS 'Payment records for purchase orders';
COMMENT ON COLUMN lats_purchase_order_payments.amount IS 'Payment amount';
COMMENT ON COLUMN lats_purchase_order_payments.payment_method IS 'Method of payment (cash, bank transfer, credit, etc.)';
COMMENT ON COLUMN lats_purchase_order_payments.reference_number IS 'Transaction reference or receipt number';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_po_payments_po ON lats_purchase_order_payments(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_po_payments_date ON lats_purchase_order_payments(payment_date);

-- Enable Row Level Security
ALTER TABLE lats_purchase_order_payments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view purchase order payments" ON lats_purchase_order_payments;
DROP POLICY IF EXISTS "Users can insert purchase order payments" ON lats_purchase_order_payments;
DROP POLICY IF EXISTS "Users can update purchase order payments" ON lats_purchase_order_payments;
DROP POLICY IF EXISTS "Users can delete purchase order payments" ON lats_purchase_order_payments;

-- Create RLS policies
CREATE POLICY "Users can view purchase order payments" 
  ON lats_purchase_order_payments FOR SELECT 
  USING (true);

CREATE POLICY "Users can insert purchase order payments" 
  ON lats_purchase_order_payments FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Users can update purchase order payments" 
  ON lats_purchase_order_payments FOR UPDATE 
  USING (true);

CREATE POLICY "Users can delete purchase order payments" 
  ON lats_purchase_order_payments FOR DELETE 
  USING (true);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_po_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER po_payments_updated_at
  BEFORE UPDATE ON lats_purchase_order_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_po_payments_updated_at();


-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Verify the tables were created
SELECT 
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('lats_inventory_items', 'lats_purchase_order_payments')
ORDER BY table_name;

-- Verify the functions were created
SELECT 
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'get_received_items_for_po',
    'get_quality_check_summary',
    'get_inventory_items',
    'get_payments'
  )
ORDER BY routine_name;

-- Check table columns
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'lats_inventory_items'
ORDER BY ordinal_position;

-- ============================================
-- SUMMARY
-- ============================================
-- ✅ Created 2 tables:
--    - lats_inventory_items (for tracking received items)
--    - lats_purchase_order_payments (for payment records)
-- ✅ Created 4 RPC functions:
--    - get_received_items_for_po (fetch received items)
--    - get_quality_check_summary (quality check stats)
--    - get_inventory_items (fetch inventory with filters)
--    - get_payments (fetch payment history)
-- ✅ Added indexes for performance
-- ✅ Enabled RLS with policies
-- ✅ Added update timestamp triggers
-- ============================================

