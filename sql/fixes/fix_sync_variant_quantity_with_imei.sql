-- =====================================================
-- FIX: Sync Variant Quantity with IMEI Children
-- =====================================================
-- Problem: sync_variant_quantity_from_inventory() only counts inventory_items,
--          but ignores IMEI child variants. This causes parent variant quantity
--          to be incorrect when items are received with serial numbers (IMEI).
--
-- Solution: Update the function to count BOTH:
--           1. inventory_items (for non-IMEI items)
--           2. IMEI child variants (for IMEI items)
-- =====================================================

-- Updated function to sync variant quantity from both inventory_items and IMEI children
CREATE OR REPLACE FUNCTION sync_variant_quantity_from_inventory()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_variant_id UUID;
  v_available_count INTEGER;
  v_imei_children_count INTEGER;
  v_total_count INTEGER;
  v_is_parent BOOLEAN;
BEGIN
  -- Determine which variant to update based on operation
  IF TG_OP = 'DELETE' THEN
    v_variant_id := OLD.variant_id;
  ELSE
    v_variant_id := NEW.variant_id;
  END IF;
  
  -- Only process if variant_id is set
  IF v_variant_id IS NOT NULL THEN
    -- Check if this variant is a parent variant
    SELECT COALESCE(is_parent, false) INTO v_is_parent
    FROM lats_product_variants
    WHERE id = v_variant_id;
    
    -- Count available inventory items for this variant
    SELECT COUNT(*) INTO v_available_count
    FROM inventory_items
    WHERE variant_id = v_variant_id
      AND status = 'available';
    
    -- If this is a parent variant, also count IMEI child variants
    v_imei_children_count := 0;
    IF v_is_parent THEN
      SELECT COALESCE(SUM(quantity), 0) INTO v_imei_children_count
      FROM lats_product_variants
      WHERE parent_variant_id = v_variant_id
        AND variant_type = 'imei_child'
        AND is_active = TRUE;
    END IF;
    
    -- Total count = inventory_items + IMEI children
    v_total_count := v_available_count + v_imei_children_count;
    
    -- Update the variant quantity
    UPDATE lats_product_variants
    SET 
      quantity = v_total_count,
      updated_at = NOW()
    WHERE id = v_variant_id;
    
    -- Log the sync (optional, for debugging)
    RAISE NOTICE 'Synced variant % quantity to % (inventory_items: %, IMEI children: %)', 
      v_variant_id, v_total_count, v_available_count, v_imei_children_count;
  END IF;
  
  -- Return appropriate record based on operation
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Update the comment
COMMENT ON FUNCTION sync_variant_quantity_from_inventory() IS 
'Automatically syncs lats_product_variants.quantity with count of available inventory_items AND IMEI child variants.
For parent variants: quantity = inventory_items count + IMEI children count
For regular variants: quantity = inventory_items count
Triggered when inventory items are inserted, updated (status/variant changes), or deleted.';

-- =====================================================
-- FIX EXISTING DATA
-- =====================================================
-- Recalculate all variant quantities to fix existing mismatches

DO $$
DECLARE
  v_variant RECORD;
  v_inventory_count INTEGER;
  v_imei_children_count INTEGER;
  v_total_count INTEGER;
  v_updated INTEGER := 0;
BEGIN
  RAISE NOTICE 'Starting variant quantity sync fix...';
  
  -- Loop through all variants
  FOR v_variant IN 
    SELECT id, variant_name, quantity, is_parent, variant_type
    FROM lats_product_variants
  LOOP
    -- Count available inventory items
    SELECT COUNT(*) INTO v_inventory_count
    FROM inventory_items
    WHERE variant_id = v_variant.id
      AND status = 'available';
    
    -- Count IMEI children if this is a parent variant
    v_imei_children_count := 0;
    IF COALESCE(v_variant.is_parent, false) THEN
      SELECT COALESCE(SUM(quantity), 0) INTO v_imei_children_count
      FROM lats_product_variants
      WHERE parent_variant_id = v_variant.id
        AND variant_type = 'imei_child'
        AND is_active = TRUE;
    END IF;
    
    -- Calculate total
    v_total_count := v_inventory_count + v_imei_children_count;
    
    -- Update if count doesn't match
    IF v_total_count != COALESCE(v_variant.quantity, 0) THEN
      UPDATE lats_product_variants
      SET 
        quantity = v_total_count,
        updated_at = NOW()
      WHERE id = v_variant.id;
      
      v_updated := v_updated + 1;
      RAISE NOTICE 'Updated variant % (%): % -> % (inventory: %, IMEI children: %)', 
        v_variant.variant_name, 
        v_variant.id, 
        v_variant.quantity, 
        v_total_count,
        v_inventory_count,
        v_imei_children_count;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Variant quantity sync fix complete. Updated % variants.', v_updated;
END $$;

