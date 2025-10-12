-- ============================================
-- QUICK FIX: Transaction Aborted Error
-- Run this if you got "transaction is aborted" error
-- ============================================

-- Step 1: Rollback the failed transaction
ROLLBACK;

-- Step 2: Clear any locks
SELECT pg_advisory_unlock_all();

-- Step 3: Verify we're ready
SELECT 'Transaction cleared. Ready to run migration again!' as status;

-- ============================================
-- NOW YOU CAN RUN: FIX-PRODUCT-PAGES-COMPLETE.sql
-- ============================================

