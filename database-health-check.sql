
-- Database Health Check
-- Run this to diagnose connection issues

SELECT 
  'Active Connections' as metric,
  count(*) as value
FROM pg_stat_activity;

SELECT 
  'Database Size' as metric,
  pg_size_pretty(pg_database_size(current_database())) as value;

SELECT 
  'Slow Queries (>1s)' as metric,
  count(*) as value
FROM pg_stat_statements
WHERE mean_exec_time > 1000;

-- Check for missing indexes
SELECT 
  schemaname,
  tablename,
  attname,
  n_distinct,
  correlation
FROM pg_stats
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
  AND n_distinct > 100
  AND correlation < 0.1;

-- Check table sizes
SELECT 
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;
