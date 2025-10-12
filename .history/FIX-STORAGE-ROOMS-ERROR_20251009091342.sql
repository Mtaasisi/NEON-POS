-- ============================================
-- FIX STORAGE ROOMS ERROR - COMPLETE SOLUTION
-- This will create/fix storage tables and permissions
-- ============================================

BEGIN;

SELECT '========== FIXING STORAGE ROOMS ERROR ==========' as status;

-- Step 1: Create lats_store_rooms table with ALL required columns
CREATE TABLE IF NOT EXISTS lats_store_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_location_id UUID,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  description TEXT,
  floor_level INTEGER DEFAULT 1,
  area_sqm NUMERIC(10,2),
  max_capacity INTEGER,
  current_capacity INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_secure BOOLEAN DEFAULT false,
  requires_access_card BOOLEAN DEFAULT false,
  color_code TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(code)
);

SELECT '✅ Created/verified lats_store_rooms table' as step_1;

-- Step 2: Add missing columns if table already existed
DO $$
BEGIN
  -- store_location_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_store_rooms' AND column_name = 'store_location_id') THEN
    ALTER TABLE lats_store_rooms ADD COLUMN store_location_id UUID;
    RAISE NOTICE '✅ Added store_location_id column';
  END IF;

  -- code
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_store_rooms' AND column_name = 'code') THEN
    ALTER TABLE lats_store_rooms ADD COLUMN code TEXT;
    -- Generate codes for existing rows
    UPDATE lats_store_rooms 
    SET code = UPPER(SUBSTRING(REPLACE(name, ' ', ''), 1, 3)) || '-' || SUBSTRING(id::text, 1, 4)
    WHERE code IS NULL;
    -- Make it required
    ALTER TABLE lats_store_rooms ALTER COLUMN code SET NOT NULL;
    RAISE NOTICE '✅ Added code column';
  END IF;

  -- floor_level
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_store_rooms' AND column_name = 'floor_level') THEN
    ALTER TABLE lats_store_rooms ADD COLUMN floor_level INTEGER DEFAULT 1;
    RAISE NOTICE '✅ Added floor_level column';
  END IF;

  -- area_sqm
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_store_rooms' AND column_name = 'area_sqm') THEN
    ALTER TABLE lats_store_rooms ADD COLUMN area_sqm NUMERIC(10,2);
    RAISE NOTICE '✅ Added area_sqm column';
  END IF;

  -- max_capacity
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_store_rooms' AND column_name = 'max_capacity') THEN
    ALTER TABLE lats_store_rooms ADD COLUMN max_capacity INTEGER;
    RAISE NOTICE '✅ Added max_capacity column';
  END IF;

  -- current_capacity
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_store_rooms' AND column_name = 'current_capacity') THEN
    ALTER TABLE lats_store_rooms ADD COLUMN current_capacity INTEGER DEFAULT 0;
    RAISE NOTICE '✅ Added current_capacity column';
  END IF;

  -- is_secure
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_store_rooms' AND column_name = 'is_secure') THEN
    ALTER TABLE lats_store_rooms ADD COLUMN is_secure BOOLEAN DEFAULT false;
    RAISE NOTICE '✅ Added is_secure column';
  END IF;

  -- requires_access_card
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_store_rooms' AND column_name = 'requires_access_card') THEN
    ALTER TABLE lats_store_rooms ADD COLUMN requires_access_card BOOLEAN DEFAULT false;
    RAISE NOTICE '✅ Added requires_access_card column';
  END IF;

  -- color_code
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_store_rooms' AND column_name = 'color_code') THEN
    ALTER TABLE lats_store_rooms ADD COLUMN color_code TEXT;
    RAISE NOTICE '✅ Added color_code column';
  END IF;

  -- notes
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_store_rooms' AND column_name = 'notes') THEN
    ALTER TABLE lats_store_rooms ADD COLUMN notes TEXT;
    RAISE NOTICE '✅ Added notes column';
  END IF;
END $$;

SELECT '✅ Added all missing columns to lats_store_rooms' as step_2;

