-- ============================================
-- MANAGE INTEGRATIONS - HELPER QUERIES
-- ============================================
-- Useful queries for managing your integrations
-- ============================================

-- ============================================
-- 1. VIEW ALL INTEGRATIONS
-- ============================================

SELECT 
  id,
  integration_name as "Integration",
  provider_name as "Provider",
  integration_type as "Type",
  is_enabled as "Enabled",
  is_test_mode as "Test Mode",
  environment as "Env",
  last_used_at as "Last Used",
  total_requests as "Total Requests",
  successful_requests as "Success",
  failed_requests as "Failed",
  created_at as "Created"
FROM lats_pos_integrations_settings
ORDER BY integration_type, integration_name;

-- ============================================
-- 2. VIEW ONLY ENABLED INTEGRATIONS
-- ============================================

SELECT 
  integration_name,
  provider_name,
  integration_type,
  environment,
  credentials,
  config
FROM lats_pos_integrations_settings
WHERE is_enabled = true
AND is_active = true;

-- ============================================
-- 3. GET SPECIFIC INTEGRATION CREDENTIALS
-- ============================================
-- Replace 'SMS_GATEWAY' with your integration name
-- Replace 'YOUR_USER_ID' with your actual user_id

SELECT 
  integration_name,
  credentials,
  config
FROM lats_pos_integrations_settings
WHERE integration_name = 'SMS_GATEWAY'
-- AND user_id = 'YOUR_USER_ID' -- Uncomment and replace if filtering by user
;

-- ============================================
-- 4. UPDATE INTEGRATION CREDENTIALS
-- ============================================
-- Example: Update SMS Gateway credentials

UPDATE lats_pos_integrations_settings
SET 
  credentials = jsonb_build_object(
    'account_sid', 'NEW_ACCOUNT_SID',
    'auth_token', 'NEW_AUTH_TOKEN',
    'messaging_service_sid', 'NEW_SERVICE_SID'
  ),
  updated_at = NOW()
WHERE integration_name = 'SMS_GATEWAY';
-- AND user_id = 'YOUR_USER_ID'; -- Uncomment if needed

-- ============================================
-- 5. ENABLE/DISABLE INTEGRATION
-- ============================================

-- Enable an integration
UPDATE lats_pos_integrations_settings
SET 
  is_enabled = true,
  is_active = true,
  updated_at = NOW()
WHERE integration_name = 'SMS_GATEWAY';
-- AND user_id = 'YOUR_USER_ID'; -- Uncomment if needed

-- Disable an integration
UPDATE lats_pos_integrations_settings
SET 
  is_enabled = false,
  is_active = false,
  updated_at = NOW()
WHERE integration_name = 'SMS_GATEWAY';
-- AND user_id = 'YOUR_USER_ID'; -- Uncomment if needed

-- ============================================
-- 6. SWITCH BETWEEN TEST AND PRODUCTION
-- ============================================

-- Switch to production mode
UPDATE lats_pos_integrations_settings
SET 
  is_test_mode = false,
  environment = 'production',
  -- Update credentials to production keys
  credentials = jsonb_set(
    credentials,
    '{api_key}',
    '"sk_live_YOUR_LIVE_KEY_HERE"'
  ),
  updated_at = NOW()
WHERE integration_name = 'STRIPE_PAYMENT'
; -- AND user_id = 'YOUR_USER_ID' -- Uncomment if needed

-- Switch back to test mode
UPDATE lats_pos_integrations_settings
SET 
  is_test_mode = true,
  environment = 'test',
  credentials = jsonb_set(
    credentials,
    '{api_key}',
    '"sk_test_YOUR_TEST_KEY_HERE"'
  ),
  updated_at = NOW()
WHERE integration_name = 'STRIPE_PAYMENT'
; -- AND user_id = 'YOUR_USER_ID' -- Uncomment if needed

-- ============================================
-- 7. UPDATE USAGE STATISTICS
-- ============================================
-- Call this after using an integration

UPDATE lats_pos_integrations_settings
SET 
  last_used_at = NOW(),
  total_requests = total_requests + 1,
  successful_requests = successful_requests + 1,
  updated_at = NOW()
WHERE integration_name = 'SMS_GATEWAY'
; -- AND user_id = 'YOUR_USER_ID' -- Uncomment if needed

-- For failed requests
UPDATE lats_pos_integrations_settings
SET 
  last_used_at = NOW(),
  total_requests = total_requests + 1,
  failed_requests = failed_requests + 1,
  updated_at = NOW()
WHERE integration_name = 'SMS_GATEWAY'
; -- AND user_id = 'YOUR_USER_ID' -- Uncomment if needed

-- ============================================
-- 8. CHECK INTEGRATION HEALTH
-- ============================================

