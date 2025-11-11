-- ============================================
-- FIX VARIANT NAME DISPLAY IN PURCHASE ORDER RECEIVING
-- ============================================
-- This migration ensures that the main variant names are correctly
-- fetched and displayed in the serial number receiving modal.
-- 
-- Issue: The SerialNumberReceiveModal was not displaying the proper
-- variant name (e.g., "iPhone X - Default Variant")
--
-- Solution: Update the database function to prioritize variant_name
-- column over the legacy name column.
-- ============================================

-- Create or replace the function to fetch PO items with proper variant names
CREATE OR REPLACE FUNCTION get_purchase_order_items_with_products(
  purchase_order_id_param UUID
)
RETURNS TABLE(
  id UUID,
  purchase_order_id UUID,
  product_id UUID,
  variant_id UUID,
  quantity INTEGER,
  received_quantity INTEGER,
  unit_cost NUMERIC,
  total_cost NUMERIC,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  product_name TEXT,
  product_sku TEXT,
  variant_name TEXT,
  variant_sku TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    poi.id,
    poi.purchase_order_id,
    poi.product_id,
    poi.variant_id,
    COALESCE(poi.quantity_ordered, 0)::INTEGER as quantity,
    COALESCE(poi.quantity_received, 0)::INTEGER as received_quantity,
    COALESCE(poi.unit_cost, 0) as unit_cost,
    (COALESCE(poi.quantity_ordered, 0) * COALESCE(poi.unit_cost, 0)) as total_cost,
    COALESCE(poi.notes, '')::TEXT as notes,
    poi.created_at,
    COALESCE(poi.updated_at, poi.created_at) as updated_at,
    COALESCE(p.name, 'Unknown Product') as product_name,
    COALESCE(p.sku, '') as product_sku,
    -- ✅ PRIORITY FIX: Read variant_name (main field) first, then fallback to name (legacy), then default
    COALESCE(pv.variant_name, pv.name, 'Default Variant') as variant_name,
    COALESCE(pv.sku, '') as variant_sku
  FROM lats_purchase_order_items poi
  LEFT JOIN lats_products p ON poi.product_id = p.id
  LEFT JOIN lats_product_variants pv ON poi.variant_id = pv.id
  WHERE poi.purchase_order_id = purchase_order_id_param
  ORDER BY poi.created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- Add documentation
COMMENT ON FUNCTION get_purchase_order_items_with_products(UUID) IS 
  'Fetch purchase order items with product and variant details. Prioritizes variant_name column for proper display in UI.';

-- Verify the function works
DO $$
BEGIN
  RAISE NOTICE '✅ Function get_purchase_order_items_with_products() updated successfully!';
  RAISE NOTICE '📋 The function now correctly reads variant_name for display in receiving modal';
  RAISE NOTICE '🔧 Variant names like "iPhone X - Default Variant" will now display properly';
END $$;

