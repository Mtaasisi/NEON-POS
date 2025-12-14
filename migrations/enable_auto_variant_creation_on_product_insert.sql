-- =====================================================
-- ENABLE AUTO-VARIANT CREATION ON PRODUCT INSERT
-- =====================================================
-- This migration creates a trigger that automatically creates
-- a "Default" variant for any product that has no variants.
-- The trigger fires AFTER INSERT on lats_products table.

-- First, ensure the function exists and is up to date
CREATE OR REPLACE FUNCTION public.auto_create_default_variant() 
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    variant_count INTEGER;
    v_new_variant_id UUID;
BEGIN
    -- Wait a moment to allow batch variant insertions
    PERFORM pg_sleep(0.1);
    
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

-- Add comment to the function
COMMENT ON FUNCTION public.auto_create_default_variant() IS 
'Automatically creates a default variant for products that have no variants. Triggered after product insertion.';

-- Drop the trigger if it exists (to avoid conflicts)
DROP TRIGGER IF EXISTS trigger_auto_create_default_variant ON lats_products;

-- Create the trigger
CREATE TRIGGER trigger_auto_create_default_variant
    AFTER INSERT ON lats_products
    FOR EACH ROW
    EXECUTE FUNCTION auto_create_default_variant();

-- Add comment to the trigger
COMMENT ON TRIGGER trigger_auto_create_default_variant ON lats_products IS 
'Automatically creates a "Default" variant for newly inserted products that have no variants';

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.auto_create_default_variant() TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Auto-variant creation trigger enabled!';
  RAISE NOTICE '📝 Products will now automatically get a "Default" variant when created';
  RAISE NOTICE '🎯 Trigger: trigger_auto_create_default_variant on lats_products';
END $$;

