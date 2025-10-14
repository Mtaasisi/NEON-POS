-- ============================================
-- INTEGRATIONS DATABASE HEALTH CHECK
-- ============================================
-- Complete diagnostic to verify database is in perfect condition
-- ============================================

\echo '🔍 STARTING INTEGRATIONS DATABASE HEALTH CHECK...'
\echo ''

-- ============================================
-- 1. CHECK IF TABLE EXISTS
-- ============================================
\echo '📋 Step 1: Checking if integrations table exists...'
\echo ''

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'lats_pos_integrations_settings'
    ) THEN '✅ Table exists'
    ELSE '❌ Table does NOT exist - run CREATE-INTEGRATIONS-SETTINGS.sql'
  END as "Table Status";

\echo ''

-- ============================================
-- 2. CHECK TABLE STRUCTURE
-- ============================================
\echo '🏗️  Step 2: Verifying table structure...'
\echo ''

SELECT 
  column_name as "Column",
  data_type as "Type",
  is_nullable as "Nullable",
  column_default as "Default"
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'lats_pos_integrations_settings'
ORDER BY ordinal_position;

\echo ''

-- ============================================
-- 3. CHECK INDEXES
-- ============================================
\echo '📑 Step 3: Checking indexes...'
\echo ''

SELECT 
  indexname as "Index Name",
  indexdef as "Definition"
FROM pg_indexes
WHERE tablename = 'lats_pos_integrations_settings'
ORDER BY indexname;

\echo ''

-- ============================================
-- 4. VIEW ALL INTEGRATIONS
-- ============================================
\echo '📊 Step 4: Viewing all integrations...'
\echo ''

SELECT 
  id,
  integration_name as "Name",
  provider_name as "Provider",
  integration_type as "Type",
  is_enabled as "Enabled",
  is_active as "Active",
  is_test_mode as "Test Mode",
  environment as "Env",
  created_at as "Created"
FROM lats_pos_integrations_settings
ORDER BY created_at DESC;

\echo ''

-- ============================================
-- 5. COUNT INTEGRATIONS BY STATUS
-- ============================================
\echo '📈 Step 5: Integration statistics...'
\echo ''

SELECT 
  'Total Integrations' as "Metric",
  COUNT(*)::text as "Count"
FROM lats_pos_integrations_settings

UNION ALL

SELECT 
  'Enabled Integrations' as "Metric",
  COUNT(*)::text as "Count"
FROM lats_pos_integrations_settings
WHERE is_enabled = true

UNION ALL

SELECT 
  'Active Integrations' as "Metric",
  COUNT(*)::text as "Count"
FROM lats_pos_integrations_settings
WHERE is_active = true

UNION ALL

SELECT 
  'Test Mode' as "Metric",
  COUNT(*)::text as "Count"
FROM lats_pos_integrations_settings
WHERE is_test_mode = true

UNION ALL

SELECT 
  'Production Mode' as "Metric",
  COUNT(*)::text as "Count"
FROM lats_pos_integrations_settings
WHERE is_test_mode = false;

\echo ''

-- ============================================
-- 6. CHECK CREDENTIALS
-- ============================================
\echo '🔐 Step 6: Checking credentials (without exposing secrets)...'
\echo ''

SELECT 
  integration_name as "Integration",
  provider_name as "Provider",
  CASE 
    WHEN credentials IS NOT NULL AND credentials != '{}'::jsonb 
    THEN '✅ Configured (' || jsonb_object_keys_count(credentials) || ' keys)'
    ELSE '❌ Not configured'
  END as "Credentials Status",
  CASE 
    WHEN config IS NOT NULL AND config != '{}'::jsonb 
    THEN '✅ Configured (' || jsonb_object_keys_count(config) || ' keys)'
    ELSE '⚠️  No config'
  END as "Config Status"
FROM lats_pos_integrations_settings
ORDER BY integration_name;

-- Helper function to count jsonb keys
CREATE OR REPLACE FUNCTION jsonb_object_keys_count(obj jsonb)
RETURNS integer AS $$
BEGIN
  RETURN (SELECT count(*) FROM jsonb_object_keys(obj));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

\echo ''

-- ============================================
-- 7. CHECK USAGE STATISTICS
-- ============================================
\echo '📊 Step 7: Usage statistics...'
\echo ''

SELECT 
  integration_name as "Integration",
  total_requests as "Total",
  successful_requests as "Success",
  failed_requests as "Failed",
  CASE 
    WHEN total_requests > 0 
    THEN ROUND((successful_requests::float / total_requests * 100)::numeric, 2) || '%'
    ELSE 'N/A'
  END as "Success Rate",
  to_char(last_used_at, 'YYYY-MM-DD HH24:MI:SS') as "Last Used"
FROM lats_pos_integrations_settings
WHERE total_requests > 0
ORDER BY total_requests DESC;

-- If no usage yet
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '⚠️  No integrations have been used yet'
    ELSE '✅ Usage data available above'
  END as "Usage Status"
