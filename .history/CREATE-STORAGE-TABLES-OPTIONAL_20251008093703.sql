-- ============================================
-- OPTIONAL: CREATE STORAGE LOCATION TABLES
-- Run this if you want to use storage rooms and shelves
-- ============================================

BEGIN;

SELECT '========== CREATING STORAGE LOCATION TABLES ==========' as status;

-- Create lats_store_rooms table
CREATE TABLE IF NOT EXISTS lats_store_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  location TEXT,
  capacity INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE lats_store_rooms IS 'Storage rooms for inventory organization';

-- Create lats_store_shelves table
CREATE TABLE IF NOT EXISTS lats_store_shelves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES lats_store_rooms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position TEXT,
  capacity INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id, name)
);

COMMENT ON TABLE lats_store_shelves IS 'Storage shelves within rooms';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_store_shelves_room_id ON lats_store_shelves(room_id);
CREATE INDEX IF NOT EXISTS idx_store_rooms_is_active ON lats_store_rooms(is_active);
CREATE INDEX IF NOT EXISTS idx_store_shelves_is_active ON lats_store_shelves(is_active);

-- Enable RLS
ALTER TABLE lats_store_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE lats_store_shelves ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view store rooms" ON lats_store_rooms;
DROP POLICY IF EXISTS "Users can manage store rooms" ON lats_store_rooms;
DROP POLICY IF EXISTS "Users can view store shelves" ON lats_store_shelves;
DROP POLICY IF EXISTS "Users can manage store shelves" ON lats_store_shelves;

-- Create policies
CREATE POLICY "Users can view store rooms" 
  ON lats_store_rooms FOR SELECT 
  USING (true);

CREATE POLICY "Users can manage store rooms" 
  ON lats_store_rooms FOR ALL 
  USING (true);

CREATE POLICY "Users can view store shelves" 
  ON lats_store_shelves FOR SELECT 
  USING (true);

CREATE POLICY "Users can manage store shelves" 
  ON lats_store_shelves FOR ALL 
  USING (true);

-- Insert sample data
INSERT INTO lats_store_rooms (name, description, location) VALUES
  ('Main Warehouse', 'Primary storage facility', 'Building A'),
  ('Retail Floor', 'Customer-facing display area', 'Ground Floor'),
  ('Back Office', 'Office inventory storage', 'First Floor')
ON CONFLICT (name) DO NOTHING;

-- Get the room IDs for shelves
DO $$
DECLARE
  main_warehouse_id UUID;
  retail_floor_id UUID;
  back_office_id UUID;
BEGIN
  SELECT id INTO main_warehouse_id FROM lats_store_rooms WHERE name = 'Main Warehouse';
  SELECT id INTO retail_floor_id FROM lats_store_rooms WHERE name = 'Retail Floor';
  SELECT id INTO back_office_id FROM lats_store_rooms WHERE name = 'Back Office';

  -- Insert sample shelves
  INSERT INTO lats_store_shelves (room_id, name, position) VALUES
    (main_warehouse_id, 'A1', 'Aisle A, Position 1'),
    (main_warehouse_id, 'A2', 'Aisle A, Position 2'),
    (main_warehouse_id, 'B1', 'Aisle B, Position 1'),
    (main_warehouse_id, 'B2', 'Aisle B, Position 2'),
    (retail_floor_id, 'Display 1', 'Front Window Display'),
    (retail_floor_id, 'Display 2', 'Center Island Display'),
    (back_office_id, 'Cabinet 1', 'Storage Cabinet 1')
  ON CONFLICT (room_id, name) DO NOTHING;
END $$;

-- Now add foreign keys to lats_products if they exist without them
DO $$
BEGIN
  -- Add foreign key to storage_room_id if it doesn't have one
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_products' 
    AND column_name = 'storage_room_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'lats_products_storage_room_id_fkey'
  ) THEN
    ALTER TABLE lats_products 
    ADD CONSTRAINT lats_products_storage_room_id_fkey 
    FOREIGN KEY (storage_room_id) REFERENCES lats_store_rooms(id) ON DELETE SET NULL;
    RAISE NOTICE '✅ Added foreign key constraint to storage_room_id';
  END IF;

  -- Add foreign key to store_shelf_id if it doesn't have one
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_products' 
    AND column_name = 'store_shelf_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'lats_products_store_shelf_id_fkey'
  ) THEN
    ALTER TABLE lats_products 
    ADD CONSTRAINT lats_products_store_shelf_id_fkey 
    FOREIGN KEY (store_shelf_id) REFERENCES lats_store_shelves(id) ON DELETE SET NULL;
    RAISE NOTICE '✅ Added foreign key constraint to store_shelf_id';
  END IF;
END $$;

-- Grant permissions
GRANT ALL ON lats_store_rooms TO postgres, anon, authenticated, service_role;
GRANT ALL ON lats_store_shelves TO postgres, anon, authenticated, service_role;

COMMIT;

SELECT '🎉 STORAGE TABLES CREATED!' as summary;
SELECT '✅ Created lats_store_rooms table' as result_1;
SELECT '✅ Created lats_store_shelves table' as result_2;
SELECT '✅ Added sample data (3 rooms, 7 shelves)' as result_3;
SELECT '✅ Added foreign key constraints to lats_products' as result_4;
SELECT '' as empty;
SELECT '💡 You can now assign storage locations to products!' as tip;