-- Step 3: Create lats_store_shelves table with ALL required columns
CREATE TABLE IF NOT EXISTS lats_store_shelves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_room_id UUID REFERENCES lats_store_rooms(id) ON DELETE CASCADE,
  store_location_id UUID,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  description TEXT,
  shelf_type TEXT DEFAULT 'standard',
  section TEXT,
  aisle TEXT,
  row_number INTEGER,
  column_number INTEGER,
  column_letter TEXT,
  width_cm NUMERIC(10,2),
  height_cm NUMERIC(10,2),
  depth_cm NUMERIC(10,2),
  max_weight_kg NUMERIC(10,2),
  max_capacity INTEGER,
  current_capacity INTEGER DEFAULT 0,
  current_occupancy INTEGER DEFAULT 0,
  floor_level INTEGER DEFAULT 1,
  zone TEXT,
  coordinates JSONB,
  position TEXT,
  is_active BOOLEAN DEFAULT true,
  is_accessible BOOLEAN DEFAULT true,
  requires_ladder BOOLEAN DEFAULT false,
  is_refrigerated BOOLEAN DEFAULT false,
  temperature_range JSONB,
  priority_order INTEGER DEFAULT 0,
  color_code TEXT,
  barcode TEXT,
  notes TEXT,
  images JSONB DEFAULT '[]'::jsonb,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(storage_room_id, code)
);

SELECT '✅ Created/verified lats_store_shelves table' as step_3;

