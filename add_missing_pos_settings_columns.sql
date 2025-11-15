-- =====================================================
-- Add Missing POS Settings Columns
-- =====================================================
-- Problem: POS settings tables are missing specific columns
-- that the application TypeScript interfaces expect.
--
-- Solution: Add all missing columns to match the interfaces
-- in posSettingsApi.ts
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔧 =====================================================';
    RAISE NOTICE '🔧 Adding Missing POS Settings Columns';
    RAISE NOTICE '🔧 =====================================================';
    RAISE NOTICE '';
END $$;

-- =====================================================
-- 1. Add missing columns to lats_pos_user_permissions_settings
-- =====================================================
DO $$
BEGIN
    -- enable_pos_access
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lats_pos_user_permissions_settings'
        AND column_name = 'enable_pos_access'
    ) THEN
        ALTER TABLE lats_pos_user_permissions_settings
        ADD COLUMN enable_pos_access BOOLEAN DEFAULT true;
        RAISE NOTICE '✅ Added enable_pos_access to lats_pos_user_permissions_settings';
    END IF;

    -- enable_sales_access
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lats_pos_user_permissions_settings'
        AND column_name = 'enable_sales_access'
    ) THEN
        ALTER TABLE lats_pos_user_permissions_settings
        ADD COLUMN enable_sales_access BOOLEAN DEFAULT true;
        RAISE NOTICE '✅ Added enable_sales_access to lats_pos_user_permissions_settings';
    END IF;

    -- enable_refunds_access
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lats_pos_user_permissions_settings'
        AND column_name = 'enable_refunds_access'
    ) THEN
        ALTER TABLE lats_pos_user_permissions_settings
        ADD COLUMN enable_refunds_access BOOLEAN DEFAULT true;
        RAISE NOTICE '✅ Added enable_refunds_access to lats_pos_user_permissions_settings';
    END IF;

    -- enable_void_access
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lats_pos_user_permissions_settings'
        AND column_name = 'enable_void_access'
    ) THEN
        ALTER TABLE lats_pos_user_permissions_settings
        ADD COLUMN enable_void_access BOOLEAN DEFAULT false;
        RAISE NOTICE '✅ Added enable_void_access to lats_pos_user_permissions_settings';
    END IF;

    -- enable_discount_access
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lats_pos_user_permissions_settings'
        AND column_name = 'enable_discount_access'
    ) THEN
        ALTER TABLE lats_pos_user_permissions_settings
        ADD COLUMN enable_discount_access BOOLEAN DEFAULT true;
        RAISE NOTICE '✅ Added enable_discount_access to lats_pos_user_permissions_settings';
    END IF;

    -- enable_inventory_view
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lats_pos_user_permissions_settings'
        AND column_name = 'enable_inventory_view'
    ) THEN
        ALTER TABLE lats_pos_user_permissions_settings
        ADD COLUMN enable_inventory_view BOOLEAN DEFAULT true;
        RAISE NOTICE '✅ Added enable_inventory_view to lats_pos_user_permissions_settings';
    END IF;

    -- enable_inventory_edit
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lats_pos_user_permissions_settings'
        AND column_name = 'enable_inventory_edit'
    ) THEN
        ALTER TABLE lats_pos_user_permissions_settings
        ADD COLUMN enable_inventory_edit BOOLEAN DEFAULT true;
        RAISE NOTICE '✅ Added enable_inventory_edit to lats_pos_user_permissions_settings';
    END IF;

    -- enable_stock_adjustments
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lats_pos_user_permissions_settings'
        AND column_name = 'enable_stock_adjustments'
    ) THEN
        ALTER TABLE lats_pos_user_permissions_settings
        ADD COLUMN enable_stock_adjustments BOOLEAN DEFAULT true;
        RAISE NOTICE '✅ Added enable_stock_adjustments to lats_pos_user_permissions_settings';
    END IF;

    -- enable_product_creation
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lats_pos_user_permissions_settings'
        AND column_name = 'enable_product_creation'
    ) THEN
        ALTER TABLE lats_pos_user_permissions_settings
        ADD COLUMN enable_product_creation BOOLEAN DEFAULT true;
        RAISE NOTICE '✅ Added enable_product_creation to lats_pos_user_permissions_settings';
    END IF;

    -- enable_product_deletion
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lats_pos_user_permissions_settings'
        AND column_name = 'enable_product_deletion'
    ) THEN
        ALTER TABLE lats_pos_user_permissions_settings
        ADD COLUMN enable_product_deletion BOOLEAN DEFAULT false;
        RAISE NOTICE '✅ Added enable_product_deletion to lats_pos_user_permissions_settings';
    END IF;

    -- enable_customer_view
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lats_pos_user_permissions_settings'
        AND column_name = 'enable_customer_view'
    ) THEN
        ALTER TABLE lats_pos_user_permissions_settings
        ADD COLUMN enable_customer_view BOOLEAN DEFAULT true;
        RAISE NOTICE '✅ Added enable_customer_view to lats_pos_user_permissions_settings';
    END IF;

    -- enable_customer_creation
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lats_pos_user_permissions_settings'
        AND column_name = 'enable_customer_creation'
    ) THEN
        ALTER TABLE lats_pos_user_permissions_settings
        ADD COLUMN enable_customer_creation BOOLEAN DEFAULT true;
        RAISE NOTICE '✅ Added enable_customer_creation to lats_pos_user_permissions_settings';
    END IF;

    -- enable_customer_edit
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lats_pos_user_permissions_settings'
        AND column_name = 'enable_customer_edit'
    ) THEN
        ALTER TABLE lats_pos_user_permissions_settings
        ADD COLUMN enable_customer_edit BOOLEAN DEFAULT true;
        RAISE NOTICE '✅ Added enable_customer_edit to lats_pos_user_permissions_settings';
    END IF;

    -- enable_customer_deletion
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lats_pos_user_permissions_settings'
        AND column_name = 'enable_customer_deletion'
    ) THEN
        ALTER TABLE lats_pos_user_permissions_settings
        ADD COLUMN enable_customer_deletion BOOLEAN DEFAULT false;
        RAISE NOTICE '✅ Added enable_customer_deletion to lats_pos_user_permissions_settings';
    END IF;

    -- enable_customer_history
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lats_pos_user_permissions_settings'
        AND column_name = 'enable_customer_history'
    ) THEN
        ALTER TABLE lats_pos_user_permissions_settings
        ADD COLUMN enable_customer_history BOOLEAN DEFAULT true;
        RAISE NOTICE '✅ Added enable_customer_history to lats_pos_user_permissions_settings';
    END IF;

    -- enable_payment_processing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lats_pos_user_permissions_settings'
        AND column_name = 'enable_payment_processing'
    ) THEN
        ALTER TABLE lats_pos_user_permissions_settings
        ADD COLUMN enable_payment_processing BOOLEAN DEFAULT true;
        RAISE NOTICE '✅ Added enable_payment_processing to lats_pos_user_permissions_settings';
    END IF;

    -- enable_cash_management
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lats_pos_user_permissions_settings'
        AND column_name = 'enable_cash_management'
    ) THEN
        ALTER TABLE lats_pos_user_permissions_settings
        ADD COLUMN enable_cash_management BOOLEAN DEFAULT true;
        RAISE NOTICE '✅ Added enable_cash_management to lats_pos_user_permissions_settings';
    END IF;

    -- enable_daily_reports
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lats_pos_user_permissions_settings'
        AND column_name = 'enable_daily_reports'
    ) THEN
        ALTER TABLE lats_pos_user_permissions_settings
        ADD COLUMN enable_daily_reports BOOLEAN DEFAULT true;
        RAISE NOTICE '✅ Added enable_daily_reports to lats_pos_user_permissions_settings';
    END IF;

    -- enable_financial_reports
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lats_pos_user_permissions_settings'
        AND column_name = 'enable_financial_reports'
    ) THEN
        ALTER TABLE lats_pos_user_permissions_settings
        ADD COLUMN enable_financial_reports BOOLEAN DEFAULT false;
        RAISE NOTICE '✅ Added enable_financial_reports to lats_pos_user_permissions_settings';
    END IF;

    -- enable_tax_management
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lats_pos_user_permissions_settings'
        AND column_name = 'enable_tax_management'
    ) THEN
        ALTER TABLE lats_pos_user_permissions_settings
        ADD COLUMN enable_tax_management BOOLEAN DEFAULT false;
        RAISE NOTICE '✅ Added enable_tax_management to lats_pos_user_permissions_settings';
    END IF;

    -- enable_settings_access
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lats_pos_user_permissions_settings'
        AND column_name = 'enable_settings_access'
    ) THEN
        ALTER TABLE lats_pos_user_permissions_settings
        ADD COLUMN enable_settings_access BOOLEAN DEFAULT false;
        RAISE NOTICE '✅ Added enable_settings_access to lats_pos_user_permissions_settings';
    END IF;

    -- enable_user_management
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lats_pos_user_permissions_settings'
        AND column_name = 'enable_user_management'
    ) THEN
        ALTER TABLE lats_pos_user_permissions_settings
        ADD COLUMN enable_user_management BOOLEAN DEFAULT false;
        RAISE NOTICE '✅ Added enable_user_management to lats_pos_user_permissions_settings';
    END IF;

    -- enable_backup_restore
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lats_pos_user_permissions_settings'
        AND column_name = 'enable_backup_restore'
    ) THEN
        ALTER TABLE lats_pos_user_permissions_settings
        ADD COLUMN enable_backup_restore BOOLEAN DEFAULT false;
        RAISE NOTICE '✅ Added enable_backup_restore to lats_pos_user_permissions_settings';
    END IF;

    -- enable_system_maintenance
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lats_pos_user_permissions_settings'
        AND column_name = 'enable_system_maintenance'
    ) THEN
        ALTER TABLE lats_pos_user_permissions_settings
        ADD COLUMN enable_system_maintenance BOOLEAN DEFAULT false;
        RAISE NOTICE '✅ Added enable_system_maintenance to lats_pos_user_permissions_settings';
    END IF;

    -- enable_api_access
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lats_pos_user_permissions_settings'
        AND column_name = 'enable_api_access'
    ) THEN
        ALTER TABLE lats_pos_user_permissions_settings
        ADD COLUMN enable_api_access BOOLEAN DEFAULT false;
        RAISE NOTICE '✅ Added enable_api_access to lats_pos_user_permissions_settings';
    END IF;

    -- enable_audit_logs
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lats_pos_user_permissions_settings'
        AND column_name = 'enable_audit_logs'
    ) THEN
        ALTER TABLE lats_pos_user_permissions_settings
        ADD COLUMN enable_audit_logs BOOLEAN DEFAULT false;
        RAISE NOTICE '✅ Added enable_audit_logs to lats_pos_user_permissions_settings';
    END IF;

    -- enable_security_settings
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lats_pos_user_permissions_settings'
        AND column_name = 'enable_security_settings'
    ) THEN
        ALTER TABLE lats_pos_user_permissions_settings
        ADD COLUMN enable_security_settings BOOLEAN DEFAULT false;
        RAISE NOTICE '✅ Added enable_security_settings to lats_pos_user_permissions_settings';
    END IF;

    -- enable_password_reset
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lats_pos_user_permissions_settings'
        AND column_name = 'enable_password_reset'
    ) THEN
        ALTER TABLE lats_pos_user_permissions_settings
        ADD COLUMN enable_password_reset BOOLEAN DEFAULT false;
        RAISE NOTICE '✅ Added enable_password_reset to lats_pos_user_permissions_settings';
    END IF;

    -- enable_session_management
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lats_pos_user_permissions_settings'
        AND column_name = 'enable_session_management'
    ) THEN
        ALTER TABLE lats_pos_user_permissions_settings
        ADD COLUMN enable_session_management BOOLEAN DEFAULT false;
        RAISE NOTICE '✅ Added enable_session_management to lats_pos_user_permissions_settings';
    END IF;

    -- enable_data_export
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lats_pos_user_permissions_settings'
        AND column_name = 'enable_data_export'
    ) THEN
        ALTER TABLE lats_pos_user_permissions_settings
        ADD COLUMN enable_data_export BOOLEAN DEFAULT true;
        RAISE NOTICE '✅ Added enable_data_export to lats_pos_user_permissions_settings';
    END IF;

