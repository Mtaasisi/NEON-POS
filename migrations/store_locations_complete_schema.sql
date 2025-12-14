-- =====================================================
-- COMPLETE store_locations TABLE SCHEMA
-- =====================================================
-- This file contains the complete CREATE TABLE statement
-- for store_locations with ALL isolation features included.
-- Use this when exporting/importing only the schema.
-- =====================================================

-- Drop table if exists (for clean schema export)
-- DROP TABLE IF EXISTS store_locations CASCADE;

-- Create store_locations table with complete isolation schema
CREATE TABLE IF NOT EXISTS store_locations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    address text NOT NULL,
    city text NOT NULL,
    state text,
    zip_code text,
    country text DEFAULT 'Tanzania'::text NOT NULL,
    phone text,
    email text,
    manager_name text,
    is_main boolean DEFAULT false,
    is_active boolean DEFAULT true,
    opening_time time without time zone DEFAULT '09:00:00'::time without time zone,
    closing_time time without time zone DEFAULT '18:00:00'::time without time zone,
    inventory_sync_enabled boolean DEFAULT true,
    pricing_model text DEFAULT 'centralized'::text,
    tax_rate_override numeric(5,2),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    
    -- =====================================================
    -- BRANCH ISOLATION FEATURES (All Included)
    -- =====================================================
    
    -- Main isolation mode
    data_isolation_mode text DEFAULT 'shared'::text,
    
    -- Core data isolation flags
    share_products boolean DEFAULT true,
    share_inventory boolean DEFAULT false,
    share_customers boolean DEFAULT true,
    share_suppliers boolean DEFAULT true,
    share_categories boolean DEFAULT true,
    share_employees boolean DEFAULT false,
    share_accounts boolean DEFAULT true,
    
    -- Business operations isolation flags
    share_sales boolean DEFAULT false,
    share_purchase_orders boolean DEFAULT false,
    share_devices boolean DEFAULT false,
    share_payments boolean DEFAULT false,
    share_appointments boolean DEFAULT false,
    share_reminders boolean DEFAULT false,
    share_expenses boolean DEFAULT false,
    share_trade_ins boolean DEFAULT false,
    share_special_orders boolean DEFAULT false,
    share_attendance boolean DEFAULT false,
    share_loyalty_points boolean DEFAULT false,
    
    -- Additional features isolation flags
    share_gift_cards boolean DEFAULT true,
    share_quality_checks boolean DEFAULT false,
    share_recurring_expenses boolean DEFAULT false,
    share_communications boolean DEFAULT false,
    share_reports boolean DEFAULT false,
    share_finance_transfers boolean DEFAULT false,
    
    -- Stock transfer settings
    allow_stock_transfer boolean DEFAULT true,
    auto_sync_products boolean DEFAULT true,
    auto_sync_prices boolean DEFAULT true,
    require_approval_for_transfers boolean DEFAULT false,
    can_view_other_branches boolean DEFAULT false,
    can_transfer_to_branches text[] DEFAULT '{}'::text[],
    
    -- Primary key
    CONSTRAINT store_locations_pkey PRIMARY KEY (id),
    
    -- Unique constraint
    CONSTRAINT store_locations_code_key UNIQUE (code),
    
    -- Check constraints
    CONSTRAINT store_locations_data_isolation_mode_check 
        CHECK (data_isolation_mode = ANY (ARRAY['shared'::text, 'isolated'::text, 'hybrid'::text])),
    CONSTRAINT store_locations_pricing_model_check 
        CHECK (pricing_model = ANY (ARRAY['centralized'::text, 'location-specific'::text]))
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_store_locations_active ON store_locations(is_active);
CREATE INDEX IF NOT EXISTS idx_store_locations_code ON store_locations(code);
CREATE INDEX IF NOT EXISTS idx_store_locations_is_main ON store_locations(is_main);
CREATE INDEX IF NOT EXISTS idx_store_locations_isolation_mode ON store_locations(data_isolation_mode);
CREATE INDEX IF NOT EXISTS idx_store_locations_share_inventory ON store_locations(share_inventory);
CREATE INDEX IF NOT EXISTS idx_store_locations_share_accounts ON store_locations(share_accounts);
CREATE INDEX IF NOT EXISTS idx_store_locations_share_products ON store_locations(share_products);

-- Add column comments for documentation
COMMENT ON TABLE store_locations IS 
'Store locations (branches) with comprehensive data isolation controls. Each branch can configure which data types are shared or isolated.';

COMMENT ON COLUMN store_locations.data_isolation_mode IS 
'Isolation mode: shared (all data shared), isolated (all data isolated), hybrid (per-entity configuration via share_* flags)';

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

-- Success message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ =====================================================';
    RAISE NOTICE '✅ store_locations Table Schema Created!';
    RAISE NOTICE '✅ =====================================================';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Schema includes ALL isolation features:';
    RAISE NOTICE '  ✅ data_isolation_mode (shared/isolated/hybrid)';
    RAISE NOTICE '  ✅ 26 share_* flags for granular control';
    RAISE NOTICE '  ✅ All indexes and constraints';
    RAISE NOTICE '  ✅ Column comments for documentation';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 This schema can be exported/imported independently';
    RAISE NOTICE '   and will include all isolation features.';
    RAISE NOTICE '';
END $$;