FROM lats_pos_integrations_settings
WHERE total_requests > 0;

\echo ''

-- ============================================
-- 8. INTEGRATION HEALTH CHECK
-- ============================================
\echo '🏥 Step 8: Integration health assessment...'
\echo ''

SELECT 
  integration_name as "Integration",
  provider_name as "Provider",
  CASE 
    WHEN is_enabled AND is_active THEN '✅ Healthy'
    WHEN is_enabled AND NOT is_active THEN '⚠️  Enabled but Inactive'
    ELSE '❌ Disabled'
  END as "Status",
  CASE 
    WHEN total_requests = 0 THEN '🆕 Never Used'
    WHEN successful_requests::float / NULLIF(total_requests, 0) > 0.95 THEN '✅ Excellent'
    WHEN successful_requests::float / NULLIF(total_requests, 0) > 0.80 THEN '⚠️  Good'
    ELSE '❌ Needs Attention'
  END as "Performance",
  CASE 
    WHEN is_test_mode THEN '🧪 Test'
    ELSE '🚀 Production'
  END as "Environment"
FROM lats_pos_integrations_settings
ORDER BY is_enabled DESC, total_requests DESC;

\echo ''

-- ============================================
-- 9. CHECK FOR ISSUES
-- ============================================
\echo '🔍 Step 9: Checking for potential issues...'
\echo ''

-- Check for integrations with no credentials
SELECT 
  'Missing Credentials' as "Issue Type",
  COUNT(*)::text as "Count",
  string_agg(integration_name, ', ') as "Affected Integrations"
FROM lats_pos_integrations_settings
WHERE credentials IS NULL OR credentials = '{}'::jsonb
GROUP BY "Issue Type"

UNION ALL

-- Check for enabled integrations with no credentials
SELECT 
  'Enabled Without Credentials' as "Issue Type",
  COUNT(*)::text as "Count",
  string_agg(integration_name, ', ') as "Affected Integrations"
FROM lats_pos_integrations_settings
WHERE is_enabled = true 
  AND (credentials IS NULL OR credentials = '{}'::jsonb)
GROUP BY "Issue Type"

UNION ALL

-- Check for high failure rates
SELECT 
  'High Failure Rate (>20%)' as "Issue Type",
  COUNT(*)::text as "Count",
  string_agg(integration_name, ', ') as "Affected Integrations"
FROM lats_pos_integrations_settings
WHERE total_requests > 10
  AND failed_requests::float / total_requests > 0.2
GROUP BY "Issue Type"

UNION ALL

-- Check for stale integrations (not used in 30 days)
SELECT 
  'Not Used in 30+ Days' as "Issue Type",
  COUNT(*)::text as "Count",
  string_agg(integration_name, ', ') as "Affected Integrations"
FROM lats_pos_integrations_settings
WHERE is_enabled = true
  AND last_used_at IS NOT NULL
  AND last_used_at < NOW() - INTERVAL '30 days'
GROUP BY "Issue Type";

-- If no issues
SELECT 
  CASE 
    WHEN NOT EXISTS (
      SELECT 1 FROM lats_pos_integrations_settings
      WHERE (credentials IS NULL OR credentials = '{}'::jsonb)
        OR (is_enabled = true AND (credentials IS NULL OR credentials = '{}'::jsonb))
        OR (total_requests > 10 AND failed_requests::float / total_requests > 0.2)
        OR (is_enabled = true AND last_used_at < NOW() - INTERVAL '30 days')
    ) THEN '✅ No issues found - Everything looks great!'
    ELSE '⚠️  Issues found above - Please review'
  END as "Overall Health";

\echo ''

-- ============================================
-- 10. VALIDATE DATA INTEGRITY
-- ============================================
\echo '🔬 Step 10: Data integrity validation...'
\echo ''

SELECT 
  'User ID Format' as "Check",
  CASE 
    WHEN COUNT(*) = COUNT(CASE WHEN user_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN 1 END)
    THEN '✅ All valid UUIDs'
    ELSE '⚠️  Some invalid UUIDs'
  END as "Result"
FROM lats_pos_integrations_settings

UNION ALL

SELECT 
  'Integration Names' as "Check",
  CASE 
    WHEN COUNT(*) = COUNT(CASE WHEN integration_name IS NOT NULL AND integration_name != '' THEN 1 END)
    THEN '✅ All have names'
    ELSE '❌ Some missing names'
  END as "Result"
FROM lats_pos_integrations_settings

UNION ALL

SELECT 
  'Integration Types' as "Check",
  CASE 
    WHEN COUNT(*) = COUNT(CASE WHEN integration_type IN ('sms', 'email', 'payment', 'analytics', 'shipping', 'whatsapp', 'ai', 'custom') THEN 1 END)
    THEN '✅ All valid types'
    ELSE '⚠️  Some invalid types'
  END as "Result"
FROM lats_pos_integrations_settings

UNION ALL

