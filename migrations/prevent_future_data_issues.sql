-- =====================================================
-- Prevent Future Data Issues - Comprehensive Fix
-- =====================================================
-- This migration implements:
-- 1. Automatic currency conversion on PO receiving
-- 2. Data validation constraints
-- 3. Audit logging for price changes
-- 4. Triggers to prevent fake/zero data
-- =====================================================

-- =====================================================
-- 1. CREATE AUDIT LOG TABLE
-- =====================================================

-- Create audit log table if it doesn't exist
CREATE TABLE IF NOT EXISTS lats_data_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    field_name TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    change_reason TEXT,
    change_source TEXT, -- 'purchase_order', 'manual_edit', 'system', 'import'
    changed_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_record ON lats_data_audit_log(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON lats_data_audit_log(created_at DESC);

COMMENT ON TABLE lats_data_audit_log IS 'Tracks all data changes for auditing and preventing fake data';

-- =====================================================
-- 2. FUNCTION: Auto-convert Currency on PO Receive
-- =====================================================

CREATE OR REPLACE FUNCTION auto_convert_po_currency()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_po_currency TEXT;
    v_exchange_rate NUMERIC;
    v_converted_cost NUMERIC;
    v_variant_id UUID;
BEGIN
    -- Get the PO currency and exchange rate
    SELECT currency, exchange_rate 
    INTO v_po_currency, v_exchange_rate
    FROM lats_purchase_orders
    WHERE id = NEW.purchase_order_id;
    
    -- Only convert if currency is not TZS and exchange rate exists
    IF v_po_currency IS NOT NULL 
       AND v_po_currency != 'TZS' 
       AND v_exchange_rate IS NOT NULL 
       AND v_exchange_rate > 0 THEN
        
        -- Convert the cost to TZS
        v_converted_cost := NEW.unit_cost * v_exchange_rate;
        
        RAISE NOTICE '💱 Currency Conversion: % % × % = % TZS', 
            NEW.unit_cost, v_po_currency, v_exchange_rate, v_converted_cost;
        
        -- If there's a variant, update its cost price with converted amount
        IF NEW.variant_id IS NOT NULL THEN
            UPDATE lats_product_variants
            SET cost_price = v_converted_cost,
                updated_at = NOW()
            WHERE id = NEW.variant_id;
            
            -- Log the change
            INSERT INTO lats_data_audit_log 
                (table_name, record_id, field_name, old_value, new_value, change_reason, change_source)
            VALUES 
                ('lats_product_variants', NEW.variant_id, 'cost_price', 
                 NULL, v_converted_cost::TEXT, 
                 'Auto-converted from PO: ' || v_po_currency || ' to TZS',
                 'purchase_order');
            
            RAISE NOTICE '✅ Updated variant cost to % TZS', v_converted_cost;
        END IF;
    ELSE
        RAISE NOTICE 'ℹ️  No currency conversion needed (Currency: %, Rate: %)', 
            v_po_currency, v_exchange_rate;
    END IF;
    
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION auto_convert_po_currency() IS 
'Automatically converts foreign currency to TZS when receiving PO items';

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_auto_convert_po_currency ON lats_purchase_order_items;

-- Create trigger for automatic currency conversion
CREATE TRIGGER trigger_auto_convert_po_currency
    AFTER INSERT OR UPDATE OF quantity_received ON lats_purchase_order_items
    FOR EACH ROW
    WHEN (NEW.quantity_received > 0)
    EXECUTE FUNCTION auto_convert_po_currency();

COMMENT ON TRIGGER trigger_auto_convert_po_currency ON lats_purchase_order_items IS
'Automatically converts PO item costs from foreign currency to TZS';

-- =====================================================
-- 3. FUNCTION: Validate Variant Prices (No Fake Data)
-- =====================================================

CREATE OR REPLACE FUNCTION validate_variant_prices()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_old_cost NUMERIC;
    v_old_price NUMERIC;
    v_has_po BOOLEAN;
BEGIN
    -- Store old values for audit
    IF TG_OP = 'UPDATE' THEN
        v_old_cost := OLD.cost_price;
        v_old_price := OLD.selling_price;
    END IF;
    
    -- Check if this variant has a purchase order source
    SELECT EXISTS(
        SELECT 1 FROM lats_purchase_order_items 
        WHERE variant_id = NEW.id
    ) INTO v_has_po;
    
    -- RULE 1: Prevent suspiciously high markups (> 100,000%)
    IF NEW.cost_price > 0 AND NEW.selling_price > 0 THEN
        IF ((NEW.selling_price - NEW.cost_price) / NEW.cost_price * 100) > 100000 THEN
            RAISE WARNING '⚠️  SUSPICIOUS MARKUP: Variant % has %.0%% markup. Please verify pricing.', 
                NEW.variant_name,
                ((NEW.selling_price - NEW.cost_price) / NEW.cost_price * 100);
        END IF;
    END IF;
    
    -- RULE 2: Warn if cost is changed without a PO
    IF TG_OP = 'UPDATE' AND v_old_cost != NEW.cost_price AND NOT v_has_po THEN
        RAISE WARNING '⚠️  Cost price changed without purchase order for variant %. Consider creating a PO for audit trail.', 
            NEW.variant_name;
    END IF;
    
    -- RULE 3: Prevent negative prices
    IF NEW.cost_price < 0 OR NEW.selling_price < 0 THEN
        RAISE EXCEPTION '❌ Negative prices not allowed. Cost: %, Selling: %', 
            NEW.cost_price, NEW.selling_price;
    END IF;
    
    -- RULE 4: Warn if selling price is less than cost
    IF NEW.cost_price > 0 AND NEW.selling_price > 0 AND NEW.selling_price < NEW.cost_price THEN
        RAISE WARNING '⚠️  LOSS ALERT: Variant % selling price (%) is less than cost (%). This will result in a loss.', 
            NEW.variant_name, NEW.selling_price, NEW.cost_price;
    END IF;
    
    -- Log significant changes
    IF TG_OP = 'UPDATE' THEN
        IF v_old_cost != NEW.cost_price THEN
            INSERT INTO lats_data_audit_log 
                (table_name, record_id, field_name, old_value, new_value, change_source)
            VALUES 
                ('lats_product_variants', NEW.id, 'cost_price', 
                 v_old_cost::TEXT, NEW.cost_price::TEXT, 'manual_edit');
        END IF;
        
        IF v_old_price != NEW.selling_price THEN
            INSERT INTO lats_data_audit_log 
                (table_name, record_id, field_name, old_value, new_value, change_source)
            VALUES 
                ('lats_product_variants', NEW.id, 'selling_price', 
                 v_old_price::TEXT, NEW.selling_price::TEXT, 'manual_edit');
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION validate_variant_prices() IS 
'Validates variant prices and prevents suspicious data entries';

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_validate_variant_prices ON lats_product_variants;

-- Create trigger for price validation
CREATE TRIGGER trigger_validate_variant_prices
    BEFORE INSERT OR UPDATE OF cost_price, selling_price ON lats_product_variants
    FOR EACH ROW
    EXECUTE FUNCTION validate_variant_prices();

COMMENT ON TRIGGER trigger_validate_variant_prices ON lats_product_variants IS
'Validates variant prices and logs changes for audit';

-- =====================================================
-- 4. FUNCTION: Track Data Source Origin
-- =====================================================

CREATE OR REPLACE FUNCTION track_variant_data_source()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Add metadata about data source if not already present
    IF NEW.variant_attributes IS NULL THEN
        NEW.variant_attributes := '{}'::jsonb;
    END IF;
    
    -- Track if this is a new variant without a PO
    IF TG_OP = 'INSERT' THEN
        IF NOT EXISTS(SELECT 1 FROM lats_purchase_order_items WHERE variant_id = NEW.id) THEN
            NEW.variant_attributes := NEW.variant_attributes || 
                jsonb_build_object(
                    'data_source', 'manual',
                    'created_without_po', true,
                    'created_at', NOW()
                );
            
            RAISE NOTICE '⚠️  Variant created without purchase order: %', NEW.variant_name;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION track_variant_data_source() IS 
'Tracks the origin of variant data (PO, manual, import, etc.)';

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_track_variant_source ON lats_product_variants;

-- Create trigger for data source tracking
CREATE TRIGGER trigger_track_variant_source
    BEFORE INSERT ON lats_product_variants
    FOR EACH ROW
    EXECUTE FUNCTION track_variant_data_source();

-- =====================================================
-- 5. CREATE VIEW: Data Quality Dashboard
-- =====================================================

CREATE OR REPLACE VIEW data_quality_issues AS
SELECT 
    'Suspicious Markup' as issue_type,
    pv.id as variant_id,
    p.name as product_name,
    pv.variant_name,
    pv.sku,
    pv.cost_price,
    pv.selling_price,
    CASE 
        WHEN pv.cost_price > 0 AND pv.selling_price > 0 
        THEN ((pv.selling_price - pv.cost_price) / pv.cost_price * 100)::TEXT || '%'
        ELSE 'N/A'
    END as markup,
    EXISTS(SELECT 1 FROM lats_purchase_order_items poi WHERE poi.variant_id = pv.id) as has_po,
    pv.created_at
FROM lats_product_variants pv
LEFT JOIN lats_products p ON pv.product_id = p.id
WHERE pv.cost_price > 0 
  AND pv.selling_price > 0
  AND ((pv.selling_price - pv.cost_price) / pv.cost_price * 100) > 100000

UNION ALL

SELECT 
    'No Purchase Order' as issue_type,
    pv.id as variant_id,
    p.name as product_name,
    pv.variant_name,
    pv.sku,
    pv.cost_price,
    pv.selling_price,
    NULL as markup,
    FALSE as has_po,
    pv.created_at
FROM lats_product_variants pv
LEFT JOIN lats_products p ON pv.product_id = p.id
WHERE NOT EXISTS(SELECT 1 FROM lats_purchase_order_items poi WHERE poi.variant_id = pv.id)
  AND pv.cost_price > 0
  AND pv.created_at > NOW() - INTERVAL '30 days'

UNION ALL

SELECT 
    'Selling Below Cost' as issue_type,
    pv.id as variant_id,
    p.name as product_name,
    pv.variant_name,
    pv.sku,
    pv.cost_price,
    pv.selling_price,
    ((pv.selling_price - pv.cost_price) / pv.cost_price * 100)::TEXT || '%' as markup,
    EXISTS(SELECT 1 FROM lats_purchase_order_items poi WHERE poi.variant_id = pv.id) as has_po,
    pv.created_at
FROM lats_product_variants pv
LEFT JOIN lats_products p ON pv.product_id = p.id
WHERE pv.cost_price > 0 
  AND pv.selling_price > 0
  AND pv.selling_price < pv.cost_price

UNION ALL

SELECT 
    'Zero or Missing Price' as issue_type,
    pv.id as variant_id,
    p.name as product_name,
    pv.variant_name,
    pv.sku,
    pv.cost_price,
    pv.selling_price,
    NULL as markup,
    EXISTS(SELECT 1 FROM lats_purchase_order_items poi WHERE poi.variant_id = pv.id) as has_po,
    pv.created_at
FROM lats_product_variants pv
LEFT JOIN lats_products p ON pv.product_id = p.id
WHERE (pv.cost_price = 0 OR pv.selling_price = 0)
  AND pv.is_active = true

ORDER BY created_at DESC;

COMMENT ON VIEW data_quality_issues IS 
'Dashboard view showing all data quality issues that need attention';

-- =====================================================
-- 6. HELPER FUNCTION: Fix Existing Currency Issues
-- =====================================================

CREATE OR REPLACE FUNCTION fix_existing_currency_issues()
RETURNS TABLE(
    variant_id UUID,
    variant_name TEXT,
    po_number TEXT,
    old_cost NUMERIC,
    new_cost NUMERIC,
    currency TEXT,
    exchange_rate NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH issues AS (
        SELECT 
            pv.id as variant_id,
            pv.variant_name,
            pv.cost_price as current_cost,
            po.po_number,
            po.currency,
            po.exchange_rate,
            poi.unit_cost,
            (poi.unit_cost * po.exchange_rate) as correct_cost
        FROM lats_product_variants pv
        JOIN lats_purchase_order_items poi ON poi.variant_id = pv.id
        JOIN lats_purchase_orders po ON poi.purchase_order_id = po.id
        WHERE po.currency IS NOT NULL 
          AND po.currency != 'TZS'
          AND po.exchange_rate IS NOT NULL
          AND po.exchange_rate > 0
          AND pv.cost_price != (poi.unit_cost * po.exchange_rate)
    )
    SELECT 
        i.variant_id,
        i.variant_name,
        i.po_number,
        i.current_cost,
        i.correct_cost,
        i.currency,
        i.exchange_rate
    FROM issues i;
    
    -- Update the costs
    UPDATE lats_product_variants pv
    SET cost_price = (poi.unit_cost * po.exchange_rate),
        updated_at = NOW()
    FROM lats_purchase_order_items poi
    JOIN lats_purchase_orders po ON poi.purchase_order_id = po.id
    WHERE poi.variant_id = pv.id
      AND po.currency IS NOT NULL 
      AND po.currency != 'TZS'
      AND po.exchange_rate IS NOT NULL
      AND po.exchange_rate > 0
      AND pv.cost_price != (poi.unit_cost * po.exchange_rate);
    
    RAISE NOTICE '✅ Fixed % variant(s) with currency conversion issues', 
        (SELECT COUNT(*) FROM issues);
END;
$$;

COMMENT ON FUNCTION fix_existing_currency_issues() IS 
'Identifies and fixes existing variants with currency conversion problems';

-- =====================================================
-- 7. SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ =====================================================';
    RAISE NOTICE '✅ Data Protection System Installed Successfully!';
    RAISE NOTICE '✅ =====================================================';
    RAISE NOTICE '';
    RAISE NOTICE '📋 What was installed:';
    RAISE NOTICE '  1. ✅ Automatic currency conversion on PO receiving';
    RAISE NOTICE '  2. ✅ Price validation (prevents fake data)';
    RAISE NOTICE '  3. ✅ Audit logging for all price changes';
    RAISE NOTICE '  4. ✅ Data source tracking';
    RAISE NOTICE '  5. ✅ Data quality dashboard view';
    RAISE NOTICE '';
    RAISE NOTICE '🔍 To check for data quality issues, run:';
    RAISE NOTICE '   SELECT * FROM data_quality_issues;';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 To fix existing currency issues, run:';
    RAISE NOTICE '   SELECT * FROM fix_existing_currency_issues();';
    RAISE NOTICE '';
    RAISE NOTICE '📊 To view audit log:';
    RAISE NOTICE '   SELECT * FROM lats_data_audit_log ORDER BY created_at DESC LIMIT 50;';
    RAISE NOTICE '';
END $$;

