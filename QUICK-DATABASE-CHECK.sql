-- ============================================
-- QUICK DATABASE CHECK (Simple Version)
-- ============================================
-- Fast check to see if integrations are set up correctly
-- ============================================

-- 1. Does the table exist?
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_name = 'lats_pos_integrations_settings'
    ) 
    THEN '✅ Table exists'
    ELSE '❌ Table NOT found - Run CREATE-INTEGRATIONS-SETTINGS.sql'
  END as "Status";

-- 2. How many integrations?
SELECT 
  COUNT(*) as "Total Integrations",
  COUNT(CASE WHEN is_enabled THEN 1 END) as "Enabled",
  COUNT(CASE WHEN is_active THEN 1 END) as "Active"
FROM lats_pos_integrations_settings;

-- 3. List all integrations
SELECT 
  integration_name as "Name",
  provider_name as "Provider",
  CASE WHEN is_enabled THEN '✅' ELSE '❌' END as "Enabled",
  CASE WHEN is_test_mode THEN '🧪 Test' ELSE '🚀 Prod' END as "Mode",
  total_requests as "Requests",
  created_at as "Created"
FROM lats_pos_integrations_settings
ORDER BY created_at DESC;

-- 4. Check for issues
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ No integrations yet - Add some in Admin Settings'
    WHEN COUNT(CASE WHEN is_enabled AND (credentials IS NULL OR credentials = '{}') THEN 1 END) > 0
    THEN '⚠️  Some enabled integrations missing credentials'
    ELSE '✅ Everything looks good!'
  END as "Health Status"
FROM lats_pos_integrations_settings;

