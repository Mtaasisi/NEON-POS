-- ============================================
-- Fix Database Relationships Script
-- ============================================
-- This script creates missing foreign key constraints
-- Run CHECK_DATABASE_RELATIONSHIPS.sql first to see what's missing
-- ============================================

BEGIN;

-- 1. Fix lats_spare_parts relationships
-- Add foreign key for category_id if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_spare_parts_category'
        AND constraint_type = 'FOREIGN KEY'
    ) THEN
        ALTER TABLE lats_spare_parts
        ADD CONSTRAINT fk_spare_parts_category
        FOREIGN KEY (category_id) 
        REFERENCES lats_categories(id) 
        ON DELETE SET NULL 
        ON UPDATE CASCADE;
        
        RAISE NOTICE 'Created foreign key: fk_spare_parts_category';
    ELSE
        RAISE NOTICE 'Foreign key fk_spare_parts_category already exists';
    END IF;
END $$;

-- Add foreign key for supplier_id if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_spare_parts_supplier'
        AND constraint_type = 'FOREIGN KEY'
    ) THEN
        ALTER TABLE lats_spare_parts
        ADD CONSTRAINT fk_spare_parts_supplier
        FOREIGN KEY (supplier_id) 
        REFERENCES lats_suppliers(id) 
        ON DELETE SET NULL 
        ON UPDATE CASCADE;
        
        RAISE NOTICE 'Created foreign key: fk_spare_parts_supplier';
    ELSE
        RAISE NOTICE 'Foreign key fk_spare_parts_supplier already exists';
    END IF;
END $$;

-- 2. Fix lats_spare_part_variants relationships
-- Add foreign key for spare_part_id if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_spare_part_variants_spare_part'
        AND constraint_type = 'FOREIGN KEY'
    ) THEN
        ALTER TABLE lats_spare_part_variants
        ADD CONSTRAINT fk_spare_part_variants_spare_part
        FOREIGN KEY (spare_part_id) 
        REFERENCES lats_spare_parts(id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE;
        
        RAISE NOTICE 'Created foreign key: fk_spare_part_variants_spare_part';
    ELSE
        RAISE NOTICE 'Foreign key fk_spare_part_variants_spare_part already exists';
    END IF;
END $$;

-- 3. Fix lats_spare_part_usage relationships
-- Add foreign key for spare_part_id if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_spare_part_usage_spare_part'
        AND constraint_type = 'FOREIGN KEY'
    ) THEN
        ALTER TABLE lats_spare_part_usage
        ADD CONSTRAINT fk_spare_part_usage_spare_part
        FOREIGN KEY (spare_part_id) 
        REFERENCES lats_spare_parts(id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE;
        
        RAISE NOTICE 'Created foreign key: fk_spare_part_usage_spare_part';
    ELSE
        RAISE NOTICE 'Foreign key fk_spare_part_usage_spare_part already exists';
    END IF;
END $$;

-- Add foreign key for device_id if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_spare_part_usage_device'
        AND constraint_type = 'FOREIGN KEY'
    ) THEN
        ALTER TABLE lats_spare_part_usage
        ADD CONSTRAINT fk_spare_part_usage_device
        FOREIGN KEY (device_id) 
        REFERENCES devices(id) 
        ON DELETE SET NULL 
        ON UPDATE CASCADE;
        
        RAISE NOTICE 'Created foreign key: fk_spare_part_usage_device';
    ELSE
        RAISE NOTICE 'Foreign key fk_spare_part_usage_device already exists';
    END IF;
END $$;

-- Add foreign key for used_by if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_spare_part_usage_user'
        AND constraint_type = 'FOREIGN KEY'
    ) THEN
        ALTER TABLE lats_spare_part_usage
        ADD CONSTRAINT fk_spare_part_usage_user
        FOREIGN KEY (used_by) 
        REFERENCES auth_users(id) 
        ON DELETE SET NULL 
        ON UPDATE CASCADE;
        
        RAISE NOTICE 'Created foreign key: fk_spare_part_usage_user';
    ELSE
        RAISE NOTICE 'Foreign key fk_spare_part_usage_user already exists';
    END IF;
END $$;

-- 4. Fix lats_products relationships
-- Add foreign key for category_id if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_products_category'
        AND constraint_type = 'FOREIGN KEY'
    ) THEN
        ALTER TABLE lats_products
        ADD CONSTRAINT fk_products_category
        FOREIGN KEY (category_id) 
        REFERENCES lats_categories(id) 
        ON DELETE SET NULL 
        ON UPDATE CASCADE;
        
        RAISE NOTICE 'Created foreign key: fk_products_category';
    ELSE
        RAISE NOTICE 'Foreign key fk_products_category already exists';
    END IF;
END $$;

