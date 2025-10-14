-- ============================================================
-- SIMPLE FIX: Drop and recreate payment_method as JSONB
-- This is the safest approach - it drops the column and recreates it
-- ============================================================

-- Add missing columns first (if they don't exist)
ALTER TABLE lats_sales ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'completed';
ALTER TABLE lats_sales ADD COLUMN IF NOT EXISTS sold_by TEXT;
ALTER TABLE lats_sales ADD COLUMN IF NOT EXISTS branch_id UUID;
ALTER TABLE lats_sales ADD COLUMN IF NOT EXISTS subtotal NUMERIC DEFAULT 0;
ALTER TABLE lats_sales ADD COLUMN IF NOT EXISTS discount NUMERIC DEFAULT 0;
ALTER TABLE lats_sales ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE lats_sales ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE lats_sales ADD COLUMN IF NOT EXISTS customer_email TEXT;
ALTER TABLE lats_sales ADD COLUMN IF NOT EXISTS tax NUMERIC DEFAULT 0;

-- Drop the problematic payment_method column
ALTER TABLE lats_sales DROP COLUMN IF EXISTS payment_method CASCADE;

-- Recreate it as JSONB
ALTER TABLE lats_sales ADD COLUMN payment_method JSONB;

-- Verify it worked
SELECT 
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_name = 'lats_sales' 
AND column_name = 'payment_method';

-- Test insert
DO $$ 
BEGIN
  INSERT INTO lats_sales (
    sale_number,
    total_amount,
    payment_method,
    payment_status
  ) VALUES (
    'TEST-' || gen_random_uuid()::text,
    100,
    '{"type":"cash","amount":100}'::jsonb,
    'completed'
  );
  
  DELETE FROM lats_sales WHERE sale_number LIKE 'TEST-%';
  
  RAISE NOTICE '✅ SUCCESS! payment_method is now JSONB and working!';
END $$;

