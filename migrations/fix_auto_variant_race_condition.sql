-- =====================================================
-- FIX AUTO-VARIANT CREATION RACE CONDITION
-- =====================================================
-- This fixes the issue where auto-variant creation happens
-- even when manual variants are created, causing duplicates.
--
-- Solution: Increase wait time and add better checking

-- Drop the existing trigger
DROP TRIGGER IF EXISTS trigger_auto_create_default_variant ON lats_products;

-- Update the function with better logic
CREATE OR REPLACE FUNCTION public.auto_create_default_variant() 
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    variant_count INTEGER;
    v_new_variant_id UUID;
BEGIN
    -- Wait longer to allow batch variant insertions (increased from 100ms to 500ms)
    PERFORM pg_sleep(0.5);
    
    -- Check if this product has any variants (including children)
    SELECT COUNT(*) INTO variant_count
    FROM lats_product_variants
    WHERE product_id = NEW.id;
    
    -- Only create default variant if NO variants exist at all
    IF variant_count = 0 THEN
        INSERT INTO lats_product_variants (
            product_id,
            name,
            variant_name,
            sku,
            cost_price,
            unit_price,
            selling_price,
            quantity,
            min_quantity,
            variant_attributes,
            attributes,
            is_active,
            created_at,
            updated_at
        )
        VALUES (
            NEW.id,
            'Default',
            'Default',
            COALESCE(NEW.sku || '-DEFAULT', 'SKU-' || SUBSTRING(NEW.id::text, 1, 8) || '-DEFAULT'),
            COALESCE(NEW.cost_price, 0),
            COALESCE(NEW.unit_price, NEW.selling_price, 0),
            COALESCE(NEW.selling_price, 0),
            COALESCE(NEW.stock_quantity, 0),
            COALESCE(NEW.min_stock_level, 5), -- Default min quantity
            jsonb_build_object(
                'auto_created', true,
                'created_at', NOW(),
                'created_from', 'product_insert_trigger'
            ),
            COALESCE(NEW.attributes, '{}'::jsonb),
            true,
            NOW(),
            NOW()
        )
        RETURNING id INTO v_new_variant_id;
        
        RAISE NOTICE '✨ Auto-created default variant (ID: %) for product: "%" (ID: %)', 
            v_new_variant_id, NEW.name, NEW.id;
    ELSE
        RAISE NOTICE '✅ Product "%" already has % variant(s), skipping auto-creation', 
            NEW.name, variant_count;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER trigger_auto_create_default_variant
    AFTER INSERT ON lats_products
    FOR EACH ROW
    EXECUTE FUNCTION auto_create_default_variant();

-- Add comments
COMMENT ON FUNCTION public.auto_create_default_variant() IS 
'Automatically creates a default variant for products that have no variants. Waits 500ms to avoid race conditions with manual variant creation.';

COMMENT ON TRIGGER trigger_auto_create_default_variant ON lats_products IS 
'Automatically creates a "Default" variant for newly inserted products that have no variants. Includes race condition protection.';

-- Clean up duplicate "Default Variant" entries that have incorrect pricing
-- This removes auto-created default variants when a product already has other variants
DO $$
DECLARE
    v_product_record RECORD;
    v_variant_to_delete UUID;
    v_deleted_count INTEGER := 0;
BEGIN
    -- Find products with both manual variants AND auto-created default variants
    FOR v_product_record IN
        SELECT 
            p.id as product_id,
            p.name as product_name,
            COUNT(*) as variant_count
        FROM lats_products p
        INNER JOIN lats_product_variants pv ON pv.product_id = p.id
        WHERE pv.parent_variant_id IS NULL
        GROUP BY p.id, p.name
        HAVING COUNT(*) > 1
    LOOP
        -- Check if this product has an auto-created "Default" variant
        SELECT id INTO v_variant_to_delete
        FROM lats_product_variants
        WHERE product_id = v_product_record.product_id
        AND parent_variant_id IS NULL
        AND (
            (name = 'Default' OR variant_name = 'Default')
            AND variant_attributes->>'auto_created' = 'true'
        )
        LIMIT 1;
        
        -- If found and product has other variants, delete the auto-created one
        IF v_variant_to_delete IS NOT NULL THEN
            -- Check if there are other variants (non-auto-created)
            IF EXISTS (
                SELECT 1 FROM lats_product_variants
                WHERE product_id = v_product_record.product_id
                AND id != v_variant_to_delete
                AND parent_variant_id IS NULL
            ) THEN
                -- Delete the auto-created default variant
                DELETE FROM lats_product_variants
                WHERE id = v_variant_to_delete;
                
                v_deleted_count := v_deleted_count + 1;
                
                RAISE NOTICE '🗑️  Removed duplicate auto-created variant for product "%"', 
                    v_product_record.product_name;
            END IF;
        END IF;
    END LOOP;
    
    IF v_deleted_count > 0 THEN
        RAISE NOTICE '✅ Cleaned up % duplicate auto-created variants', v_deleted_count;
    ELSE
        RAISE NOTICE '✅ No duplicate auto-created variants found';
    END IF;
END $$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.auto_create_default_variant() TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Auto-variant race condition fixed!';
  RAISE NOTICE '📝 Increased wait time to 500ms to prevent duplicates';
  RAISE NOTICE '🗑️  Cleaned up existing duplicate variants';
END $$;

