-- ============================================
-- ADD IMEI VARIANT SUPPORT TO PRODUCTS
-- ============================================
-- This migration adds support for IMEI-based variants similar to trade-in devices
-- Each IMEI becomes its own variant instead of using inventory_items table

-- Step 1: Add variant_attributes column if it doesn't exist
ALTER TABLE lats_product_variants 
ADD COLUMN IF NOT EXISTS variant_attributes JSONB DEFAULT '{}'::jsonb;

-- Step 2: Add quantity column if it doesn't exist (for per-variant stock)
ALTER TABLE lats_product_variants 
ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1;

-- Step 3: Add branch_id to variants if it doesn't exist
ALTER TABLE lats_product_variants 
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES lats_branches(id);

-- Step 4: Create index on variant_attributes for IMEI lookups
CREATE INDEX IF NOT EXISTS idx_variant_attributes_imei 
ON lats_product_variants USING gin (variant_attributes);

-- Step 5: Create specific index for IMEI field in JSONB
CREATE INDEX IF NOT EXISTS idx_variant_imei 
ON lats_product_variants ((variant_attributes->>'imei'))
WHERE variant_attributes->>'imei' IS NOT NULL;

-- Step 6: Add metadata column to products for tracking IMEI settings
ALTER TABLE lats_products 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Step 7: Create index on product metadata
CREATE INDEX IF NOT EXISTS idx_products_metadata 
ON lats_products USING gin (metadata);

-- Step 8: Add function to check for duplicate IMEI across all variants
CREATE OR REPLACE FUNCTION check_duplicate_imei()
RETURNS TRIGGER AS $$
BEGIN
  -- Only check if IMEI is provided
  IF NEW.variant_attributes->>'imei' IS NOT NULL AND NEW.variant_attributes->>'imei' != '' THEN
    -- Check if IMEI already exists (excluding current variant)
    IF EXISTS (
      SELECT 1 
      FROM lats_product_variants 
      WHERE variant_attributes->>'imei' = NEW.variant_attributes->>'imei'
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) THEN
      RAISE EXCEPTION 'Device with IMEI % already exists in inventory', NEW.variant_attributes->>'imei';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 9: Create trigger to enforce unique IMEI
DROP TRIGGER IF EXISTS enforce_unique_imei ON lats_product_variants;
CREATE TRIGGER enforce_unique_imei
  BEFORE INSERT OR UPDATE ON lats_product_variants
  FOR EACH ROW
  EXECUTE FUNCTION check_duplicate_imei();

-- Step 10: Create helper function to get variant by IMEI
CREATE OR REPLACE FUNCTION get_variant_by_imei(search_imei TEXT)
RETURNS TABLE (
  variant_id UUID,
  product_id UUID,
  product_name TEXT,
  variant_name TEXT,
  imei TEXT,
  serial_number TEXT,
  selling_price NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.id as variant_id,
    v.product_id,
    p.name as product_name,
    v.variant_name,
    v.variant_attributes->>'imei' as imei,
    v.variant_attributes->>'serial_number' as serial_number,
    v.selling_price
  FROM lats_product_variants v
  JOIN lats_products p ON p.id = v.product_id
  WHERE v.variant_attributes->>'imei' = search_imei
  AND v.is_active = true;
END;
$$ LANGUAGE plpgsql;

-- Step 11: Create view for available IMEI variants
CREATE OR REPLACE VIEW available_imei_variants AS
SELECT 
  v.id as variant_id,
  v.product_id,
  p.name as product_name,
  p.sku as product_sku,
  v.variant_name,
  v.sku as variant_sku,
  v.variant_attributes->>'imei' as imei,
  v.variant_attributes->>'serial_number' as serial_number,
  v.variant_attributes->>'mac_address' as mac_address,
  v.variant_attributes->>'condition' as condition,
  v.variant_attributes->>'source' as source,
  v.cost_price,
  v.selling_price,
  v.quantity,
  v.is_active,
  v.branch_id,
  v.created_at,
  v.updated_at
FROM lats_product_variants v
JOIN lats_products p ON p.id = v.product_id
WHERE 
  v.variant_attributes->>'imei' IS NOT NULL 
  AND v.variant_attributes->>'imei' != ''
  AND v.quantity > 0
  AND v.is_active = true
ORDER BY v.created_at DESC;

-- Step 12: Create function to decrement variant quantity on sale
CREATE OR REPLACE FUNCTION decrement_variant_quantity(
  variant_id_param UUID,
  quantity_param INTEGER DEFAULT 1
)
RETURNS BOOLEAN AS $$
DECLARE
  current_quantity INTEGER;
BEGIN
  -- Get current quantity
  SELECT quantity INTO current_quantity
  FROM lats_product_variants
  WHERE id = variant_id_param;
  
  -- Check if enough quantity available
  IF current_quantity < quantity_param THEN
    RAISE EXCEPTION 'Insufficient quantity. Available: %, Requested: %', current_quantity, quantity_param;
  END IF;
  
  -- Decrement quantity
  UPDATE lats_product_variants
  SET 
    quantity = quantity - quantity_param,
    is_active = CASE 
      WHEN quantity - quantity_param <= 0 THEN false 
      ELSE is_active 
    END,
    updated_at = NOW()
  WHERE id = variant_id_param;
  
  -- Also update product stock_quantity
  UPDATE lats_products p
  SET 
    stock_quantity = stock_quantity - quantity_param,
    updated_at = NOW()
  WHERE id = (SELECT product_id FROM lats_product_variants WHERE id = variant_id_param);
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Step 13: Add comments for documentation
COMMENT ON COLUMN lats_product_variants.variant_attributes IS 'Stores IMEI, serial_number, mac_address, condition, and other device-specific attributes';
COMMENT ON COLUMN lats_product_variants.quantity IS 'Stock quantity for this specific variant (usually 1 for IMEI-tracked items)';
COMMENT ON FUNCTION check_duplicate_imei() IS 'Prevents duplicate IMEI numbers across all product variants';
COMMENT ON FUNCTION get_variant_by_imei(TEXT) IS 'Quick lookup of variant by IMEI number';
COMMENT ON VIEW available_imei_variants IS 'View of all variants with IMEI numbers that are available for sale';

-- Step 14: Grant permissions
GRANT SELECT ON available_imei_variants TO authenticated;
GRANT EXECUTE ON FUNCTION get_variant_by_imei(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION decrement_variant_quantity(UUID, INTEGER) TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ IMEI variant support successfully added to products';
  RAISE NOTICE '📋 Features added:';
  RAISE NOTICE '   - variant_attributes JSONB column for storing IMEI data';
  RAISE NOTICE '   - Unique IMEI validation across all variants';
  RAISE NOTICE '   - Helper functions for IMEI lookups';
  RAISE NOTICE '   - Available IMEI variants view';
  RAISE NOTICE '   - Automatic quantity decrement on sale';
END $$;

