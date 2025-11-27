-- =====================================================
-- COMPLETE BRANCH ISOLATION SCHEMA
-- =====================================================
-- This migration ensures all branch isolation features
-- are included in the schema, so they work when only
-- the schema is exported/imported.
-- =====================================================

-- Ensure store_locations table has all isolation columns
DO $$
BEGIN
    -- Add data_isolation_mode if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'store_locations' 
        AND column_name = 'data_isolation_mode'
    ) THEN
        ALTER TABLE store_locations 
        ADD COLUMN data_isolation_mode text DEFAULT 'shared';
        
        -- Add check constraint
        ALTER TABLE store_locations 
        ADD CONSTRAINT store_locations_data_isolation_mode_check 
        CHECK (data_isolation_mode = ANY (ARRAY['shared'::text, 'isolated'::text, 'hybrid'::text]));
        
        RAISE NOTICE '✅ Added data_isolation_mode column';
    END IF;

    -- Add share_products if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'store_locations' 
        AND column_name = 'share_products'
    ) THEN
        ALTER TABLE store_locations 
        ADD COLUMN share_products boolean DEFAULT true;
        RAISE NOTICE '✅ Added share_products column';
    END IF;

    -- Add share_inventory if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'store_locations' 
        AND column_name = 'share_inventory'
    ) THEN
        ALTER TABLE store_locations 
        ADD COLUMN share_inventory boolean DEFAULT false;
        RAISE NOTICE '✅ Added share_inventory column';
    END IF;

    -- Add share_customers if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'store_locations' 
        AND column_name = 'share_customers'
    ) THEN
        ALTER TABLE store_locations 
        ADD COLUMN share_customers boolean DEFAULT true;
        RAISE NOTICE '✅ Added share_customers column';
    END IF;

    -- Add share_suppliers if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'store_locations' 
        AND column_name = 'share_suppliers'
    ) THEN
        ALTER TABLE store_locations 
        ADD COLUMN share_suppliers boolean DEFAULT true;
        RAISE NOTICE '✅ Added share_suppliers column';
    END IF;

    -- Add share_accounts if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'store_locations' 
        AND column_name = 'share_accounts'
    ) THEN
        ALTER TABLE store_locations 
        ADD COLUMN share_accounts boolean DEFAULT true;
        RAISE NOTICE '✅ Added share_accounts column';
    END IF;

    -- Add share_categories if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'store_locations' 
        AND column_name = 'share_categories'
    ) THEN
        ALTER TABLE store_locations 
        ADD COLUMN share_categories boolean DEFAULT true;
        RAISE NOTICE '✅ Added share_categories column';
    END IF;

    -- Add share_employees if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'store_locations' 
        AND column_name = 'share_employees'
    ) THEN
        ALTER TABLE store_locations 
        ADD COLUMN share_employees boolean DEFAULT false;
        RAISE NOTICE '✅ Added share_employees column';
    END IF;

    -- Add share_payments if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'store_locations' 
        AND column_name = 'share_payments'
    ) THEN
        ALTER TABLE store_locations 
        ADD COLUMN share_payments boolean DEFAULT false;
        RAISE NOTICE '✅ Added share_payments column';
    END IF;

    -- Add share_gift_cards if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'store_locations' 
        AND column_name = 'share_gift_cards'
    ) THEN
        ALTER TABLE store_locations 
        ADD COLUMN share_gift_cards boolean DEFAULT true;
        RAISE NOTICE '✅ Added share_gift_cards column';
    END IF;

    -- Add share_quality_checks if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'store_locations' 
        AND column_name = 'share_quality_checks'
    ) THEN
        ALTER TABLE store_locations 
        ADD COLUMN share_quality_checks boolean DEFAULT false;
        RAISE NOTICE '✅ Added share_quality_checks column';
    END IF;

    -- Add share_recurring_expenses if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'store_locations' 
        AND column_name = 'share_recurring_expenses'
    ) THEN
        ALTER TABLE store_locations 
        ADD COLUMN share_recurring_expenses boolean DEFAULT false;
        RAISE NOTICE '✅ Added share_recurring_expenses column';
    END IF;

    -- Add share_communications if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'store_locations' 
        AND column_name = 'share_communications'
    ) THEN
        ALTER TABLE store_locations 
        ADD COLUMN share_communications boolean DEFAULT false;
        RAISE NOTICE '✅ Added share_communications column';
    END IF;

    -- Add share_reports if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'store_locations' 
        AND column_name = 'share_reports'
    ) THEN
        ALTER TABLE store_locations 
        ADD COLUMN share_reports boolean DEFAULT false;
        RAISE NOTICE '✅ Added share_reports column';
    END IF;

    -- Add share_finance_transfers if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'store_locations' 
        AND column_name = 'share_finance_transfers'
    ) THEN
        ALTER TABLE store_locations 
        ADD COLUMN share_finance_transfers boolean DEFAULT false;
        RAISE NOTICE '✅ Added share_finance_transfers column';
    END IF;

    -- Add share_sales if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'store_locations' 
        AND column_name = 'share_sales'
    ) THEN
        ALTER TABLE store_locations 
        ADD COLUMN share_sales boolean DEFAULT false;
        RAISE NOTICE '✅ Added share_sales column';
    END IF;

    -- Add share_purchase_orders if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'store_locations' 
        AND column_name = 'share_purchase_orders'
    ) THEN
        ALTER TABLE store_locations 
        ADD COLUMN share_purchase_orders boolean DEFAULT false;
        RAISE NOTICE '✅ Added share_purchase_orders column';
    END IF;

    -- Add share_devices if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'store_locations' 
        AND column_name = 'share_devices'
    ) THEN
        ALTER TABLE store_locations 
        ADD COLUMN share_devices boolean DEFAULT false;
        RAISE NOTICE '✅ Added share_devices column';
    END IF;

    -- Add share_appointments if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'store_locations' 
        AND column_name = 'share_appointments'
    ) THEN
        ALTER TABLE store_locations 
        ADD COLUMN share_appointments boolean DEFAULT false;
        RAISE NOTICE '✅ Added share_appointments column';
    END IF;

    -- Add share_reminders if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'store_locations' 
        AND column_name = 'share_reminders'
    ) THEN
        ALTER TABLE store_locations 
        ADD COLUMN share_reminders boolean DEFAULT false;
        RAISE NOTICE '✅ Added share_reminders column';
    END IF;

    -- Add share_expenses if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'store_locations' 
        AND column_name = 'share_expenses'
    ) THEN
        ALTER TABLE store_locations 
        ADD COLUMN share_expenses boolean DEFAULT false;
        RAISE NOTICE '✅ Added share_expenses column';
    END IF;

    -- Add share_trade_ins if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'store_locations' 
        AND column_name = 'share_trade_ins'
    ) THEN
        ALTER TABLE store_locations 
        ADD COLUMN share_trade_ins boolean DEFAULT false;
        RAISE NOTICE '✅ Added share_trade_ins column';
    END IF;

    -- Add share_special_orders if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'store_locations' 
        AND column_name = 'share_special_orders'
    ) THEN
        ALTER TABLE store_locations 
        ADD COLUMN share_special_orders boolean DEFAULT false;
        RAISE NOTICE '✅ Added share_special_orders column';
    END IF;

    -- Add share_attendance if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'store_locations' 
        AND column_name = 'share_attendance'
    ) THEN
        ALTER TABLE store_locations 
        ADD COLUMN share_attendance boolean DEFAULT false;
        RAISE NOTICE '✅ Added share_attendance column';
    END IF;

    -- Add share_loyalty_points if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'store_locations' 
        AND column_name = 'share_loyalty_points'
    ) THEN
        ALTER TABLE store_locations 
        ADD COLUMN share_loyalty_points boolean DEFAULT false;
        RAISE NOTICE '✅ Added share_loyalty_points column';
    END IF;

    -- Create indexes for faster lookups
    CREATE INDEX IF NOT EXISTS idx_store_locations_isolation_mode 
    ON store_locations(data_isolation_mode);
    
    CREATE INDEX IF NOT EXISTS idx_store_locations_share_inventory 
    ON store_locations(share_inventory);
    
    CREATE INDEX IF NOT EXISTS idx_store_locations_share_accounts 
    ON store_locations(share_accounts);
    
    CREATE INDEX IF NOT EXISTS idx_store_locations_share_products 
    ON store_locations(share_products);

    RAISE NOTICE '';
    RAISE NOTICE '✅ =====================================================';
    RAISE NOTICE '✅ Branch Isolation Schema Complete!';
    RAISE NOTICE '✅ =====================================================';
    RAISE NOTICE '';
    RAISE NOTICE '📋 All isolation columns are now in the schema:';
    RAISE NOTICE '  ✅ data_isolation_mode (shared/isolated/hybrid)';
    RAISE NOTICE '  ✅ share_products';
    RAISE NOTICE '  ✅ share_inventory';
    RAISE NOTICE '  ✅ share_customers';
    RAISE NOTICE '  ✅ share_suppliers';
    RAISE NOTICE '  ✅ share_accounts';
    RAISE NOTICE '  ✅ share_categories';
    RAISE NOTICE '  ✅ share_employees';
    RAISE NOTICE '  ✅ share_payments';
    RAISE NOTICE '  ✅ share_gift_cards';
    RAISE NOTICE '  ✅ share_quality_checks';
    RAISE NOTICE '  ✅ share_recurring_expenses';
    RAISE NOTICE '  ✅ share_communications';
    RAISE NOTICE '  ✅ share_reports';
    RAISE NOTICE '  ✅ share_finance_transfers';
    RAISE NOTICE '  ✅ share_sales';
    RAISE NOTICE '  ✅ share_purchase_orders';
    RAISE NOTICE '  ✅ share_devices';
    RAISE NOTICE '  ✅ share_appointments';
    RAISE NOTICE '  ✅ share_reminders';
    RAISE NOTICE '  ✅ share_expenses';
    RAISE NOTICE '  ✅ share_trade_ins';
    RAISE NOTICE '  ✅ share_special_orders';
    RAISE NOTICE '  ✅ share_attendance';
    RAISE NOTICE '  ✅ share_loyalty_points';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 These columns are now part of the schema and will';
    RAISE NOTICE '   be included when exporting/importing the schema.';
    RAISE NOTICE '';
END $$;

-- Add comments to document the columns
COMMENT ON COLUMN store_locations.data_isolation_mode IS 
'Isolation mode: shared (all data shared), isolated (all data isolated), hybrid (per-entity configuration)';

COMMENT ON COLUMN store_locations.share_products IS 
'If true in hybrid mode, products are shared across branches. If false, products are isolated per branch.';

COMMENT ON COLUMN store_locations.share_inventory IS 
'If true in hybrid mode, inventory/variants are shared across branches. If false, inventory is isolated per branch.';

COMMENT ON COLUMN store_locations.share_customers IS 
'If true in hybrid mode, customers are shared across branches. If false, customers are isolated per branch.';

COMMENT ON COLUMN store_locations.share_suppliers IS 
'If true in hybrid mode, suppliers are shared across branches. If false, suppliers are isolated per branch.';

COMMENT ON COLUMN store_locations.share_accounts IS 
'If true in hybrid mode, payment accounts are shared across branches. If false, accounts are isolated per branch.';