-- Add foreign key for supplier_id if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_products_supplier'
        AND constraint_type = 'FOREIGN KEY'
    ) THEN
        ALTER TABLE lats_products
        ADD CONSTRAINT fk_products_supplier
        FOREIGN KEY (supplier_id) 
        REFERENCES lats_suppliers(id) 
        ON DELETE SET NULL 
        ON UPDATE CASCADE;
        
        RAISE NOTICE 'Created foreign key: fk_products_supplier';
    ELSE
        RAISE NOTICE 'Foreign key fk_products_supplier already exists';
    END IF;
END $$;

-- Add foreign key for branch_id if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_products_branch'
        AND constraint_type = 'FOREIGN KEY'
    ) THEN
        ALTER TABLE lats_products
        ADD CONSTRAINT fk_products_branch
        FOREIGN KEY (branch_id) 
        REFERENCES lats_branches(id) 
        ON DELETE SET NULL 
        ON UPDATE CASCADE;
        
        RAISE NOTICE 'Created foreign key: fk_products_branch';
    ELSE
        RAISE NOTICE 'Foreign key fk_products_branch already exists';
    END IF;
END $$;

-- Add foreign key for storage_room_id if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_products_storage_room'
        AND constraint_type = 'FOREIGN KEY'
    ) THEN
        ALTER TABLE lats_products
        ADD CONSTRAINT fk_products_storage_room
        FOREIGN KEY (storage_room_id) 
        REFERENCES lats_store_rooms(id) 
        ON DELETE SET NULL 
        ON UPDATE CASCADE;
        
        RAISE NOTICE 'Created foreign key: fk_products_storage_room';
    ELSE
        RAISE NOTICE 'Foreign key fk_products_storage_room already exists';
    END IF;
END $$;

-- Add foreign key for store_shelf_id if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_products_store_shelf'
        AND constraint_type = 'FOREIGN KEY'
    ) THEN
        ALTER TABLE lats_products
        ADD CONSTRAINT fk_products_store_shelf
        FOREIGN KEY (store_shelf_id) 
        REFERENCES lats_store_shelves(id) 
        ON DELETE SET NULL 
        ON UPDATE CASCADE;
        
        RAISE NOTICE 'Created foreign key: fk_products_store_shelf';
    ELSE
        RAISE NOTICE 'Foreign key fk_products_store_shelf already exists';
    END IF;
END $$;

-- 5. Fix lats_product_variants relationships
-- Add foreign key for product_id if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_product_variants_product'
        AND constraint_type = 'FOREIGN KEY'
    ) THEN
        ALTER TABLE lats_product_variants
        ADD CONSTRAINT fk_product_variants_product
        FOREIGN KEY (product_id) 
        REFERENCES lats_products(id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE;
        
        RAISE NOTICE 'Created foreign key: fk_product_variants_product';
    ELSE
        RAISE NOTICE 'Foreign key fk_product_variants_product already exists';
    END IF;
END $$;

-- 6. Fix lats_stock_movements relationships
-- Add foreign key for product_id if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_stock_movements_product'
        AND constraint_type = 'FOREIGN KEY'
    ) THEN
        ALTER TABLE lats_stock_movements
        ADD CONSTRAINT fk_stock_movements_product
        FOREIGN KEY (product_id) 
        REFERENCES lats_products(id) 
        ON DELETE SET NULL 
        ON UPDATE CASCADE;
        
        RAISE NOTICE 'Created foreign key: fk_stock_movements_product';
    ELSE
        RAISE NOTICE 'Foreign key fk_stock_movements_product already exists';
    END IF;
END $$;

-- Add foreign key for variant_id if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_stock_movements_variant'
        AND constraint_type = 'FOREIGN KEY'
    ) THEN
        ALTER TABLE lats_stock_movements
        ADD CONSTRAINT fk_stock_movements_variant
        FOREIGN KEY (variant_id) 
        REFERENCES lats_product_variants(id) 
        ON DELETE SET NULL 
        ON UPDATE CASCADE;
        
        RAISE NOTICE 'Created foreign key: fk_stock_movements_variant';
    ELSE
        RAISE NOTICE 'Foreign key fk_stock_movements_variant already exists';
    END IF;
END $$;

-- Add foreign key for branch_id if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_stock_movements_branch'
        AND constraint_type = 'FOREIGN KEY'
    ) THEN
        ALTER TABLE lats_stock_movements
        ADD CONSTRAINT fk_stock_movements_branch
        FOREIGN KEY (branch_id) 
        REFERENCES lats_branches(id) 
        ON DELETE SET NULL 
        ON UPDATE CASCADE;
        
        RAISE NOTICE 'Created foreign key: fk_stock_movements_branch';
    ELSE
        RAISE NOTICE 'Foreign key fk_stock_movements_branch already exists';
    END IF;
END $$;

-- Add foreign key for from_branch_id if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_stock_movements_from_branch'
        AND constraint_type = 'FOREIGN KEY'
    ) THEN
        ALTER TABLE lats_stock_movements
        ADD CONSTRAINT fk_stock_movements_from_branch
        FOREIGN KEY (from_branch_id) 
        REFERENCES lats_branches(id) 
        ON DELETE SET NULL 
        ON UPDATE CASCADE;
        
        RAISE NOTICE 'Created foreign key: fk_stock_movements_from_branch';
    ELSE
        RAISE NOTICE 'Foreign key fk_stock_movements_from_branch already exists';
    END IF;
