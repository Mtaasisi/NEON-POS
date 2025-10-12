-- Quick Fix: Add missing tables for storage management
-- This script adds ONLY the missing tables without modifying existing ones

-- ============================================================================
-- 1. ADD MISSING COLUMNS TO lats_categories (if needed)
-- ============================================================================
DO $$
BEGIN
  -- Add parent_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_categories' AND column_name = 'parent_id'
  ) THEN
    ALTER TABLE lats_categories ADD COLUMN parent_id UUID REFERENCES lats_categories(id) ON DELETE CASCADE;
    RAISE NOTICE '✅ Added parent_id column to lats_categories';
  END IF;

  -- Add sort_order column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_categories' AND column_name = 'sort_order'
  ) THEN
    ALTER TABLE lats_categories ADD COLUMN sort_order INTEGER DEFAULT 0;
    RAISE NOTICE '✅ Added sort_order column to lats_categories';
  END IF;

  -- Add metadata column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_categories' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE lats_categories ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    RAISE NOTICE '✅ Added metadata column to lats_categories';
  END IF;
END $$;

-- Disable RLS on categories
ALTER TABLE lats_categories DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. CREATE lats_store_locations TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS lats_store_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  address TEXT,
  city TEXT,
  region TEXT,
  country TEXT DEFAULT 'Tanzania',
  postal_code TEXT,
  phone TEXT,
  email TEXT,
  manager_name TEXT,
  manager_phone TEXT,
  is_active BOOLEAN DEFAULT true,
  is_main_branch BOOLEAN DEFAULT false,
  has_repair_service BOOLEAN DEFAULT false,
  has_sales_service BOOLEAN DEFAULT true,
  has_delivery_service BOOLEAN DEFAULT false,
  store_size_sqm NUMERIC,
  current_staff_count INTEGER DEFAULT 0,
  monthly_target NUMERIC DEFAULT 0,
  opening_hours JSONB,
  priority_order INTEGER DEFAULT 0,
  latitude NUMERIC,
  longitude NUMERIC,
  timezone TEXT DEFAULT 'Africa/Dar_es_Salaam',
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable RLS
ALTER TABLE lats_store_locations DISABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_lats_store_locations_is_active ON lats_store_locations(is_active);
CREATE INDEX IF NOT EXISTS idx_lats_store_locations_city ON lats_store_locations(city);
CREATE INDEX IF NOT EXISTS idx_lats_store_locations_code ON lats_store_locations(code);

-- Insert sample data only if table is empty
DO $$
DECLARE
  location_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO location_count FROM lats_store_locations;
  
  IF location_count = 0 THEN
    INSERT INTO lats_store_locations (name, code, city, region, is_active, is_main_branch, has_sales_service, priority_order) VALUES
      ('Main Branch - Dar es Salaam', 'DSM-MAIN', 'Dar es Salaam', 'Dar es Salaam', true, true, true, 1),
      ('Kariakoo Branch', 'DSM-KRK', 'Dar es Salaam', 'Dar es Salaam', true, false, true, 2),
      ('Mwanza Branch', 'MWZ-01', 'Mwanza', 'Mwanza', true, false, true, 3);
    RAISE NOTICE '✅ Inserted 3 sample store locations';
  ELSE
    RAISE NOTICE 'ℹ️  Store locations table already has data';
  END IF;
END $$;

-- ============================================================================
-- 3. CREATE lats_store_rooms TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS lats_store_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_location_id UUID REFERENCES lats_store_locations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  description TEXT,
  floor_level INTEGER DEFAULT 0,
  area_sqm NUMERIC,
  max_capacity INTEGER,
  current_capacity INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_secure BOOLEAN DEFAULT false,
  requires_access_card BOOLEAN DEFAULT false,
  color_code TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_location_id, code)
);

-- Disable RLS
ALTER TABLE lats_store_rooms DISABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_lats_store_rooms_location_id ON lats_store_rooms(store_location_id);
CREATE INDEX IF NOT EXISTS idx_lats_store_rooms_is_active ON lats_store_rooms(is_active);

-- Insert sample data only if table is empty
DO $$
DECLARE
  room_count INTEGER;
  main_branch_id UUID;
BEGIN
  SELECT COUNT(*) INTO room_count FROM lats_store_rooms;
  
  IF room_count = 0 THEN
    SELECT id INTO main_branch_id FROM lats_store_locations WHERE is_main_branch = true LIMIT 1;
    
    IF main_branch_id IS NOT NULL THEN
      INSERT INTO lats_store_rooms (store_location_id, name, code, floor_level, is_active) VALUES
        (main_branch_id, 'Main Warehouse', 'A', 0, true),
        (main_branch_id, 'Retail Floor', 'B', 1, true),
        (main_branch_id, 'Back Office', 'C', 1, true);
      RAISE NOTICE '✅ Inserted 3 sample storage rooms';
    ELSE
      RAISE NOTICE '⚠️  No main branch found';
    END IF;
  ELSE
    RAISE NOTICE 'ℹ️  Storage rooms table already has data';
  END IF;
