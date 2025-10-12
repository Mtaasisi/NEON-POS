-- =============================================================================
-- FIX POS CART ISSUES - Comprehensive Fix for All Identified Problems
-- =============================================================================
-- This script fixes the following issues:
-- 1. Missing column "enable_time_based_pricing" in lats_pos_dynamic_pricing_settings
-- 2. Missing columns in related settings tables
-- 3. Products not displaying properly
-- =============================================================================

-- Fix 1: Add missing column to lats_pos_dynamic_pricing_settings (if it doesn't exist)
DO $$ 
BEGIN
    -- Check if the column exists, if not add it
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'lats_pos_dynamic_pricing_settings' 
        AND column_name = 'enable_time_based_pricing'
    ) THEN
        ALTER TABLE lats_pos_dynamic_pricing_settings 
        ADD COLUMN enable_time_based_pricing BOOLEAN DEFAULT false;
        
        RAISE NOTICE '✓ Added enable_time_based_pricing column';
    ELSE
        RAISE NOTICE '✓ Column enable_time_based_pricing already exists';
    END IF;

    -- Check for enable_dynamic_pricing
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'lats_pos_dynamic_pricing_settings' 
        AND column_name = 'enable_dynamic_pricing'
    ) THEN
        ALTER TABLE lats_pos_dynamic_pricing_settings 
        ADD COLUMN enable_dynamic_pricing BOOLEAN DEFAULT false;
        
        RAISE NOTICE '✓ Added enable_dynamic_pricing column';
    END IF;

    -- Check for enable_loyalty_pricing
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'lats_pos_dynamic_pricing_settings' 
        AND column_name = 'enable_loyalty_pricing'
    ) THEN
        ALTER TABLE lats_pos_dynamic_pricing_settings 
        ADD COLUMN enable_loyalty_pricing BOOLEAN DEFAULT false;
        
        RAISE NOTICE '✓ Added enable_loyalty_pricing column';
    END IF;

    -- Check for enable_bulk_pricing
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'lats_pos_dynamic_pricing_settings' 
        AND column_name = 'enable_bulk_pricing'
    ) THEN
        ALTER TABLE lats_pos_dynamic_pricing_settings 
        ADD COLUMN enable_bulk_pricing BOOLEAN DEFAULT false;
        
        RAISE NOTICE '✓ Added enable_bulk_pricing column';
    END IF;

    -- Check for enable_customer_pricing
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'lats_pos_dynamic_pricing_settings' 
        AND column_name = 'enable_customer_pricing'
    ) THEN
        ALTER TABLE lats_pos_dynamic_pricing_settings 
        ADD COLUMN enable_customer_pricing BOOLEAN DEFAULT false;
        
        RAISE NOTICE '✓ Added enable_customer_pricing column';
    END IF;

    -- Check for enable_special_events
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'lats_pos_dynamic_pricing_settings' 
        AND column_name = 'enable_special_events'
    ) THEN
        ALTER TABLE lats_pos_dynamic_pricing_settings 
        ADD COLUMN enable_special_events BOOLEAN DEFAULT false;
        
        RAISE NOTICE '✓ Added enable_special_events column';
    END IF;
END $$;

