-- ============================================
-- 📱 CONFIGURE SMS GATEWAY (MShastra)
-- ============================================
-- Run this SQL in your Neon database to set up SMS
-- Replace YOUR_USER_ID and credentials with your actual values
-- ============================================

-- Step 1: Get your user_id
-- Run this first to find your user_id:
-- SELECT id FROM auth.users WHERE email = 'your@email.com';

-- Step 2: Insert/Update SMS Gateway Integration
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
  'YOUR_USER_ID',  -- ⚠️ Replace with your actual user_id from auth.users
  NULL,
  'SMS_GATEWAY',
  'sms',
  'MShastra',
  true,              -- Enable the integration
  true,              -- Make it active
  false,             -- Set to true if testing, false for production
  'production',      -- Change to 'test' if testing
  jsonb_build_object(
    'api_key', 'YOUR_MSHASTRA_USERNAME',      -- ⚠️ Replace with your MShastra username
    'api_password', 'YOUR_MSHASTRA_PASSWORD', -- ⚠️ Replace with your MShastra password
    'sender_id', 'INAUZWA'                    -- ⚠️ Replace with your approved Sender ID
  ),
  jsonb_build_object(
    'api_url', 'https://api.mshastra.com/sms', -- Default MShastra API URL
    'priority', 'High',                         -- Message priority (High, Medium, Low)
    'country_code', 'ALL',                      -- Country code (ALL for all countries)
    'max_retries', 3,                           -- Number of retry attempts
    'timeout', 30000                            -- Timeout in milliseconds
  ),
  'MShastra SMS Gateway for customer notifications and receipts'
)
ON CONFLICT (user_id, business_id, integration_name) 
DO UPDATE SET
  credentials = EXCLUDED.credentials,
  config = EXCLUDED.config,
  is_enabled = EXCLUDED.is_enabled,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- Step 3: Verify the integration
SELECT 
  integration_name,
  provider_name,
  is_enabled,
  is_active,
  environment,
  created_at
FROM lats_pos_integrations_settings
WHERE integration_name = 'SMS_GATEWAY';

-- ============================================
-- ✅ Done! Your SMS service should now work
-- ============================================
-- 
-- 🔍 To test:
-- 1. Reload your app (refresh the page)
-- 2. Try sending an SMS from the customer detail modal
-- 3. Check the console logs for success/error messages
-- 
-- 📋 Note: Make sure you have:
-- - Valid MShastra account
-- - Sufficient SMS credits
-- - Approved Sender ID (e.g., "INAUZWA")
-- - Correct username and password
-- ============================================

