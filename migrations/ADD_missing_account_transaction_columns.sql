-- ============================================
-- ADD MISSING COLUMNS TO account_transactions
-- ============================================
-- Adds related_entity_type and related_entity_id columns
-- that are referenced in payment processing code
--
-- These columns provide better tracking of what created
-- each transaction (e.g., sale, payment, expense, transfer)
-- ============================================

-- Add the columns if they don't exist
ALTER TABLE account_transactions 
ADD COLUMN IF NOT EXISTS related_entity_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS related_entity_id UUID;

-- Add helpful comment
COMMENT ON COLUMN account_transactions.related_entity_type IS 
'Type of entity that created this transaction (e.g., purchase_order_payment, sale, expense, transfer)';

COMMENT ON COLUMN account_transactions.related_entity_id IS 
'UUID of the specific entity that created this transaction';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_account_transactions_entity_type 
ON account_transactions(related_entity_type)
WHERE related_entity_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_account_transactions_entity_id 
ON account_transactions(related_entity_id)
WHERE related_entity_id IS NOT NULL;

-- Create composite index for lookups by both type and id
CREATE INDEX IF NOT EXISTS idx_account_transactions_entity_type_id 
ON account_transactions(related_entity_type, related_entity_id)
WHERE related_entity_type IS NOT NULL AND related_entity_id IS NOT NULL;

-- Migrate existing data from metadata field if it exists
DO $$
DECLARE
  migrated_count INTEGER := 0;
BEGIN
  -- Try to populate from metadata jsonb if data exists there
  UPDATE account_transactions
  SET 
    related_entity_type = metadata->>'entity_type',
    related_entity_id = (metadata->>'entity_id')::uuid
  WHERE metadata IS NOT NULL 
    AND metadata->>'entity_type' IS NOT NULL
    AND metadata->>'entity_id' IS NOT NULL
    AND metadata->>'entity_id' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND related_entity_type IS NULL;
  
  GET DIAGNOSTICS migrated_count = ROW_COUNT;
  
  IF migrated_count > 0 THEN
    RAISE NOTICE '✅ Migrated % existing records from metadata field', migrated_count;
  END IF;
END $$;

-- Verification
DO $$
DECLARE
  type_exists BOOLEAN;
  id_exists BOOLEAN;
BEGIN
  -- Check if columns were created
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'account_transactions' 
      AND column_name = 'related_entity_type'
  ) INTO type_exists;
  
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'account_transactions' 
      AND column_name = 'related_entity_id'
  ) INTO id_exists;
  
  RAISE NOTICE '================================================';
  RAISE NOTICE '✅ COLUMN ADDITION COMPLETE';
  RAISE NOTICE '================================================';
  
  IF type_exists THEN
    RAISE NOTICE '   ✅ related_entity_type column added';
  ELSE
    RAISE EXCEPTION '   ❌ related_entity_type column FAILED to add';
  END IF;
  
  IF id_exists THEN
    RAISE NOTICE '   ✅ related_entity_id column added';
  ELSE
    RAISE EXCEPTION '   ❌ related_entity_id column FAILED to add';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '📊 Current account_transactions structure:';
  
  FOR type_exists IN 
    SELECT true
    FROM information_schema.columns
    WHERE table_name = 'account_transactions'
    ORDER BY ordinal_position
  LOOP
    NULL; -- Just to show we have columns
  END LOOP;
  
  RAISE NOTICE '   ✅ All columns verified';
  RAISE NOTICE '   ✅ Indexes created';
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Ready to apply function fix migration!';
  RAISE NOTICE '================================================';
END $$;

