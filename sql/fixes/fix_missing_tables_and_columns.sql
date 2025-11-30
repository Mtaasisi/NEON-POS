-- ================================================
-- FIX MISSING TABLES AND COLUMNS
-- ================================================
-- This migration fixes all the missing database tables and columns
-- that are causing errors in the application
-- ================================================

-- ================================================
-- 1. CREATE LOYALTY_POINTS TABLE
-- ================================================

-- Create loyalty_points table (customer_id without FK constraint since customers might be a view)
CREATE TABLE IF NOT EXISTS loyalty_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID, -- No FK constraint since customers might be a view
    branch_id UUID REFERENCES lats_branches(id),
    points NUMERIC NOT NULL DEFAULT 0,
    points_type TEXT NOT NULL CHECK (points_type IN ('earned', 'purchased', 'redeemed', 'expired', 'adjusted')),
    reason TEXT,
    reference_id UUID, -- Can reference sale_id, order_id, etc.
    reference_type TEXT, -- 'sale', 'order', 'manual', etc.
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for loyalty_points
CREATE INDEX IF NOT EXISTS idx_loyalty_points_customer ON loyalty_points(customer_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_points_branch ON loyalty_points(branch_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_points_type ON loyalty_points(points_type);
CREATE INDEX IF NOT EXISTS idx_loyalty_points_created_at ON loyalty_points(created_at);

-- Enable RLS
ALTER TABLE loyalty_points ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Enable read access for all users" ON loyalty_points;
CREATE POLICY "Enable read access for all users" 
    ON loyalty_points FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON loyalty_points;
CREATE POLICY "Enable insert for authenticated users" 
    ON loyalty_points FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for authenticated users" ON loyalty_points;
CREATE POLICY "Enable update for authenticated users" 
    ON loyalty_points FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Enable delete for authenticated users" ON loyalty_points;
CREATE POLICY "Enable delete for authenticated users" 
    ON loyalty_points FOR DELETE USING (true);

-- ================================================
-- 2. CREATE LATS_STORAGE_ROOMS TABLE
-- (or create view if lats_store_rooms exists)
-- ================================================

-- Check if lats_store_rooms exists, if so create a view, otherwise create the table
DO $$
BEGIN
    -- Check if lats_store_rooms table exists
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'lats_store_rooms'
    ) THEN
        -- Create view as alias
        DROP VIEW IF EXISTS lats_storage_rooms;
        CREATE VIEW lats_storage_rooms AS SELECT * FROM lats_store_rooms;
    ELSE
        -- Create the table
        CREATE TABLE IF NOT EXISTS lats_storage_rooms (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL,
            code TEXT UNIQUE,
            description TEXT,
            location TEXT,
            capacity INTEGER,
            max_capacity INTEGER,
            current_capacity INTEGER DEFAULT 0,
            is_active BOOLEAN DEFAULT true,
            is_secure BOOLEAN DEFAULT false,
            requires_access_card BOOLEAN DEFAULT false,
            floor_level INTEGER DEFAULT 0,
            area_sqm NUMERIC,
            color_code TEXT,
            notes TEXT,
            store_location_id UUID,
            branch_id UUID REFERENCES lats_branches(id),
            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ DEFAULT now()
        );
        
        -- Indexes
        CREATE INDEX IF NOT EXISTS idx_lats_storage_rooms_branch ON lats_storage_rooms(branch_id);
        CREATE INDEX IF NOT EXISTS idx_lats_storage_rooms_store_location ON lats_storage_rooms(store_location_id);
        CREATE INDEX IF NOT EXISTS idx_lats_storage_rooms_code ON lats_storage_rooms(code);
    END IF;
END $$;

-- ================================================
-- 3. CREATE LATS_STOCK_TRANSFERS TABLE
-- ================================================

CREATE TABLE IF NOT EXISTS lats_stock_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_number TEXT UNIQUE,
    from_branch_id UUID REFERENCES lats_branches(id),
    to_branch_id UUID REFERENCES lats_branches(id),
    product_id UUID REFERENCES lats_products(id),
    variant_id UUID REFERENCES lats_product_variants(id),
    quantity INTEGER NOT NULL DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'in_transit', 'completed', 'cancelled', 'rejected')),
    requested_by UUID,
    approved_by UUID,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_lats_stock_transfers_from_branch ON lats_stock_transfers(from_branch_id);
CREATE INDEX IF NOT EXISTS idx_lats_stock_transfers_to_branch ON lats_stock_transfers(to_branch_id);
CREATE INDEX IF NOT EXISTS idx_lats_stock_transfers_status ON lats_stock_transfers(status);
CREATE INDEX IF NOT EXISTS idx_lats_stock_transfers_product ON lats_stock_transfers(product_id);
CREATE INDEX IF NOT EXISTS idx_lats_stock_transfers_variant ON lats_stock_transfers(variant_id);

-- Enable RLS
ALTER TABLE lats_stock_transfers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Enable read access for all users" ON lats_stock_transfers;
CREATE POLICY "Enable read access for all users" 
    ON lats_stock_transfers FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON lats_stock_transfers;
CREATE POLICY "Enable insert for authenticated users" 
    ON lats_stock_transfers FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for authenticated users" ON lats_stock_transfers;
