-- Fix: Add missing columns to existing storage tables to match what the code expects

-- ============================================================================
-- 1. ADD MISSING COLUMNS TO lats_store_rooms
-- ============================================================================
DO $$
BEGIN
  -- Add store_location_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_store_rooms' AND column_name = 'store_location_id'
  ) THEN
    ALTER TABLE lats_store_rooms ADD COLUMN store_location_id UUID REFERENCES lats_store_locations(id) ON DELETE CASCADE;
    -- Set to main branch for existing rooms
    UPDATE lats_store_rooms SET store_location_id = (SELECT id FROM lats_store_locations WHERE is_main_branch = true LIMIT 1);
    RAISE NOTICE '✅ Added store_location_id column to lats_store_rooms';
  END IF;

  -- Add code column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_store_rooms' AND column_name = 'code'
  ) THEN
    ALTER TABLE lats_store_rooms ADD COLUMN code TEXT;
    -- Set codes for existing rooms
    UPDATE lats_store_rooms SET code = 'A' WHERE name ILIKE '%warehouse%';
    UPDATE lats_store_rooms SET code = 'B' WHERE name ILIKE '%retail%';
    UPDATE lats_store_rooms SET code = 'C' WHERE name ILIKE '%office%';
    UPDATE lats_store_rooms SET code = LEFT(name, 1) WHERE code IS NULL;
    RAISE NOTICE '✅ Added code column to lats_store_rooms';
  END IF;

  -- Add floor_level column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_store_rooms' AND column_name = 'floor_level'
  ) THEN
    ALTER TABLE lats_store_rooms ADD COLUMN floor_level INTEGER DEFAULT 0;
    RAISE NOTICE '✅ Added floor_level column to lats_store_rooms';
  END IF;

  -- Add other useful columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_store_rooms' AND column_name = 'area_sqm'
  ) THEN
    ALTER TABLE lats_store_rooms ADD COLUMN area_sqm NUMERIC;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_store_rooms' AND column_name = 'max_capacity'
  ) THEN
    ALTER TABLE lats_store_rooms ADD COLUMN max_capacity INTEGER;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_store_rooms' AND column_name = 'current_capacity'
  ) THEN
    ALTER TABLE lats_store_rooms ADD COLUMN current_capacity INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_store_rooms' AND column_name = 'is_secure'
  ) THEN
    ALTER TABLE lats_store_rooms ADD COLUMN is_secure BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_store_rooms' AND column_name = 'requires_access_card'
  ) THEN
    ALTER TABLE lats_store_rooms ADD COLUMN requires_access_card BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_store_rooms' AND column_name = 'color_code'
  ) THEN
    ALTER TABLE lats_store_rooms ADD COLUMN color_code TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_store_rooms' AND column_name = 'notes'
  ) THEN
    ALTER TABLE lats_store_rooms ADD COLUMN notes TEXT;
  END IF;
END $$;