SELECT 
  integration_name,
  provider_name,
  CASE 
    WHEN is_enabled AND is_active THEN '✅ Active'
    WHEN is_enabled AND NOT is_active THEN '⚠️ Enabled but Inactive'
    ELSE '❌ Disabled'
  END as "Status",
  CASE 
    WHEN total_requests = 0 THEN 'Never Used'
    WHEN successful_requests::float / total_requests > 0.95 THEN '✅ Healthy'
    WHEN successful_requests::float / total_requests > 0.80 THEN '⚠️ Needs Attention'
    ELSE '❌ Failing'
  END as "Health",
  ROUND((successful_requests::float / NULLIF(total_requests, 0) * 100)::numeric, 2) || '%' as "Success Rate",
  total_requests as "Total",
  successful_requests as "Success",
  failed_requests as "Failed",
  last_used_at as "Last Used"
FROM lats_pos_integrations_settings
WHERE total_requests > 0
ORDER BY integration_type, integration_name;

-- ============================================
-- 9. DELETE INTEGRATION
-- ============================================
-- BE CAREFUL! This deletes the integration permanently

DELETE FROM lats_pos_integrations_settings
WHERE integration_name = 'INTEGRATION_NAME_HERE'
; -- AND user_id = 'YOUR_USER_ID' -- Uncomment if needed

-- ============================================
-- 10. GET INTEGRATION BY TYPE
-- ============================================
-- Get all SMS integrations

SELECT 
  integration_name,
  provider_name,
  is_enabled,
  credentials,
  config
FROM lats_pos_integrations_settings
WHERE integration_type = 'sms'
; -- AND user_id = 'YOUR_USER_ID' -- Uncomment if needed

-- ============================================
-- 11. ADD CUSTOM METADATA
-- ============================================

UPDATE lats_pos_integrations_settings
SET 
  metadata = jsonb_build_object(
    'contact_person', 'John Doe',
    'support_email', 'support@provider.com',
    'contract_expires', '2025-12-31',
    'monthly_limit', 10000,
    'current_usage', 5000
  ),
  updated_at = NOW()
WHERE integration_name = 'SMS_GATEWAY'
; -- AND user_id = 'YOUR_USER_ID' -- Uncomment if needed

-- ============================================
-- 12. RESET USAGE STATISTICS (Monthly)
-- ============================================
-- Run this at the start of each month

UPDATE lats_pos_integrations_settings
SET 
  total_requests = 0,
  successful_requests = 0,
  failed_requests = 0,
  -- Save previous stats to metadata
  metadata = jsonb_set(
    COALESCE(metadata, '{}'::jsonb),
    '{previous_month_stats}',
    jsonb_build_object(
      'month', to_char(NOW(), 'YYYY-MM'),
      'total', total_requests,
      'success', successful_requests,
      'failed', failed_requests
    )
  ),
  updated_at = NOW()
WHERE user_id = auth.uid();

-- ============================================
-- 13. EXPORT INTEGRATION SETTINGS (Backup)
-- ============================================

SELECT jsonb_pretty(
  jsonb_build_object(
    'integration_name', integration_name,
    'integration_type', integration_type,
    'provider_name', provider_name,
    'is_enabled', is_enabled,
    'is_test_mode', is_test_mode,
    'environment', environment,
    'credentials', credentials,
    'config', config,
    'metadata', metadata,
    'exported_at', NOW()
  )
) as "Backup JSON"
FROM lats_pos_integrations_settings
WHERE user_id = auth.uid();

-- ============================================
-- 14. SEARCH INTEGRATIONS
-- ============================================

SELECT 
  integration_name,
  provider_name,
  integration_type,
  description
FROM lats_pos_integrations_settings
WHERE 
  (integration_name ILIKE '%SEARCH_TERM%'
  OR provider_name ILIKE '%SEARCH_TERM%'
  OR description ILIKE '%SEARCH_TERM%')
; -- AND user_id = 'YOUR_USER_ID' -- Uncomment if needed

-- ============================================
-- 15. SUMMARY REPORT
-- ============================================

SELECT 
  COUNT(*) as "Total Integrations",
  COUNT(CASE WHEN is_enabled THEN 1 END) as "Enabled",
  COUNT(CASE WHEN is_active THEN 1 END) as "Active",
  COUNT(CASE WHEN is_test_mode THEN 1 END) as "Test Mode",
  COUNT(CASE WHEN environment = 'production' THEN 1 END) as "Production",
  COUNT(DISTINCT integration_type) as "Types",
  SUM(total_requests) as "Total Requests",
  SUM(successful_requests) as "Successful",
  SUM(failed_requests) as "Failed",
  ROUND(AVG(successful_requests::float / NULLIF(total_requests, 0) * 100)::numeric, 2) || '%' as "Avg Success Rate"
FROM lats_pos_integrations_settings
WHERE user_id = auth.uid();

