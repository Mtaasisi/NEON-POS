-- ============================================================================
-- PERMANENT FIX: Device Pricing Issue for SKU-1761488427336-DJ5-V01
-- ============================================================================
-- Problem: Child IMEI devices showing TSh 0 instead of parent price (TSh 150,000)
-- Root Cause: Devices created without inheriting parent variant selling_price
-- ============================================================================

-- Step 1: Fix the specific product SKU-1761488427336-DJ5-V01
-- Update all child devices to inherit parent's selling price (TSh 150,000)

WITH parent_info AS (
  SELECT 
    id as parent_id,
    selling_price as parent_selling_price,
    cost_price as parent_cost_price,
    product_id
  FROM lats_product_variants
  WHERE sku = 'SKU-1761488427336-DJ5-V01'
    AND variant_type = 'parent'
    AND is_parent = TRUE
  LIMIT 1
)
UPDATE lats_product_variants child
SET 
  selling_price = parent_info.parent_selling_price,
  cost_price = CASE 
    WHEN child.cost_price = 0 OR child.cost_price IS NULL 
    THEN parent_info.parent_cost_price 
    ELSE child.cost_price 
  END,
  updated_at = NOW()
FROM parent_info
WHERE child.parent_variant_id = parent_info.parent_id
  AND child.variant_type = 'imei_child'
  AND (child.selling_price = 0 OR child.selling_price IS NULL);

-- Step 2: Fix ALL products with the same issue (prevention)
-- This ensures any other products with this issue are also fixed

UPDATE lats_product_variants child
SET 
  selling_price = parent.selling_price,
  cost_price = CASE 
    WHEN child.cost_price = 0 OR child.cost_price IS NULL 
    THEN parent.cost_price 
    ELSE child.cost_price 
  END,
  updated_at = NOW()
FROM lats_product_variants parent
WHERE child.parent_variant_id = parent.id
  AND child.variant_type = 'imei_child'
  AND parent.is_parent = TRUE
  AND (child.selling_price = 0 OR child.selling_price IS NULL);

-- Step 3: Create a trigger to automatically inherit prices on insert/update
-- This prevents the issue from happening in the future

CREATE OR REPLACE FUNCTION inherit_parent_variant_prices()
RETURNS TRIGGER AS $$
DECLARE
  v_parent_selling_price NUMERIC;
  v_parent_cost_price NUMERIC;
BEGIN
  -- Only apply to imei_child variants with a parent
  IF NEW.variant_type = 'imei_child' AND NEW.parent_variant_id IS NOT NULL THEN
    
    -- Get parent prices
    SELECT selling_price, cost_price
    INTO v_parent_selling_price, v_parent_cost_price
    FROM lats_product_variants
    WHERE id = NEW.parent_variant_id;
    
    -- Inherit selling price if not set or is 0
    IF NEW.selling_price IS NULL OR NEW.selling_price = 0 THEN
      NEW.selling_price := COALESCE(v_parent_selling_price, 0);
    END IF;
    
    -- Inherit cost price if not set or is 0
    IF NEW.cost_price IS NULL OR NEW.cost_price = 0 THEN
      NEW.cost_price := COALESCE(v_parent_cost_price, 0);
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_inherit_parent_prices ON lats_product_variants;

-- Create the trigger
CREATE TRIGGER trigger_inherit_parent_prices
  BEFORE INSERT OR UPDATE ON lats_product_variants
  FOR EACH ROW
  EXECUTE FUNCTION inherit_parent_variant_prices();

-- Step 4: Verification queries
-- Run these to confirm the fix worked

SELECT 
  'Verification Results for SKU-1761488427336-DJ5-V01' as info;

-- Show parent variant
SELECT 
  'Parent Variant' as type,
  sku,
  name,
  selling_price,
  cost_price,
  quantity,
  variant_type
FROM lats_product_variants
WHERE sku = 'SKU-1761488427336-DJ5-V01'
  AND variant_type = 'parent';

-- Show child devices
SELECT 
  'Child Devices' as type,
  name,
  variant_attributes->>'imei' as imei,
  variant_attributes->>'serial_number' as serial_number,
  selling_price,
  cost_price,
  quantity,
  is_active,
  variant_type
FROM lats_product_variants
WHERE parent_variant_id = (
  SELECT id FROM lats_product_variants 
  WHERE sku = 'SKU-1761488427336-DJ5-V01' 
    AND variant_type = 'parent'
)
ORDER BY created_at;

-- Show summary
SELECT 
  'Summary' as info,
  COUNT(*) as total_children,
  COUNT(*) FILTER (WHERE selling_price > 0) as with_valid_price,
  COUNT(*) FILTER (WHERE selling_price = 0 OR selling_price IS NULL) as with_zero_price,
  AVG(selling_price) as avg_selling_price
FROM lats_product_variants
WHERE parent_variant_id = (
  SELECT id FROM lats_product_variants 
  WHERE sku = 'SKU-1761488427336-DJ5-V01' 
    AND variant_type = 'parent'
);

-- ============================================================================
-- Expected Results:
-- - Parent: TSh 150,000
-- - Both child devices: TSh 150,000 each
-- - Total Value: TSh 300,000 (2 devices × TSh 150,000)
-- ============================================================================

