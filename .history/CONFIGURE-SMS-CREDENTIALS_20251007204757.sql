-- ============================================
-- CONFIGURE SMS SERVICE WITH YOUR CREDENTIALS
-- This will update the settings table with your SMS provider details
-- ============================================

SELECT '🔧 Configuring SMS service...' as status;

-- Update or insert SMS configuration settings
INSERT INTO settings (key, value, description)
VALUES 
  ('sms_api_url', 'https://mshastra.com/sendurl.aspx', 'SMS provider API URL'),
  ('sms_provider_api_key', 'Inauzwa', 'API key for SMS provider'),
  ('sms_provider_password', '@Masika10', 'SMS provider password')
ON CONFLICT (key) 
DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = NOW();

SELECT '✅ SMS credentials configured' as status;

-- ============================================
-- Verify the configuration
-- ============================================

SELECT '🔍 Verifying SMS configuration...' as status;

SELECT 
  key,
  CASE 
    WHEN key = 'sms_provider_password' THEN '****' || RIGHT(value, 4)
    ELSE value
  END as value,
  '✅ Configured' as status,
  description
FROM settings
WHERE key IN ('sms_provider_api_key', 'sms_api_url', 'sms_provider_password')
ORDER BY 
  CASE key
    WHEN 'sms_api_url' THEN 1
    WHEN 'sms_provider_api_key' THEN 2
    WHEN 'sms_provider_password' THEN 3
  END;

-- ============================================
-- Done!
-- ============================================

SELECT '🎉 SMS CONFIGURATION COMPLETE!' as result;
SELECT 'Your SMS service is now configured with MShastra credentials' as info_1;
SELECT 'Refresh your app (Ctrl+Shift+R or Cmd+Shift+R) to activate SMS service' as next_step;
SELECT 'The SMS service will now be able to send messages! ✅' as final_message;

