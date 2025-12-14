-- =====================================================
-- Add Branch Isolation to All POS Settings Tables
-- =====================================================
-- Problem: POS settings tables don't have branch_id column,
-- causing settings to be shared across all branches instead
-- of being isolated per branch.
--
-- Solution: Add branch_id column to all POS settings tables
-- and create proper indexes and constraints.
-- =====================================================

-- Print start message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔧 =====================================================';
    RAISE NOTICE '🔧 Adding Branch Isolation to Settings Tables';
    RAISE NOTICE '🔧 =====================================================';
    RAISE NOTICE '';
END $$;

-- =====================================================
-- 1. Add branch_id to lats_pos_general_settings
-- =====================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_pos_general_settings' 
        AND column_name = 'branch_id'
    ) THEN
        ALTER TABLE lats_pos_general_settings 
        ADD COLUMN branch_id UUID;
        
        -- Add foreign key constraint
        ALTER TABLE lats_pos_general_settings
        ADD CONSTRAINT fk_general_settings_branch
        FOREIGN KEY (branch_id) REFERENCES lats_branches(id) ON DELETE CASCADE;
        
        -- Create index
        CREATE INDEX IF NOT EXISTS idx_general_settings_branch_id 
        ON lats_pos_general_settings(branch_id);
        
        -- Update constraint to use branch_id instead of user_id
        ALTER TABLE lats_pos_general_settings
        DROP CONSTRAINT IF EXISTS lats_pos_general_settings_user_id_unique;
        
        -- Create unique constraint on user_id + branch_id
        ALTER TABLE lats_pos_general_settings
        ADD CONSTRAINT lats_pos_general_settings_user_branch_unique 
        UNIQUE (user_id, branch_id);
        
        RAISE NOTICE '✅ Added branch_id to lats_pos_general_settings';
    ELSE
        RAISE NOTICE 'ℹ️  branch_id already exists in lats_pos_general_settings';
    END IF;
END $$;

-- =====================================================
-- 2. Add branch_id to lats_pos_receipt_settings
-- =====================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_pos_receipt_settings' 
        AND column_name = 'branch_id'
    ) THEN
        ALTER TABLE lats_pos_receipt_settings 
        ADD COLUMN branch_id UUID;
        
        ALTER TABLE lats_pos_receipt_settings
        ADD CONSTRAINT fk_receipt_settings_branch
        FOREIGN KEY (branch_id) REFERENCES lats_branches(id) ON DELETE CASCADE;
        
        CREATE INDEX IF NOT EXISTS idx_receipt_settings_branch_id 
        ON lats_pos_receipt_settings(branch_id);
        
        -- Update unique constraint
        ALTER TABLE lats_pos_receipt_settings
        DROP CONSTRAINT IF EXISTS lats_pos_receipt_settings_user_id_unique;
        
        ALTER TABLE lats_pos_receipt_settings
        ADD CONSTRAINT lats_pos_receipt_settings_user_branch_unique 
        UNIQUE (user_id, branch_id);
        
        RAISE NOTICE '✅ Added branch_id to lats_pos_receipt_settings';
    ELSE
        RAISE NOTICE 'ℹ️  branch_id already exists in lats_pos_receipt_settings';
    END IF;
END $$;

-- =====================================================
-- 3. Add branch_id to lats_pos_advanced_settings
-- =====================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_pos_advanced_settings' 
        AND column_name = 'branch_id'
    ) THEN
        ALTER TABLE lats_pos_advanced_settings 
        ADD COLUMN branch_id UUID;
        
        ALTER TABLE lats_pos_advanced_settings
        ADD CONSTRAINT fk_advanced_settings_branch
        FOREIGN KEY (branch_id) REFERENCES lats_branches(id) ON DELETE CASCADE;
        
        CREATE INDEX IF NOT EXISTS idx_advanced_settings_branch_id 
        ON lats_pos_advanced_settings(branch_id);
        
        -- Update unique constraint
        ALTER TABLE lats_pos_advanced_settings
        DROP CONSTRAINT IF EXISTS lats_pos_advanced_settings_user_id_business_id_key;
        
        ALTER TABLE lats_pos_advanced_settings
        ADD CONSTRAINT lats_pos_advanced_settings_user_branch_unique 
        UNIQUE (user_id, branch_id);
        
        RAISE NOTICE '✅ Added branch_id to lats_pos_advanced_settings';
    ELSE
        RAISE NOTICE 'ℹ️  branch_id already exists in lats_pos_advanced_settings';
    END IF;
