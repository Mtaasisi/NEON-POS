-- =====================================================
-- INVENTORY SYNC TRIGGER - Apply this to fix inventory sync
-- =====================================================
-- Run this SQL in your Supabase SQL Editor or through psql
-- This ensures variant quantities are automatically synced with inventory_items

-- Function to sync variant quantity from inventory items
CREATE OR REPLACE FUNCTION sync_variant_quantity_from_inventory()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_variant_id UUID;
  v_available_count INTEGER;
BEGIN
  -- Determine which variant to update based on operation
  IF TG_OP = 'DELETE' THEN
    v_variant_id := OLD.variant_id;
  ELSE
    v_variant_id := NEW.variant_id;
  END IF;
  
  -- Only process if variant_id is set
  IF v_variant_id IS NOT NULL THEN
    -- Count available inventory items for this variant
    SELECT COUNT(*) INTO v_available_count
    FROM inventory_items
    WHERE variant_id = v_variant_id
      AND status = 'available';
    
    -- Update the variant quantity
    UPDATE lats_product_variants
    SET 
      quantity = v_available_count,
      updated_at = NOW()
    WHERE id = v_variant_id;
    
    -- Log the sync (optional, for debugging)
    RAISE NOTICE 'Synced variant % quantity to %', v_variant_id, v_available_count;
  END IF;
  
  -- Return appropriate record based on operation
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_sync_variant_quantity_insert_update ON inventory_items;
DROP TRIGGER IF EXISTS trigger_sync_variant_quantity_delete ON inventory_items;
DROP TRIGGER IF EXISTS trigger_sync_variant_quantity ON inventory_items;

-- Create trigger for INSERT and UPDATE
CREATE TRIGGER trigger_sync_variant_quantity_insert_update
AFTER INSERT OR UPDATE OF status, variant_id ON inventory_items
FOR EACH ROW
WHEN (NEW.variant_id IS NOT NULL)
EXECUTE FUNCTION sync_variant_quantity_from_inventory();

-- Create trigger for DELETE
CREATE TRIGGER trigger_sync_variant_quantity_delete
AFTER DELETE ON inventory_items
FOR EACH ROW
WHEN (OLD.variant_id IS NOT NULL)
EXECUTE FUNCTION sync_variant_quantity_from_inventory();

-- Add comments for documentation
COMMENT ON FUNCTION sync_variant_quantity_from_inventory IS 
'Automatically syncs lats_product_variants.quantity with count of available inventory_items. 
Triggered when inventory items are inserted, updated (status/variant changes), or deleted.';

COMMENT ON TRIGGER trigger_sync_variant_quantity_insert_update ON inventory_items IS
'Syncs variant quantity when inventory items are added or their status/variant changes';

COMMENT ON TRIGGER trigger_sync_variant_quantity_delete ON inventory_items IS
'Syncs variant quantity when inventory items are deleted';

-- =====================================================
-- INITIAL SYNC - Sync all existing variants
-- =====================================================

DO $$
DECLARE
  v_variant RECORD;
  v_count INTEGER;
  v_updated INTEGER := 0;
  v_total INTEGER := 0;
BEGIN
  RAISE NOTICE 'Starting initial inventory sync...';
  
  -- Count total variants
  SELECT COUNT(*) INTO v_total FROM lats_product_variants;
  RAISE NOTICE 'Found % variants to sync', v_total;
  
  -- Loop through all variants
  FOR v_variant IN 
    SELECT id, name, quantity 
    FROM lats_product_variants
  LOOP
    -- Count available inventory items
    SELECT COUNT(*) INTO v_count
    FROM inventory_items
    WHERE variant_id = v_variant.id
      AND status = 'available';
    
    -- Update if count doesn't match
    IF v_count != COALESCE(v_variant.quantity, 0) THEN
      UPDATE lats_product_variants
      SET 
        quantity = v_count,
        updated_at = NOW()
      WHERE id = v_variant.id;
      
      v_updated := v_updated + 1;
      RAISE NOTICE 'Updated variant %: % -> %', v_variant.name, v_variant.quantity, v_count;
    END IF;
  END LOOP;
  
  RAISE NOTICE '✅ Initial sync complete. Updated % of % variants.', v_updated, v_total;
  
  -- Show summary
  IF v_updated > 0 THEN
    RAISE NOTICE '🎉 Fixed % variant quantity mismatches!', v_updated;
  ELSE
    RAISE NOTICE '✅ All variants were already in sync!';
  END IF;
END $$;

-- Success message
DO $$ 
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Inventory sync trigger installed!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'From now on, variant quantities will automatically sync';
  RAISE NOTICE 'whenever inventory items are created, updated, or deleted.';
  RAISE NOTICE '========================================';
END $$;

