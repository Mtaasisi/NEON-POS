-- =====================================================
-- DATABASE ISOLATION CHECK - SQL VERSION
-- Run this directly in your Neon SQL console
-- =====================================================

-- 1. Check Current Transaction Isolation Level
-- =====================================================
SHOW default_transaction_isolation;

-- Expected: "read committed" (PostgreSQL default)
-- This prevents dirty reads while maintaining good performance

-- 2. Check All Database Settings Related to Isolation
-- =====================================================
SELECT 
  name, 
  setting, 
  unit,
  short_desc
FROM pg_settings
WHERE name IN (
  'default_transaction_isolation',
  'max_connections',
  'max_locks_per_transaction',
  'deadlock_timeout',
  'statement_timeout',
  'idle_in_transaction_session_timeout',
  'lock_timeout'
)
ORDER BY name;

-- 3. Check Current Database Connections
-- =====================================================
SELECT 
  datname as database,
  count(*) as total_connections,
  count(*) FILTER (WHERE state = 'active') as active,
  count(*) FILTER (WHERE state = 'idle') as idle,
  count(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction,
  max(backend_start) as oldest_connection
FROM pg_stat_activity 
WHERE datname = current_database()
GROUP BY datname;

-- 4. Check Current Locks (Concurrency Issues)
-- =====================================================
SELECT 
  locktype,
  relation::regclass as table_name,
  mode,
  granted,
  COUNT(*) as lock_count
FROM pg_locks l
LEFT JOIN pg_class c ON l.relation = c.oid
WHERE database = (SELECT oid FROM pg_database WHERE datname = current_database())
GROUP BY locktype, relation, mode, granted
ORDER BY lock_count DESC, granted
LIMIT 20;

-- 5. Check for Blocking Queries
-- =====================================================
SELECT 
  blocked_locks.pid AS blocked_pid,
  blocked_activity.usename AS blocked_user,
  blocking_locks.pid AS blocking_pid,
  blocking_activity.usename AS blocking_user,
  blocked_activity.query AS blocked_statement,
  blocking_activity.query AS blocking_statement,
  blocked_activity.state as blocked_state,
  blocking_activity.state as blocking_state
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks 
  ON blocking_locks.locktype = blocked_locks.locktype
  AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
  AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
  AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
  AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
  AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
  AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
  AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
  AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
  AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
  AND blocking_locks.pid != blocked_locks.pid
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;

-- 6. Check Branch Isolation Setup
-- =====================================================
-- Check if branch-related columns exist
SELECT 
  c.table_name,
  c.column_name,
  c.data_type,
  c.is_nullable
FROM information_schema.columns c
WHERE c.table_schema = 'public'
AND c.column_name = 'branch_id'
ORDER BY c.table_name;

-- 7. Test Transaction Isolation (Optional - Run Manually)
-- =====================================================
-- Run this in TWO separate SQL console tabs simultaneously

-- TAB 1: Start a transaction and insert data (DON'T COMMIT YET)
/*
BEGIN;
INSERT INTO branches (id, name) VALUES ('test-isolation-1', 'Test Branch 1');
SELECT * FROM branches WHERE id = 'test-isolation-1';
-- Don't commit yet! Go to Tab 2
*/

-- TAB 2: Try to see the uncommitted data
/*
SELECT * FROM branches WHERE id = 'test-isolation-1';
-- You should see NO results because of READ COMMITTED isolation
-- This proves dirty read prevention is working
*/

-- TAB 1: Now commit
/*
COMMIT;
*/

-- TAB 2: Check again
/*
SELECT * FROM branches WHERE id = 'test-isolation-1';
-- Now you should see the result
*/

-- Cleanup
/*
DELETE FROM branches WHERE id = 'test-isolation-1';
*/

-- 8. Check Row Level Security (RLS) Status
-- =====================================================
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
  'branches',
  'lats_purchase_orders', 
  'lats_products', 
  'lats_inventory',
  'sales_transactions'
)
ORDER BY tablename;

-- 9. Check for Long-Running Transactions
-- =====================================================
SELECT 
  pid,
  now() - xact_start AS transaction_duration,
  usename,
  application_name,
  state,
  query
FROM pg_stat_activity
WHERE state IN ('idle in transaction', 'active')
AND xact_start IS NOT NULL
AND datname = current_database()
ORDER BY transaction_duration DESC
LIMIT 10;

-- 10. Check Transaction Wraparound Status
-- =====================================================
SELECT 
  datname,
  age(datfrozenxid) as transaction_age,
  CASE 
    WHEN age(datfrozenxid) > 1500000000 THEN '🔴 CRITICAL'
    WHEN age(datfrozenxid) > 1000000000 THEN '⚠️  WARNING'
    ELSE '✅ OK'
  END as status
FROM pg_database
WHERE datname = current_database();

-- =====================================================
-- SUMMARY OF ISOLATION LEVELS IN POSTGRESQL
-- =====================================================
/*
┌─────────────────────┬─────────────┬──────────────────┬──────────────┐
│ Isolation Level     │ Dirty Reads │ Non-Repeatable   │ Phantom Reads│
│                     │             │ Reads            │              │
├─────────────────────┼─────────────┼──────────────────┼──────────────┤
│ READ UNCOMMITTED    │ Possible    │ Possible         │ Possible     │
│ READ COMMITTED ✓    │ Prevented   │ Possible         │ Possible     │
│ REPEATABLE READ     │ Prevented   │ Prevented        │ Prevented*   │
│ SERIALIZABLE        │ Prevented   │ Prevented        │ Prevented    │
└─────────────────────┴─────────────┴──────────────────┴──────────────┘

* In PostgreSQL, REPEATABLE READ also prevents phantom reads

RECOMMENDED FOR POS SYSTEM: READ COMMITTED (current setting)
- Prevents dirty reads
- Good balance of consistency and performance
- Suitable for high-concurrency OLTP workloads
*/

-- =====================================================
-- TO CHANGE ISOLATION LEVEL (if needed)
-- =====================================================
-- Session-level change:
-- SET SESSION CHARACTERISTICS AS TRANSACTION ISOLATION LEVEL REPEATABLE READ;

-- Transaction-level change:
-- BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;

-- Database-level change (requires admin):
-- ALTER DATABASE your_database SET default_transaction_isolation TO 'repeatable read';

