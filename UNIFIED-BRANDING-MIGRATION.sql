-- =====================================================
-- UNIFIED BRANDING SETTINGS TABLE
-- =====================================================
-- This creates a single source of truth for all branding
-- Both Admin Settings and POS Settings will reference this table
-- =====================================================

-- Step 1: Create the unified branding settings table
CREATE TABLE IF NOT EXISTS unified_branding_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Logo & Visual Identity
  business_logo TEXT, -- Main business logo (for receipts, invoices)
  app_logo TEXT, -- Alternative logo for app header/navigation
  logo_size TEXT DEFAULT 'medium' CHECK (logo_size IN ('small', 'medium', 'large')),
  logo_position TEXT DEFAULT 'left' CHECK (logo_position IN ('left', 'center', 'right')),
  
  -- Company Information
  company_name TEXT DEFAULT 'My Business' NOT NULL,
  business_name TEXT DEFAULT 'My Business', -- Alternative name for receipts
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

CREATE TRIGGER trigger_update_unified_branding_updated_at
  BEFORE UPDATE ON unified_branding_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_unified_branding_updated_at();

-- Step 4: Enable Row Level Security (RLS)
ALTER TABLE unified_branding_settings ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies
-- Policy: Users can view their own branding settings
CREATE POLICY "Users can view their own branding settings"
  ON unified_branding_settings
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own branding settings
CREATE POLICY "Users can insert their own branding settings"
  ON unified_branding_settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own branding settings
CREATE POLICY "Users can update their own branding settings"
  ON unified_branding_settings
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own branding settings
CREATE POLICY "Users can delete their own branding settings"
  ON unified_branding_settings
  FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- STEP 6: MIGRATION FROM EXISTING DATA
-- =====================================================

-- Migrate data from lats_pos_general_settings to unified_branding_settings
-- This will copy business information from POS settings
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
);

-- =====================================================
-- STEP 7: OPTIONAL - UPDATE POS SETTINGS TO REMOVE DUPLICATES
-- =====================================================
-- After migration, you can optionally drop duplicate columns from POS settings
-- CAUTION: Only run this after verifying data migration was successful!

-- To remove duplicate columns (uncomment if needed):
/*
ALTER TABLE lats_pos_general_settings 
  DROP COLUMN IF EXISTS business_name,
  DROP COLUMN IF EXISTS business_address,
  DROP COLUMN IF EXISTS business_phone,
  DROP COLUMN IF EXISTS business_email,
  DROP COLUMN IF EXISTS business_website;
  -- Keep business_logo for backward compatibility
*/

-- =====================================================
-- STEP 8: CREATE VIEW FOR EASY ACCESS
-- =====================================================
-- Create a view that combines user info with branding
CREATE OR REPLACE VIEW v_user_branding AS
SELECT 
  u.id as user_id,
  u.email,
  b.business_logo,
  b.app_logo,
  b.company_name,
  b.business_name,
  b.business_address,
  b.business_phone,
  b.business_email,
  b.business_website,
  b.primary_color,
  b.secondary_color,
  b.accent_color,
  b.logo_size,
  b.logo_position,
  b.tagline,
  b.tax_id,
  b.registration_number,
  b.created_at,
  b.updated_at
FROM auth.users u
LEFT JOIN unified_branding_settings b ON u.id = b.user_id;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check if migration was successful
-- SELECT COUNT(*) as migrated_records FROM unified_branding_settings;

-- View all branding settings
-- SELECT * FROM unified_branding_settings;

-- Compare with old POS settings
-- SELECT 
--   p.user_id,
--   p.business_name as pos_business_name,
--   u.business_name as unified_business_name,
--   p.business_logo as pos_logo,
--   u.business_logo as unified_logo
-- FROM lats_pos_general_settings p
-- LEFT JOIN unified_branding_settings u ON p.user_id = u.user_id;

-- =====================================================
-- ROLLBACK (if needed)
-- =====================================================
-- DROP VIEW IF EXISTS v_user_branding;
-- DROP TABLE IF EXISTS unified_branding_settings CASCADE;

