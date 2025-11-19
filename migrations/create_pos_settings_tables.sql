-- ================================================
-- POS SETTINGS TABLES
-- ================================================
-- Create all POS settings tables with proper column definitions

-- Delivery Settings
CREATE TABLE IF NOT EXISTS lats_pos_delivery_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    business_id UUID,
    enable_delivery BOOLEAN DEFAULT true,
    default_delivery_fee NUMERIC DEFAULT 0,
    free_delivery_threshold NUMERIC DEFAULT 0,
    max_delivery_distance NUMERIC DEFAULT 20,
    enable_delivery_areas BOOLEAN DEFAULT false,
    delivery_areas TEXT[], -- Array of strings, allows NULL
    area_delivery_fees JSONB, -- JSON object, allows NULL
    area_delivery_times JSONB, -- JSON object, allows NULL
    enable_delivery_hours BOOLEAN DEFAULT false,
    delivery_start_time TEXT DEFAULT '08:00',
    delivery_end_time TEXT DEFAULT '18:00',
    enable_same_day_delivery BOOLEAN DEFAULT true,
    enable_next_day_delivery BOOLEAN DEFAULT true,
    delivery_time_slots TEXT[], -- Array of strings, allows NULL
    notify_customer_on_delivery BOOLEAN DEFAULT true,
    notify_driver_on_assignment BOOLEAN DEFAULT true,
    enable_sms_notifications BOOLEAN DEFAULT false,
    enable_email_notifications BOOLEAN DEFAULT false,
    enable_driver_assignment BOOLEAN DEFAULT false,
    driver_commission NUMERIC DEFAULT 10,
    require_signature BOOLEAN DEFAULT false,
    enable_driver_tracking BOOLEAN DEFAULT false,
    enable_scheduled_delivery BOOLEAN DEFAULT false,
    enable_partial_delivery BOOLEAN DEFAULT false,
    require_advance_payment BOOLEAN DEFAULT false,
    advance_payment_percent NUMERIC DEFAULT 50,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Barcode Scanner Settings
CREATE TABLE IF NOT EXISTS lats_pos_barcode_scanner_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    business_id UUID,
    enable_barcode_scanner BOOLEAN DEFAULT true,
    scanner_type TEXT DEFAULT 'usb',
    auto_focus BOOLEAN DEFAULT true,
    beep_on_scan BOOLEAN DEFAULT true,
    scan_mode TEXT DEFAULT 'single',
    scan_delay NUMERIC DEFAULT 500,
    enable_scan_history BOOLEAN DEFAULT true,
    max_scan_history INTEGER DEFAULT 50,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Dynamic Pricing Settings
CREATE TABLE IF NOT EXISTS lats_pos_dynamic_pricing_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    business_id UUID,
    enable_dynamic_pricing BOOLEAN DEFAULT false,
    base_markup_percent NUMERIC DEFAULT 0,
    max_discount_percent NUMERIC DEFAULT 0,
    min_profit_margin NUMERIC DEFAULT 0,
    enable_volume_discounts BOOLEAN DEFAULT false,
    enable_time_based_pricing BOOLEAN DEFAULT false,
    enable_customer_tier_pricing BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Search Filter Settings
CREATE TABLE IF NOT EXISTS lats_pos_search_filter_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    business_id UUID,
    enable_product_search BOOLEAN DEFAULT true,
    enable_customer_search BOOLEAN DEFAULT true,
    enable_sales_search BOOLEAN DEFAULT true,
    search_by_name BOOLEAN DEFAULT true,
    search_by_barcode BOOLEAN DEFAULT true,
    search_by_sku BOOLEAN DEFAULT true,
    search_by_category BOOLEAN DEFAULT true,
    search_by_supplier BOOLEAN DEFAULT true,
    search_by_description BOOLEAN DEFAULT false,
    search_by_tags BOOLEAN DEFAULT false,
    enable_fuzzy_search BOOLEAN DEFAULT true,
    enable_autocomplete BOOLEAN DEFAULT true,
    min_search_length INTEGER DEFAULT 2,
    max_search_results INTEGER DEFAULT 50,
    search_timeout INTEGER DEFAULT 5000,
    search_debounce_time INTEGER DEFAULT 300,
    enable_search_history BOOLEAN DEFAULT true,
    max_search_history INTEGER DEFAULT 50,
    enable_recent_searches BOOLEAN DEFAULT true,
    enable_popular_searches BOOLEAN DEFAULT true,
    enable_search_suggestions BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- User Permissions Settings
