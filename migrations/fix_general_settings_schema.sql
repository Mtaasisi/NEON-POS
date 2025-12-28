-- ================================================
-- FIX GENERAL SETTINGS TABLE SCHEMA
-- ================================================
-- Add missing user_id and business_id columns to lats_pos_general_settings
-- to match the API expectations and other settings tables
-- ================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔧 ================================================';
    RAISE NOTICE '🔧 Fixing General Settings Table Schema';
    RAISE NOTICE '🔧 ================================================';
    RAISE NOTICE '';
END $$;

-- Add user_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lats_pos_general_settings'
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE lats_pos_general_settings
        ADD COLUMN user_id UUID;

        -- Add foreign key constraint
        ALTER TABLE lats_pos_general_settings
        ADD CONSTRAINT fk_general_settings_user_id
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

        -- Create index
        CREATE INDEX IF NOT EXISTS idx_general_settings_user_id
        ON lats_pos_general_settings(user_id);

        RAISE NOTICE '✅ Added user_id column to lats_pos_general_settings';
    ELSE
        RAISE NOTICE 'ℹ️  user_id column already exists in lats_pos_general_settings';
    END IF;
END $$;

-- Add business_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lats_pos_general_settings'
        AND column_name = 'business_id'
    ) THEN
        ALTER TABLE lats_pos_general_settings
        ADD COLUMN business_id UUID;

        -- Create index
        CREATE INDEX IF NOT EXISTS idx_general_settings_business_id
        ON lats_pos_general_settings(business_id);

        RAISE NOTICE '✅ Added business_id column to lats_pos_general_settings';
    ELSE
        RAISE NOTICE 'ℹ️  business_id column already exists in lats_pos_general_settings';
    END IF;
END $$;