-- ============================================================================
-- 2. ADD MISSING COLUMNS TO lats_store_shelves
-- ============================================================================
DO $$
BEGIN
  -- Add store_location_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_store_shelves' AND column_name = 'store_location_id'
  ) THEN
    ALTER TABLE lats_store_shelves ADD COLUMN store_location_id UUID REFERENCES lats_store_locations(id) ON DELETE CASCADE;
    -- Set to main branch for existing shelves
    UPDATE lats_store_shelves SET store_location_id = (SELECT id FROM lats_store_locations WHERE is_main_branch = true LIMIT 1);
    RAISE NOTICE '✅ Added store_location_id column to lats_store_shelves';
  END IF;

  -- Add storage_room_id column (in addition to room_id for backward compatibility)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_store_shelves' AND column_name = 'storage_room_id'
  ) THEN
    ALTER TABLE lats_store_shelves ADD COLUMN storage_room_id UUID REFERENCES lats_store_rooms(id) ON DELETE CASCADE;
    -- Copy data from room_id to storage_room_id
    UPDATE lats_store_shelves SET storage_room_id = room_id;
    RAISE NOTICE '✅ Added storage_room_id column to lats_store_shelves';
  END IF;

  -- Add code column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_store_shelves' AND column_name = 'code'
  ) THEN
    ALTER TABLE lats_store_shelves ADD COLUMN code TEXT;
    -- Set codes based on name for existing shelves
    UPDATE lats_store_shelves SET code = name WHERE code IS NULL;
    RAISE NOTICE '✅ Added code column to lats_store_shelves';
  END IF;

  -- Add many more columns that the code expects
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_store_shelves' AND column_name = 'description') THEN
    ALTER TABLE lats_store_shelves ADD COLUMN description TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_store_shelves' AND column_name = 'shelf_type') THEN
    ALTER TABLE lats_store_shelves ADD COLUMN shelf_type TEXT DEFAULT 'standard';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_store_shelves' AND column_name = 'section') THEN
    ALTER TABLE lats_store_shelves ADD COLUMN section TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_store_shelves' AND column_name = 'aisle') THEN
    ALTER TABLE lats_store_shelves ADD COLUMN aisle TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_store_shelves' AND column_name = 'row_number') THEN
    ALTER TABLE lats_store_shelves ADD COLUMN row_number INTEGER;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_store_shelves' AND column_name = 'column_number') THEN
    ALTER TABLE lats_store_shelves ADD COLUMN column_number INTEGER;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_store_shelves' AND column_name = 'max_capacity') THEN
    ALTER TABLE lats_store_shelves ADD COLUMN max_capacity INTEGER;
    UPDATE lats_store_shelves SET max_capacity = capacity WHERE max_capacity IS NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_store_shelves' AND column_name = 'current_capacity') THEN
    ALTER TABLE lats_store_shelves ADD COLUMN current_capacity INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_store_shelves' AND column_name = 'floor_level') THEN
    ALTER TABLE lats_store_shelves ADD COLUMN floor_level INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_store_shelves' AND column_name = 'zone') THEN
    ALTER TABLE lats_store_shelves ADD COLUMN zone TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_store_shelves' AND column_name = 'is_accessible') THEN
    ALTER TABLE lats_store_shelves ADD COLUMN is_accessible BOOLEAN DEFAULT true;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_store_shelves' AND column_name = 'requires_ladder') THEN
    ALTER TABLE lats_store_shelves ADD COLUMN requires_ladder BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_store_shelves' AND column_name = 'is_refrigerated') THEN
    ALTER TABLE lats_store_shelves ADD COLUMN is_refrigerated BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_store_shelves' AND column_name = 'priority_order') THEN
    ALTER TABLE lats_store_shelves ADD COLUMN priority_order INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_store_shelves' AND column_name = 'color_code') THEN
    ALTER TABLE lats_store_shelves ADD COLUMN color_code TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_store_shelves' AND column_name = 'barcode') THEN
    ALTER TABLE lats_store_shelves ADD COLUMN barcode TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_store_shelves' AND column_name = 'notes') THEN
    ALTER TABLE lats_store_shelves ADD COLUMN notes TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_store_shelves' AND column_name = 'images') THEN
    ALTER TABLE lats_store_shelves ADD COLUMN images TEXT[] DEFAULT ARRAY[]::TEXT[];
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_store_shelves' AND column_name = 'created_by') THEN
    ALTER TABLE lats_store_shelves ADD COLUMN created_by UUID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_store_shelves' AND column_name = 'updated_by') THEN
    ALTER TABLE lats_store_shelves ADD COLUMN updated_by UUID;
  END IF;
END $$;

-- ============================================================================
-- 3. CREATE NECESSARY INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_lats_store_rooms_location_id ON lats_store_rooms(store_location_id);
CREATE INDEX IF NOT EXISTS idx_lats_store_rooms_code ON lats_store_rooms(code);
CREATE INDEX IF NOT EXISTS idx_lats_store_shelves_location_id ON lats_store_shelves(store_location_id);
CREATE INDEX IF NOT EXISTS idx_lats_store_shelves_storage_room_id ON lats_store_shelves(storage_room_id);
CREATE INDEX IF NOT EXISTS idx_lats_store_shelves_code ON lats_store_shelves(code);

-- ============================================================================
-- SUMMARY
-- ============================================================================
SELECT '🎉 SCHEMA UPDATED SUCCESSFULLY!' as summary;
SELECT 'Tables now match what the application code expects' as info;
SELECT '✅ Refresh your browser and test Add Product page' as action;