CREATE TABLE IF NOT EXISTS lats_pos_user_permissions_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    business_id UUID,
    enable_pos_access BOOLEAN DEFAULT true,
    enable_sales_access BOOLEAN DEFAULT true,
    enable_inventory_access BOOLEAN DEFAULT true,
    enable_customer_access BOOLEAN DEFAULT true,
    enable_reports_access BOOLEAN DEFAULT true,
    enable_settings_access BOOLEAN DEFAULT true,
    can_view_sales BOOLEAN DEFAULT true,
    can_create_sales BOOLEAN DEFAULT true,
    can_edit_sales BOOLEAN DEFAULT false,
    can_delete_sales BOOLEAN DEFAULT false,
    can_apply_discounts BOOLEAN DEFAULT true,
    max_discount_percent NUMERIC DEFAULT 20,
    can_process_refunds BOOLEAN DEFAULT false,
    can_view_inventory BOOLEAN DEFAULT true,
    can_add_products BOOLEAN DEFAULT true,
    can_edit_products BOOLEAN DEFAULT true,
    can_delete_products BOOLEAN DEFAULT false,
    can_adjust_stock BOOLEAN DEFAULT true,
    can_view_customers BOOLEAN DEFAULT true,
    can_add_customers BOOLEAN DEFAULT true,
    can_edit_customers BOOLEAN DEFAULT true,
    can_delete_customers BOOLEAN DEFAULT false,
    can_view_reports BOOLEAN DEFAULT true,
    can_export_data BOOLEAN DEFAULT false,
    can_manage_users BOOLEAN DEFAULT false,
    can_change_settings BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Loyalty Customer Settings
CREATE TABLE IF NOT EXISTS lats_pos_loyalty_customer_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    business_id UUID,
    enable_loyalty_program BOOLEAN DEFAULT false,
    points_per_currency_unit NUMERIC DEFAULT 1,
    currency_per_point NUMERIC DEFAULT 1,
    enable_point_expiry BOOLEAN DEFAULT false,
    point_expiry_days INTEGER DEFAULT 365,
    enable_birthday_rewards BOOLEAN DEFAULT false,
    birthday_reward_points INTEGER DEFAULT 100,
    enable_referral_rewards BOOLEAN DEFAULT false,
    referral_reward_points INTEGER DEFAULT 50,
    min_purchase_for_points NUMERIC DEFAULT 0,
    enable_tier_system BOOLEAN DEFAULT false,
    tier_upgrade_threshold NUMERIC DEFAULT 10000,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Analytics Reporting Settings
CREATE TABLE IF NOT EXISTS lats_pos_analytics_reporting_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    business_id UUID,
    enable_sales_analytics BOOLEAN DEFAULT true,
    enable_inventory_analytics BOOLEAN DEFAULT true,
    enable_customer_analytics BOOLEAN DEFAULT true,
    enable_employee_analytics BOOLEAN DEFAULT true,
    enable_product_performance BOOLEAN DEFAULT true,
    enable_sales_trends BOOLEAN DEFAULT true,
    enable_profit_analysis BOOLEAN DEFAULT true,
    enable_automated_reports BOOLEAN DEFAULT false,
    report_frequency TEXT DEFAULT 'daily',
    report_recipients TEXT[],
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Notification Settings
CREATE TABLE IF NOT EXISTS lats_pos_notification_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    business_id UUID,
    enable_low_stock_alerts BOOLEAN DEFAULT true,
    low_stock_threshold INTEGER DEFAULT 5,
    enable_daily_sales_summary BOOLEAN DEFAULT false,
    enable_payment_notifications BOOLEAN DEFAULT true,
    enable_customer_notifications BOOLEAN DEFAULT true,
    enable_employee_notifications BOOLEAN DEFAULT false,
    notification_email TEXT,
    notification_sms TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_delivery_settings_user_id ON lats_pos_delivery_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_delivery_settings_business_id ON lats_pos_delivery_settings(business_id);
CREATE INDEX IF NOT EXISTS idx_scanner_settings_user_id ON lats_pos_barcode_scanner_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_pricing_settings_user_id ON lats_pos_dynamic_pricing_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_search_settings_user_id ON lats_pos_search_filter_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_permissions_settings_user_id ON lats_pos_user_permissions_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_settings_user_id ON lats_pos_loyalty_customer_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_settings_user_id ON lats_pos_analytics_reporting_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_settings_user_id ON lats_pos_notification_settings(user_id);

-- Add comments for documentation
COMMENT ON TABLE lats_pos_delivery_settings IS 'Stores delivery configuration for POS system';
COMMENT ON TABLE lats_pos_barcode_scanner_settings IS 'Stores barcode scanner configuration';
COMMENT ON TABLE lats_pos_dynamic_pricing_settings IS 'Stores dynamic pricing rules';
COMMENT ON TABLE lats_pos_search_filter_settings IS 'Stores search and filter preferences';
COMMENT ON TABLE lats_pos_user_permissions_settings IS 'Stores user permission settings';
COMMENT ON TABLE lats_pos_loyalty_customer_settings IS 'Stores loyalty program configuration';
COMMENT ON TABLE lats_pos_analytics_reporting_settings IS 'Stores analytics and reporting preferences';
COMMENT ON TABLE lats_pos_notification_settings IS 'Stores notification preferences';