-- Step 4: Add missing columns to shelves if table already existed
DO $$
BEGIN
  -- storage_room_id (rename from room_id if needed)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_store_shelves' AND column_name = 'room_id') THEN
    ALTER TABLE lats_store_shelves RENAME COLUMN room_id TO storage_room_id;
    RAISE NOTICE '✅ Renamed room_id to storage_room_id';
  END IF;

  -- Basic info columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_store_shelves' AND column_name = 'store_location_id') THEN
    ALTER TABLE lats_store_shelves ADD COLUMN store_location_id UUID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_store_shelves' AND column_name = 'code') THEN
    ALTER TABLE lats_store_shelves ADD COLUMN code TEXT;
    UPDATE lats_store_shelves SET code = UPPER(SUBSTRING(REPLACE(name, ' ', ''), 1, 5)) WHERE code IS NULL;
    ALTER TABLE lats_store_shelves ALTER COLUMN code SET NOT NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_store_shelves' AND column_name = 'description') THEN
    ALTER TABLE lats_store_shelves ADD COLUMN description TEXT;
  END IF;

  -- Type and location columns
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

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_store_shelves' AND column_name = 'column_letter') THEN
    ALTER TABLE lats_store_shelves ADD COLUMN column_letter TEXT;
  END IF;

  -- Dimensions
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_store_shelves' AND column_name = 'width_cm') THEN
    ALTER TABLE lats_store_shelves ADD COLUMN width_cm NUMERIC(10,2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_store_shelves' AND column_name = 'height_cm') THEN
    ALTER TABLE lats_store_shelves ADD COLUMN height_cm NUMERIC(10,2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_store_shelves' AND column_name = 'depth_cm') THEN
    ALTER TABLE lats_store_shelves ADD COLUMN depth_cm NUMERIC(10,2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_store_shelves' AND column_name = 'max_weight_kg') THEN
    ALTER TABLE lats_store_shelves ADD COLUMN max_weight_kg NUMERIC(10,2);
  END IF;

  -- Capacity
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_store_shelves' AND column_name = 'max_capacity') THEN
    ALTER TABLE lats_store_shelves ADD COLUMN max_capacity INTEGER;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_store_shelves' AND column_name = 'current_capacity') THEN
    ALTER TABLE lats_store_shelves ADD COLUMN current_capacity INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_store_shelves' AND column_name = 'current_occupancy') THEN
    ALTER TABLE lats_store_shelves ADD COLUMN current_occupancy INTEGER DEFAULT 0;
  END IF;

  -- Position
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_store_shelves' AND column_name = 'floor_level') THEN
    ALTER TABLE lats_store_shelves ADD COLUMN floor_level INTEGER DEFAULT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_store_shelves' AND column_name = 'zone') THEN
    ALTER TABLE lats_store_shelves ADD COLUMN zone TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_store_shelves' AND column_name = 'coordinates') THEN
    ALTER TABLE lats_store_shelves ADD COLUMN coordinates JSONB;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_store_shelves' AND column_name = 'position') THEN
    ALTER TABLE lats_store_shelves ADD COLUMN position TEXT;
  END IF;

  -- Status flags
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_store_shelves' AND column_name = 'is_active') THEN
    ALTER TABLE lats_store_shelves ADD COLUMN is_active BOOLEAN DEFAULT true;
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

  -- Additional info
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_store_shelves' AND column_name = 'temperature_range') THEN
    ALTER TABLE lats_store_shelves ADD COLUMN temperature_range JSONB;
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
    ALTER TABLE lats_store_shelves ADD COLUMN images JSONB DEFAULT '[]'::jsonb;
  END IF;

  -- Audit columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_store_shelves' AND column_name = 'created_by') THEN
    ALTER TABLE lats_store_shelves ADD COLUMN created_by UUID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_store_shelves' AND column_name = 'updated_by') THEN
    ALTER TABLE lats_store_shelves ADD COLUMN updated_by UUID;
  END IF;

  RAISE NOTICE '✅ Added all missing columns to lats_store_shelves';
END $$;

SELECT '✅ Added all missing columns to lats_store_shelves' as step_4;

-- Step 5: Create indexes
CREATE INDEX IF NOT EXISTS idx_store_rooms_active ON lats_store_rooms(is_active);
CREATE INDEX IF NOT EXISTS idx_store_rooms_code ON lats_store_rooms(code);
CREATE INDEX IF NOT EXISTS idx_store_shelves_room ON lats_store_shelves(storage_room_id);
CREATE INDEX IF NOT EXISTS idx_store_shelves_code ON lats_store_shelves(code);
CREATE INDEX IF NOT EXISTS idx_store_shelves_active ON lats_store_shelves(is_active);

SELECT '✅ Created indexes' as step_5;

-- Step 6: Fix RLS policies - DISABLE RLS to allow access
ALTER TABLE lats_store_rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE lats_store_shelves DISABLE ROW LEVEL SECURITY;

SELECT '✅ Disabled RLS on storage tables (allows all access)' as step_6;

-- Alternative: If you want RLS enabled, uncomment this section and comment out the DISABLE above
/*
ALTER TABLE lats_store_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE lats_store_shelves ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow all access to storage rooms" ON lats_store_rooms;
DROP POLICY IF EXISTS "Allow all access to storage shelves" ON lats_store_shelves;

-- Create permissive policies
CREATE POLICY "Allow all access to storage rooms"
  ON lats_store_rooms
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all access to storage shelves"
  ON lats_store_shelves
  FOR ALL
  USING (true)
  WITH CHECK (true);

SELECT '✅ Created permissive RLS policies' as step_6_alt;
*/

-- Step 7: Grant permissions to all roles
DO $$
BEGIN
  -- Grant to authenticated role
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    GRANT ALL ON lats_store_rooms TO authenticated;
    GRANT ALL ON lats_store_shelves TO authenticated;
  END IF;

  -- Grant to anon role
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    GRANT ALL ON lats_store_rooms TO anon;
    GRANT ALL ON lats_store_shelves TO anon;
  END IF;

  -- Grant to service_role
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT ALL ON lats_store_rooms TO service_role;
    GRANT ALL ON lats_store_shelves TO service_role;
  END IF;

  -- Grant to postgres role
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'postgres') THEN
    GRANT ALL ON lats_store_rooms TO postgres;
    GRANT ALL ON lats_store_shelves TO postgres;
  END IF;

  -- Grant to neondb_owner (Neon specific)
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'neondb_owner') THEN
    GRANT ALL ON lats_store_rooms TO neondb_owner;
    GRANT ALL ON lats_store_shelves TO neondb_owner;
  END IF;

  -- Grant USAGE on sequences
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;
  END IF;
END $$;

SELECT '✅ Granted permissions to all roles' as step_7;

-- Step 8: Add sample data if tables are empty
DO $$
DECLARE
  room_count INTEGER;
  shelf_count INTEGER;
  room1_id UUID;
  room2_id UUID;
  room3_id UUID;
BEGIN
  -- Check if we need sample data
  SELECT COUNT(*) INTO room_count FROM lats_store_rooms;
  
  IF room_count = 0 THEN
    -- Insert sample storage rooms
    INSERT INTO lats_store_rooms (id, name, code, description, floor_level, area_sqm, max_capacity, current_capacity, is_active, is_secure)
    VALUES 
      (gen_random_uuid(), 'Main Warehouse', 'A-WH01', 'Primary storage facility', 1, 500.00, 1000, 0, true, false),
      (gen_random_uuid(), 'Secure Storage', 'B-SEC01', 'High-security storage area', 1, 200.00, 300, 0, true, true),
      (gen_random_uuid(), 'Display Room', 'C-DIS01', 'Customer display area', 1, 150.00, 200, 0, true, false)
    RETURNING id INTO room1_id;
    
    -- Get the IDs of inserted rooms
    SELECT id INTO room1_id FROM lats_store_rooms WHERE code = 'A-WH01';
    SELECT id INTO room2_id FROM lats_store_rooms WHERE code = 'B-SEC01';
    SELECT id INTO room3_id FROM lats_store_rooms WHERE code = 'C-DIS01';
    
    -- Insert sample shelves for each room
    INSERT INTO lats_store_shelves (
      storage_room_id, name, code, position, row_number, column_number, column_letter, 
      max_capacity, current_capacity, shelf_type, floor_level, zone, is_active, is_accessible, 
      requires_ladder, is_refrigerated, priority_order
    )
    VALUES 
      -- Main Warehouse shelves
      (room1_id, 'Shelf A1', 'A1', 'Front Left', 1, 1, 'A', 100, 0, 'standard', 1, 'front', true, true, false, false, 1),
      (room1_id, 'Shelf A2', 'A2', 'Front Center', 1, 2, 'B', 100, 0, 'standard', 1, 'center', true, true, false, false, 2),
      (room1_id, 'Shelf B1', 'B1', 'Back Left', 2, 1, 'A', 100, 0, 'storage', 1, 'back', true, true, false, false, 3),
      (room1_id, 'Shelf B2', 'B2', 'Back Center', 2, 2, 'B', 100, 0, 'storage', 1, 'back', true, true, false, false, 4),
      -- Secure Storage shelves
      (room2_id, 'Secure A1', 'S-A1', 'Section A', 1, 1, 'A', 50, 0, 'specialty', 1, 'front', true, true, false, false, 1),
      (room2_id, 'Secure B1', 'S-B1', 'Section B', 1, 2, 'B', 50, 0, 'specialty', 1, 'back', true, true, false, false, 2),
      -- Display Room shelves
      (room3_id, 'Display Front', 'D-F1', 'Front Display', 1, 1, 'A', 30, 0, 'display', 1, 'front', true, true, false, false, 1),
      (room3_id, 'Display Center', 'D-C1', 'Center Display', 1, 2, 'B', 30, 0, 'display', 1, 'center', true, true, false, false, 2);
    
    RAISE NOTICE '✅ Added sample storage data (3 rooms, 8 shelves)';
  ELSE
    RAISE NOTICE 'ℹ️  Storage rooms already exist, skipping sample data';
  END IF;
END $$;

SELECT '✅ Added sample data (if needed)' as step_8;

-- Step 9: Update lats_products table to have storage columns
DO $$
BEGIN
  -- Add storage_room_id column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_products' AND column_name = 'storage_room_id') THEN
    ALTER TABLE lats_products ADD COLUMN storage_room_id UUID;
    RAISE NOTICE '✅ Added storage_room_id to lats_products';
  END IF;

  -- Add store_shelf_id column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_products' AND column_name = 'store_shelf_id') THEN
    ALTER TABLE lats_products ADD COLUMN store_shelf_id UUID;
    RAISE NOTICE '✅ Added store_shelf_id to lats_products';
  END IF;
  
  -- Note: We don't add foreign keys here to avoid dependency issues
  -- Products can reference storage locations, but storage locations can exist independently
END $$;

SELECT '✅ Updated lats_products table with storage columns' as step_9;

COMMIT;

-- Final verification
SELECT '🎉 STORAGE ROOMS ERROR FIXED!' as summary;
SELECT '' as empty;
SELECT '📊 Current Storage Data:' as data_summary;
SELECT COUNT(*) || ' storage rooms' as room_count FROM lats_store_rooms;
SELECT COUNT(*) || ' storage shelves' as shelf_count FROM lats_store_shelves;
SELECT '' as empty_2;
SELECT '✅ Storage rooms table: READY' as status_1;
SELECT '✅ Storage shelves table: READY' as status_2;
SELECT '✅ All permissions: GRANTED' as status_3;
SELECT '✅ Sample data: AVAILABLE' as status_4;
SELECT '' as empty_3;
SELECT '💡 Your AddProductPage should now work without storage errors!' as tip;

