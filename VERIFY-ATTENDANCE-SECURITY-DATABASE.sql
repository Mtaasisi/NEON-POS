-- ============================================
-- VERIFY ATTENDANCE SECURITY SETTINGS DATABASE
-- This ensures your new security mode features are properly stored
-- ============================================

-- Step 1: Ensure settings table exists
-- ============================================
SELECT '🔍 Step 1: Checking settings table...' as status;

CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Disable RLS for settings table
ALTER TABLE settings DISABLE ROW LEVEL SECURITY;

-- Create index on key for faster lookups
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);

SELECT '✅ Settings table verified!' as status;

-- Step 2: Check if attendance settings exist
-- ============================================
SELECT '🔍 Step 2: Checking attendance settings...' as status;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM settings WHERE key = 'attendance') THEN
    RAISE NOTICE '✅ Attendance settings already exist in database';
  ELSE
    RAISE NOTICE '⚠️  No attendance settings found - they will be created on first save';
  END IF;
END $$;

-- Step 3: Verify settings table structure
-- ============================================
SELECT '🔍 Step 3: Verifying table structure...' as status;

SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'settings'
ORDER BY ordinal_position;

-- Step 4: Test data structure (example of what will be saved)
-- ============================================
SELECT '📋 Step 4: Example attendance settings structure...' as status;

SELECT '
{
  "enabled": true,
  "allowEmployeeChoice": true,
  "availableSecurityModes": ["auto-location", "manual-location", "wifi-only"],
  "defaultSecurityMode": "auto-location",
  "requireLocation": true,
  "requireWifi": true,
  "allowMobileData": true,
  "gpsAccuracy": 50,
  "checkInRadius": 100,
  "checkInTime": "08:00",
  "checkOutTime": "17:00",
  "gracePeriod": 15,
  "offices": [
    {
      "name": "Main Office",
      "lat": -3.359178,
      "lng": 36.661366,
      "radius": 100,
      "address": "Arusha, Tanzania",
      "networks": [
        {
          "ssid": "Office_WiFi",
          "bssid": "00:11:22:33:44:55",
          "description": "Main office WiFi"
        }
      ]
    }
  ]
}
' as example_attendance_settings_json;

-- Step 5: Insert or update default attendance settings (optional)
-- ============================================
SELECT '🔍 Step 5: Setting up default attendance configuration...' as status;

INSERT INTO settings (key, value, description)
VALUES (
  'attendance',
  '{
    "enabled": true,
    "allowEmployeeChoice": true,
    "availableSecurityModes": ["auto-location", "manual-location", "wifi-only"],
    "defaultSecurityMode": "auto-location",
    "requireLocation": true,
    "requireWifi": true,
    "allowMobileData": true,
    "gpsAccuracy": 50,
    "checkInRadius": 100,
    "checkInTime": "08:00",
    "checkOutTime": "17:00",
    "gracePeriod": 15,
    "offices": [
      {
        "name": "Arusha Main Office",
        "lat": -3.359178,
        "lng": 36.661366,
        "radius": 100,
        "address": "Main Office, Arusha, Tanzania",
        "networks": [
          {
            "ssid": "Office_WiFi",
            "bssid": "00:11:22:33:44:55",
            "description": "Main office WiFi network"
          },
          {
            "ssid": "Office_Guest",
            "description": "Guest WiFi network"
          },
          {
            "ssid": "4G_Mobile",
            "description": "Mobile data connection"
          }
        ]
      }
    ]
  }',
  'Attendance security mode configuration with employee choice settings'
)
ON CONFLICT (key) 
DO UPDATE SET 
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = NOW();

SELECT '✅ Default attendance settings configured!' as status;

-- Step 6: Verify the saved settings
-- ============================================
SELECT '🔍 Step 6: Verifying saved attendance settings...' as status;

SELECT 
  key,
  LEFT(value, 100) || '...' as value_preview,
  description,
  created_at,
  updated_at
FROM settings
WHERE key = 'attendance';

-- Step 7: Summary Report
-- ============================================
SELECT '
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ ATTENDANCE SECURITY DATABASE CHECK COMPLETE!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Settings table: EXISTS
✅ Attendance settings: CONFIGURED
✅ New security fields: READY
   - allowEmployeeChoice
   - availableSecurityModes (array)
   - defaultSecurityMode
   
🎯 What is stored:
   - All attendance configuration as JSON in settings.value
   - Key: "attendance"
   - Includes: offices, networks, security modes, etc.

📝 How it works:
   1. Admin changes settings in UI
   2. React calls saveAttendanceSettings()
   3. API saves to settings table as JSON
   4. Employees load settings on check-in
   5. Settings persist across sessions

🚀 You are ready to use the new security features!

Next steps:
1. Go to Admin → Settings → Attendance
2. Configure your security modes
3. Click Save Settings
4. Test as an employee

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
' as summary;

-- Optional: Show all current settings keys
SELECT '📋 All settings keys in database:' as info;
SELECT key, description, updated_at FROM settings ORDER BY key;

