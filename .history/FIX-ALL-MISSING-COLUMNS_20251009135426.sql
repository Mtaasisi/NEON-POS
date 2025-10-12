-- ============================================
-- FIX ALL MISSING COLUMNS - Comprehensive Fix
-- ============================================
-- Run this script to fix all column-related 400 errors
-- Generated: 2025-10-09

-- 1. Fix whatsapp_instances_comprehensive table - add user_id column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'whatsapp_instances_comprehensive' 
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE whatsapp_instances_comprehensive 
        ADD COLUMN user_id UUID;
        
        COMMENT ON COLUMN whatsapp_instances_comprehensive.user_id IS 'User who created/owns this instance';
        RAISE NOTICE '✅ Added user_id to whatsapp_instances_comprehensive';
    ELSE
        RAISE NOTICE '✓ whatsapp_instances_comprehensive.user_id already exists';
    END IF;
END $$;

-- 2. Fix notifications table - add user_id column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' 
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE notifications 
        ADD COLUMN user_id UUID;
        
        COMMENT ON COLUMN notifications.user_id IS 'User who receives this notification';
        RAISE NOTICE '✅ Added user_id to notifications';
    ELSE
        RAISE NOTICE '✓ notifications.user_id already exists';
    END IF;
END $$;

-- 3. Fix devices table - add issue_description column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'devices' 
        AND column_name = 'issue_description'
    ) THEN
        ALTER TABLE devices 
        ADD COLUMN issue_description TEXT;
        
        COMMENT ON COLUMN devices.issue_description IS 'Description of the device issue';
        
        -- Copy from problem_description if it exists
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'devices' 
            AND column_name = 'problem_description'
        ) THEN
            UPDATE devices SET issue_description = problem_description WHERE problem_description IS NOT NULL;
            RAISE NOTICE '✅ Added issue_description to devices and copied from problem_description';
        ELSE
            RAISE NOTICE '✅ Added issue_description to devices';
        END IF;
    ELSE
        RAISE NOTICE '✓ devices.issue_description already exists';
    END IF;
END $$;

-- 4. Fix devices table - add assigned_to column  
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'devices' 
        AND column_name = 'assigned_to'
    ) THEN
        ALTER TABLE devices 
        ADD COLUMN assigned_to UUID;
        
        COMMENT ON COLUMN devices.assigned_to IS 'Technician assigned to this device';
        RAISE NOTICE '✅ Added assigned_to to devices';
    ELSE
        RAISE NOTICE '✓ devices.assigned_to already exists';
    END IF;
END $$;

-- 5. Fix user_daily_goals table - add is_active column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_daily_goals' 
        AND column_name = 'is_active'
    ) THEN
        ALTER TABLE user_daily_goals 
        ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
        
        COMMENT ON COLUMN user_daily_goals.is_active IS 'Whether this goal is currently active';
        
        -- Update existing records to be active
        UPDATE user_daily_goals SET is_active = TRUE WHERE is_active IS NULL;
        RAISE NOTICE '✅ Added is_active to user_daily_goals';
    ELSE
        RAISE NOTICE '✓ user_daily_goals.is_active already exists';
    END IF;
END $$;

-- 6. Fix user_daily_goals unique constraint issue
-- Drop the old constraint and create a new one that includes goal_type
DO $$ 
BEGIN
    -- Drop the old constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'user_daily_goals' 
        AND constraint_name = 'user_daily_goals_user_id_date_key'
    ) THEN
        ALTER TABLE user_daily_goals 
        DROP CONSTRAINT user_daily_goals_user_id_date_key;
        RAISE NOTICE '✅ Dropped old constraint user_daily_goals_user_id_date_key';
    END IF;
    
    -- Create new unique constraint that includes goal_type
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'user_daily_goals' 
        AND constraint_name = 'user_daily_goals_user_id_date_goal_type_key'
    ) THEN
        ALTER TABLE user_daily_goals 
        ADD CONSTRAINT user_daily_goals_user_id_date_goal_type_key 
        UNIQUE (user_id, date, goal_type);
        RAISE NOTICE '✅ Created new constraint user_daily_goals_user_id_date_goal_type_key';
    ELSE
        RAISE NOTICE '✓ Constraint user_daily_goals_user_id_date_goal_type_key already exists';
    END IF;
END $$;

-- 7. Fix lats_products table - add selling_price column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_products' 
        AND column_name = 'selling_price'
    ) THEN
        ALTER TABLE lats_products 
        ADD COLUMN selling_price NUMERIC(10, 2) DEFAULT 0;
        
        COMMENT ON COLUMN lats_products.selling_price IS 'Selling price of the product';
        RAISE NOTICE '✅ Added selling_price to lats_products';
    ELSE
        RAISE NOTICE '✓ lats_products.selling_price already exists';
    END IF;