SELECT 
  'Environment Values' as "Check",
  CASE 
    WHEN COUNT(*) = COUNT(CASE WHEN environment IN ('test', 'production', 'sandbox') THEN 1 END)
    THEN '✅ All valid'
    ELSE '❌ Some invalid'
  END as "Result"
FROM lats_pos_integrations_settings

UNION ALL

SELECT 
  'Timestamps' as "Check",
  CASE 
    WHEN COUNT(*) = COUNT(CASE WHEN created_at IS NOT NULL AND updated_at IS NOT NULL THEN 1 END)
    THEN '✅ All have timestamps'
    ELSE '❌ Some missing timestamps'
  END as "Result"
FROM lats_pos_integrations_settings;

\echo ''

-- ============================================
-- 11. SUMMARY REPORT
-- ============================================
\echo '📋 Step 11: Summary report...'
\echo ''

WITH summary AS (
  SELECT 
    COUNT(*) as total,
    COUNT(CASE WHEN is_enabled THEN 1 END) as enabled,
    COUNT(CASE WHEN is_active THEN 1 END) as active,
    COUNT(CASE WHEN is_test_mode THEN 1 END) as test_mode,
    COUNT(CASE WHEN environment = 'production' THEN 1 END) as production,
    COUNT(DISTINCT integration_type) as types,
    COALESCE(SUM(total_requests), 0) as total_requests,
    COALESCE(SUM(successful_requests), 0) as successful,
    COALESCE(SUM(failed_requests), 0) as failed,
    CASE 
      WHEN SUM(total_requests) > 0 
      THEN ROUND(AVG(successful_requests::float / NULLIF(total_requests, 0) * 100)::numeric, 2)
      ELSE 0
    END as avg_success_rate
  FROM lats_pos_integrations_settings
)
SELECT 
  '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as "",
  '          INTEGRATIONS SUMMARY REPORT' as "",
  '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as ""

UNION ALL

SELECT '', 'Total Integrations: ' || total::text, ''
FROM summary

UNION ALL

SELECT '', 'Enabled: ' || enabled::text, ''
FROM summary

UNION ALL

SELECT '', 'Active: ' || active::text, ''
FROM summary

UNION ALL

SELECT '', 'Test Mode: ' || test_mode::text, ''
FROM summary

UNION ALL

SELECT '', 'Production: ' || production::text, ''
FROM summary

UNION ALL

SELECT '', 'Integration Types: ' || types::text, ''
FROM summary

UNION ALL

SELECT '', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', ''

UNION ALL

SELECT '', 'Total API Requests: ' || total_requests::text, ''
FROM summary

UNION ALL

SELECT '', 'Successful: ' || successful::text, ''
FROM summary

UNION ALL

SELECT '', 'Failed: ' || failed::text, ''
FROM summary

UNION ALL

SELECT '', 'Average Success Rate: ' || avg_success_rate::text || '%', ''
FROM summary

UNION ALL

SELECT '', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', '';

\echo ''

-- ============================================
-- 12. FINAL HEALTH STATUS
-- ============================================
\echo '🏁 Step 12: Final health status...'
\echo ''

WITH health_check AS (
  SELECT 
    -- Check if table exists
    EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'lats_pos_integrations_settings'
    ) as table_exists,
    
    -- Check if there are integrations
    (SELECT COUNT(*) FROM lats_pos_integrations_settings) as integration_count,
    
    -- Check if enabled integrations have credentials
    (SELECT COUNT(*) FROM lats_pos_integrations_settings 
     WHERE is_enabled = true 
     AND (credentials IS NULL OR credentials = '{}'::jsonb)) as enabled_without_creds,
    
    -- Check for high failure rates
    (SELECT COUNT(*) FROM lats_pos_integrations_settings
     WHERE total_requests > 10
     AND failed_requests::float / total_requests > 0.2) as high_failure_count
)
SELECT 
  '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as "═══════════════════════════════════════════",
  CASE 
    WHEN table_exists 
         AND integration_count >= 0 
         AND enabled_without_creds = 0 
         AND high_failure_count = 0
    THEN '✅ DATABASE IS IN PERFECT CONDITION! ✅'
    WHEN table_exists 
         AND enabled_without_creds = 0 
         AND high_failure_count = 0
    THEN '✅ DATABASE IS HEALTHY!'
    WHEN table_exists
    THEN '⚠️  DATABASE EXISTS BUT HAS ISSUES'
    ELSE '❌ DATABASE NEEDS SETUP'
  END as "║              OVERALL STATUS              ║",
  '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as "═══════════════════════════════════════════"
FROM health_check;

\echo ''
\echo '✅ HEALTH CHECK COMPLETE!'
\echo ''
\echo '📚 Next Steps:'
\echo '   - If table doesn'\''t exist, run: CREATE-INTEGRATIONS-SETTINGS.sql'
\echo '   - If no integrations, add them in: Admin Settings → Integrations'
\echo '   - If issues found, review and fix credentials'
\echo '   - Test integrations at: /integrations-test'
\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