END $$;

-- =====================================================
-- 4. Add branch_id to lats_pos_dynamic_pricing_settings
-- =====================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_pos_dynamic_pricing_settings' 
        AND column_name = 'branch_id'
    ) THEN
        ALTER TABLE lats_pos_dynamic_pricing_settings 
        ADD COLUMN branch_id UUID;
        
        ALTER TABLE lats_pos_dynamic_pricing_settings
        ADD CONSTRAINT fk_dynamic_pricing_settings_branch
        FOREIGN KEY (branch_id) REFERENCES lats_branches(id) ON DELETE CASCADE;
        
        CREATE INDEX IF NOT EXISTS idx_dynamic_pricing_settings_branch_id 
        ON lats_pos_dynamic_pricing_settings(branch_id);
        
        ALTER TABLE lats_pos_dynamic_pricing_settings
        ADD CONSTRAINT lats_pos_dynamic_pricing_user_branch_unique 
        UNIQUE (user_id, branch_id);
        
        RAISE NOTICE '✅ Added branch_id to lats_pos_dynamic_pricing_settings';
    ELSE
        RAISE NOTICE 'ℹ️  branch_id already exists in lats_pos_dynamic_pricing_settings';
    END IF;
END $$;

-- =====================================================
-- 5. Add branch_id to lats_pos_barcode_scanner_settings
-- =====================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_pos_barcode_scanner_settings' 
        AND column_name = 'branch_id'
    ) THEN
        ALTER TABLE lats_pos_barcode_scanner_settings 
        ADD COLUMN branch_id UUID;
        
        ALTER TABLE lats_pos_barcode_scanner_settings
        ADD CONSTRAINT fk_barcode_scanner_settings_branch
        FOREIGN KEY (branch_id) REFERENCES lats_branches(id) ON DELETE CASCADE;
        
        CREATE INDEX IF NOT EXISTS idx_barcode_scanner_settings_branch_id 
        ON lats_pos_barcode_scanner_settings(branch_id);
        
        ALTER TABLE lats_pos_barcode_scanner_settings
        ADD CONSTRAINT lats_pos_barcode_scanner_user_branch_unique 
        UNIQUE (user_id, branch_id);
        
        RAISE NOTICE '✅ Added branch_id to lats_pos_barcode_scanner_settings';
    ELSE
        RAISE NOTICE 'ℹ️  branch_id already exists in lats_pos_barcode_scanner_settings';
    END IF;
END $$;

-- =====================================================
-- 6. Add branch_id to lats_pos_delivery_settings
-- =====================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_pos_delivery_settings' 
        AND column_name = 'branch_id'
    ) THEN
        ALTER TABLE lats_pos_delivery_settings 
        ADD COLUMN branch_id UUID;
        
        ALTER TABLE lats_pos_delivery_settings
        ADD CONSTRAINT fk_delivery_settings_branch
        FOREIGN KEY (branch_id) REFERENCES lats_branches(id) ON DELETE CASCADE;
        
        CREATE INDEX IF NOT EXISTS idx_delivery_settings_branch_id 
        ON lats_pos_delivery_settings(branch_id);
        
        ALTER TABLE lats_pos_delivery_settings
        ADD CONSTRAINT lats_pos_delivery_user_branch_unique 
        UNIQUE (user_id, branch_id);
        
        RAISE NOTICE '✅ Added branch_id to lats_pos_delivery_settings';
    ELSE
        RAISE NOTICE 'ℹ️  branch_id already exists in lats_pos_delivery_settings';
    END IF;
END $$;

