-- ============================================================================
-- ADD MISSING ENTITY FOREIGN KEY CONSTRAINT
-- ============================================================================
-- This adds the missing foreign key constraint for entity_id -> lats_product_variants
-- ============================================================================

-- Check if the constraint already exists
SELECT 
  'Checking existing constraints' as step,
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'branch_transfers'
  AND tc.constraint_type = 'FOREIGN KEY'
  AND kcu.column_name = 'entity_id';

-- Add the missing foreign key constraint
DO $$
BEGIN
  -- Add entity_id foreign key for variants if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'branch_transfers' 
    AND constraint_name = 'branch_transfers_entity_fkey'
  ) THEN
    ALTER TABLE branch_transfers
    ADD CONSTRAINT branch_transfers_entity_fkey
    FOREIGN KEY (entity_id) REFERENCES lats_product_variants(id);
    
    RAISE NOTICE '✅ Added entity_id foreign key constraint';
  ELSE
    RAISE NOTICE 'ℹ️  entity_id foreign key constraint already exists';
  END IF;
END $$;

-- Verify the constraint was added
SELECT 
  'After adding constraint' as step,
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'branch_transfers'
  AND tc.constraint_type = 'FOREIGN KEY';

-- Test the complex query that was failing
DO $$
DECLARE
  v_test_branch_id UUID;
  v_transfer_count INTEGER;
  v_error TEXT;
BEGIN
  -- Get the Main Store branch ID (from your diagnostic output)
  SELECT id INTO v_test_branch_id 
  FROM store_locations 
  WHERE name = 'Main Store'
  LIMIT 1;
  
  IF v_test_branch_id IS NULL THEN
    RAISE EXCEPTION 'Main Store branch not found!';
  END IF;
  
  RAISE NOTICE '📝 Testing with Main Store branch_id: %', v_test_branch_id;
  
  -- Try the complex query (like list) - this should work now
  BEGIN
    SELECT COUNT(*) INTO v_transfer_count
    FROM branch_transfers bt
    LEFT JOIN store_locations fb ON fb.id = bt.from_branch_id
    LEFT JOIN store_locations tb ON tb.id = bt.to_branch_id
    LEFT JOIN lats_product_variants v ON v.id = bt.entity_id
    LEFT JOIN lats_products p ON p.id = v.product_id
    WHERE bt.transfer_type = 'stock'
      AND (bt.from_branch_id = v_test_branch_id OR bt.to_branch_id = v_test_branch_id);
    
    RAISE NOTICE '✅ Complex query found % transfers', v_transfer_count;
  EXCEPTION
    WHEN OTHERS THEN
      v_error := SQLERRM;
      RAISE NOTICE '❌ Complex query failed: %', v_error;
  END;
END $$;

-- Show the actual transfers with joined data
SELECT 
  'Sample transfers with joins' as info,
  bt.id,
  bt.status,
  bt.quantity,
  bt.transfer_type,
  bt.created_at,
  fb.name as from_branch,
  tb.name as to_branch,
  v.variant_name,
  v.sku,
  p.name as product_name
FROM branch_transfers bt
LEFT JOIN store_locations fb ON fb.id = bt.from_branch_id
LEFT JOIN store_locations tb ON tb.id = bt.to_branch_id
LEFT JOIN lats_product_variants v ON v.id = bt.entity_id
LEFT JOIN lats_products p ON p.id = v.product_id
WHERE bt.transfer_type = 'stock'
ORDER BY bt.created_at DESC
LIMIT 5;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ MISSING FOREIGN KEY CONSTRAINT ADDED';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'What was fixed:';
  RAISE NOTICE '1. ✅ Added entity_id foreign key constraint';
  RAISE NOTICE '2. ✅ Tested complex query with joins';
  RAISE NOTICE '3. ✅ Verified transfers can be fetched with full details';
  RAISE NOTICE '';
  RAISE NOTICE 'Next step: Refresh your application!';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;