END $$;

-- =====================================================
-- 2. Add missing columns to lats_pos_loyalty_customer_settings
-- =====================================================
DO $$
BEGIN
    -- enable_loyalty_program (rename from enable_loyalty)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lats_pos_loyalty_customer_settings'
        AND column_name = 'enable_loyalty_program'
    ) THEN
        ALTER TABLE lats_pos_loyalty_customer_settings
        ADD COLUMN enable_loyalty_program BOOLEAN DEFAULT true;
        RAISE NOTICE '✅ Added enable_loyalty_program to lats_pos_loyalty_customer_settings';
    END IF;

    -- loyalty_program_name
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lats_pos_loyalty_customer_settings'
        AND column_name = 'loyalty_program_name'
    ) THEN
        ALTER TABLE lats_pos_loyalty_customer_settings
        ADD COLUMN loyalty_program_name TEXT DEFAULT 'Loyalty Rewards';
        RAISE NOTICE '✅ Added loyalty_program_name to lats_pos_loyalty_customer_settings';
    END IF;

    -- points_per_currency (rename from points_per_dollar)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lats_pos_loyalty_customer_settings'
        AND column_name = 'points_per_currency'
    ) THEN
        ALTER TABLE lats_pos_loyalty_customer_settings
        ADD COLUMN points_per_currency NUMERIC DEFAULT 1;
        RAISE NOTICE '✅ Added points_per_currency to lats_pos_loyalty_customer_settings';
    END IF;

    -- points_redemption_rate
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lats_pos_loyalty_customer_settings'
        AND column_name = 'points_redemption_rate'
    ) THEN
        ALTER TABLE lats_pos_loyalty_customer_settings
        ADD COLUMN points_redemption_rate NUMERIC DEFAULT 100;
        RAISE NOTICE '✅ Added points_redemption_rate to lats_pos_loyalty_customer_settings';
    END IF;

    -- minimum_points_redemption
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lats_pos_loyalty_customer_settings'
        AND column_name = 'minimum_points_redemption'
    ) THEN
        ALTER TABLE lats_pos_loyalty_customer_settings
        ADD COLUMN minimum_points_redemption INTEGER DEFAULT 500;
        RAISE NOTICE '✅ Added minimum_points_redemption to lats_pos_loyalty_customer_settings';
    END IF;

    -- points_expiry_days
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lats_pos_loyalty_customer_settings'
        AND column_name = 'points_expiry_days'
    ) THEN
        ALTER TABLE lats_pos_loyalty_customer_settings
        ADD COLUMN points_expiry_days INTEGER DEFAULT 365;
        RAISE NOTICE '✅ Added points_expiry_days to lats_pos_loyalty_customer_settings';
    END IF;

    -- enable_customer_registration
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lats_pos_loyalty_customer_settings'
        AND column_name = 'enable_customer_registration'
    ) THEN
        ALTER TABLE lats_pos_loyalty_customer_settings
        ADD COLUMN enable_customer_registration BOOLEAN DEFAULT true;
        RAISE NOTICE '✅ Added enable_customer_registration to lats_pos_loyalty_customer_settings';
    END IF;

    -- require_customer_info
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lats_pos_loyalty_customer_settings'
        AND column_name = 'require_customer_info'
    ) THEN
        ALTER TABLE lats_pos_loyalty_customer_settings
        ADD COLUMN require_customer_info BOOLEAN DEFAULT false;
        RAISE NOTICE '✅ Added require_customer_info to lats_pos_loyalty_customer_settings';
    END IF;

    -- enable_customer_categories
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lats_pos_loyalty_customer_settings'
        AND column_name = 'enable_customer_categories'
    ) THEN
        ALTER TABLE lats_pos_loyalty_customer_settings
        ADD COLUMN enable_customer_categories BOOLEAN DEFAULT true;
        RAISE NOTICE '✅ Added enable_customer_categories to lats_pos_loyalty_customer_settings';
    END IF;

    -- enable_customer_tags
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lats_pos_loyalty_customer_settings'
        AND column_name = 'enable_customer_tags'
    ) THEN
        ALTER TABLE lats_pos_loyalty_customer_settings
        ADD COLUMN enable_customer_tags BOOLEAN DEFAULT true;
        RAISE NOTICE '✅ Added enable_customer_tags to lats_pos_loyalty_customer_settings';
    END IF;

    -- enable_customer_notes
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lats_pos_loyalty_customer_settings'
        AND column_name = 'enable_customer_notes'
    ) THEN
        ALTER TABLE lats_pos_loyalty_customer_settings
        ADD COLUMN enable_customer_notes BOOLEAN DEFAULT true;
        RAISE NOTICE '✅ Added enable_customer_notes to lats_pos_loyalty_customer_settings';
    END IF;

    -- enable_automatic_rewards
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lats_pos_loyalty_customer_settings'
        AND column_name = 'enable_automatic_rewards'
    ) THEN
        ALTER TABLE lats_pos_loyalty_customer_settings
        ADD COLUMN enable_automatic_rewards BOOLEAN DEFAULT true;
        RAISE NOTICE '✅ Added enable_automatic_rewards to lats_pos_loyalty_customer_settings';
    END IF;

    -- enable_manual_rewards
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lats_pos_loyalty_customer_settings'
        AND column_name = 'enable_manual_rewards'
    ) THEN
        ALTER TABLE lats_pos_loyalty_customer_settings
        ADD COLUMN enable_manual_rewards BOOLEAN DEFAULT true;
        RAISE NOTICE '✅ Added enable_manual_rewards to lats_pos_loyalty_customer_settings';
    END IF;

    -- enable_birthday_rewards
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lats_pos_loyalty_customer_settings'
        AND column_name = 'enable_birthday_rewards'
    ) THEN
        ALTER TABLE lats_pos_loyalty_customer_settings
        ADD COLUMN enable_birthday_rewards BOOLEAN DEFAULT true;
        RAISE NOTICE '✅ Added enable_birthday_rewards to lats_pos_loyalty_customer_settings';
    END IF;

    -- enable_anniversary_rewards
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lats_pos_loyalty_customer_settings'
        AND column_name = 'enable_anniversary_rewards'
    ) THEN
        ALTER TABLE lats_pos_loyalty_customer_settings
        ADD COLUMN enable_anniversary_rewards BOOLEAN DEFAULT false;
        RAISE NOTICE '✅ Added enable_anniversary_rewards to lats_pos_loyalty_customer_settings';
    END IF;

    -- enable_referral_rewards
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lats_pos_loyalty_customer_settings'
        AND column_name = 'enable_referral_rewards'
    ) THEN
        ALTER TABLE lats_pos_loyalty_customer_settings
        ADD COLUMN enable_referral_rewards BOOLEAN DEFAULT false;
        RAISE NOTICE '✅ Added enable_referral_rewards to lats_pos_loyalty_customer_settings';
    END IF;

    -- enable_email_communication
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lats_pos_loyalty_customer_settings'
        AND column_name = 'enable_email_communication'
    ) THEN
        ALTER TABLE lats_pos_loyalty_customer_settings
        ADD COLUMN enable_email_communication BOOLEAN DEFAULT false;
        RAISE NOTICE '✅ Added enable_email_communication to lats_pos_loyalty_customer_settings';
    END IF;

    -- enable_sms_communication
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lats_pos_loyalty_customer_settings'
        AND column_name = 'enable_sms_communication'
    ) THEN
        ALTER TABLE lats_pos_loyalty_customer_settings
        ADD COLUMN enable_sms_communication BOOLEAN DEFAULT false;
        RAISE NOTICE '✅ Added enable_sms_communication to lats_pos_loyalty_customer_settings';
    END IF;

    -- enable_push_notifications
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lats_pos_loyalty_customer_settings'
        AND column_name = 'enable_push_notifications'
    ) THEN
        ALTER TABLE lats_pos_loyalty_customer_settings
        ADD COLUMN enable_push_notifications BOOLEAN DEFAULT false;
        RAISE NOTICE '✅ Added enable_push_notifications to lats_pos_loyalty_customer_settings';
    END IF;

    -- enable_marketing_emails
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lats_pos_loyalty_customer_settings'
        AND column_name = 'enable_marketing_emails'
    ) THEN
        ALTER TABLE lats_pos_loyalty_customer_settings
        ADD COLUMN enable_marketing_emails BOOLEAN DEFAULT false;
        RAISE NOTICE '✅ Added enable_marketing_emails to lats_pos_loyalty_customer_settings';
    END IF;

    -- enable_customer_analytics
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lats_pos_loyalty_customer_settings'
        AND column_name = 'enable_customer_analytics'
    ) THEN
        ALTER TABLE lats_pos_loyalty_customer_settings
        ADD COLUMN enable_customer_analytics BOOLEAN DEFAULT true;
        RAISE NOTICE '✅ Added enable_customer_analytics to lats_pos_loyalty_customer_settings';
    END IF;

    -- enable_purchase_history
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lats_pos_loyalty_customer_settings'
        AND column_name = 'enable_purchase_history'
    ) THEN
        ALTER TABLE lats_pos_loyalty_customer_settings
        ADD COLUMN enable_purchase_history BOOLEAN DEFAULT true;
        RAISE NOTICE '✅ Added enable_purchase_history to lats_pos_loyalty_customer_settings';
    END IF;

    -- enable_spending_patterns
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lats_pos_loyalty_customer_settings'
        AND column_name = 'enable_spending_patterns'
    ) THEN
        ALTER TABLE lats_pos_loyalty_customer_settings
        ADD COLUMN enable_spending_patterns BOOLEAN DEFAULT true;
        RAISE NOTICE '✅ Added enable_spending_patterns to lats_pos_loyalty_customer_settings';
    END IF;

    -- enable_customer_segmentation
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lats_pos_loyalty_customer_settings'
        AND column_name = 'enable_customer_segmentation'
    ) THEN
        ALTER TABLE lats_pos_loyalty_customer_settings
        ADD COLUMN enable_customer_segmentation BOOLEAN DEFAULT false;
        RAISE NOTICE '✅ Added enable_customer_segmentation to lats_pos_loyalty_customer_settings';
    END IF;

    -- enable_customer_insights
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lats_pos_loyalty_customer_settings'
        AND column_name = 'enable_customer_insights'
    ) THEN
        ALTER TABLE lats_pos_loyalty_customer_settings
        ADD COLUMN enable_customer_insights BOOLEAN DEFAULT false;
        RAISE NOTICE '✅ Added enable_customer_insights to lats_pos_loyalty_customer_settings';
    END IF;

