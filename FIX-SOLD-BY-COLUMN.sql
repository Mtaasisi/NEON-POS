-- ============================================================
-- FIX: Add missing sold_by column to lats_sales table
-- ============================================================
-- This fixes the error: column "sold_by" of relation "lats_sales" does not exist
--
-- Run this SQL in your Neon database console or via psql
-- ============================================================

-- Add sold_by column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_sales' AND column_name = 'sold_by'
  ) THEN
    ALTER TABLE lats_sales ADD COLUMN sold_by TEXT;
    RAISE NOTICE '✅ Added sold_by column to lats_sales';
  ELSE
    RAISE NOTICE '✅ sold_by column already exists in lats_sales';
  END IF;
END $$;

-- Also add customer_email if it doesn't exist (for completeness)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_sales' AND column_name = 'customer_email'
  ) THEN
    ALTER TABLE lats_sales ADD COLUMN customer_email TEXT;
    RAISE NOTICE '✅ Added customer_email column to lats_sales';
  ELSE
    RAISE NOTICE '✅ customer_email column already exists in lats_sales';
  END IF;
END $$;

-- Verify the columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'lats_sales' 
ORDER BY ordinal_position;

