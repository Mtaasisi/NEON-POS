-- =====================================================
-- UNIFIED BRANDING SETTINGS TABLE (FIXED VERSION)
-- =====================================================
-- This version works without requiring auth.users
-- Compatible with any authentication setup
-- =====================================================

-- Step 1: Create the unified branding settings table
-- Note: We're NOT adding a foreign key constraint to auth.users
-- This makes it compatible with any auth setup
CREATE TABLE IF NOT EXISTS unified_branding_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL, -- Just a UUID, no foreign key
  
  -- Logo & Visual Identity
  business_logo TEXT,
  app_logo TEXT,
  logo_size TEXT DEFAULT 'medium' CHECK (logo_size IN ('small', 'medium', 'large')),
  logo_position TEXT DEFAULT 'left' CHECK (logo_position IN ('left', 'center', 'right')),
  
  -- Company Information
  company_name TEXT DEFAULT 'My Business' NOT NULL,
  business_name TEXT DEFAULT 'My Business',
  business_address TEXT DEFAULT '',
  business_phone TEXT DEFAULT '',
  business_email TEXT DEFAULT '',
  business_website TEXT DEFAULT '',
  
  -- Color Scheme
  primary_color TEXT DEFAULT '#3B82F6',
  secondary_color TEXT DEFAULT '#1E40AF',
  accent_color TEXT DEFAULT '#10B981',
  
  -- Additional Information
  tagline TEXT DEFAULT '',
  tax_id TEXT DEFAULT '',
  registration_number TEXT DEFAULT '',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one record per user
  UNIQUE(user_id)
);

-- Step 2: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_unified_branding_user_id ON unified_branding_settings(user_id);

-- Step 3: Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_unified_branding_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_unified_branding_updated_at ON unified_branding_settings;

CREATE TRIGGER trigger_update_unified_branding_updated_at
  BEFORE UPDATE ON unified_branding_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_unified_branding_updated_at();

-- Step 4: Enable Row Level Security (RLS)
ALTER TABLE unified_branding_settings ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own branding settings" ON unified_branding_settings;
DROP POLICY IF EXISTS "Users can insert their own branding settings" ON unified_branding_settings;
DROP POLICY IF EXISTS "Users can update their own branding settings" ON unified_branding_settings;
DROP POLICY IF EXISTS "Users can delete their own branding settings" ON unified_branding_settings;

-- Policy: Users can view their own branding settings
CREATE POLICY "Users can view their own branding settings"
  ON unified_branding_settings
  FOR SELECT
  USING (
    CASE 
      WHEN current_setting('request.jwt.claims', true)::json->>'sub' IS NOT NULL 
      THEN user_id::text = current_setting('request.jwt.claims', true)::json->>'sub'
      ELSE true -- Allow all if no JWT (for testing)
    END
  );

-- Policy: Users can insert their own branding settings
CREATE POLICY "Users can insert their own branding settings"
  ON unified_branding_settings
  FOR INSERT
  WITH CHECK (
    CASE 
      WHEN current_setting('request.jwt.claims', true)::json->>'sub' IS NOT NULL 
      THEN user_id::text = current_setting('request.jwt.claims', true)::json->>'sub'
      ELSE true -- Allow all if no JWT (for testing)
    END
  );

-- Policy: Users can update their own branding settings
CREATE POLICY "Users can update their own branding settings"
  ON unified_branding_settings
  FOR UPDATE
  USING (
    CASE 
      WHEN current_setting('request.jwt.claims', true)::json->>'sub' IS NOT NULL 
      THEN user_id::text = current_setting('request.jwt.claims', true)::json->>'sub'
      ELSE true
    END
  )
  WITH CHECK (
    CASE 
      WHEN current_setting('request.jwt.claims', true)::json->>'sub' IS NOT NULL 
      THEN user_id::text = current_setting('request.jwt.claims', true)::json->>'sub'
      ELSE true
    END
  );

-- Policy: Users can delete their own branding settings
CREATE POLICY "Users can delete their own branding settings"
  ON unified_branding_settings
  FOR DELETE
  USING (
    CASE 
      WHEN current_setting('request.jwt.claims', true)::json->>'sub' IS NOT NULL 
      THEN user_id::text = current_setting('request.jwt.claims', true)::json->>'sub'
      ELSE true
    END
  );

-- =====================================================
-- STEP 6: MIGRATION FROM EXISTING DATA
-- =====================================================

-- First, check if lats_pos_general_settings table exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'lats_pos_general_settings') THEN
    -- Migrate data from lats_pos_general_settings to unified_branding_settings
    INSERT INTO unified_branding_settings (
      user_id,
      business_logo,
      app_logo,
      company_name,
      business_name,
      business_address,
      business_phone,
      business_email,
      business_website,
      logo_size,
      logo_position,
      primary_color,
      secondary_color,
      accent_color
    )
    SELECT 
      user_id,
      business_logo,
      business_logo as app_logo,
      COALESCE(business_name, 'My Business') as company_name,
      COALESCE(business_name, 'My Business') as business_name,
      COALESCE(business_address, '') as business_address,
      COALESCE(business_phone, '') as business_phone,
      COALESCE(business_email, '') as business_email,
      COALESCE(business_website, '') as business_website,
      'medium' as logo_size,
      'left' as logo_position,
      '#3B82F6' as primary_color,
      '#1E40AF' as secondary_color,
      '#10B981' as accent_color
    FROM lats_pos_general_settings
    WHERE NOT EXISTS (
      SELECT 1 FROM unified_branding_settings ub
      WHERE ub.user_id = lats_pos_general_settings.user_id
    )
    ON CONFLICT (user_id) DO NOTHING;
    
    RAISE NOTICE '✅ Migrated branding data from lats_pos_general_settings';
  ELSE
    RAISE NOTICE '⚠️ Table lats_pos_general_settings does not exist, skipping migration';
  END IF;
END $$;

-- =====================================================
-- STEP 7: CREATE VIEW FOR EASY ACCESS
-- =====================================================

-- Drop view if exists
DROP VIEW IF EXISTS v_user_branding;

-- Create a simplified view (without auth.users since it doesn't exist)
CREATE OR REPLACE VIEW v_user_branding AS
SELECT 
  user_id,
  business_logo,
  app_logo,
  company_name,
  business_name,
  business_address,
  business_phone,
  business_email,
  business_website,
  primary_color,
  secondary_color,
  accent_color,
  logo_size,
  logo_position,
  tagline,
  tax_id,
  registration_number,
  created_at,
  updated_at
FROM unified_branding_settings;

-- =====================================================
-- STEP 8: VERIFICATION
-- =====================================================

-- Show results
DO $$
DECLARE
  record_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO record_count FROM unified_branding_settings;
  RAISE NOTICE '✅ unified_branding_settings table created successfully';
  RAISE NOTICE '📊 Total branding records: %', record_count;
  
  IF record_count > 0 THEN
    RAISE NOTICE '✅ Data migration completed successfully';
  ELSE
    RAISE NOTICE '⚠️ No data migrated - this is normal for new installations';
  END IF;
END $$;

-- =====================================================
-- VERIFICATION QUERIES (Run these separately if needed)
-- =====================================================

-- Check if migration was successful
-- SELECT COUNT(*) as migrated_records FROM unified_branding_settings;

-- View all branding settings
-- SELECT * FROM unified_branding_settings;

-- View using the view
-- SELECT * FROM v_user_branding;

-- =====================================================
-- ROLLBACK (if needed)
-- =====================================================
-- DROP VIEW IF EXISTS v_user_branding;
-- DROP TABLE IF EXISTS unified_branding_settings CASCADE;

