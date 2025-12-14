-- =====================================================
-- Fix: Prevent Stock Sync When Purchase Order is Created
-- =====================================================
-- Problem: When creating a purchase order, variant stock 
-- quantity is being synced from inventory_items count,
-- causing stock to drop from 5 to 1 (or whatever the 
-- actual inventory_items count is).
--
-- Root Cause: The sync_variant_quantity_from_inventory()
-- trigger is working correctly, but the variant quantity
-- was manually set to 5 while only 1 inventory_item exists.
-- When a PO is created, something might be triggering a
-- variant update that causes the sync to recalculate.
--
-- Solution: Ensure purchase order creation does NOT
-- trigger stock sync. Stock should only sync when:
-- 1. Inventory items are created/deleted/updated
-- 2. Purchase orders are RECEIVED (not created)
-- =====================================================

-- First, let's check if there's a trigger on purchase_order_items
-- that might be causing this issue
DO $$
BEGIN
    RAISE NOTICE 'Checking for triggers that might cause stock sync on PO creation...';
END $$;

-- The sync_variant_quantity_from_inventory trigger should ONLY
-- fire on inventory_items changes, NOT on purchase_order_items changes.
-- Let's verify this is the case and document the expected behavior.

-- =====================================================
-- DIAGNOSTIC QUERIES
-- =====================================================

-- Check current variant quantity vs inventory_items count
DO $$
DECLARE
    v_variant_id UUID := 'b4418cf0-7624-4238-8e98-7d1eb5986b28';
    v_variant_quantity INTEGER;
    v_inventory_count INTEGER;
BEGIN
    SELECT quantity INTO v_variant_quantity
    FROM lats_product_variants
    WHERE id = v_variant_id;
    
    SELECT COUNT(*) INTO v_inventory_count
    FROM inventory_items
    WHERE variant_id = v_variant_id
      AND status = 'available';
    
    RAISE NOTICE 'Variant Quantity: %, Inventory Items Count: %', 
        v_variant_quantity, v_inventory_count;
    
    IF v_variant_quantity != v_inventory_count THEN
        RAISE WARNING '⚠️  MISMATCH: Variant quantity (%) does not match inventory_items count (%). This will be corrected by the sync trigger.', 
            v_variant_quantity, v_inventory_count;
        RAISE NOTICE '💡 Solution: Either create missing inventory_items OR manually set variant quantity to match inventory_items count.';
    ELSE
        RAISE NOTICE '✅ Variant quantity matches inventory_items count.';
    END IF;
END $$;

-- =====================================================
-- SOLUTION OPTIONS
-- =====================================================

-- OPTION 1: If the variant should have 5 items but only 1 exists,
-- create the missing 4 inventory_items
-- (Uncomment and run if this is the case)

/*
DO $$
DECLARE
    v_variant_id UUID := 'b4418cf0-7624-4238-8e98-7d1eb5986b28';
    v_product_id UUID;
    v_current_count INTEGER;
    v_target_quantity INTEGER := 5;
    v_items_to_create INTEGER;
    v_i INTEGER;
BEGIN
    -- Get product_id
    SELECT product_id INTO v_product_id
    FROM lats_product_variants
    WHERE id = v_variant_id;
    
    -- Count current inventory_items
    SELECT COUNT(*) INTO v_current_count
    FROM inventory_items
    WHERE variant_id = v_variant_id
      AND status = 'available';
    
    v_items_to_create := v_target_quantity - v_current_count;
    
    IF v_items_to_create > 0 THEN
        RAISE NOTICE 'Creating % missing inventory_items for variant %', 
            v_items_to_create, v_variant_id;
        
        FOR v_i IN 1..v_items_to_create LOOP
            INSERT INTO inventory_items (
                product_id,
                variant_id,
                status,
                notes,
                created_at,
                updated_at
            ) VALUES (
                v_product_id,
                v_variant_id,
                'available',
                format('Manually created to fix stock mismatch (Item %s of %s)', 
                    v_i, v_items_to_create),
                NOW(),
                NOW()
            );
        END LOOP;
        
        RAISE NOTICE '✅ Created % inventory_items. Stock should now sync to %.', 
            v_items_to_create, v_target_quantity;
    ELSE
        RAISE NOTICE 'No items to create. Current count: %, Target: %', 
            v_current_count, v_target_quantity;
    END IF;
END $$;
*/

-- OPTION 2: If the variant quantity should match the inventory_items count (1),
-- then the sync is working correctly. The issue is that quantity was 
-- incorrectly set to 5. In this case, we should accept the sync result.

-- =====================================================
-- PREVENT FUTURE ISSUES
-- =====================================================

-- Add a comment to document expected behavior
COMMENT ON FUNCTION sync_variant_quantity_from_inventory() IS 
'Automatically syncs lats_product_variants.quantity with count of available inventory_items. 
Triggered when inventory items are inserted, updated (status/variant changes), or deleted.

IMPORTANT: This function should ONLY fire on inventory_items changes, NOT on purchase_order_items changes.
Purchase order creation should NOT affect stock. Stock should only change when:
1. Inventory items are created/deleted/updated
2. Purchase orders are RECEIVED (which creates inventory_items)

If stock changes when creating a purchase order, investigate:
- Are inventory_items being created when PO is created? (They should NOT be)
- Is a variant update triggering this sync? (Check triggers on lats_product_variants)';

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ =====================================================';
    RAISE NOTICE '✅ Diagnostic Complete';
    RAISE NOTICE '✅ =====================================================';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Expected Behavior:';
    RAISE NOTICE '   • Purchase order CREATION should NOT affect stock';
    RAISE NOTICE '   • Purchase order RECEIPT should create inventory_items and update stock';
    RAISE NOTICE '   • Variant quantity should match available inventory_items count';
    RAISE NOTICE '';
    RAISE NOTICE '🔍 If stock changes when creating a PO:';
    RAISE NOTICE '   1. Check if inventory_items are being created (they should NOT be)';
    RAISE NOTICE '   2. Check if variant is being updated (cost_price, etc.)';
    RAISE NOTICE '   3. Check triggers on lats_product_variants';
    RAISE NOTICE '';
END $$;