END $$;

-- 8. Fix lats_products table - add cost_price column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_products' 
        AND column_name = 'cost_price'
    ) THEN
        ALTER TABLE lats_products 
        ADD COLUMN cost_price NUMERIC(10, 2) DEFAULT 0;
        
        COMMENT ON COLUMN lats_products.cost_price IS 'Cost price of the product';
        RAISE NOTICE '✅ Added cost_price to lats_products';
    ELSE
        RAISE NOTICE '✓ lats_products.cost_price already exists';
    END IF;
END $$;

-- 9. Fix lats_products table - add stock_quantity column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_products' 
        AND column_name = 'stock_quantity'
    ) THEN
        ALTER TABLE lats_products 
        ADD COLUMN stock_quantity INTEGER DEFAULT 0;
        
        COMMENT ON COLUMN lats_products.stock_quantity IS 'Current stock quantity';
        RAISE NOTICE '✅ Added stock_quantity to lats_products';
    ELSE
        RAISE NOTICE '✓ lats_products.stock_quantity already exists';
    END IF;
END $$;

-- 10. Fix lats_products table - add min_stock_level column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_products' 
        AND column_name = 'min_stock_level'
    ) THEN
        ALTER TABLE lats_products 
        ADD COLUMN min_stock_level INTEGER DEFAULT 0;
        
        COMMENT ON COLUMN lats_products.min_stock_level IS 'Minimum stock level for alerts';
        RAISE NOTICE '✅ Added min_stock_level to lats_products';
    ELSE
        RAISE NOTICE '✓ lats_products.min_stock_level already exists';
    END IF;
END $$;

-- 11. Fix lats_products table - add total_quantity column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_products' 
        AND column_name = 'total_quantity'
    ) THEN
        ALTER TABLE lats_products 
        ADD COLUMN total_quantity INTEGER DEFAULT 0;
        
        COMMENT ON COLUMN lats_products.total_quantity IS 'Total quantity including variants';
        RAISE NOTICE '✅ Added total_quantity to lats_products';
    ELSE
        RAISE NOTICE '✓ lats_products.total_quantity already exists';
    END IF;
END $$;

-- 12. Fix lats_products table - add total_value column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_products' 
        AND column_name = 'total_value'
    ) THEN
        ALTER TABLE lats_products 
        ADD COLUMN total_value NUMERIC(12, 2) DEFAULT 0;
        
        COMMENT ON COLUMN lats_products.total_value IS 'Total value of inventory';
        RAISE NOTICE '✅ Added total_value to lats_products';
    ELSE
        RAISE NOTICE '✓ lats_products.total_value already exists';
    END IF;
END $$;

-- 13. Fix lats_products table - add storage_room_id column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_products' 
        AND column_name = 'storage_room_id'
    ) THEN
        ALTER TABLE lats_products 
        ADD COLUMN storage_room_id UUID;
        
        COMMENT ON COLUMN lats_products.storage_room_id IS 'Storage room where product is located';
        RAISE NOTICE '✅ Added storage_room_id to lats_products';
    ELSE
        RAISE NOTICE '✓ lats_products.storage_room_id already exists';
    END IF;
END $$;

-- 14. Fix lats_products table - add store_shelf_id column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_products' 
        AND column_name = 'store_shelf_id'
    ) THEN
        ALTER TABLE lats_products 
        ADD COLUMN store_shelf_id UUID;
        
        COMMENT ON COLUMN lats_products.store_shelf_id IS 'Shelf where product is stored';
        RAISE NOTICE '✅ Added store_shelf_id to lats_products';
    ELSE
        RAISE NOTICE '✓ lats_products.store_shelf_id already exists';
    END IF;
END $$;

-- 15. Fix lats_products table - add tags column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_products' 
        AND column_name = 'tags'
    ) THEN
        ALTER TABLE lats_products 
        ADD COLUMN tags TEXT[] DEFAULT '{}';
        
        COMMENT ON COLUMN lats_products.tags IS 'Product tags for filtering and search';
        RAISE NOTICE '✅ Added tags to lats_products';
    ELSE
        RAISE NOTICE '✓ lats_products.tags already exists';
    END IF;
END $$;

-- 16. Fix lats_products table - add attributes column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_products' 
        AND column_name = 'attributes'
    ) THEN
        ALTER TABLE lats_products 
        ADD COLUMN attributes JSONB DEFAULT '{}'::jsonb;
        
        COMMENT ON COLUMN lats_products.attributes IS 'Product attributes (color, size, condition, etc.)';
        RAISE NOTICE '✅ Added attributes to lats_products';
    ELSE
        RAISE NOTICE '✓ lats_products.attributes already exists';
    END IF;
END $$;