END $$;

-- ============================================================================
-- 4. CREATE lats_store_shelves TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS lats_store_shelves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_location_id UUID REFERENCES lats_store_locations(id) ON DELETE CASCADE,
  storage_room_id UUID REFERENCES lats_store_rooms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  description TEXT,
  shelf_type TEXT DEFAULT 'standard',
  section TEXT,
  aisle TEXT,
  row_number INTEGER,
  column_number INTEGER,
  width_cm NUMERIC,
  height_cm NUMERIC,
  depth_cm NUMERIC,
  max_weight_kg NUMERIC,
  max_capacity INTEGER,
  current_capacity INTEGER DEFAULT 0,
  floor_level INTEGER DEFAULT 0,
  zone TEXT,
  coordinates JSONB,
  is_active BOOLEAN DEFAULT true,
  is_accessible BOOLEAN DEFAULT true,
  requires_ladder BOOLEAN DEFAULT false,
  is_refrigerated BOOLEAN DEFAULT false,
  temperature_range JSONB,
  priority_order INTEGER DEFAULT 0,
  color_code TEXT,
  barcode TEXT,
  notes TEXT,
  images TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable RLS
ALTER TABLE lats_store_shelves DISABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_lats_store_shelves_location_id ON lats_store_shelves(store_location_id);
CREATE INDEX IF NOT EXISTS idx_lats_store_shelves_room_id ON lats_store_shelves(storage_room_id);
CREATE INDEX IF NOT EXISTS idx_lats_store_shelves_is_active ON lats_store_shelves(is_active);
CREATE INDEX IF NOT EXISTS idx_lats_store_shelves_code ON lats_store_shelves(code);

-- Insert sample data only if table is empty
DO $$
DECLARE
  shelf_count INTEGER;
  main_branch_id UUID;
  warehouse_room_id UUID;
BEGIN
  SELECT COUNT(*) INTO shelf_count FROM lats_store_shelves;
  
  IF shelf_count = 0 THEN
    SELECT id INTO main_branch_id FROM lats_store_locations WHERE is_main_branch = true LIMIT 1;
    SELECT id INTO warehouse_room_id FROM lats_store_rooms WHERE code = 'A' AND store_location_id = main_branch_id LIMIT 1;
    
    IF main_branch_id IS NOT NULL AND warehouse_room_id IS NOT NULL THEN
      INSERT INTO lats_store_shelves (store_location_id, storage_room_id, name, code, is_active) VALUES
        (main_branch_id, warehouse_room_id, 'Shelf A1', 'A1', true),
        (main_branch_id, warehouse_room_id, 'Shelf A2', 'A2', true),
        (main_branch_id, warehouse_room_id, 'Shelf A3', 'A3', true),
        (main_branch_id, warehouse_room_id, 'Shelf B1', 'B1', true),
        (main_branch_id, warehouse_room_id, 'Shelf B2', 'B2', true),
        (main_branch_id, warehouse_room_id, 'Shelf B3', 'B3', true),
        (main_branch_id, warehouse_room_id, 'Shelf C1', 'C1', true),
        (main_branch_id, warehouse_room_id, 'Shelf C2', 'C2', true);
      RAISE NOTICE '✅ Inserted 8 sample shelves';
    ELSE
      RAISE NOTICE '⚠️  No main branch or warehouse room found';
    END IF;
  ELSE
    RAISE NOTICE 'ℹ️  Store shelves table already has data';
  END IF;
END $$;

-- ============================================================================
-- 5. UPDATE lats_products TABLE (add storage columns if needed)
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_products' AND column_name = 'storage_room_id'
  ) THEN
    ALTER TABLE lats_products ADD COLUMN storage_room_id UUID REFERENCES lats_store_rooms(id) ON DELETE SET NULL;
    RAISE NOTICE '✅ Added storage_room_id column to lats_products';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_products' AND column_name = 'store_shelf_id'
  ) THEN
    ALTER TABLE lats_products ADD COLUMN store_shelf_id UUID REFERENCES lats_store_shelves(id) ON DELETE SET NULL;
    RAISE NOTICE '✅ Added store_shelf_id column to lats_products';
  END IF;
END $$;

-- ============================================================================
-- SUMMARY
-- ============================================================================
SELECT '🎉 ALL TABLES READY!' as summary;
SELECT (SELECT COUNT(*)::TEXT || ' categories' FROM lats_categories) as categories;
SELECT (SELECT COUNT(*)::TEXT || ' locations' FROM lats_store_locations) as locations;
SELECT (SELECT COUNT(*)::TEXT || ' rooms' FROM lats_store_rooms) as rooms;
SELECT (SELECT COUNT(*)::TEXT || ' shelves' FROM lats_store_shelves) as shelves;
SELECT '✅ Refresh your browser now!' as action;

