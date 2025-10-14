-- ============================================================
-- STEP-BY-STEP FIX FOR PAYMENT_METHOD COLUMN
-- Run each section one at a time and check the output
-- ============================================================

-- ============================================================
-- STEP 1: Check current state
-- ============================================================
\echo '========================================='
\echo 'STEP 1: Checking current column type...'
\echo '========================================='

SELECT 
  column_name,
  data_type,
  udt_name
FROM information_schema.columns 
WHERE table_name = 'lats_sales' 
AND column_name = 'payment_method';

-- ============================================================
-- STEP 2: Backup existing data (if any)
-- ============================================================
\echo ''
\echo '========================================='
\echo 'STEP 2: Checking existing data...'
\echo '========================================='

SELECT COUNT(*) as total_sales FROM lats_sales;

-- ============================================================
-- STEP 3: Create a temporary backup column
-- ============================================================
\echo ''
\echo '========================================='
\echo 'STEP 3: Creating backup of payment_method...'
\echo '========================================='

ALTER TABLE lats_sales ADD COLUMN IF NOT EXISTS payment_method_backup TEXT;
UPDATE lats_sales SET payment_method_backup = payment_method::text WHERE payment_method IS NOT NULL;

\echo 'Backup created ✅'

-- ============================================================
-- STEP 4: Drop the old column
-- ============================================================
\echo ''
\echo '========================================='
\echo 'STEP 4: Dropping old payment_method column...'
\echo '========================================='

ALTER TABLE lats_sales DROP COLUMN IF EXISTS payment_method;

\echo 'Old column dropped ✅'

-- ============================================================
-- STEP 5: Create new JSONB column
-- ============================================================
\echo ''
\echo '========================================='
\echo 'STEP 5: Creating new JSONB column...'
\echo '========================================='

ALTER TABLE lats_sales ADD COLUMN payment_method JSONB;

\echo 'New JSONB column created ✅'

-- ============================================================
-- STEP 6: Restore data from backup (if any)
-- ============================================================
\echo ''
\echo '========================================='
\echo 'STEP 6: Restoring data from backup...'
\echo '========================================='

UPDATE lats_sales 
SET payment_method = 
  CASE 
    WHEN payment_method_backup IS NULL THEN NULL
    WHEN payment_method_backup = '' THEN '{"type":"cash","amount":0}'::jsonb
    WHEN payment_method_backup ~ '^[\s]*[\{\[]' THEN payment_method_backup::jsonb
    ELSE jsonb_build_object('type', payment_method_backup, 'amount', 0)
  END
WHERE payment_method_backup IS NOT NULL;

\echo 'Data restored ✅'

-- ============================================================
-- STEP 7: Verify the new column type
-- ============================================================
\echo ''
\echo '========================================='
\echo 'STEP 7: Verifying new column...'
\echo '========================================='

SELECT 
  column_name,
  data_type,
  udt_name
FROM information_schema.columns 
WHERE table_name = 'lats_sales' 
AND column_name = 'payment_method';

-- ============================================================
-- STEP 8: Test JSONB insert
-- ============================================================
\echo ''
\echo '========================================='
\echo 'STEP 8: Testing JSONB insert...'
\echo '========================================='

DO $$ 
DECLARE
  test_sale_id UUID;
BEGIN
  -- Insert test sale
  INSERT INTO lats_sales (
    sale_number,
    total_amount,
    payment_method
  ) VALUES (
    'TEST-' || gen_random_uuid()::text,
    100,
    '{"type":"CRDB Bank","amount":100,"details":{"accountId":"test-123","timestamp":"2025-01-01"}}'::jsonb
  ) RETURNING id INTO test_sale_id;
  
  -- Verify it was inserted correctly
  IF test_sale_id IS NOT NULL THEN
    RAISE NOTICE '✅ JSONB insert successful! Sale ID: %', test_sale_id;
    
    -- Clean up test data
    DELETE FROM lats_sales WHERE id = test_sale_id;
    RAISE NOTICE '✅ Test data cleaned up';
  ELSE
    RAISE EXCEPTION '❌ JSONB insert failed!';
  END IF;
END $$;

-- ============================================================
-- STEP 9: Add other missing columns
-- ============================================================
\echo ''
\echo '========================================='
\echo 'STEP 9: Adding other missing columns...'
\echo '========================================='

ALTER TABLE lats_sales ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'completed';
ALTER TABLE lats_sales ADD COLUMN IF NOT EXISTS sold_by TEXT;
ALTER TABLE lats_sales ADD COLUMN IF NOT EXISTS branch_id UUID;
ALTER TABLE lats_sales ADD COLUMN IF NOT EXISTS subtotal NUMERIC DEFAULT 0;
ALTER TABLE lats_sales ADD COLUMN IF NOT EXISTS discount NUMERIC DEFAULT 0;
ALTER TABLE lats_sales ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE lats_sales ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE lats_sales ADD COLUMN IF NOT EXISTS customer_email TEXT;
ALTER TABLE lats_sales ADD COLUMN IF NOT EXISTS tax NUMERIC DEFAULT 0;

\echo 'Additional columns added ✅'

-- ============================================================
-- STEP 10: Clean up backup column
-- ============================================================
\echo ''
\echo '========================================='
\echo 'STEP 10: Cleaning up backup column...'
\echo '========================================='

ALTER TABLE lats_sales DROP COLUMN IF EXISTS payment_method_backup;

\echo 'Backup column removed ✅'

-- ============================================================
-- STEP 11: Final verification
-- ============================================================
\echo ''
\echo '========================================='
\echo 'STEP 11: Final verification...'
\echo '========================================='

SELECT 
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_name = 'lats_sales' 
AND column_name IN (
  'payment_method',
  'payment_status',
  'sold_by',
  'branch_id',
  'subtotal',
  'discount',
  'customer_name',
  'customer_phone',
  'customer_email',
  'tax'
)
ORDER BY column_name;

\echo ''
\echo '========================================='
\echo '✅ ALL STEPS COMPLETED SUCCESSFULLY!'
\echo '========================================='
\echo ''
\echo 'You can now test creating a sale in your POS system.'

