-- ============================================================
-- FIX PAYMENT_METHOD COLUMN TO JSONB
-- This script ensures payment_method is JSONB type
-- ============================================================

DO $$ 
BEGIN
  RAISE NOTICE '🔧 Checking payment_method column type...';
END $$;

-- Step 1: Check current data type
DO $$ 
DECLARE
  current_type TEXT;
BEGIN
  SELECT data_type INTO current_type
  FROM information_schema.columns 
  WHERE table_name = 'lats_sales' 
  AND column_name = 'payment_method';
  
  RAISE NOTICE 'Current payment_method type: %', current_type;
END $$;

-- Step 2: Convert payment_method to JSONB if needed
DO $$ 
DECLARE
  current_type TEXT;
BEGIN
  SELECT data_type INTO current_type
  FROM information_schema.columns 
  WHERE table_name = 'lats_sales' 
  AND column_name = 'payment_method';
  
  IF current_type = 'text' OR current_type = 'character varying' THEN
    RAISE NOTICE '🔄 Converting payment_method from TEXT to JSONB...';
    
    -- First, drop the default if it exists
    BEGIN
      ALTER TABLE lats_sales ALTER COLUMN payment_method DROP DEFAULT;
      RAISE NOTICE '   ✅ Default constraint dropped';
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE '   ⚠️ No default to drop';
    END;
    
    -- Convert the column type
    ALTER TABLE lats_sales 
    ALTER COLUMN payment_method TYPE JSONB 
    USING CASE 
      WHEN payment_method IS NULL THEN NULL
      WHEN payment_method = '' THEN '{"type":"cash","amount":0}'::jsonb
      WHEN payment_method::text ~ '^[\s]*[\{\[]' THEN payment_method::jsonb
      ELSE jsonb_build_object('type', payment_method, 'amount', 0)
    END;
    
    RAISE NOTICE '   ✅ Converted payment_method to JSONB';
    
  ELSIF current_type = 'jsonb' THEN
    RAISE NOTICE '   ✅ payment_method is already JSONB - no action needed';
    
  ELSIF current_type = 'json' THEN
    RAISE NOTICE '🔄 Converting payment_method from JSON to JSONB...';
    ALTER TABLE lats_sales ALTER COLUMN payment_method TYPE JSONB;
    RAISE NOTICE '   ✅ Converted payment_method to JSONB';
    
  ELSE
    RAISE NOTICE '   ⚠️ Unknown type: % - Adding new JSONB column', current_type;
    ALTER TABLE lats_sales DROP COLUMN IF EXISTS payment_method;
    ALTER TABLE lats_sales ADD COLUMN payment_method JSONB;
    RAISE NOTICE '   ✅ Added payment_method as JSONB';
  END IF;
END $$;

-- Step 3: Verify the final type
DO $$ 
DECLARE
  final_type TEXT;
BEGIN
  SELECT data_type INTO final_type
  FROM information_schema.columns 
  WHERE table_name = 'lats_sales' 
  AND column_name = 'payment_method';
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '  Final payment_method type: %', final_type;
  RAISE NOTICE '========================================';
  
  IF final_type = 'jsonb' THEN
    RAISE NOTICE '✅ SUCCESS: payment_method is now JSONB';
  ELSE
    RAISE EXCEPTION 'FAILED: payment_method is still %', final_type;
  END IF;
END $$;

-- Step 4: Test insert to verify it works
DO $$ 
BEGIN
  RAISE NOTICE '🧪 Testing JSONB insert...';
  
  -- Try to insert a test record (will be rolled back)
  BEGIN
    INSERT INTO lats_sales (
      sale_number, 
      total_amount, 
      payment_method
    ) VALUES (
      'TEST-' || gen_random_uuid()::text,
      100,
      '{"type":"cash","amount":100,"details":{"test":true}}'::jsonb
    );
    
    -- Clean up test record
    DELETE FROM lats_sales WHERE sale_number LIKE 'TEST-%';
    
    RAISE NOTICE '   ✅ JSONB insert test successful!';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION 'JSONB insert test failed: %', SQLERRM;
  END;
END $$;

-- Step 5: Add missing columns if they don't exist
DO $$ 
BEGIN
  -- Add payment_status if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_sales' 
    AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE lats_sales ADD COLUMN payment_status TEXT DEFAULT 'completed';
    RAISE NOTICE '✅ Added payment_status column';
  ELSE
    RAISE NOTICE '   payment_status already exists';
  END IF;
  
  -- Add sold_by if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_sales' 
    AND column_name = 'sold_by'
  ) THEN
    ALTER TABLE lats_sales ADD COLUMN sold_by TEXT;
    RAISE NOTICE '✅ Added sold_by column';
  ELSE
    RAISE NOTICE '   sold_by already exists';
  END IF;
  
  -- Add branch_id if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_sales' 
    AND column_name = 'branch_id'
  ) THEN
    ALTER TABLE lats_sales ADD COLUMN branch_id UUID;
    RAISE NOTICE '✅ Added branch_id column';
  ELSE
    RAISE NOTICE '   branch_id already exists';
  END IF;
  
  -- Add subtotal if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_sales' 
    AND column_name = 'subtotal'
  ) THEN
    ALTER TABLE lats_sales ADD COLUMN subtotal NUMERIC DEFAULT 0;
    RAISE NOTICE '✅ Added subtotal column';
  ELSE
    RAISE NOTICE '   subtotal already exists';
  END IF;
  
  -- Add discount if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_sales' 
    AND column_name = 'discount'
  ) THEN
    ALTER TABLE lats_sales ADD COLUMN discount NUMERIC DEFAULT 0;
    RAISE NOTICE '✅ Added discount column';
  ELSE
    RAISE NOTICE '   discount already exists';
  END IF;
  
  -- Add customer_name if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_sales' 
    AND column_name = 'customer_name'
  ) THEN
    ALTER TABLE lats_sales ADD COLUMN customer_name TEXT;
    RAISE NOTICE '✅ Added customer_name column';
  ELSE
    RAISE NOTICE '   customer_name already exists';
  END IF;
  
  -- Add customer_phone if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_sales' 
    AND column_name = 'customer_phone'
  ) THEN
    ALTER TABLE lats_sales ADD COLUMN customer_phone TEXT;
    RAISE NOTICE '✅ Added customer_phone column';
  ELSE
    RAISE NOTICE '   customer_phone already exists';
  END IF;
  
  -- Add customer_email if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_sales' 
    AND column_name = 'customer_email'
  ) THEN
    ALTER TABLE lats_sales ADD COLUMN customer_email TEXT;
    RAISE NOTICE '✅ Added customer_email column';
  ELSE
    RAISE NOTICE '   customer_email already exists';
  END IF;
  
  -- Add tax if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_sales' 
    AND column_name = 'tax'
  ) THEN
    ALTER TABLE lats_sales ADD COLUMN tax NUMERIC DEFAULT 0;
    RAISE NOTICE '✅ Added tax column';
  ELSE
    RAISE NOTICE '   tax already exists';
  END IF;
END $$;

RAISE NOTICE '';
RAISE NOTICE '========================================';
RAISE NOTICE '  ✅ ALL FIXES COMPLETED SUCCESSFULLY';
RAISE NOTICE '========================================';