-- =====================================================
-- 7. Add branch_id to lats_pos_search_filter_settings
-- =====================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_pos_search_filter_settings' 
        AND column_name = 'branch_id'
    ) THEN
        ALTER TABLE lats_pos_search_filter_settings 
        ADD COLUMN branch_id UUID;
        
        ALTER TABLE lats_pos_search_filter_settings
        ADD CONSTRAINT fk_search_filter_settings_branch
        FOREIGN KEY (branch_id) REFERENCES lats_branches(id) ON DELETE CASCADE;
        
        CREATE INDEX IF NOT EXISTS idx_search_filter_settings_branch_id 
        ON lats_pos_search_filter_settings(branch_id);
        
        ALTER TABLE lats_pos_search_filter_settings
        ADD CONSTRAINT lats_pos_search_filter_user_branch_unique 
        UNIQUE (user_id, branch_id);
        
        RAISE NOTICE '✅ Added branch_id to lats_pos_search_filter_settings';
    ELSE
        RAISE NOTICE 'ℹ️  branch_id already exists in lats_pos_search_filter_settings';
    END IF;
END $$;

-- =====================================================
-- 8. Add branch_id to lats_pos_user_permissions_settings
-- =====================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_pos_user_permissions_settings' 
        AND column_name = 'branch_id'
    ) THEN
        ALTER TABLE lats_pos_user_permissions_settings 
        ADD COLUMN branch_id UUID;
        
        ALTER TABLE lats_pos_user_permissions_settings
        ADD CONSTRAINT fk_user_permissions_settings_branch
        FOREIGN KEY (branch_id) REFERENCES lats_branches(id) ON DELETE CASCADE;
        
        CREATE INDEX IF NOT EXISTS idx_user_permissions_settings_branch_id 
        ON lats_pos_user_permissions_settings(branch_id);
        
        ALTER TABLE lats_pos_user_permissions_settings
        ADD CONSTRAINT lats_pos_user_permissions_user_branch_unique 
        UNIQUE (user_id, branch_id);
        
        RAISE NOTICE '✅ Added branch_id to lats_pos_user_permissions_settings';
    ELSE
        RAISE NOTICE 'ℹ️  branch_id already exists in lats_pos_user_permissions_settings';
    END IF;
END $$;

-- =====================================================
-- 9. Add branch_id to lats_pos_loyalty_customer_settings
-- =====================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_pos_loyalty_customer_settings' 
        AND column_name = 'branch_id'
    ) THEN
        ALTER TABLE lats_pos_loyalty_customer_settings 
        ADD COLUMN branch_id UUID;
        
        ALTER TABLE lats_pos_loyalty_customer_settings
        ADD CONSTRAINT fk_loyalty_customer_settings_branch
        FOREIGN KEY (branch_id) REFERENCES lats_branches(id) ON DELETE CASCADE;
        
        CREATE INDEX IF NOT EXISTS idx_loyalty_customer_settings_branch_id 
        ON lats_pos_loyalty_customer_settings(branch_id);
        
        ALTER TABLE lats_pos_loyalty_customer_settings
        ADD CONSTRAINT lats_pos_loyalty_customer_user_branch_unique 
        UNIQUE (user_id, branch_id);
        
        RAISE NOTICE '✅ Added branch_id to lats_pos_loyalty_customer_settings';
    ELSE
        RAISE NOTICE 'ℹ️  branch_id already exists in lats_pos_loyalty_customer_settings';
    END IF;
END $$;

-- =====================================================
-- 10. Add branch_id to lats_pos_analytics_reporting_settings
-- =====================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_pos_analytics_reporting_settings' 
        AND column_name = 'branch_id'
    ) THEN
        ALTER TABLE lats_pos_analytics_reporting_settings 
        ADD COLUMN branch_id UUID;
        
        ALTER TABLE lats_pos_analytics_reporting_settings
        ADD CONSTRAINT fk_analytics_reporting_settings_branch
        FOREIGN KEY (branch_id) REFERENCES lats_branches(id) ON DELETE CASCADE;
        
        CREATE INDEX IF NOT EXISTS idx_analytics_reporting_settings_branch_id 
        ON lats_pos_analytics_reporting_settings(branch_id);
        
        ALTER TABLE lats_pos_analytics_reporting_settings
        ADD CONSTRAINT lats_pos_analytics_reporting_user_branch_unique 
        UNIQUE (user_id, branch_id);
        
        RAISE NOTICE '✅ Added branch_id to lats_pos_analytics_reporting_settings';
    ELSE
        RAISE NOTICE 'ℹ️  branch_id already exists in lats_pos_analytics_reporting_settings';
    END IF;
END $$;

