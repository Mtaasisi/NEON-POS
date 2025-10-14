-- ============================================
-- WHERE SMS CONFIGURATION IS FETCHED FROM
-- ============================================

-- The SMS service now fetches data from this table:
-- Table: lats_pos_integrations_settings

-- Here's what gets fetched:
SELECT 
  integration_name,
  provider_name,
  is_enabled,
  is_active,
  
  -- CREDENTIALS (JSONB field) - Contains authentication info
  credentials->>'api_key' as api_username,
  credentials->>'api_password' as api_password,
  credentials->>'sender_id' as sender_id,
  
  -- CONFIG (JSONB field) - Contains configuration settings
  config->>'api_url' as api_url,
  config->>'priority' as priority,
  config->>'country_code' as country_code,
  
  created_at,
  updated_at
FROM lats_pos_integrations_settings
WHERE integration_name = 'SMS_GATEWAY';

-- ============================================
-- HOW THE CODE FETCHES IT:
-- ============================================
-- 
-- 1. In smsService.ts, it calls:
--    const integration = await getIntegration('SMS_GATEWAY');
-- 
-- 2. From the integration object, it extracts:
--    - integration.credentials.api_key      → 'Inauzwa'
--    - integration.credentials.api_password → '@Masika10'
--    - integration.credentials.sender_id    → 'INAUZWA'
--    - integration.config.api_url           → 'https://mshastra.com/sendurl.aspx'
-- 
-- 3. These are then sent to the backend proxy at localhost:8000
-- 
-- 4. The backend constructs the MShastra URL with query params
--    and sends the SMS
-- ============================================

-- ============================================
-- FULL RECORD VIEW:
-- ============================================

SELECT 
  *,
  jsonb_pretty(credentials) as credentials_formatted,
  jsonb_pretty(config) as config_formatted
FROM lats_pos_integrations_settings
WHERE integration_name = 'SMS_GATEWAY';

-- ============================================
-- TO UPDATE SMS SETTINGS:
-- ============================================

-- Update credentials (username, password, sender ID)
UPDATE lats_pos_integrations_settings
SET credentials = jsonb_build_object(
  'api_key', 'YourNewUsername',
  'api_password', 'YourNewPassword',
  'sender_id', 'YOUR_SENDER_ID'
),
updated_at = NOW()
WHERE integration_name = 'SMS_GATEWAY';

-- Update config (API URL, priority, etc.)
UPDATE lats_pos_integrations_settings
SET config = jsonb_build_object(
  'api_url', 'https://mshastra.com/sendurl.aspx',
  'priority', 'High',
  'country_code', 'ALL',
  'max_retries', 3,
  'timeout', 30000
),
updated_at = NOW()
WHERE integration_name = 'SMS_GATEWAY';

