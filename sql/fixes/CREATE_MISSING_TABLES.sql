-- Create Missing Tables for Storage Features
-- Run this in your Neon/Supabase SQL editor

-- 1. Create storage_rooms table
CREATE TABLE IF NOT EXISTS storage_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  store_location_id UUID REFERENCES store_locations(id),
  floor_level INTEGER DEFAULT 1,
  area_sqm DECIMAL(10, 2),
  is_secure BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create shelves table
CREATE TABLE IF NOT EXISTS shelves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_room_id UUID REFERENCES storage_rooms(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  row_number INTEGER,
  column_number INTEGER,
  capacity INTEGER,
  is_refrigerated BOOLEAN DEFAULT false,
  requires_ladder BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_storage_rooms_location 
  ON storage_rooms(store_location_id);

CREATE INDEX IF NOT EXISTS idx_shelves_room 
  ON shelves(storage_room_id);

CREATE INDEX IF NOT EXISTS idx_shelves_code 
  ON shelves(code);

-- 4. Add comments
COMMENT ON TABLE storage_rooms IS 'Physical storage rooms in store locations';
COMMENT ON TABLE shelves IS 'Individual shelves within storage rooms';

-- Success message
SELECT 'Tables created successfully!' AS status;

