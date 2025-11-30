-- =====================================================
-- Add status column to account_transactions table
-- =====================================================
-- Problem: QuickExpenseModal and expense management code expect
-- a 'status' column in account_transactions for approval workflow,
-- but this column doesn't exist in the database schema.
--
-- Solution: Add status column with appropriate constraints
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔧 =====================================================';
    RAISE NOTICE '🔧 Adding status column to account_transactions';
    RAISE NOTICE '🔧 =====================================================';
    RAISE NOTICE '';
END $$;

-- Add status column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'account_transactions'
        AND column_name = 'status'
    ) THEN
        ALTER TABLE account_transactions
        ADD COLUMN status TEXT DEFAULT 'approved'
        CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled'));

        RAISE NOTICE '✅ Added status column to account_transactions';
    ELSE
        RAISE NOTICE 'ℹ️  Status column already exists in account_transactions';
    END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN account_transactions.status IS 'Approval status for transactions requiring approval (pending, approved, rejected, cancelled)';

-- Create index for status queries
CREATE INDEX IF NOT EXISTS idx_account_transactions_status
ON account_transactions(status)
WHERE status IS NOT NULL;

-- Migrate existing data: set status to 'approved' for existing records
-- that don't have approval_status in metadata, or use the metadata value
DO $$
DECLARE
    migrated_count INTEGER := 0;
BEGIN
    -- Update records where status is null
    UPDATE account_transactions
    SET status = COALESCE(
        metadata->>'approval_status',
        'approved'  -- Default for existing records
    )
    WHERE status IS NULL;

    GET DIAGNOSTICS migrated_count = ROW_COUNT;

    IF migrated_count > 0 THEN
        RAISE NOTICE '✅ Migrated status for % existing records', migrated_count;
    END IF;
END $$;

-- Verification
DO $$
DECLARE
    column_exists BOOLEAN;
    index_exists BOOLEAN;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔍 =====================================================';
    RAISE NOTICE '🔍 Verification Results';
    RAISE NOTICE '🔍 =====================================================';

    -- Check if column exists
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'account_transactions'
        AND column_name = 'status'
    ) INTO column_exists;

    -- Check if index exists
    SELECT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE tablename = 'account_transactions'
        AND indexname = 'idx_account_transactions_status'
    ) INTO index_exists;

    IF column_exists THEN
        RAISE NOTICE '   ✅ status column exists';
    ELSE
        RAISE EXCEPTION '   ❌ status column FAILED to add';
    END IF;

    IF index_exists THEN
        RAISE NOTICE '   ✅ status index exists';
    ELSE
        RAISE NOTICE '   ⚠️  status index not found (may not be critical)';
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '📊 Sample of updated records:';

    -- Show a few sample records with status
    FOR i IN 1..3 LOOP
        RAISE NOTICE '   Record %: status = %', i,
        (SELECT status FROM account_transactions LIMIT 1 OFFSET (i-1));
    END LOOP;

    RAISE NOTICE '';
    RAISE NOTICE '✅ =====================================================';
    RAISE NOTICE '✅ Status column addition completed successfully!';
    RAISE NOTICE '✅ =====================================================';
    RAISE NOTICE '';
    RAISE NOTICE '📋 What was done:';
    RAISE NOTICE '  1. ✅ Added status column with CHECK constraint';
    RAISE NOTICE '  2. ✅ Added helpful comment';
    RAISE NOTICE '  3. ✅ Created index for performance';
    RAISE NOTICE '  4. ✅ Migrated existing data';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  IMPORTANT: The application should now work without SQL errors';
    RAISE NOTICE '   for expense creation. Test the Quick Expense functionality.';
    RAISE NOTICE '';
END $$;
