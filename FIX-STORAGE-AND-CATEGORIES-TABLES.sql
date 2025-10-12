-- ============================================================================
-- FIX STORAGE AND CATEGORIES TABLES
-- ============================================================================
-- This script creates/fixes all tables needed for the Add Product page:
-- 1. lats_categories
-- 2. lats_store_locations  
-- 3. lats_store_rooms
-- 4. lats_store_shelves
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. CREATE/FIX CATEGORIES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS lats_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES lats_categories(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  color TEXT,
  icon TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable RLS on categories
ALTER TABLE lats_categories DISABLE ROW LEVEL SECURITY;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_lats_categories_is_active ON lats_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_lats_categories_parent_id ON lats_categories(parent_id);

COMMENT ON TABLE lats_categories IS 'Product categories for LATS inventory system';

-- Insert sample categories if table is empty
DO $$
DECLARE
  category_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO category_count FROM lats_categories;
  
  IF category_count = 0 THEN
    INSERT INTO lats_categories (name, description, is_active, sort_order) VALUES
      ('Laptops', 'Desktop and portable computers', true, 1),
      ('Phones', 'Mobile phones and smartphones', true, 2),
      ('Tablets', 'Tablet devices', true, 3),
      ('Accessories', 'Computer and phone accessories', true, 4),
      ('Gaming Consoles', 'Gaming systems and consoles', true, 5),
      ('Smart Watches', 'Wearable smart devices', true, 6),
      ('Audio', 'Headphones, speakers, and audio equipment', true, 7),
      ('Networking', 'Routers, modems, and network equipment', true, 8);
    
    RAISE NOTICE '✅ Inserted 8 sample categories';
  ELSE
    RAISE NOTICE 'ℹ️  Categories table already has data (% items)', category_count;
  END IF;
END $$;

-- ============================================================================
-- 2. CREATE/FIX STORE LOCATIONS TABLE
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

-- Disable RLS on store locations
ALTER TABLE lats_store_locations DISABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_lats_store_locations_is_active ON lats_store_locations(is_active);
CREATE INDEX IF NOT EXISTS idx_lats_store_locations_city ON lats_store_locations(city);
CREATE INDEX IF NOT EXISTS idx_lats_store_locations_code ON lats_store_locations(code);

COMMENT ON TABLE lats_store_locations IS 'Physical store branch locations';

-- Insert sample store locations if table is empty
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
    RAISE NOTICE 'ℹ️  Store locations table already has data (% items)', location_count;
  END IF;
END $$;

-- ============================================================================
-- 3. CREATE/FIX STORAGE ROOMS TABLE
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

-- Disable RLS on storage rooms
ALTER TABLE lats_store_rooms DISABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_lats_store_rooms_location_id ON lats_store_rooms(store_location_id);
CREATE INDEX IF NOT EXISTS idx_lats_store_rooms_is_active ON lats_store_rooms(is_active);

COMMENT ON TABLE lats_store_rooms IS 'Storage rooms within store locations';

-- Insert sample storage rooms if table is empty
DO $$
DECLARE
  room_count INTEGER;
  main_branch_id UUID;
BEGIN
  SELECT COUNT(*) INTO room_count FROM lats_store_rooms;
  
  IF room_count = 0 THEN
    -- Get the main branch ID
    SELECT id INTO main_branch_id FROM lats_store_locations WHERE is_main_branch = true LIMIT 1;
    
    IF main_branch_id IS NOT NULL THEN
      INSERT INTO lats_store_rooms (store_location_id, name, code, floor_level, is_active) VALUES
        (main_branch_id, 'Main Warehouse', 'A', 0, true),
        (main_branch_id, 'Retail Floor', 'B', 1, true),
        (main_branch_id, 'Back Office', 'C', 1, true);
      
      RAISE NOTICE '✅ Inserted 3 sample storage rooms';
    ELSE
      RAISE NOTICE '⚠️  No main branch found, skipping storage rooms sample data';
    END IF;
  ELSE
    RAISE NOTICE 'ℹ️  Storage rooms table already has data (% items)', room_count;
  END IF;
END $$;

-- ============================================================================
-- 4. CREATE/FIX STORE SHELVES TABLE
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

-- Disable RLS on store shelves
ALTER TABLE lats_store_shelves DISABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_lats_store_shelves_location_id ON lats_store_shelves(store_location_id);
CREATE INDEX IF NOT EXISTS idx_lats_store_shelves_room_id ON lats_store_shelves(storage_room_id);
CREATE INDEX IF NOT EXISTS idx_lats_store_shelves_is_active ON lats_store_shelves(is_active);
CREATE INDEX IF NOT EXISTS idx_lats_store_shelves_code ON lats_store_shelves(code);

COMMENT ON TABLE lats_store_shelves IS 'Storage shelves within storage rooms';

-- Insert sample shelves if table is empty
DO $$
DECLARE
  shelf_count INTEGER;
  main_branch_id UUID;
  warehouse_room_id UUID;
BEGIN
  SELECT COUNT(*) INTO shelf_count FROM lats_store_shelves;
  
  IF shelf_count = 0 THEN
    -- Get the main branch and warehouse room
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
      RAISE NOTICE '⚠️  No main branch or warehouse room found, skipping shelves sample data';
    END IF;
  ELSE
    RAISE NOTICE 'ℹ️  Store shelves table already has data (% items)', shelf_count;
  END IF;
END $$;

-- ============================================================================
-- 5. UPDATE PRODUCTS TABLE TO ADD STORAGE COLUMNS (IF NEEDED)
-- ============================================================================
DO $$
BEGIN
  -- Add storage_room_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_products' AND column_name = 'storage_room_id'
  ) THEN
    ALTER TABLE lats_products ADD COLUMN storage_room_id UUID REFERENCES lats_store_rooms(id) ON DELETE SET NULL;
    RAISE NOTICE '✅ Added storage_room_id column to lats_products';
  END IF;

  -- Add store_shelf_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_products' AND column_name = 'store_shelf_id'
  ) THEN
    ALTER TABLE lats_products ADD COLUMN store_shelf_id UUID REFERENCES lats_store_shelves(id) ON DELETE SET NULL;
    RAISE NOTICE '✅ Added store_shelf_id column to lats_products';
  END IF;

  -- Add category_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_products' AND column_name = 'category_id'
  ) THEN
    ALTER TABLE lats_products ADD COLUMN category_id UUID REFERENCES lats_categories(id) ON DELETE SET NULL;
    RAISE NOTICE '✅ Added category_id column to lats_products';
  END IF;
END $$;

COMMIT;

-- ============================================================================
-- VERIFICATION & SUMMARY
-- ============================================================================
SELECT '🎉 STORAGE AND CATEGORIES TABLES FIXED!' as summary;
SELECT '' as empty_line_1;

SELECT '✅ 1. lats_categories table ready' as result_1;
SELECT (SELECT COUNT(*)::TEXT || ' categories' FROM lats_categories) as categories_count;

SELECT '' as empty_line_2;

SELECT '✅ 2. lats_store_locations table ready' as result_2;
SELECT (SELECT COUNT(*)::TEXT || ' store locations' FROM lats_store_locations) as locations_count;

SELECT '' as empty_line_3;

SELECT '✅ 3. lats_store_rooms table ready' as result_3;
SELECT (SELECT COUNT(*)::TEXT || ' storage rooms' FROM lats_store_rooms) as rooms_count;

SELECT '' as empty_line_4;

SELECT '✅ 4. lats_store_shelves table ready' as result_4;
SELECT (SELECT COUNT(*)::TEXT || ' shelves' FROM lats_store_shelves) as shelves_count;

SELECT '' as empty_line_5;

SELECT '💡 TIP: Refresh your application page to load the new data!' as tip;