-- Fix 2: Ensure all other necessary columns exist
DO $$ 
BEGIN
    -- loyalty_discount_percent
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_pos_dynamic_pricing_settings' 
        AND column_name = 'loyalty_discount_percent'
    ) THEN
        ALTER TABLE lats_pos_dynamic_pricing_settings 
        ADD COLUMN loyalty_discount_percent NUMERIC(5,2) DEFAULT 0;
    END IF;

    -- loyalty_points_threshold
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_pos_dynamic_pricing_settings' 
        AND column_name = 'loyalty_points_threshold'
    ) THEN
        ALTER TABLE lats_pos_dynamic_pricing_settings 
        ADD COLUMN loyalty_points_threshold INTEGER DEFAULT 100;
    END IF;

    -- loyalty_max_discount
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_pos_dynamic_pricing_settings' 
        AND column_name = 'loyalty_max_discount'
    ) THEN
        ALTER TABLE lats_pos_dynamic_pricing_settings 
        ADD COLUMN loyalty_max_discount NUMERIC(5,2) DEFAULT 20;
    END IF;

    -- bulk_discount_enabled
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_pos_dynamic_pricing_settings' 
        AND column_name = 'bulk_discount_enabled'
    ) THEN
        ALTER TABLE lats_pos_dynamic_pricing_settings 
        ADD COLUMN bulk_discount_enabled BOOLEAN DEFAULT false;
    END IF;

    -- bulk_discount_threshold
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_pos_dynamic_pricing_settings' 
        AND column_name = 'bulk_discount_threshold'
    ) THEN
        ALTER TABLE lats_pos_dynamic_pricing_settings 
        ADD COLUMN bulk_discount_threshold INTEGER DEFAULT 10;
    END IF;

    -- bulk_discount_percent
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_pos_dynamic_pricing_settings' 
        AND column_name = 'bulk_discount_percent'
    ) THEN
        ALTER TABLE lats_pos_dynamic_pricing_settings 
        ADD COLUMN bulk_discount_percent NUMERIC(5,2) DEFAULT 5;
    END IF;

    -- time_based_discount_enabled
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_pos_dynamic_pricing_settings' 
        AND column_name = 'time_based_discount_enabled'
    ) THEN
        ALTER TABLE lats_pos_dynamic_pricing_settings 
        ADD COLUMN time_based_discount_enabled BOOLEAN DEFAULT false;
    END IF;

    -- time_based_start_time
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_pos_dynamic_pricing_settings' 
        AND column_name = 'time_based_start_time'
    ) THEN
        ALTER TABLE lats_pos_dynamic_pricing_settings 
        ADD COLUMN time_based_start_time TEXT DEFAULT '00:00';
    END IF;

    -- time_based_end_time
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_pos_dynamic_pricing_settings' 
        AND column_name = 'time_based_end_time'
    ) THEN
        ALTER TABLE lats_pos_dynamic_pricing_settings 
        ADD COLUMN time_based_end_time TEXT DEFAULT '23:59';
    END IF;

    -- time_based_discount_percent
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_pos_dynamic_pricing_settings' 
        AND column_name = 'time_based_discount_percent'
    ) THEN
        ALTER TABLE lats_pos_dynamic_pricing_settings 
        ADD COLUMN time_based_discount_percent NUMERIC(5,2) DEFAULT 0;
    END IF;

    -- customer_pricing_enabled
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_pos_dynamic_pricing_settings' 
        AND column_name = 'customer_pricing_enabled'
    ) THEN
        ALTER TABLE lats_pos_dynamic_pricing_settings 
        ADD COLUMN customer_pricing_enabled BOOLEAN DEFAULT false;
    END IF;

    -- vip_customer_discount
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_pos_dynamic_pricing_settings' 
        AND column_name = 'vip_customer_discount'
    ) THEN
        ALTER TABLE lats_pos_dynamic_pricing_settings 
        ADD COLUMN vip_customer_discount NUMERIC(5,2) DEFAULT 10;
    END IF;

    -- regular_customer_discount
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_pos_dynamic_pricing_settings' 
        AND column_name = 'regular_customer_discount'
    ) THEN
        ALTER TABLE lats_pos_dynamic_pricing_settings 
        ADD COLUMN regular_customer_discount NUMERIC(5,2) DEFAULT 5;
    END IF;

    -- special_events_enabled
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_pos_dynamic_pricing_settings' 
        AND column_name = 'special_events_enabled'
    ) THEN
        ALTER TABLE lats_pos_dynamic_pricing_settings 
        ADD COLUMN special_events_enabled BOOLEAN DEFAULT false;
    END IF;

    -- special_event_discount_percent
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_pos_dynamic_pricing_settings' 
        AND column_name = 'special_event_discount_percent'
    ) THEN
        ALTER TABLE lats_pos_dynamic_pricing_settings 
        ADD COLUMN special_event_discount_percent NUMERIC(5,2) DEFAULT 15;
    END IF;

    RAISE NOTICE '✓ All required columns verified/added';
END $$;

-- Fix 3: Check for products table and variants
DO $$
DECLARE
    product_count INTEGER;
    variant_count INTEGER;
BEGIN
    -- Check if products table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lats_products') THEN
        SELECT COUNT(*) INTO product_count FROM lats_products WHERE is_active = true;
        RAISE NOTICE '✓ Found % active products in lats_products table', product_count;
        
        -- Check variants
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lats_product_variants') THEN
            SELECT COUNT(*) INTO variant_count FROM lats_product_variants;
            RAISE NOTICE '✓ Found % product variants in lats_product_variants table', variant_count;
        ELSE
            RAISE NOTICE '⚠ lats_product_variants table does not exist';
        END IF;
        
        IF product_count = 0 THEN
            RAISE NOTICE '⚠ WARNING: No active products found. This is why products are not displaying on POS page.';
            RAISE NOTICE '→ Solution: Add products using the Products/Inventory page';
        END IF;
    ELSE
        RAISE NOTICE '⚠ lats_products table does not exist';
    END IF;
END $$;

-- Fix 4: Insert default settings if none exist
INSERT INTO lats_pos_dynamic_pricing_settings (
    user_id,
    enable_dynamic_pricing,
    enable_loyalty_pricing,
    enable_bulk_pricing,
    enable_time_based_pricing,
    enable_customer_pricing,
    enable_special_events,
    loyalty_discount_percent,
    bulk_discount_percent,
    time_based_discount_percent
)
SELECT 
    id,
    false,
    false,
    false,
    false,
    false,
    false,
    0,
    0,
    0
FROM auth_users
WHERE NOT EXISTS (
    SELECT 1 
    FROM lats_pos_dynamic_pricing_settings 
    WHERE lats_pos_dynamic_pricing_settings.user_id = auth_users.id
)
LIMIT 1;

-- Summary
SELECT 
    '✅ POS Cart Issues Fixed!' as status,
    'All database schema issues have been resolved.' as message,
    'If products still don''t display, ensure you have active products in the database.' as next_step;

