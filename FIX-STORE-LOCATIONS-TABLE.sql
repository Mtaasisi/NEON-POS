-- ============================================
-- FIX STORE LOCATIONS TABLE
-- This script ensures the store_locations table exists
-- and is properly configured with permissions
-- Date: October 12, 2025
-- ============================================

-- Drop and recreate the table to ensure clean state
DROP TABLE IF EXISTS store_locations CASCADE;

-- Create the store_locations table
CREATE TABLE store_locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT,
  zip_code TEXT,
  country TEXT NOT NULL DEFAULT 'Tanzania',
  phone TEXT,
  email TEXT,
  manager_name TEXT,
  is_main BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  opening_time TIME DEFAULT '09:00',
  closing_time TIME DEFAULT '18:00',
  inventory_sync_enabled BOOLEAN DEFAULT true,
  pricing_model TEXT DEFAULT 'centralized' CHECK (pricing_model IN ('centralized', 'location-specific')),
  tax_rate_override NUMERIC(5,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_store_locations_code ON store_locations(code);
CREATE INDEX idx_store_locations_active ON store_locations(is_active);
CREATE INDEX idx_store_locations_is_main ON store_locations(is_main);

-- Disable Row Level Security to allow full access
ALTER TABLE store_locations DISABLE ROW LEVEL SECURITY;

-- Grant full permissions to authenticated and anon users
GRANT ALL ON store_locations TO authenticated;
GRANT ALL ON store_locations TO anon;
GRANT ALL ON store_locations TO postgres;

-- Create update trigger for updated_at field
CREATE OR REPLACE FUNCTION update_store_locations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_store_locations ON store_locations;
CREATE TRIGGER trigger_update_store_locations
  BEFORE UPDATE ON store_locations
  FOR EACH ROW
  EXECUTE FUNCTION update_store_locations_updated_at();

-- Insert default main store
INSERT INTO store_locations (name, code, address, city, country, is_main, is_active)
VALUES 
  ('Main Store', 'MAIN-001', 'Main Street', 'Arusha', 'Tanzania', true, true)
ON CONFLICT (code) DO NOTHING;

-- Verification query
DO $$
DECLARE
  store_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO store_count FROM store_locations;
  RAISE NOTICE '✅ Store locations table created successfully!';
  RAISE NOTICE '📊 Current store count: %', store_count;
  RAISE NOTICE '🔓 RLS disabled - full access granted';
  RAISE NOTICE '✨ Ready to use in StoreManagementSettings component';
END $$;