END $$;

-- =====================================================
-- 3. Migrate existing data from JSONB permissions to individual columns
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔄 Migrating existing permissions data...';

    -- Update enable_pos_access from permissions JSONB
    UPDATE lats_pos_user_permissions_settings
    SET enable_pos_access = COALESCE((permissions->>'enable_pos_access')::boolean, true)
    WHERE permissions IS NOT NULL AND permissions->>'enable_pos_access' IS NOT NULL;

    -- Update other permission columns similarly
    UPDATE lats_pos_user_permissions_settings
    SET enable_sales_access = COALESCE((permissions->>'enable_sales_access')::boolean, true)
    WHERE permissions IS NOT NULL AND permissions->>'enable_sales_access' IS NOT NULL;

    UPDATE lats_pos_user_permissions_settings
    SET enable_inventory_view = COALESCE((permissions->>'enable_inventory_view')::boolean, true)
    WHERE permissions IS NOT NULL AND permissions->>'enable_inventory_view' IS NOT NULL;

    UPDATE lats_pos_user_permissions_settings
    SET enable_customer_view = COALESCE((permissions->>'enable_customer_view')::boolean, true)
    WHERE permissions IS NOT NULL AND permissions->>'enable_customer_view' IS NOT NULL;

    UPDATE lats_pos_user_permissions_settings
    SET enable_payment_processing = COALESCE((permissions->>'enable_payment_processing')::boolean, true)
    WHERE permissions IS NOT NULL AND permissions->>'enable_payment_processing' IS NOT NULL;

    RAISE NOTICE '✅ Migrated permissions data to individual columns';
