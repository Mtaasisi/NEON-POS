-- ============================================
-- FIX PURCHASE ORDER ITEMS COLUMN NAMES
-- ============================================
-- This fixes the column name mismatches in lats_purchase_order_items table
-- and creates/updates the RPC function to use correct column names
-- ============================================

-- 1. Ensure correct column names exist (if table uses old names, add new ones)
-- ============================================
DO $$ 
BEGIN
  -- Add quantity_ordered if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_purchase_order_items' AND column_name = 'quantity_ordered'
  ) THEN
    -- Check if 'quantity' column exists and rename it
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'lats_purchase_order_items' AND column_name = 'quantity'
    ) THEN
      ALTER TABLE lats_purchase_order_items RENAME COLUMN quantity TO quantity_ordered;
    ELSE
      ALTER TABLE lats_purchase_order_items ADD COLUMN quantity_ordered INTEGER NOT NULL DEFAULT 0;
    END IF;
  END IF;

  -- Add quantity_received if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_purchase_order_items' AND column_name = 'quantity_received'
  ) THEN
    -- Check if 'received_quantity' column exists and rename it
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'lats_purchase_order_items' AND column_name = 'received_quantity'
    ) THEN
      ALTER TABLE lats_purchase_order_items RENAME COLUMN received_quantity TO quantity_received;
    ELSE
      ALTER TABLE lats_purchase_order_items ADD COLUMN quantity_received INTEGER DEFAULT 0;
    END IF;
  END IF;
END $$;

-- 2. Create or replace the RPC function with correct column names
-- ============================================
CREATE OR REPLACE FUNCTION get_purchase_order_items_with_products(purchase_order_id_param uuid)
RETURNS TABLE (
  id uuid,
  purchase_order_id uuid,
  product_id uuid,
  variant_id uuid,
  quantity integer,
  unit_cost numeric,
  total_cost numeric,
  received_quantity integer,
  notes text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  product_name text,
  product_sku text,
  variant_name text,
  variant_sku text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    poi.id,
    poi.purchase_order_id,
    poi.product_id,
    poi.variant_id,
    poi.quantity_ordered as quantity,
    poi.unit_cost,
    poi.subtotal as total_cost,
    COALESCE(poi.quantity_received, 0) as received_quantity,
    poi.notes,
    poi.created_at,
    poi.updated_at,
    p.name as product_name,
    p.sku as product_sku,
    pv.name as variant_name,
    pv.sku as variant_sku
  FROM lats_purchase_order_items poi
  LEFT JOIN lats_products p ON poi.product_id = p.id
  LEFT JOIN lats_product_variants pv ON poi.variant_id = pv.id
  WHERE poi.purchase_order_id = purchase_order_id_param
  ORDER BY poi.created_at DESC;
END;
$$;

-- 3. Grant execute permissions
-- ============================================
GRANT EXECUTE ON FUNCTION get_purchase_order_items_with_products(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_purchase_order_items_with_products(uuid) TO anon;

-- 4. Verify the changes
-- ============================================
SELECT 
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'lats_purchase_order_items' 
  AND column_name IN ('quantity_ordered', 'quantity_received', 'quantity', 'received_quantity')
ORDER BY column_name;

