-- ============================================
-- 📱 SETUP SMS GATEWAY - INAUZWA
-- ============================================
-- This will configure your MShastra SMS integration
-- ============================================

-- Step 1: Check if integrations table exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_name = 'lats_pos_integrations_settings'
    )
    THEN '✅ Table exists - proceeding with setup'
    ELSE '❌ Table does not exist - please create it first'
  END as table_status;

-- Step 2: Check existing integrations (if any)
SELECT 
  user_id,
  integration_name,
  provider_name,
  is_enabled,
  '👆 If you see a user_id above, use it. Otherwise use NULL for Step 3' as instruction
FROM lats_pos_integrations_settings
LIMIT 5;

-- Alternative: Check if there are any users in the employees table
SELECT 
  id as user_id,
  name,
  email,
  '👆 Copy a user_id from above for Step 3' as instruction
FROM lats_pos_employees
WHERE role IN ('owner', 'admin', 'manager')
LIMIT 5;

-- ============================================
-- Step 3: INSERT YOUR SMS CREDENTIALS
-- ⚠️ REPLACE 'YOUR_USER_ID_HERE' with the ID from Step 2
-- ============================================

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
  'YOUR_USER_ID_HERE',  -- ⚠️ REPLACE THIS with your user_id from Step 2
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
  'MShastra SMS Gateway for customer notifications and receipts'
)
ON CONFLICT (user_id, business_id, integration_name) 
DO UPDATE SET
  credentials = EXCLUDED.credentials,
  config = EXCLUDED.config,
  is_enabled = true,
  is_active = true,
  updated_at = NOW();

-- Step 4: Verify the configuration
SELECT 
  integration_name,
  provider_name,
  is_enabled,
  is_active,
  environment,
  credentials->>'api_key' as username,
  config->>'api_url' as api_url,
  '✅ SMS Configuration loaded successfully!' as status
FROM lats_pos_integrations_settings
WHERE integration_name = 'SMS_GATEWAY';

-- ============================================
-- 🎉 SETUP COMPLETE!
-- ============================================
-- 
-- Next steps:
-- 1. Refresh your POS application (hard refresh: Cmd+Shift+R)
-- 2. Open browser console (F12)
-- 3. Look for: "✅ SMS service initialized successfully"
-- 4. Try sending an SMS to test!
-- ============================================

