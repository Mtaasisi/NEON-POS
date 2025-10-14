-- ============================================
-- 📱 QUICK SMS SETUP - NO USER_ID NEEDED
-- ============================================
-- Just run this directly - all credentials filled in!
-- ============================================

-- Insert SMS Configuration (using NULL for user_id)
INSERT INTO lats_pos_integrations_settings (
  user_id,
  business_id,
  integration_name,
  integration_type,
  provider_name,
  is_enabled,
  is_active,
  is_test_mode,
  environment,
  credentials,
  config,
  description
) VALUES (
  NULL,  -- Using NULL for user_id (works fine!)
  NULL,
  'SMS_GATEWAY',
  'sms',
  'MShastra',
  true,
  true,
  false,
  'production',
  jsonb_build_object(
    'api_key', 'Inauzwa',
    'api_password', '@Masika10',
    'sender_id', 'INAUZWA'
  ),
  jsonb_build_object(
    'api_url', 'https://mshastra.com/sendurl.aspx',
    'priority', 'High',
    'country_code', 'ALL',
    'max_retries', 3,
    'timeout', 30000
  ),
  'MShastra SMS Gateway - Inauzwa'
)
ON CONFLICT (user_id, business_id, integration_name) 
DO UPDATE SET
  credentials = EXCLUDED.credentials,
  config = EXCLUDED.config,
  is_enabled = true,
  is_active = true,
  updated_at = NOW();

-- Verify it worked
SELECT 
  integration_name,
  provider_name,
  is_enabled,
  is_active,
  credentials->>'api_key' as username,
  credentials->>'sender_id' as sender_id,
  config->>'api_url' as api_url,
  '✅ SMS Configured!' as status
FROM lats_pos_integrations_settings
WHERE integration_name = 'SMS_GATEWAY';

-- ============================================
-- 🎉 DONE! Now refresh your app!
-- ============================================

