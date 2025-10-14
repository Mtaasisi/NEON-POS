-- ============================================================================
-- FIX BRANCH_TRANSFERS TABLE - Add Missing Columns
-- ============================================================================
-- This script safely adds all missing columns to branch_transfers table
-- Run this in your Neon database SQL editor
-- ============================================================================

-- ============================================================================
-- STEP 1: Add rejection_reason column if missing
-- ============================================================================

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'branch_transfers' 
    AND column_name = 'rejection_reason'
  ) THEN
    ALTER TABLE branch_transfers 
    ADD COLUMN rejection_reason TEXT;
    
    RAISE NOTICE '✅ Added rejection_reason column to branch_transfers';
  ELSE
    RAISE NOTICE '✓ Column rejection_reason already exists';
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Add metadata column if missing
-- ============================================================================

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'branch_transfers' 
    AND column_name = 'metadata'
  ) THEN
    ALTER TABLE branch_transfers 
    ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    
    RAISE NOTICE '✅ Added metadata column to branch_transfers';
  ELSE
    RAISE NOTICE '✓ Column metadata already exists';
  END IF;
END $$;

-- ============================================================================
-- STEP 3: Ensure all timestamp columns exist
-- ============================================================================

DO $$ 
BEGIN
  -- requested_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'branch_transfers' 
    AND column_name = 'requested_at'
  ) THEN
    ALTER TABLE branch_transfers 
    ADD COLUMN requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    
    RAISE NOTICE '✅ Added requested_at column to branch_transfers';
  END IF;

  -- approved_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'branch_transfers' 
    AND column_name = 'approved_at'
  ) THEN
    ALTER TABLE branch_transfers 
    ADD COLUMN approved_at TIMESTAMP WITH TIME ZONE;
    
    RAISE NOTICE '✅ Added approved_at column to branch_transfers';
  END IF;

  -- completed_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'branch_transfers' 
    AND column_name = 'completed_at'
  ) THEN
    ALTER TABLE branch_transfers 
    ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE;
    
    RAISE NOTICE '✅ Added completed_at column to branch_transfers';
  END IF;

  -- created_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'branch_transfers' 
    AND column_name = 'created_at'
  ) THEN
    ALTER TABLE branch_transfers 
    ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    
    RAISE NOTICE '✅ Added created_at column to branch_transfers';
  END IF;

  -- updated_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'branch_transfers' 
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE branch_transfers 
    ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    
    RAISE NOTICE '✅ Added updated_at column to branch_transfers';
  END IF;
END $$;

-- ============================================================================
-- STEP 4: Add reserved_quantity to lats_product_variants if missing
-- ============================================================================

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'lats_product_variants' 
    AND column_name = 'reserved_quantity'
  ) THEN
    ALTER TABLE lats_product_variants 
    ADD COLUMN reserved_quantity INTEGER DEFAULT 0 NOT NULL;
    
    RAISE NOTICE '✅ Added reserved_quantity column to lats_product_variants';
  ELSE
    RAISE NOTICE '✓ Column reserved_quantity already exists in lats_product_variants';
  END IF;
END $$;

-- ============================================================================
-- STEP 5: Create/update updated_at trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION update_branch_transfer_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trg_update_branch_transfer_timestamp ON branch_transfers;

-- Create new trigger
CREATE TRIGGER trg_update_branch_transfer_timestamp
  BEFORE UPDATE ON branch_transfers
  FOR EACH ROW
  EXECUTE FUNCTION update_branch_transfer_timestamp();

RAISE NOTICE '✅ Created/updated timestamp trigger';

-- ============================================================================
-- STEP 6: Ensure metadata defaults are set for existing rows
-- ============================================================================

DO $$
BEGIN
  UPDATE branch_transfers 
  SET metadata = '{}'::jsonb 
  WHERE metadata IS NULL;
  
  GET DIAGNOSTICS result = ROW_COUNT;
  IF result > 0 THEN
    RAISE NOTICE '✅ Updated % existing rows with default metadata', result;
  END IF;
EXCEPTION
  WHEN undefined_column THEN
    RAISE NOTICE '⚠️ metadata column does not exist yet';
END $$;

-- ============================================================================
-- STEP 7: Verification
-- ============================================================================

DO $$
DECLARE
  missing_cols TEXT[];
  col_name TEXT;
BEGIN
  -- Check for required columns
  SELECT ARRAY_AGG(required_column) INTO missing_cols
  FROM (
    VALUES 
      ('rejection_reason'),
      ('metadata'),
      ('requested_at'),
      ('approved_at'),
      ('completed_at'),
      ('created_at'),
      ('updated_at')
  ) AS required(required_column)
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'branch_transfers' 
    AND column_name = required_column
  );

  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ BRANCH_TRANSFERS TABLE FIX COMPLETE';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  
  IF missing_cols IS NOT NULL AND array_length(missing_cols, 1) > 0 THEN
    RAISE NOTICE '❌ Still missing columns:';
    FOREACH col_name IN ARRAY missing_cols LOOP
      RAISE NOTICE '   - %', col_name;
    END LOOP;
  ELSE
    RAISE NOTICE '✅ All required columns are present!';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Next steps:';
    RAISE NOTICE '   1. Refresh your browser';
    RAISE NOTICE '   2. Try creating a stock transfer again';
    RAISE NOTICE '   3. The "column undefined" error should be fixed';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;

-- ============================================================================
-- STEP 8: Display current column list
-- ============================================================================

SELECT 
  'Current branch_transfers columns:' as info,
  column_name,
  data_type,
  CASE WHEN is_nullable = 'YES' THEN 'NULL' ELSE 'NOT NULL' END as nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'branch_transfers'
ORDER BY ordinal_position;