-- 17. Fix lats_products table - add metadata column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_products' 
        AND column_name = 'metadata'
    ) THEN
        ALTER TABLE lats_products 
        ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
        
        COMMENT ON COLUMN lats_products.metadata IS 'Additional metadata (useVariants, variantCount, createdBy, etc.)';
        RAISE NOTICE '✅ Added metadata to lats_products';
    ELSE
        RAISE NOTICE '✓ lats_products.metadata already exists';
    END IF;
END $$;

-- 15. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_user_id 
ON whatsapp_instances_comprehensive(user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id 
ON notifications(user_id);

CREATE INDEX IF NOT EXISTS idx_devices_assigned_to 
ON devices(assigned_to);

CREATE INDEX IF NOT EXISTS idx_user_daily_goals_active 
ON user_daily_goals(user_id, date, is_active) 
WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_lats_products_storage 
ON lats_products(storage_room_id, store_shelf_id);

CREATE INDEX IF NOT EXISTS idx_lats_products_category 
ON lats_products(category_id);

-- ============================================
-- Verification Section
-- ============================================

-- Check all fixes
SELECT 
    '================================================' as "STATUS CHECK",
    'whatsapp_instances_comprehensive' as table_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'whatsapp_instances_comprehensive' AND column_name = 'user_id'
    ) THEN '✅ user_id exists' ELSE '❌ user_id missing' END as column_status
UNION ALL
SELECT 
    '================================================',
    'notifications',
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' AND column_name = 'user_id'
    ) THEN '✅ user_id exists' ELSE '❌ user_id missing' END
UNION ALL
SELECT 
    '================================================',
    'devices',
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'devices' AND column_name = 'issue_description'
    ) THEN '✅ issue_description exists' ELSE '❌ issue_description missing' END
UNION ALL
SELECT 
    '================================================',
    'devices',
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'devices' AND column_name = 'assigned_to'
    ) THEN '✅ assigned_to exists' ELSE '❌ assigned_to missing' END
UNION ALL
SELECT 
    '================================================',
    'user_daily_goals',
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_daily_goals' AND column_name = 'is_active'
    ) THEN '✅ is_active exists' ELSE '❌ is_active missing' END
UNION ALL
SELECT 
    '================================================',
    'user_daily_goals constraint',
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'user_daily_goals' 
        AND constraint_name = 'user_daily_goals_user_id_date_goal_type_key'
    ) THEN '✅ New constraint exists' ELSE '❌ New constraint missing' END
UNION ALL
SELECT 
    '================================================',
    'lats_products',
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_products' AND column_name = 'selling_price'
    ) THEN '✅ selling_price exists' ELSE '❌ selling_price missing' END
UNION ALL
SELECT 
    '================================================',
    'lats_products',
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_products' AND column_name = 'cost_price'
    ) THEN '✅ cost_price exists' ELSE '❌ cost_price missing' END
UNION ALL
SELECT 
    '================================================',
    'lats_products',
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_products' AND column_name = 'stock_quantity'
    ) THEN '✅ stock_quantity exists' ELSE '❌ stock_quantity missing' END
UNION ALL
SELECT 
    '================================================',
    'lats_products',
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_products' AND column_name = 'min_stock_level'
    ) THEN '✅ min_stock_level exists' ELSE '❌ min_stock_level missing' END
UNION ALL
SELECT 
    '================================================',
    'lats_products',
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_products' AND column_name = 'total_quantity'
    ) THEN '✅ total_quantity exists' ELSE '❌ total_quantity missing' END
UNION ALL
SELECT 
    '================================================',
    'lats_products',
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_products' AND column_name = 'total_value'
    ) THEN '✅ total_value exists' ELSE '❌ total_value missing' END
UNION ALL
SELECT 
    '================================================',
    'lats_products',
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_products' AND column_name = 'storage_room_id'
    ) THEN '✅ storage_room_id exists' ELSE '❌ storage_room_id missing' END
UNION ALL
SELECT 
    '================================================',
    'lats_products',
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_products' AND column_name = 'store_shelf_id'
    ) THEN '✅ store_shelf_id exists' ELSE '❌ store_shelf_id missing' END;

-- Final success message
SELECT '
================================================
✅ ALL SCHEMA FIXES COMPLETED SUCCESSFULLY!
================================================

Your database now has all the required columns:
- whatsapp_instances_comprehensive.user_id
- notifications.user_id  
- devices.issue_description
- devices.assigned_to
- user_daily_goals.is_active
- lats_products.selling_price
- lats_products.cost_price
- lats_products.stock_quantity
- lats_products.min_stock_level
- lats_products.total_quantity
- lats_products.total_value
- lats_products.storage_room_id
- lats_products.store_shelf_id

The duplicate key constraint has been fixed.
All indexes have been created.

You can now run your application without errors!
================================================
' AS "COMPLETION MESSAGE";