-- Add missing general settings columns that the API expects
DO $$
BEGIN
    -- Add theme column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lats_pos_general_settings'
        AND column_name = 'theme'
    ) THEN
        ALTER TABLE lats_pos_general_settings
        ADD COLUMN theme TEXT DEFAULT 'light';
        RAISE NOTICE '✅ Added theme column';
    END IF;

    -- Add language column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lats_pos_general_settings'
        AND column_name = 'language'
    ) THEN
        ALTER TABLE lats_pos_general_settings
        ADD COLUMN language TEXT DEFAULT 'en';
        RAISE NOTICE '✅ Added language column';
    END IF;

    -- Add currency column (if not exists)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lats_pos_general_settings'
        AND column_name = 'currency'
    ) THEN
        ALTER TABLE lats_pos_general_settings
        ADD COLUMN currency TEXT DEFAULT 'TZS';
        RAISE NOTICE '✅ Added currency column';
    END IF;

    -- Add timezone column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lats_pos_general_settings'
        AND column_name = 'timezone'
    ) THEN
        ALTER TABLE lats_pos_general_settings
        ADD COLUMN timezone TEXT DEFAULT 'Africa/Dar_es_Salaam';
        RAISE NOTICE '✅ Added timezone column';
    END IF;

    -- Add date_format column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lats_pos_general_settings'
        AND column_name = 'date_format'
    ) THEN
        ALTER TABLE lats_pos_general_settings
        ADD COLUMN date_format TEXT DEFAULT 'DD/MM/YYYY';
        RAISE NOTICE '✅ Added date_format column';
    END IF;

    -- Add time_format column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lats_pos_general_settings'
        AND column_name = 'time_format'
    ) THEN
        ALTER TABLE lats_pos_general_settings
        ADD COLUMN time_format TEXT DEFAULT '24';
        RAISE NOTICE '✅ Added time_format column';
    END IF;

    -- Add font_size column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lats_pos_general_settings'
        AND column_name = 'font_size'
    ) THEN
        ALTER TABLE lats_pos_general_settings
        ADD COLUMN font_size TEXT DEFAULT 'medium';
        RAISE NOTICE '✅ Added font_size column';
    END IF;

    -- Add display settings columns
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lats_pos_general_settings'
        AND column_name = 'show_product_images'
    ) THEN
        ALTER TABLE lats_pos_general_settings
        ADD COLUMN show_product_images BOOLEAN DEFAULT true;
        RAISE NOTICE '✅ Added show_product_images column';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lats_pos_general_settings'
        AND column_name = 'show_stock_levels'
    ) THEN
        ALTER TABLE lats_pos_general_settings
        ADD COLUMN show_stock_levels BOOLEAN DEFAULT true;
        RAISE NOTICE '✅ Added show_stock_levels column';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lats_pos_general_settings'
        AND column_name = 'show_prices'
    ) THEN
        ALTER TABLE lats_pos_general_settings
        ADD COLUMN show_prices BOOLEAN DEFAULT true;
        RAISE NOTICE '✅ Added show_prices column';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lats_pos_general_settings'
        AND column_name = 'show_barcodes'
    ) THEN
        ALTER TABLE lats_pos_general_settings
        ADD COLUMN show_barcodes BOOLEAN DEFAULT true;
        RAISE NOTICE '✅ Added show_barcodes column';
    END IF;

    -- Add product grid settings
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lats_pos_general_settings'
        AND column_name = 'products_per_page'
    ) THEN
        ALTER TABLE lats_pos_general_settings
        ADD COLUMN products_per_page INTEGER DEFAULT 20;
        RAISE NOTICE '✅ Added products_per_page column';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lats_pos_general_settings'
        AND column_name = 'products_per_row'
    ) THEN
        ALTER TABLE lats_pos_general_settings
        ADD COLUMN products_per_row INTEGER DEFAULT 4;
        RAISE NOTICE '✅ Added products_per_row column';
    END IF;

    -- Add behavior settings
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lats_pos_general_settings'
        AND column_name = 'auto_complete_search'
    ) THEN
        ALTER TABLE lats_pos_general_settings
        ADD COLUMN auto_complete_search BOOLEAN DEFAULT true;
        RAISE NOTICE '✅ Added auto_complete_search column';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lats_pos_general_settings'
        AND column_name = 'confirm_delete'
    ) THEN
        ALTER TABLE lats_pos_general_settings
        ADD COLUMN confirm_delete BOOLEAN DEFAULT true;
        RAISE NOTICE '✅ Added confirm_delete column';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lats_pos_general_settings'
        AND column_name = 'show_confirmations'
    ) THEN
        ALTER TABLE lats_pos_general_settings
        ADD COLUMN show_confirmations BOOLEAN DEFAULT true;
        RAISE NOTICE '✅ Added show_confirmations column';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lats_pos_general_settings'
        AND column_name = 'enable_sound_effects'
    ) THEN
        ALTER TABLE lats_pos_general_settings
        ADD COLUMN enable_sound_effects BOOLEAN DEFAULT true;
        RAISE NOTICE '✅ Added enable_sound_effects column';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lats_pos_general_settings'
        AND column_name = 'enable_animations'
    ) THEN
        ALTER TABLE lats_pos_general_settings
        ADD COLUMN enable_animations BOOLEAN DEFAULT true;
        RAISE NOTICE '✅ Added enable_animations column';
    END IF;

    -- Add performance settings
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lats_pos_general_settings'
        AND column_name = 'enable_caching'
    ) THEN
        ALTER TABLE lats_pos_general_settings
        ADD COLUMN enable_caching BOOLEAN DEFAULT true;
        RAISE NOTICE '✅ Added enable_caching column';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lats_pos_general_settings'
        AND column_name = 'cache_duration'
    ) THEN
        ALTER TABLE lats_pos_general_settings
        ADD COLUMN cache_duration INTEGER DEFAULT 300;
        RAISE NOTICE '✅ Added cache_duration column';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lats_pos_general_settings'
        AND column_name = 'enable_lazy_loading'
    ) THEN
        ALTER TABLE lats_pos_general_settings
        ADD COLUMN enable_lazy_loading BOOLEAN DEFAULT true;
        RAISE NOTICE '✅ Added enable_lazy_loading column';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lats_pos_general_settings'
        AND column_name = 'max_search_results'
    ) THEN
        ALTER TABLE lats_pos_general_settings
        ADD COLUMN max_search_results INTEGER DEFAULT 50;
        RAISE NOTICE '✅ Added max_search_results column';
    END IF;

    -- Add tax settings
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lats_pos_general_settings'
        AND column_name = 'enable_tax'
    ) THEN
        ALTER TABLE lats_pos_general_settings
        ADD COLUMN enable_tax BOOLEAN DEFAULT false;
        RAISE NOTICE '✅ Added enable_tax column';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lats_pos_general_settings'
        AND column_name = 'tax_rate'
    ) THEN
        ALTER TABLE lats_pos_general_settings
        ADD COLUMN tax_rate NUMERIC DEFAULT 16;
        RAISE NOTICE '✅ Added tax_rate column';
    END IF;

    -- Add security settings
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lats_pos_general_settings'
        AND column_name = 'day_closing_passcode'
    ) THEN
        ALTER TABLE lats_pos_general_settings
        ADD COLUMN day_closing_passcode TEXT DEFAULT '1234';
        RAISE NOTICE '✅ Added day_closing_passcode column';
    END IF;

    -- Add sound settings
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lats_pos_general_settings'
        AND column_name = 'sound_volume'
    ) THEN
        ALTER TABLE lats_pos_general_settings
        ADD COLUMN sound_volume NUMERIC DEFAULT 0.5;
        RAISE NOTICE '✅ Added sound_volume column';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lats_pos_general_settings'
        AND column_name = 'enable_click_sounds'
    ) THEN
        ALTER TABLE lats_pos_general_settings
        ADD COLUMN enable_click_sounds BOOLEAN DEFAULT true;
        RAISE NOTICE '✅ Added enable_click_sounds column';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lats_pos_general_settings'
        AND column_name = 'enable_cart_sounds'
    ) THEN
        ALTER TABLE lats_pos_general_settings
        ADD COLUMN enable_cart_sounds BOOLEAN DEFAULT true;
        RAISE NOTICE '✅ Added enable_cart_sounds column';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lats_pos_general_settings'
        AND column_name = 'enable_payment_sounds'
    ) THEN
        ALTER TABLE lats_pos_general_settings
        ADD COLUMN enable_payment_sounds BOOLEAN DEFAULT true;
        RAISE NOTICE '✅ Added enable_payment_sounds column';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lats_pos_general_settings'
        AND column_name = 'enable_delete_sounds'
    ) THEN
        ALTER TABLE lats_pos_general_settings
        ADD COLUMN enable_delete_sounds BOOLEAN DEFAULT true;
        RAISE NOTICE '✅ Added enable_delete_sounds column';
    END IF;

END $$;

-- Update the comment on the table
COMMENT ON TABLE lats_pos_general_settings IS 'POS general settings with user and business isolation';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ ================================================';
    RAISE NOTICE '✅ General Settings Table Schema Fixed!';
    RAISE NOTICE '✅ ================================================';
    RAISE NOTICE '';
    RAISE NOTICE '📋 What was added:';
    RAISE NOTICE '  ✅ user_id column with foreign key to users table';
    RAISE NOTICE '  ✅ business_id column for business isolation';
    RAISE NOTICE '  ✅ All missing general settings columns';
    RAISE NOTICE '  ✅ Proper indexes for performance';
    RAISE NOTICE '';
    RAISE NOTICE '🔄 The API should now work correctly!';
    RAISE NOTICE '';
END $$;