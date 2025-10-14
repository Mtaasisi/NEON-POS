-- ============================================
-- SIMPLE ATTENDANCE SECURITY SETUP
-- Copy-paste this into your Neon SQL Editor
-- ============================================

-- Step 1: Create settings table
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE settings DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);

-- Step 2: Insert/Update attendance settings
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
          }
        ]
      }
    ]
  }',
  'Attendance security mode configuration with employee choice'
)
ON CONFLICT (key) 
DO UPDATE SET 
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Step 3: Verify it worked
SELECT 
  key,
  description,
  LENGTH(value) as value_length,
  updated_at
FROM settings
WHERE key = 'attendance';

SELECT '✅ SETUP COMPLETE! Your attendance security features are ready!' as status;

