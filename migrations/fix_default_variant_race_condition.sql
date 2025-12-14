-- =====================================================
-- Fix Default Variant Race Condition
-- =====================================================
-- Problem: When creating products with custom variants, the auto_create_default_variant
-- trigger was creating a "Default" variant even though custom variants were being added.
-- This resulted in 3 variants (Default + 2 custom) instead of just 2 custom variants.
--
-- Solution: TWO-PRONGED APPROACH
-- 1. METADATA FLAG: Frontend sets metadata->>'skip_default_variant' = true when providing custom variants
--    This immediately tells the trigger to skip auto-creation (no waiting needed)
-- 2. FALLBACK DELAY: Keep 3-second delay as fallback for older code or edge cases
--
-- Tested: Delay-based approach alone was unreliable (variants can take 4+ seconds to insert)
-- The metadata flag approach is instant and reliable.
-- =====================================================

-- Drop existing trigger (if exists)
DROP TRIGGER IF EXISTS trigger_auto_create_default_variant ON lats_products;

-- Update the auto_create_default_variant function with metadata flag support
CREATE OR REPLACE FUNCTION public.auto_create_default_variant() 
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    variant_count INTEGER;
    v_new_variant_id UUID;
    skip_default BOOLEAN;
BEGIN
    -- ✅ SOLUTION 1: Check metadata flag (instant, no waiting)
    -- Frontend sets this flag when providing custom variants
    skip_default := COALESCE((NEW.metadata->>'skip_default_variant')::boolean, false);
    
    IF skip_default THEN
        RAISE NOTICE '⏭️ Skipping default variant creation for product "%" - skip flag set', NEW.name;
        RETURN NEW;
    END IF;
    
    -- ✅ SOLUTION 2: Wait 3 seconds as fallback (for older code)
    -- Increased from 1 second to handle slower network conditions
    PERFORM pg_sleep(3.0);
    
    -- Check if this product has any variants
    SELECT COUNT(*) INTO variant_count
    FROM lats_product_variants
    WHERE product_id = NEW.id
    AND parent_variant_id IS NULL; -- Only count parent variants, not IMEI children
    
    -- If no variants exist, create a default one
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
            branch_id,
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
            COALESCE(NEW.min_stock_level, 0),
            jsonb_build_object(
                'auto_created', true,
                'created_at', NOW(),
                'created_from', 'product_insert_trigger'
            ),
            COALESCE(NEW.attributes, '{}'::jsonb),
            NEW.branch_id,
            true,
            NOW(),
            NOW()
        )
        RETURNING id INTO v_new_variant_id;
        
        RAISE NOTICE '✨ Auto-created default variant (ID: %) for product: "%" (ID: %)', 
            v_new_variant_id, NEW.name, NEW.id;
    ELSE
        RAISE NOTICE '✅ Product "%" already has % variant(s), skipping default variant', 
            NEW.name, variant_count;
    END IF;
    
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.auto_create_default_variant() IS 
'Automatically creates a default variant for products that have no variants.
Checks metadata->skip_default_variant flag first (instant).
Falls back to 3-second wait for older code compatibility.';

-- Recreate the trigger
CREATE TRIGGER trigger_auto_create_default_variant
    AFTER INSERT ON lats_products
    FOR EACH ROW
    EXECUTE FUNCTION auto_create_default_variant();

COMMENT ON TRIGGER trigger_auto_create_default_variant ON lats_products IS
'Automatically creates a default variant if no custom variants are provided.
Uses metadata flag for instant skip, with 3-second fallback delay.';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Default variant race condition fixed - metadata flag + 3-second fallback';
END $$;

