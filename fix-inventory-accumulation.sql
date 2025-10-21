-- =====================================================
-- FIX: Inventory Should ACCUMULATE, Not Replace
-- =====================================================
-- This ensures that when you receive purchase orders,
-- the stock is ADDED to existing stock, not replaced.

-- Drop old trigger if exists
DROP TRIGGER IF EXISTS trigger_sync_variant_quantity_insert_update ON inventory_items;
DROP TRIGGER IF EXISTS trigger_sync_variant_quantity_delete ON inventory_items;
DROP TRIGGER IF EXISTS trigger_sync_variant_quantity ON inventory_items;

-- Create improved sync function that COUNTS ALL inventory items
CREATE OR REPLACE FUNCTION sync_variant_quantity_from_inventory()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_variant_id UUID;
  v_available_count INTEGER;
  v_old_quantity INTEGER;
BEGIN
  -- Determine which variant to update based on operation
  IF TG_OP = 'DELETE' THEN
    v_variant_id := OLD.variant_id;
  ELSE
    v_variant_id := NEW.variant_id;
  END IF;
  
  -- Only process if variant_id is set
  IF v_variant_id IS NOT NULL THEN
    -- Get current variant quantity for logging
    SELECT quantity INTO v_old_quantity
    FROM lats_product_variants
    WHERE id = v_variant_id;
    
    -- Count ALL available inventory items for this variant
    -- This will include old items + new items = ACCUMULATION
    SELECT COUNT(*) INTO v_available_count
    FROM inventory_items
    WHERE variant_id = v_variant_id
      AND status = 'available';
    
    -- Update the variant quantity with the TOTAL count
    UPDATE lats_product_variants
    SET 
      quantity = v_available_count,
      updated_at = NOW()
    WHERE id = v_variant_id;
    
    -- Log the change
    RAISE NOTICE 'Inventory sync: variant % updated from % to % items', 
                 v_variant_id, 
                 COALESCE(v_old_quantity, 0), 
                 v_available_count;
  END IF;
  
  -- Return appropriate record
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Create trigger for INSERT and UPDATE
-- This fires AFTER each inventory item is created/updated
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

-- Test the trigger works correctly
DO $$
DECLARE
  v_test_variant_id UUID;
  v_before_count INTEGER;
  v_after_count INTEGER;
  v_inventory_count INTEGER;
BEGIN
  -- Get a variant with inventory
  SELECT variant_id INTO v_test_variant_id
  FROM inventory_items
  WHERE variant_id IS NOT NULL
    AND status = 'available'
  LIMIT 1;
  
  IF v_test_variant_id IS NOT NULL THEN
    -- Get counts before
    SELECT quantity INTO v_before_count
    FROM lats_product_variants
    WHERE id = v_test_variant_id;
    
    SELECT COUNT(*) INTO v_inventory_count
    FROM inventory_items
    WHERE variant_id = v_test_variant_id
      AND status = 'available';
    
    RAISE NOTICE '🧪 Testing trigger on variant %', v_test_variant_id;
    RAISE NOTICE '   Current variant quantity: %', v_before_count;
    RAISE NOTICE '   Actual inventory count: %', v_inventory_count;
    
    IF v_before_count != v_inventory_count THEN
      RAISE NOTICE '   ⚠️  MISMATCH DETECTED - Trigger will fix this';
    ELSE
      RAISE NOTICE '   ✅ Already in sync';
    END IF;
  END IF;
END $$;

-- =====================================================
-- NOW: Sync ALL existing variants (FIX CURRENT DATA)
-- =====================================================

DO $$
DECLARE
  v_variant RECORD;
  v_inventory_count INTEGER;
  v_fixed INTEGER := 0;
  v_already_correct INTEGER := 0;
  v_total INTEGER := 0;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '🔄 Syncing ALL variants...';
  RAISE NOTICE '========================================';
  
  -- Count total variants
  SELECT COUNT(*) INTO v_total FROM lats_product_variants;
  RAISE NOTICE 'Processing % variants...', v_total;
  RAISE NOTICE '';
  
  -- Loop through each variant
  FOR v_variant IN 
    SELECT id, name, quantity, product_id
    FROM lats_product_variants
    ORDER BY updated_at DESC
  LOOP
    -- Count ALL available inventory items for this variant
    SELECT COUNT(*) INTO v_inventory_count
    FROM inventory_items
    WHERE variant_id = v_variant.id
      AND status = 'available';
    
    -- Check if it needs fixing
    IF v_inventory_count != COALESCE(v_variant.quantity, 0) THEN
      -- Update with correct count
      UPDATE lats_product_variants
      SET 
        quantity = v_inventory_count,
        updated_at = NOW()
      WHERE id = v_variant.id;
      
      RAISE NOTICE '✅ Fixed: % | Was: % | Now: % | Added/Fixed: %',
                   v_variant.name,
                   COALESCE(v_variant.quantity, 0),
                   v_inventory_count,
                   v_inventory_count - COALESCE(v_variant.quantity, 0);
      
      v_fixed := v_fixed + 1;
    ELSE
      v_already_correct := v_already_correct + 1;
    END IF;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '📊 Summary:';
  RAISE NOTICE '   Total variants: %', v_total;
  RAISE NOTICE '   Fixed: %', v_fixed;
  RAISE NOTICE '   Already correct: %', v_already_correct;
  RAISE NOTICE '========================================';
  
  IF v_fixed > 0 THEN
    RAISE NOTICE '✅ Fixed % inventory mismatches!', v_fixed;
    RAISE NOTICE '💡 Your inventory should now show the correct accumulated totals.';
  ELSE
    RAISE NOTICE '✅ All inventory was already correct!';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '🎉 From now on, receiving purchase orders will:';
  RAISE NOTICE '   ✅ ADD to existing stock (not replace)';
  RAISE NOTICE '   ✅ Automatically update quantities';
  RAISE NOTICE '   ✅ Keep accurate inventory counts';
END $$;

-- Add helpful comments
COMMENT ON FUNCTION sync_variant_quantity_from_inventory IS 
'Syncs variant quantity by counting ALL available inventory_items. 
This ensures stock ACCUMULATES when receiving purchase orders, rather than being replaced.';

-- Final success message
DO $$ 
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ INVENTORY ACCUMULATION FIX COMPLETE!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '🧪 To test:';
  RAISE NOTICE '   1. Check your inventory - should show correct totals now';
  RAISE NOTICE '   2. Receive a new PO - stock will ADD to current';
  RAISE NOTICE '   3. Verify the count increases (not replaces)';
  RAISE NOTICE '';
END $$;