-- =====================================================
-- 11. Add branch_id to lats_pos_notification_settings
-- =====================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_pos_notification_settings' 
        AND column_name = 'branch_id'
    ) THEN
        ALTER TABLE lats_pos_notification_settings 
        ADD COLUMN branch_id UUID;
        
        ALTER TABLE lats_pos_notification_settings
        ADD CONSTRAINT fk_notification_settings_branch
        FOREIGN KEY (branch_id) REFERENCES lats_branches(id) ON DELETE CASCADE;
        
        CREATE INDEX IF NOT EXISTS idx_notification_settings_branch_id 
        ON lats_pos_notification_settings(branch_id);
        
        ALTER TABLE lats_pos_notification_settings
        ADD CONSTRAINT lats_pos_notification_user_branch_unique 
        UNIQUE (user_id, branch_id);
        
        RAISE NOTICE '✅ Added branch_id to lats_pos_notification_settings';
    ELSE
        RAISE NOTICE 'ℹ️  branch_id already exists in lats_pos_notification_settings';
    END IF;
END $$;

-- =====================================================
-- 12. Add branch_id to lats_pos_integrations_settings
-- =====================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_pos_integrations_settings' 
        AND column_name = 'branch_id'
    ) THEN
        ALTER TABLE lats_pos_integrations_settings 
        ADD COLUMN branch_id UUID;
        
        ALTER TABLE lats_pos_integrations_settings
        ADD CONSTRAINT fk_integrations_settings_branch
        FOREIGN KEY (branch_id) REFERENCES lats_branches(id) ON DELETE CASCADE;
        
        CREATE INDEX IF NOT EXISTS idx_integrations_settings_branch_id 
        ON lats_pos_integrations_settings(branch_id);
        
        ALTER TABLE lats_pos_integrations_settings
        ADD CONSTRAINT lats_pos_integrations_user_branch_unique 
        UNIQUE (user_id, branch_id);
        
        RAISE NOTICE '✅ Added branch_id to lats_pos_integrations_settings';
    ELSE
        RAISE NOTICE 'ℹ️  branch_id already exists in lats_pos_integrations_settings';
    END IF;
END $$;

-- =====================================================
-- 13. Add branch_id to user_settings (if exists)
-- =====================================================
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'user_settings'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'user_settings' 
            AND column_name = 'branch_id'
        ) THEN
            ALTER TABLE user_settings 
            ADD COLUMN branch_id UUID;
            
            ALTER TABLE user_settings
            ADD CONSTRAINT fk_user_settings_branch
            FOREIGN KEY (branch_id) REFERENCES lats_branches(id) ON DELETE CASCADE;
            
            CREATE INDEX IF NOT EXISTS idx_user_settings_branch_id 
            ON user_settings(branch_id);
            
            RAISE NOTICE '✅ Added branch_id to user_settings';
        ELSE
            RAISE NOTICE 'ℹ️  branch_id already exists in user_settings';
        END IF;
    END IF;
END $$;

-- =====================================================
-- 14. Add branch_id to system_settings (if exists)
-- =====================================================
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'system_settings'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'system_settings' 
            AND column_name = 'branch_id'
        ) THEN
            ALTER TABLE system_settings 
            ADD COLUMN branch_id UUID;
            
            ALTER TABLE system_settings
            ADD CONSTRAINT fk_system_settings_branch
            FOREIGN KEY (branch_id) REFERENCES lats_branches(id) ON DELETE CASCADE;
            
            CREATE INDEX IF NOT EXISTS idx_system_settings_branch_id 
            ON system_settings(branch_id);
            
            RAISE NOTICE '✅ Added branch_id to system_settings';
        ELSE
            RAISE NOTICE 'ℹ️  branch_id already exists in system_settings';
        END IF;
    END IF;
END $$;

-- =====================================================
-- 15. Add branch_id to admin_settings (if exists)
-- =====================================================
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'admin_settings'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'admin_settings' 
            AND column_name = 'branch_id'
        ) THEN
            ALTER TABLE admin_settings 
            ADD COLUMN branch_id UUID;
            
            ALTER TABLE admin_settings
            ADD CONSTRAINT fk_admin_settings_branch
            FOREIGN KEY (branch_id) REFERENCES lats_branches(id) ON DELETE CASCADE;
            
            CREATE INDEX IF NOT EXISTS idx_admin_settings_branch_id 
            ON admin_settings(branch_id);
            
            RAISE NOTICE '✅ Added branch_id to admin_settings';
        ELSE
            RAISE NOTICE 'ℹ️  branch_id already exists in admin_settings';
        END IF;
    END IF;
