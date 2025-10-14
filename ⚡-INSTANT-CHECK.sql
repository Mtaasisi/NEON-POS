-- ⚡ INSTANT DATABASE CHECK
-- Copy this entire file and paste into Neon SQL Editor
-- Results in 10 seconds!

\echo '⚡ INSTANT DATABASE CHECK STARTING...'
\echo ''

-- Does table exist?
SELECT '1️⃣ TABLE STATUS:' as "";
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_name = 'lats_pos_integrations_settings'
    ) 
    THEN '✅ lats_pos_integrations_settings table EXISTS'
    ELSE '❌ Table NOT FOUND - Run CREATE-INTEGRATIONS-SETTINGS.sql first!'
  END as "Result";

\echo ''

-- Quick stats
SELECT '2️⃣ QUICK STATS:' as "";
SELECT 
  COUNT(*) as "Total",
  COUNT(CASE WHEN is_enabled THEN 1 END) as "Enabled",
  COUNT(CASE WHEN is_active THEN 1 END) as "Active",
  COALESCE(SUM(total_requests), 0) as "Total Requests",
  COALESCE(SUM(successful_requests), 0) as "Successful"
FROM lats_pos_integrations_settings;

\echo ''

-- List integrations
SELECT '3️⃣ YOUR INTEGRATIONS:' as "";
SELECT 
  CASE WHEN is_enabled THEN '✅' ELSE '❌' END as "On",
  integration_name as "Integration",
  provider_name as "Provider",
  integration_type as "Type",
  CASE WHEN is_test_mode THEN '🧪 Test' ELSE '🚀 Prod' END as "Mode",
  total_requests as "Requests",
  CASE 
    WHEN total_requests > 0 
    THEN ROUND((successful_requests::float / total_requests * 100)::numeric, 1) || '%'
    ELSE 'N/A'
  END as "Success"
FROM lats_pos_integrations_settings
ORDER BY is_enabled DESC, created_at DESC;

\echo ''

-- Overall health
SELECT '4️⃣ OVERALL HEALTH:' as "";
SELECT 
  CASE 
    WHEN NOT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_name = 'lats_pos_integrations_settings'
    ) 
    THEN '❌ TABLE MISSING - Setup required'
    
    WHEN (SELECT COUNT(*) FROM lats_pos_integrations_settings) = 0
    THEN '⚠️ NO INTEGRATIONS - Add some in Admin Settings'
    
    WHEN (SELECT COUNT(*) FROM lats_pos_integrations_settings 
          WHERE is_enabled = true 
          AND (credentials IS NULL OR credentials = '{}')) > 0
    THEN '⚠️ SOME ENABLED INTEGRATIONS MISSING CREDENTIALS'
    
    WHEN (SELECT COUNT(*) FROM lats_pos_integrations_settings
          WHERE total_requests > 10
          AND failed_requests::float / total_requests > 0.2) > 0
    THEN '⚠️ SOME INTEGRATIONS HAVE HIGH FAILURE RATE'
    
    ELSE '✅ PERFECT CONDITION - Everything working great!'
  END as "Status";

\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '✅ CHECK COMPLETE!'
\echo ''
\echo 'Next steps:'
\echo '  • If table missing → Run CREATE-INTEGRATIONS-SETTINGS.sql'
\echo '  • If no integrations → Go to Admin Settings → Integrations'
\echo '  • If issues found → Check credentials in Admin Settings'
\echo '  • Test integrations → Visit /integrations-test'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

