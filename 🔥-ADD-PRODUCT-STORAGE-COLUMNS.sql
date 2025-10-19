-- ============================================================================
-- ADD STORAGE LOCATION COLUMNS TO PRODUCTS
-- ============================================================================
-- This migration adds storage_room_id and shelf_id columns to lats_products
-- to support product storage location tracking
-- ============================================================================

-- Add storage_room_id column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_products' AND column_name = 'storage_room_id'
  ) THEN
    ALTER TABLE lats_products 
    ADD COLUMN storage_room_id UUID REFERENCES lats_store_rooms(id) ON DELETE SET NULL;
    RAISE NOTICE '✅ Added storage_room_id column to lats_products';
  ELSE
    RAISE NOTICE '✔️  storage_room_id column already exists';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '⚠️  Error adding storage_room_id: %', SQLERRM;
END $$;

-- Add shelf_id column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_products' AND column_name = 'shelf_id'
  ) THEN
    ALTER TABLE lats_products 
    ADD COLUMN shelf_id UUID REFERENCES lats_store_shelves(id) ON DELETE SET NULL;
    RAISE NOTICE '✅ Added shelf_id column to lats_products';
  ELSE
    RAISE NOTICE '✔️  shelf_id column already exists';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '⚠️  Error adding shelf_id: %', SQLERRM;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_lats_products_storage_room_id 
ON lats_products(storage_room_id);

CREATE INDEX IF NOT EXISTS idx_lats_products_shelf_id 
ON lats_products(shelf_id);

-- Add helpful comment
COMMENT ON COLUMN lats_products.storage_room_id IS 'Reference to the storage room where this product is stored';
COMMENT ON COLUMN lats_products.shelf_id IS 'Reference to the specific shelf where this product is stored';

-- Log index creation
DO $$ 
BEGIN
  RAISE NOTICE '✅ Indexes created for storage location columns';
END $$;

-- Display summary
DO $$
DECLARE
  storage_room_exists BOOLEAN;
  shelf_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_products' AND column_name = 'storage_room_id'
  ) INTO storage_room_exists;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_products' AND column_name = 'shelf_id'
  ) INTO shelf_exists;
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '📦 PRODUCT STORAGE COLUMNS - MIGRATION COMPLETE';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE 'storage_room_id: %', CASE WHEN storage_room_exists THEN '✅ EXISTS' ELSE '❌ MISSING' END;
  RAISE NOTICE 'shelf_id: %', CASE WHEN shelf_exists THEN '✅ EXISTS' ELSE '❌ MISSING' END;
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;

