-- ============================================
-- FIX PARENT VARIANT STOCK CALCULATION
-- ============================================
-- This script fixes parent variants whose stock doesn't match their children count
-- Issue: Parent variants showing 0 stock when they have child devices

-- Step 1: Check current state (for verification)
DO $$
DECLARE
  v_mismatched_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_mismatched_count
  FROM lats_product_variants parent
  WHERE (parent.is_parent = TRUE OR parent.variant_type = 'parent')
    AND parent.quantity != (
      SELECT COALESCE(SUM(child.quantity), 0)
      FROM lats_product_variants child
      WHERE child.parent_variant_id = parent.id
        AND child.variant_type = 'imei_child'
        AND child.is_active = TRUE
    );
    
  RAISE NOTICE '🔍 Found % parent variants with incorrect stock counts', v_mismatched_count;
END $$;

-- Step 2: Update all parent variant stocks to match their children
UPDATE lats_product_variants parent
SET 
  quantity = (
    SELECT COALESCE(SUM(child.quantity), 0)
    FROM lats_product_variants child
    WHERE child.parent_variant_id = parent.id
      AND child.variant_type = 'imei_child'
      AND child.is_active = TRUE
  ),
  updated_at = NOW()
WHERE (parent.is_parent = TRUE OR parent.variant_type = 'parent')
  AND parent.quantity != (
    SELECT COALESCE(SUM(child.quantity), 0)
    FROM lats_product_variants child
    WHERE child.parent_variant_id = parent.id
      AND child.variant_type = 'imei_child'
      AND child.is_active = TRUE
  );

-- Step 3: Verify the specific product from the issue
DO $$
DECLARE
  v_result RECORD;
BEGIN
  RAISE NOTICE '📊 Checking SKU-1761465747854-0E5 variants:';
  
  FOR v_result IN
    SELECT 
      pv.sku,
      pv.variant_name,
      pv.quantity as parent_stock,
      (
        SELECT COUNT(*)
        FROM lats_product_variants child
        WHERE child.parent_variant_id = pv.id
          AND child.variant_type = 'imei_child'
      ) as total_children,
      (
        SELECT COUNT(*)
        FROM lats_product_variants child
        WHERE child.parent_variant_id = pv.id
          AND child.variant_type = 'imei_child'
          AND child.is_active = TRUE
          AND child.quantity > 0
      ) as available_children
    FROM lats_product_variants pv
    WHERE pv.sku LIKE 'SKU-1761465747854-0E5%'
      AND pv.parent_variant_id IS NULL
    ORDER BY pv.sku
  LOOP
    RAISE NOTICE '  ✅ %: Stock=%, Total Children=%, Available=%', 
      v_result.sku, 
      v_result.parent_stock, 
      v_result.total_children, 
      v_result.available_children;
  END LOOP;
END $$;

-- Step 4: Re-create the trigger with better logic (if needed)
DROP TRIGGER IF EXISTS trigger_update_parent_stock ON lats_product_variants;

CREATE OR REPLACE FUNCTION update_parent_variant_stock()
RETURNS TRIGGER AS $$
DECLARE
  v_parent_id UUID;
  v_new_stock INTEGER;
BEGIN
  -- Get parent variant ID
  IF TG_OP = 'DELETE' THEN
    v_parent_id := OLD.parent_variant_id;
  ELSE
    v_parent_id := NEW.parent_variant_id;
  END IF;
  
  -- Only process if this is a child variant
  IF v_parent_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  -- Calculate new stock from all active children
  SELECT COALESCE(SUM(quantity), 0)
  INTO v_new_stock
  FROM lats_product_variants
  WHERE parent_variant_id = v_parent_id
    AND variant_type = 'imei_child'
    AND is_active = TRUE;
  
  -- Update parent variant
  UPDATE lats_product_variants
  SET 
    quantity = v_new_stock,
    updated_at = NOW()
  WHERE id = v_parent_id;
  
  -- Also update product stock
  UPDATE lats_products p
  SET 
    stock_quantity = (
      SELECT COALESCE(SUM(v.quantity), 0)
      FROM lats_product_variants v
      WHERE v.product_id = p.id
        AND v.is_active = TRUE
        AND (v.variant_type = 'parent' OR v.parent_variant_id IS NULL)
    ),
    updated_at = NOW()
  WHERE p.id = (SELECT product_id FROM lats_product_variants WHERE id = v_parent_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Re-create the trigger
CREATE TRIGGER trigger_update_parent_stock
  AFTER INSERT OR UPDATE OF quantity, is_active OR DELETE ON lats_product_variants
  FOR EACH ROW
  EXECUTE FUNCTION update_parent_variant_stock();

-- Step 5: Final verification
DO $$
DECLARE
  v_mismatched_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_mismatched_count
  FROM lats_product_variants parent
  WHERE (parent.is_parent = TRUE OR parent.variant_type = 'parent')
    AND parent.quantity != (
      SELECT COALESCE(SUM(child.quantity), 0)
      FROM lats_product_variants child
      WHERE child.parent_variant_id = parent.id
        AND child.variant_type = 'imei_child'
        AND child.is_active = TRUE
    );
    
  IF v_mismatched_count = 0 THEN
    RAISE NOTICE '✅ All parent variant stocks are now correct!';
  ELSE
    RAISE NOTICE '⚠️  Still have % parent variants with incorrect stock', v_mismatched_count;
  END IF;
END $$;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ Parent Variant Stock Fix Complete!';
  RAISE NOTICE '   - Updated all parent stocks to match children counts';
  RAISE NOTICE '   - Refreshed trigger function';
  RAISE NOTICE '   - Verified stock calculations';
  RAISE NOTICE '════════════════════════════════════════════════════════';
END $$;

