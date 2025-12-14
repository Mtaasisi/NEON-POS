-- Simple Migration: Fix Dynamic Pricing Schema (No Constraints)
-- Created: 2025-10-27
-- Description: Simpler version without check constraints (useful if DO blocks cause issues)

-- Ensure table exists
CREATE TABLE IF NOT EXISTS lats_pos_dynamic_pricing_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    business_id TEXT,
    enable_dynamic_pricing BOOLEAN DEFAULT false,
    enable_loyalty_pricing BOOLEAN DEFAULT false,
    enable_bulk_pricing BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    enable_time_based_pricing BOOLEAN DEFAULT false,
    enable_customer_pricing BOOLEAN DEFAULT false,
    enable_special_events BOOLEAN DEFAULT false,
    loyalty_discount_percent NUMERIC(5,2) DEFAULT 0,
    loyalty_points_threshold INTEGER DEFAULT 100,
    loyalty_max_discount NUMERIC(5,2) DEFAULT 20,
    bulk_discount_enabled BOOLEAN DEFAULT false,
    bulk_discount_threshold INTEGER DEFAULT 10,
    bulk_discount_percent NUMERIC(5,2) DEFAULT 5,
    time_based_discount_enabled BOOLEAN DEFAULT false,
    time_based_start_time TEXT DEFAULT '18:00',
    time_based_end_time TEXT DEFAULT '21:00',
    time_based_discount_percent NUMERIC(5,2) DEFAULT 15,
    customer_pricing_enabled BOOLEAN DEFAULT false,
    vip_customer_discount NUMERIC(5,2) DEFAULT 10,
    regular_customer_discount NUMERIC(5,2) DEFAULT 5,
    special_events_enabled BOOLEAN DEFAULT false,
    special_event_discount_percent NUMERIC(5,2) DEFAULT 20
);

-- Add missing columns (safe to run even if they exist - will just skip)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'lats_pos_dynamic_pricing_settings' 
                   AND column_name = 'enable_dynamic_pricing') THEN
        ALTER TABLE lats_pos_dynamic_pricing_settings 
        ADD COLUMN enable_dynamic_pricing BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'lats_pos_dynamic_pricing_settings' 
                   AND column_name = 'enable_loyalty_pricing') THEN
        ALTER TABLE lats_pos_dynamic_pricing_settings 
        ADD COLUMN enable_loyalty_pricing BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'lats_pos_dynamic_pricing_settings' 
                   AND column_name = 'enable_bulk_pricing') THEN
        ALTER TABLE lats_pos_dynamic_pricing_settings 
        ADD COLUMN enable_bulk_pricing BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'lats_pos_dynamic_pricing_settings' 
                   AND column_name = 'enable_time_based_pricing') THEN
        ALTER TABLE lats_pos_dynamic_pricing_settings 
        ADD COLUMN enable_time_based_pricing BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'lats_pos_dynamic_pricing_settings' 
                   AND column_name = 'time_based_start_time') THEN
        ALTER TABLE lats_pos_dynamic_pricing_settings 
        ADD COLUMN time_based_start_time TEXT DEFAULT '18:00';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'lats_pos_dynamic_pricing_settings' 
                   AND column_name = 'time_based_end_time') THEN
        ALTER TABLE lats_pos_dynamic_pricing_settings 
        ADD COLUMN time_based_end_time TEXT DEFAULT '21:00';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'lats_pos_dynamic_pricing_settings' 
                   AND column_name = 'time_based_discount_percent') THEN
        ALTER TABLE lats_pos_dynamic_pricing_settings 
        ADD COLUMN time_based_discount_percent NUMERIC(5,2) DEFAULT 15;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'lats_pos_dynamic_pricing_settings' 
                   AND column_name = 'bulk_discount_threshold') THEN
        ALTER TABLE lats_pos_dynamic_pricing_settings 
        ADD COLUMN bulk_discount_threshold INTEGER DEFAULT 10;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'lats_pos_dynamic_pricing_settings' 
                   AND column_name = 'bulk_discount_percent') THEN
        ALTER TABLE lats_pos_dynamic_pricing_settings 
        ADD COLUMN bulk_discount_percent NUMERIC(5,2) DEFAULT 10;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'lats_pos_dynamic_pricing_settings' 
                   AND column_name = 'loyalty_discount_percent') THEN
        ALTER TABLE lats_pos_dynamic_pricing_settings 
        ADD COLUMN loyalty_discount_percent NUMERIC(5,2) DEFAULT 5;
    END IF;
END $$;

-- Update NULL values to defaults
UPDATE lats_pos_dynamic_pricing_settings 
SET 
    enable_dynamic_pricing = COALESCE(enable_dynamic_pricing, false),
    enable_loyalty_pricing = COALESCE(enable_loyalty_pricing, false),
    enable_bulk_pricing = COALESCE(enable_bulk_pricing, false),
    enable_time_based_pricing = COALESCE(enable_time_based_pricing, false),
    time_based_start_time = COALESCE(time_based_start_time, '18:00'),
    time_based_end_time = COALESCE(time_based_end_time, '21:00'),
    time_based_discount_percent = COALESCE(time_based_discount_percent, 15),
    bulk_discount_threshold = COALESCE(bulk_discount_threshold, 10),
    bulk_discount_percent = COALESCE(bulk_discount_percent, 10),
    loyalty_discount_percent = COALESCE(loyalty_discount_percent, 5);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_dynamic_pricing_user_id 
ON lats_pos_dynamic_pricing_settings(user_id);

CREATE INDEX IF NOT EXISTS idx_dynamic_pricing_business_id 
ON lats_pos_dynamic_pricing_settings(business_id);

-- Add comments
COMMENT ON TABLE lats_pos_dynamic_pricing_settings IS 'Dynamic pricing settings for POS system - controls automatic discounts and pricing rules';
COMMENT ON COLUMN lats_pos_dynamic_pricing_settings.enable_dynamic_pricing IS 'Master switch to enable/disable all dynamic pricing features';
COMMENT ON COLUMN lats_pos_dynamic_pricing_settings.enable_time_based_pricing IS 'Enable Happy Hour discounts during specific time periods';
COMMENT ON COLUMN lats_pos_dynamic_pricing_settings.enable_bulk_pricing IS 'Enable bulk purchase discounts for large quantities';
COMMENT ON COLUMN lats_pos_dynamic_pricing_settings.enable_loyalty_pricing IS 'Enable VIP/loyalty customer discounts';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Dynamic pricing schema migration completed successfully!';
    RAISE NOTICE '📊 You can now use all 3 discount types: Happy Hour, Bulk Buy, VIP Customer';
END $$;

