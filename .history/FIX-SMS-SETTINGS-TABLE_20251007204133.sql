-- ============================================
-- FIX SMS SERVICE 400 ERROR
-- Creates the missing 'settings' table for SMS configuration
-- ============================================

SELECT '🔧 Creating settings table for SMS configuration...' as status;

-- Create a generic settings table with key-value structure
CREATE TABLE IF NOT EXISTS settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Disable RLS for this table
ALTER TABLE settings DISABLE ROW LEVEL SECURITY;

-- Create index on key for faster lookups
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);

SELECT '✅ Settings table created' as status;

-- ============================================
-- Insert default SMS settings (optional - you can configure these later in the UI)
-- ============================================

SELECT '📝 Inserting default SMS settings...' as status;

-- Insert SMS configuration settings (empty by default)
INSERT INTO settings (key, value, description)
VALUES 
  ('sms_provider_api_key', NULL, 'API key for SMS provider'),
  ('sms_api_url', NULL, 'SMS provider API URL'),
  ('sms_provider_password', NULL, 'SMS provider password')
ON CONFLICT (key) DO NOTHING;

SELECT '✅ Default SMS settings inserted' as status;

-- ============================================
-- Verify the fix
-- ============================================

SELECT '🔍 Verifying settings table...' as status;

SELECT 
  key,
  CASE 
    WHEN value IS NULL THEN '❌ Not Configured'
    ELSE '✅ Configured'
  END as status,
  description
FROM settings
WHERE key IN ('sms_provider_api_key', 'sms_api_url', 'sms_provider_password')
ORDER BY key;

-- ============================================
-- Done!
-- ============================================

SELECT '🎉 SMS SETTINGS TABLE FIX COMPLETE!' as result;
SELECT 'The 400 error for SMS service should now be fixed!' as info_1;
SELECT 'To configure SMS, update the settings table with your SMS provider credentials' as info_2;
SELECT 'Refresh your app (Ctrl+Shift+R or Cmd+Shift+R) to see the fix' as next_step;