END $$;

-- Add foreign key for to_branch_id if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_stock_movements_to_branch'
        AND constraint_type = 'FOREIGN KEY'
    ) THEN
        ALTER TABLE lats_stock_movements
        ADD CONSTRAINT fk_stock_movements_to_branch
        FOREIGN KEY (to_branch_id) 
        REFERENCES lats_branches(id) 
        ON DELETE SET NULL 
        ON UPDATE CASCADE;
        
        RAISE NOTICE 'Created foreign key: fk_stock_movements_to_branch';
    ELSE
        RAISE NOTICE 'Foreign key fk_stock_movements_to_branch already exists';
    END IF;
END $$;

-- 7. Fix lats_stock_transfers relationships
-- Add foreign key for from_branch_id if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_stock_transfers_from_branch'
        AND constraint_type = 'FOREIGN KEY'
    ) THEN
        ALTER TABLE lats_stock_transfers
        ADD CONSTRAINT fk_stock_transfers_from_branch
        FOREIGN KEY (from_branch_id) 
        REFERENCES lats_branches(id) 
        ON DELETE SET NULL 
        ON UPDATE CASCADE;
        
        RAISE NOTICE 'Created foreign key: fk_stock_transfers_from_branch';
    ELSE
        RAISE NOTICE 'Foreign key fk_stock_transfers_from_branch already exists';
    END IF;
END $$;

-- Add foreign key for to_branch_id if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_stock_transfers_to_branch'
        AND constraint_type = 'FOREIGN KEY'
    ) THEN
        ALTER TABLE lats_stock_transfers
        ADD CONSTRAINT fk_stock_transfers_to_branch
        FOREIGN KEY (to_branch_id) 
        REFERENCES lats_branches(id) 
        ON DELETE SET NULL 
        ON UPDATE CASCADE;
        
        RAISE NOTICE 'Created foreign key: fk_stock_transfers_to_branch';
    ELSE
        RAISE NOTICE 'Foreign key fk_stock_transfers_to_branch already exists';
    END IF;
END $$;

-- Add foreign key for product_id if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_stock_transfers_product'
        AND constraint_type = 'FOREIGN KEY'
    ) THEN
        ALTER TABLE lats_stock_transfers
        ADD CONSTRAINT fk_stock_transfers_product
        FOREIGN KEY (product_id) 
        REFERENCES lats_products(id) 
        ON DELETE SET NULL 
        ON UPDATE CASCADE;
        
        RAISE NOTICE 'Created foreign key: fk_stock_transfers_product';
    ELSE
        RAISE NOTICE 'Foreign key fk_stock_transfers_product already exists';
    END IF;
END $$;

-- Add foreign key for variant_id if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_stock_transfers_variant'
        AND constraint_type = 'FOREIGN KEY'
    ) THEN
        ALTER TABLE lats_stock_transfers
        ADD CONSTRAINT fk_stock_transfers_variant
        FOREIGN KEY (variant_id) 
        REFERENCES lats_product_variants(id) 
        ON DELETE SET NULL 
        ON UPDATE CASCADE;
        
        RAISE NOTICE 'Created foreign key: fk_stock_transfers_variant';
    ELSE
        RAISE NOTICE 'Foreign key fk_stock_transfers_variant already exists';
    END IF;
END $$;

-- 8. Fix lats_store_rooms relationships
-- Add foreign key for store_location_id if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_store_rooms_location'
        AND constraint_type = 'FOREIGN KEY'
    ) THEN
        ALTER TABLE lats_store_rooms
        ADD CONSTRAINT fk_store_rooms_location
        FOREIGN KEY (store_location_id) 
        REFERENCES store_locations(id) 
        ON DELETE SET NULL 
        ON UPDATE CASCADE;
        
        RAISE NOTICE 'Created foreign key: fk_store_rooms_location';
    ELSE
        RAISE NOTICE 'Foreign key fk_store_rooms_location already exists';
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_spare_parts_category_id ON lats_spare_parts(category_id);
CREATE INDEX IF NOT EXISTS idx_spare_parts_supplier_id ON lats_spare_parts(supplier_id);
CREATE INDEX IF NOT EXISTS idx_spare_part_variants_spare_part_id ON lats_spare_part_variants(spare_part_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON lats_products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_supplier_id ON lats_products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_products_branch_id ON lats_products(branch_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON lats_product_variants(product_id);

COMMIT;

-- Final verification
SELECT 
    '=== RELATIONSHIPS FIXED ===' as status,
    COUNT(*) as total_foreign_keys
FROM information_schema.table_constraints
WHERE constraint_type = 'FOREIGN KEY'
  AND table_schema = 'public';
