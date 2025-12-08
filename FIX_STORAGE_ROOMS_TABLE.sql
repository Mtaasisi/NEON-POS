-- ============================================================================
-- FIX MISSING STORAGE ROOMS TABLE AND VIEW
-- ============================================================================
-- This script creates the lats_store_rooms table and lats_storage_rooms view
-- The error "relation lats_storage_rooms does not exist" occurs because
-- lats_storage_rooms is a VIEW that depends on lats_store_rooms table
-- ============================================================================

-- ============================================================================
-- STEP 1: Create lats_store_rooms table (if it doesn't exist)
-- ============================================================================

CREATE TABLE IF NOT EXISTS lats_store_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    location TEXT,
    capacity INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    store_location_id UUID,
    code TEXT,
    floor_level INTEGER DEFAULT 0,
    area_sqm NUMERIC,
    max_capacity INTEGER,
    current_capacity INTEGER DEFAULT 0,
    is_secure BOOLEAN DEFAULT false,
    requires_access_card BOOLEAN DEFAULT false,
    color_code TEXT,
    notes TEXT
);

-- Add comment
COMMENT ON TABLE lats_store_rooms IS 'Storage rooms for inventory organization';

-- ============================================================================
-- STEP 2: Create indexes for better performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_lats_store_rooms_store_location ON lats_store_rooms(store_location_id);
CREATE INDEX IF NOT EXISTS idx_lats_store_rooms_code ON lats_store_rooms(code);
CREATE INDEX IF NOT EXISTS idx_lats_store_rooms_is_active ON lats_store_rooms(is_active);

-- ============================================================================
-- STEP 3: Create lats_storage_rooms VIEW (or replace if exists)
-- ============================================================================
-- This view is what the application queries - it's an alias for lats_store_rooms

DROP VIEW IF EXISTS lats_storage_rooms CASCADE;

CREATE VIEW lats_storage_rooms AS
SELECT 
    id,
    name,
    description,
    location,
    capacity,
    is_active,
    created_at,
    updated_at,
    store_location_id,
    code,
    floor_level,
    area_sqm,
    max_capacity,
    current_capacity,
    is_secure,
    requires_access_card,
    color_code,
    notes
FROM lats_store_rooms;

-- Add comment
COMMENT ON VIEW lats_storage_rooms IS 'View for storage rooms (aliases lats_store_rooms)';

-- ============================================================================
-- STEP 4: Create trigger to update updated_at timestamp
-- ============================================================================

CREATE OR REPLACE FUNCTION update_lats_store_rooms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_lats_store_rooms_updated_at ON lats_store_rooms;

CREATE TRIGGER trigger_update_lats_store_rooms_updated_at
    BEFORE UPDATE ON lats_store_rooms
    FOR EACH ROW
    EXECUTE FUNCTION update_lats_store_rooms_updated_at();

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Storage rooms table and view created successfully!';
    RAISE NOTICE '';
    RAISE NOTICE 'Created objects:';
    RAISE NOTICE '  - Table: lats_store_rooms';
    RAISE NOTICE '  - View: lats_storage_rooms (selects from lats_store_rooms)';
    RAISE NOTICE '';
    RAISE NOTICE 'The application can now query lats_storage_rooms without errors.';
END $$;

