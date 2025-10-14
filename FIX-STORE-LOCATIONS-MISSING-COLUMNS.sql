-- ============================================
-- FIX STORE LOCATIONS - ADD MISSING COLUMNS
-- Adds all the missing columns for multi-branch management
-- Date: October 12, 2025
-- ============================================

-- Add Data Isolation columns
ALTER TABLE store_locations 
ADD COLUMN IF NOT EXISTS data_isolation_mode TEXT DEFAULT 'shared' CHECK (data_isolation_mode IN ('shared', 'isolated', 'hybrid'));

ALTER TABLE store_locations 
ADD COLUMN IF NOT EXISTS share_products BOOLEAN DEFAULT true;

ALTER TABLE store_locations 
ADD COLUMN IF NOT EXISTS share_customers BOOLEAN DEFAULT true;

ALTER TABLE store_locations 
ADD COLUMN IF NOT EXISTS share_inventory BOOLEAN DEFAULT false;

ALTER TABLE store_locations 
ADD COLUMN IF NOT EXISTS share_suppliers BOOLEAN DEFAULT true;

ALTER TABLE store_locations 
ADD COLUMN IF NOT EXISTS share_categories BOOLEAN DEFAULT true;

ALTER TABLE store_locations 
ADD COLUMN IF NOT EXISTS share_employees BOOLEAN DEFAULT false;

-- Add Transfer & Sync Options
ALTER TABLE store_locations 
ADD COLUMN IF NOT EXISTS allow_stock_transfer BOOLEAN DEFAULT true;

ALTER TABLE store_locations 
ADD COLUMN IF NOT EXISTS auto_sync_products BOOLEAN DEFAULT true;

ALTER TABLE store_locations 
ADD COLUMN IF NOT EXISTS auto_sync_prices BOOLEAN DEFAULT true;

ALTER TABLE store_locations 
ADD COLUMN IF NOT EXISTS require_approval_for_transfers BOOLEAN DEFAULT false;

-- Add Permissions
ALTER TABLE store_locations 
ADD COLUMN IF NOT EXISTS can_view_other_branches BOOLEAN DEFAULT false;

ALTER TABLE store_locations 
ADD COLUMN IF NOT EXISTS can_transfer_to_branches TEXT[] DEFAULT '{}';

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_store_locations_isolation_mode ON store_locations(data_isolation_mode);
CREATE INDEX IF NOT EXISTS idx_store_locations_share_inventory ON store_locations(share_inventory);

-- Success message
DO $$
DECLARE
  column_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO column_count 
  FROM information_schema.columns 
  WHERE table_name = 'store_locations';
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ store_locations table columns updated successfully!';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  RAISE NOTICE '📦 Added Columns for Multi-Branch Management:';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 Data Isolation:';
  RAISE NOTICE '   ✓ data_isolation_mode (shared/isolated/hybrid)';
  RAISE NOTICE '   ✓ share_products';
  RAISE NOTICE '   ✓ share_customers';
  RAISE NOTICE '   ✓ share_inventory';
  RAISE NOTICE '   ✓ share_suppliers';
  RAISE NOTICE '   ✓ share_categories';
  RAISE NOTICE '   ✓ share_employees';
  RAISE NOTICE '';
  RAISE NOTICE '🔄 Transfer & Sync Options:';
  RAISE NOTICE '   ✓ allow_stock_transfer';
  RAISE NOTICE '   ✓ auto_sync_products';
  RAISE NOTICE '   ✓ auto_sync_prices';
  RAISE NOTICE '   ✓ require_approval_for_transfers';
  RAISE NOTICE '';
  RAISE NOTICE '👥 Permissions:';
  RAISE NOTICE '   ✓ can_view_other_branches';
  RAISE NOTICE '   ✓ can_transfer_to_branches';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Total columns in store_locations: %', column_count;
  RAISE NOTICE '';
  RAISE NOTICE '✨ Store Management now fully functional!';
  RAISE NOTICE '   You can now:';
  RAISE NOTICE '   • Create new stores/branches';
  RAISE NOTICE '   • Configure data isolation';
  RAISE NOTICE '   • Set up inventory sharing';
  RAISE NOTICE '   • Enable stock transfers';
  RAISE NOTICE '   • Manage branch permissions';
  RAISE NOTICE '';
END $$;