END $$;

-- =====================================================
-- 16. Populate branch_id for existing records
-- =====================================================
-- This will set branch_id based on the user's branch_id
DO $$
DECLARE
    settings_tables TEXT[] := ARRAY[
        'lats_pos_general_settings',
        'lats_pos_receipt_settings',
        'lats_pos_advanced_settings',
        'lats_pos_dynamic_pricing_settings',
        'lats_pos_barcode_scanner_settings',
        'lats_pos_delivery_settings',
        'lats_pos_search_filter_settings',
        'lats_pos_user_permissions_settings',
        'lats_pos_loyalty_customer_settings',
        'lats_pos_analytics_reporting_settings',
        'lats_pos_notification_settings',
        'lats_pos_integrations_settings',
        'user_settings',
        'system_settings',
        'admin_settings'
    ];
    tbl TEXT;
    affected_rows INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔄 Populating branch_id for existing settings records...';
    RAISE NOTICE '';
    
    FOREACH tbl IN ARRAY settings_tables
    LOOP
        -- Check if table exists
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = tbl) THEN
            -- Check if the table has branch_id column
            IF EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = tbl AND column_name = 'branch_id'
            ) THEN
                -- Update NULL branch_id with user's branch_id
                EXECUTE format('
                    UPDATE %I 
                    SET branch_id = u.branch_id
                    FROM users u
                    WHERE %I.user_id = u.id 
                    AND %I.branch_id IS NULL
                    AND u.branch_id IS NOT NULL
                ', tbl, tbl, tbl);
                
                GET DIAGNOSTICS affected_rows = ROW_COUNT;
                
                IF affected_rows > 0 THEN
                    RAISE NOTICE '  ✅ Updated % records in %', affected_rows, tbl;
                END IF;
            END IF;
        END IF;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ Finished populating branch_id for existing settings';
END $$;

-- =====================================================
-- 17. Create helper view for settings isolation check
-- =====================================================
CREATE OR REPLACE VIEW settings_isolation_status AS
SELECT 
    t.table_name,
    EXISTS(
        SELECT 1 FROM information_schema.columns c 
        WHERE c.table_name = t.table_name 
        AND c.column_name = 'branch_id'
    ) as has_branch_id,
    (
        SELECT COUNT(*) 
        FROM information_schema.columns c 
        WHERE c.table_name = t.table_name
    ) as total_columns
FROM information_schema.tables t
WHERE t.table_schema = 'public'
AND t.table_name LIKE '%settings%'
ORDER BY t.table_name;

COMMENT ON VIEW settings_isolation_status IS 
'Shows which settings tables have branch isolation (branch_id column)';

-- =====================================================
-- 18. Success message
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ =====================================================';
    RAISE NOTICE '✅ Branch Isolation Added to Settings Tables!';
    RAISE NOTICE '✅ =====================================================';
    RAISE NOTICE '';
    RAISE NOTICE '📋 What was done:';
    RAISE NOTICE '  1. ✅ Added branch_id column to all POS settings tables';
    RAISE NOTICE '  2. ✅ Created foreign key constraints to branches table';
    RAISE NOTICE '  3. ✅ Created indexes for better query performance';
    RAISE NOTICE '  4. ✅ Updated unique constraints to include branch_id';
    RAISE NOTICE '  5. ✅ Populated branch_id for existing records';
    RAISE NOTICE '  6. ✅ Created settings_isolation_status view';
    RAISE NOTICE '';
    RAISE NOTICE '🔍 To verify isolation is working, run:';
    RAISE NOTICE '   SELECT * FROM settings_isolation_status;';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  IMPORTANT: Update your application code to:';
    RAISE NOTICE '   1. Include branch_id when querying settings';
    RAISE NOTICE '   2. Include branch_id when creating/updating settings';
    RAISE NOTICE '   3. Filter settings by branch_id in API calls';
    RAISE NOTICE '';
END $$;

