-- ===================================================================
-- FIX TRANSACTION ERROR - Run this first to clear the error
-- ===================================================================

-- Roll back any aborted transaction
ROLLBACK;

-- Clear the error state
\echo 'Transaction rolled back. You can now run commands again.'
\echo ''
\echo 'Next steps:'
\echo '1. Run: \\i MIGRATE-EMPLOYEE-SCHEMA-SAFE.sql'
\echo ''

