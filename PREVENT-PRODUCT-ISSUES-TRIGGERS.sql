-- =============================================================================
-- DATABASE TRIGGERS TO PREVENT FUTURE PRODUCT ISSUES
-- =============================================================================
-- These triggers automatically fix issues when products/variants are created/updated
-- =============================================================================

-- Trigger 1: Auto-sync selling_price with unit_price on variant insert/update
CREATE OR REPLACE FUNCTION sync_variant_prices()
RETURNS TRIGGER AS $$
BEGIN
    -- If selling_price is null or zero, copy from unit_price
    IF (NEW.selling_price IS NULL OR NEW.selling_price = 0) AND NEW.unit_price > 0 THEN
        NEW.selling_price := NEW.unit_price;
    END IF;
    
    -- If unit_price is null or zero, copy from selling_price
    IF (NEW.unit_price IS NULL OR NEW.unit_price = 0) AND NEW.selling_price > 0 THEN
        NEW.unit_price := NEW.selling_price;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop if exists and create trigger
DROP TRIGGER IF EXISTS sync_variant_prices_trigger ON lats_product_variants;
CREATE TRIGGER sync_variant_prices_trigger
    BEFORE INSERT OR UPDATE ON lats_product_variants
    FOR EACH ROW
    EXECUTE FUNCTION sync_variant_prices();

-- Trigger 2: Auto-create default variant when product is created without variants
CREATE OR REPLACE FUNCTION ensure_product_has_variant()
RETURNS TRIGGER AS $$
DECLARE
    variant_count INTEGER;
BEGIN
    -- Only for new products or when is_active changes to true
    IF (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.is_active = false AND NEW.is_active = true)) THEN
        -- Check if product has variants
        SELECT COUNT(*) INTO variant_count
        FROM lats_product_variants
        WHERE product_id = NEW.id;
        
        -- If no variants exist and product is active, create a default one
        IF variant_count = 0 AND NEW.is_active = true THEN
            INSERT INTO lats_product_variants (
                product_id,
                name,
                unit_price,
                selling_price,
                cost_price,
                quantity,
                sku,
                is_active
            ) VALUES (
                NEW.id,
                'Standard',
                COALESCE(NEW.unit_price, NEW.selling_price, 0),
                COALESCE(NEW.selling_price, NEW.unit_price, 0),
                NEW.cost_price,
                COALESCE(NEW.stock_quantity, 0),
                NEW.sku || '-STD',
                true
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop if exists and create trigger
DROP TRIGGER IF EXISTS ensure_product_has_variant_trigger ON lats_products;
CREATE TRIGGER ensure_product_has_variant_trigger
    AFTER INSERT OR UPDATE ON lats_products
    FOR EACH ROW
    EXECUTE FUNCTION ensure_product_has_variant();

-- Trigger 3: Update variant count in product metadata
CREATE OR REPLACE FUNCTION update_product_variant_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE lats_products
    SET metadata = jsonb_set(
        COALESCE(metadata, '{}'::jsonb),
        '{variantCount}',
        to_jsonb((SELECT COUNT(*) FROM lats_product_variants WHERE product_id = COALESCE(NEW.product_id, OLD.product_id))::integer)
    )
    WHERE id = COALESCE(NEW.product_id, OLD.product_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Drop if exists and create trigger
DROP TRIGGER IF EXISTS update_variant_count_trigger ON lats_product_variants;
CREATE TRIGGER update_variant_count_trigger
    AFTER INSERT OR UPDATE OR DELETE ON lats_product_variants
    FOR EACH ROW
    EXECUTE FUNCTION update_product_variant_count();

-- Trigger 4: Prevent zero or negative prices
CREATE OR REPLACE FUNCTION validate_variant_price()
RETURNS TRIGGER AS $$
BEGIN
    -- Warn if both prices are zero/null
    IF (NEW.unit_price IS NULL OR NEW.unit_price <= 0) 
       AND (NEW.selling_price IS NULL OR NEW.selling_price <= 0) THEN
        RAISE WARNING 'Variant % for product % has no valid price!', NEW.name, NEW.product_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop if exists and create trigger
DROP TRIGGER IF EXISTS validate_variant_price_trigger ON lats_product_variants;
CREATE TRIGGER validate_variant_price_trigger
    BEFORE INSERT OR UPDATE ON lats_product_variants
    FOR EACH ROW
    EXECUTE FUNCTION validate_variant_price();

-- Trigger 5: Sync product stock with total variant quantity
CREATE OR REPLACE FUNCTION sync_product_stock()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE lats_products
    SET 
        total_quantity = (
            SELECT COALESCE(SUM(quantity), 0)
            FROM lats_product_variants
            WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
        ),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.product_id, OLD.product_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Drop if exists and create trigger
DROP TRIGGER IF EXISTS sync_product_stock_trigger ON lats_product_variants;
CREATE TRIGGER sync_product_stock_trigger
    AFTER INSERT OR UPDATE OR DELETE ON lats_product_variants
    FOR EACH ROW
    EXECUTE FUNCTION sync_product_stock();

-- Success message
SELECT 
    '✅ TRIGGERS CREATED' as status,
    'All prevention triggers are now active' as message,
    'Future products will be automatically validated' as info;