CREATE POLICY "Enable update for authenticated users" 
    ON lats_stock_transfers FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Enable delete for authenticated users" ON lats_stock_transfers;
CREATE POLICY "Enable delete for authenticated users" 
    ON lats_stock_transfers FOR DELETE USING (true);

-- ================================================
-- 4. CREATE SPECIAL_ORDERS VIEW/ALIAS
-- (if customer_special_orders exists)
-- ================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'customer_special_orders'
    ) THEN
        DROP VIEW IF EXISTS special_orders;
        CREATE VIEW special_orders AS SELECT * FROM customer_special_orders;
    END IF;
END $$;

-- ================================================
-- 5. CREATE INSTALLMENT_PLANS VIEW/ALIAS
-- (if customer_installment_plans exists)
-- ================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'customer_installment_plans'
    ) THEN
        DROP VIEW IF EXISTS installment_plans;
        CREATE VIEW installment_plans AS SELECT * FROM customer_installment_plans;
    END IF;
END $$;

-- ================================================
-- 6. CREATE BACKUP_LOGS TABLE
-- ================================================

CREATE TABLE IF NOT EXISTS backup_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    backup_type TEXT NOT NULL CHECK (backup_type IN ('full', 'incremental', 'manual', 'scheduled')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
    file_path TEXT,
    file_size BIGINT,
    record_count INTEGER,
    started_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ,
    error_message TEXT,
    created_by UUID,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_backup_logs_type ON backup_logs(backup_type);
CREATE INDEX IF NOT EXISTS idx_backup_logs_status ON backup_logs(status);
CREATE INDEX IF NOT EXISTS idx_backup_logs_created_at ON backup_logs(created_at);

-- Enable RLS
ALTER TABLE backup_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Enable read access for all users" ON backup_logs;
CREATE POLICY "Enable read access for all users" 
    ON backup_logs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON backup_logs;
CREATE POLICY "Enable insert for authenticated users" 
    ON backup_logs FOR INSERT WITH CHECK (true);

-- ================================================
-- 7. ADD MISSING COLUMNS
-- ================================================

-- Add unit_price to lats_spare_parts if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'lats_spare_parts' 
        AND column_name = 'unit_price'
    ) THEN
        ALTER TABLE lats_spare_parts 
        ADD COLUMN unit_price NUMERIC DEFAULT 0;
        
        -- Update existing rows to use selling_price or cost_price as fallback
        UPDATE lats_spare_parts 
        SET unit_price = COALESCE(selling_price, cost_price, 0)
        WHERE unit_price = 0 OR unit_price IS NULL;
    END IF;
END $$;

-- Add storage_room_id to lats_inventory_items if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'lats_inventory_items' 
        AND column_name = 'storage_room_id'
    ) THEN
        ALTER TABLE lats_inventory_items 
        ADD COLUMN storage_room_id UUID;
        
        -- Add foreign key if lats_storage_rooms or lats_store_rooms exists
        IF EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'lats_storage_rooms'
        ) THEN
            ALTER TABLE lats_inventory_items
            ADD CONSTRAINT fk_lats_inventory_items_storage_room 
            FOREIGN KEY (storage_room_id) REFERENCES lats_storage_rooms(id) ON DELETE SET NULL;
        ELSIF EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'lats_store_rooms'
        ) THEN
            ALTER TABLE lats_inventory_items
            ADD CONSTRAINT fk_lats_inventory_items_storage_room 
            FOREIGN KEY (storage_room_id) REFERENCES lats_store_rooms(id) ON DELETE SET NULL;
        END IF;
        
        -- Add index
        CREATE INDEX IF NOT EXISTS idx_lats_inventory_items_storage_room 
        ON lats_inventory_items(storage_room_id);
    END IF;
END $$;

-- Add branch_id to lats_inventory_items if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'lats_inventory_items' 
        AND column_name = 'branch_id'
    ) THEN
        ALTER TABLE lats_inventory_items 
        ADD COLUMN branch_id UUID REFERENCES lats_branches(id);
        
        -- Add index
        CREATE INDEX IF NOT EXISTS idx_lats_inventory_items_branch 
        ON lats_inventory_items(branch_id);
    END IF;
END $$;

-- Add quantity to lats_inventory_items if it doesn't exist (for aggregation queries)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'lats_inventory_items' 
        AND column_name = 'quantity'
    ) THEN
        ALTER TABLE lats_inventory_items 
        ADD COLUMN quantity INTEGER DEFAULT 1;
    END IF;
END $$;

-- ================================================
-- 8. ADD COMMENTS
-- ================================================

COMMENT ON TABLE loyalty_points IS 'Customer loyalty points tracking';
COMMENT ON TABLE lats_stock_transfers IS 'Stock transfers between branches';
COMMENT ON TABLE backup_logs IS 'Database backup operation logs';
COMMENT ON COLUMN lats_spare_parts.unit_price IS 'Unit price for spare parts (fallback to selling_price or cost_price)';
COMMENT ON COLUMN lats_inventory_items.storage_room_id IS 'Storage room where inventory item is located';
COMMENT ON COLUMN lats_inventory_items.quantity IS 'Quantity of items (defaults to 1 for individual items)';

-- ================================================
-- SUCCESS MESSAGE
-- ================================================

SELECT '✅ All missing tables and columns have been created successfully!' AS status;