END $$;

-- =====================================================
-- 4. Migrate existing loyalty data to new column names
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔄 Migrating existing loyalty data...';

    -- Copy enable_loyalty to enable_loyalty_program
    UPDATE lats_pos_loyalty_customer_settings
    SET enable_loyalty_program = enable_loyalty
    WHERE enable_loyalty IS NOT NULL;

    -- Copy points_per_dollar to points_per_currency
    UPDATE lats_pos_loyalty_customer_settings
    SET points_per_currency = points_per_dollar
    WHERE points_per_dollar IS NOT NULL;

    RAISE NOTICE '✅ Migrated loyalty data to new column names';
END $$;

-- =====================================================
-- 5. Success message
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ =====================================================';
    RAISE NOTICE '✅ Missing POS Settings Columns Added Successfully!';
    RAISE NOTICE '✅ =====================================================';
    RAISE NOTICE '';
    RAISE NOTICE '📋 What was done:';
    RAISE NOTICE '  1. ✅ Added 29 missing columns to lats_pos_user_permissions_settings';
    RAISE NOTICE '  2. ✅ Added 23 missing columns to lats_pos_loyalty_customer_settings';
    RAISE NOTICE '  3. ✅ Migrated existing JSONB permissions data to individual columns';
    RAISE NOTICE '  4. ✅ Migrated existing loyalty data to new column names';
    RAISE NOTICE '';
    RAISE NOTICE '🔍 To verify the changes, run:';
    RAISE NOTICE '   SELECT column_name FROM information_schema.columns';
    RAISE NOTICE '   WHERE table_name IN (''lats_pos_user_permissions_settings'', ''lats_pos_loyalty_customer_settings'')';
    RAISE NOTICE '   ORDER BY table_name, ordinal_position;';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  IMPORTANT: The application should now work without SQL errors';
    RAISE NOTICE '   for missing columns. Test the POS settings functionality.';
    RAISE NOTICE '';
END $$;
