-- Disable Photo Verification in Attendance Settings
-- Run this script to update your attendance settings and disable photo verification

-- Update the attendance settings in the database
UPDATE settings
SET value = jsonb_set(
    value::jsonb,
    '{requirePhoto}',
    'false'::jsonb
)
WHERE key = 'attendance';

-- Verify the update
SELECT 
    key,
    value->>'requirePhoto' as require_photo,
    value->>'requireLocation' as require_location,
    value->>'requireWifi' as require_wifi,
    value->>'enabled' as enabled
FROM settings
WHERE key = 'attendance';

-- If no attendance settings exist yet, insert default settings without photo verification
INSERT INTO settings (key, value, updated_at)
SELECT 
    'attendance',
    jsonb_build_object(
        'enabled', true,
        'allowEmployeeChoice', true,
        'availableSecurityModes', jsonb_build_array('auto-location', 'manual-location', 'wifi-only'),
        'defaultSecurityMode', 'auto-location',
        'requireLocation', true,
        'requireWifi', true,
        'requirePhoto', false,
        'allowMobileData', true,
        'gpsAccuracy', 50,
        'checkInRadius', 100,
        'checkInTime', '08:00',
        'checkOutTime', '17:00',
        'gracePeriod', 15,
        'offices', jsonb_build_array(
            jsonb_build_object(
                'name', 'Arusha Main Office',
                'lat', -3.359178,
                'lng', 36.661366,
                'radius', 100,
                'address', 'Main Office, Arusha, Tanzania',
                'networks', jsonb_build_array(
                    jsonb_build_object(
                        'ssid', 'Office_WiFi',
                        'bssid', '00:11:22:33:44:55',
                        'description', 'Main office WiFi network'
                    ),
                    jsonb_build_object(
                        'ssid', 'Office_Guest',
                        'description', 'Guest WiFi network'
                    ),
                    jsonb_build_object(
                        'ssid', '4G_Mobile',
                        'description', 'Mobile data connection'
                    )
                )
            )
        )
    ),
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM settings WHERE key = 'attendance');

-- Confirmation message
SELECT 
    '✅ Photo verification has been disabled!' as message,
    'Employees will no longer be prompted for photo during check-in' as info;

