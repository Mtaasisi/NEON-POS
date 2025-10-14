-- ============================================
-- 📱 FIND USER_ID AND INSERT SMS CONFIG
-- ============================================
-- Step 1: Find a valid user_id from existing data
-- ============================================

-- Try to find user_id from customers table
SELECT DISTINCT 
  created_by as user_id,
  'Found from customers table' as source
FROM lats_pos_customers
WHERE created_by IS NOT NULL
LIMIT 1;

-- Try to find user_id from sales table
SELECT DISTINCT 
  sold_by as user_id,
  'Found from sales table' as source
FROM lats_pos_sales
WHERE sold_by IS NOT NULL
LIMIT 1;

-- Try to find user_id from devices table
SELECT DISTINCT 
  received_by as user_id,
  'Found from devices table' as source
FROM lats_pos_devices
WHERE received_by IS NOT NULL
LIMIT 1;

-- Try to find from existing integrations
SELECT DISTINCT 
  user_id,
  'Found from existing integrations' as source
FROM lats_pos_integrations_settings
WHERE user_id IS NOT NULL
LIMIT 1;

-- ============================================
-- Step 2: Copy ONE user_id from above results
-- Replace 'PASTE_USER_ID_HERE' below
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
  'PASTE_USER_ID_HERE',  -- ⚠️ REPLACE with user_id from Step 1
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

-- Verify
SELECT 
  integration_name,
  provider_name,
  is_enabled,
  credentials->>'api_key' as username,
  config->>'api_url' as api_url,
  '✅ SMS Configured!' as status
FROM lats_pos_integrations_settings
WHERE integration_name = 'SMS_GATEWAY';

