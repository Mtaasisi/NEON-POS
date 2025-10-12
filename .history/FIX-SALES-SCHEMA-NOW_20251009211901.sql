-- ============================================================
-- AUTOMATIC FIX FOR SALES SCHEMA ISSUES
-- This script will fix all column mismatches
-- ============================================================

DO $$ 
BEGIN
  RAISE NOTICE '========== FIXING lats_sales TABLE ==========';
END $$;

-- Step 1: Ensure payment_method is JSONB (not TEXT)
DO $$ 
BEGIN
  -- Check if payment_method exists and is TEXT
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_sales' 
    AND column_name = 'payment_method' 
    AND data_type = 'text'
  ) THEN
    -- Convert TEXT to JSONB safely
    ALTER TABLE lats_sales ALTER COLUMN payment_method TYPE JSONB USING 
      CASE 
        WHEN payment_method IS NULL THEN NULL
        WHEN payment_method::text ~ '^\{.*\}$' THEN payment_method::jsonb
        ELSE json_build_object('type', payment_method, 'amount', 0)::jsonb
      END;
    RAISE NOTICE '✅ Converted payment_method from TEXT to JSONB';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_sales' 
    AND column_name = 'payment_method' 
    AND data_type = 'jsonb'
  ) THEN
    RAISE NOTICE '✅ payment_method is already JSONB';
  ELSE
    -- Add payment_method as JSONB if it doesn't exist
    ALTER TABLE lats_sales ADD COLUMN payment_method JSONB;
    RAISE NOTICE '✅ Added payment_method column as JSONB';
  END IF;
END $$;

-- Step 2: Ensure payment_status exists (not status)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_sales' AND column_name = 'payment_status'
  ) THEN
    -- Add payment_status column
    ALTER TABLE lats_sales ADD COLUMN payment_status TEXT DEFAULT 'completed';
    
    -- If status column exists, copy data over
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'lats_sales' AND column_name = 'status'
    ) THEN
      UPDATE lats_sales SET payment_status = status WHERE status IS NOT NULL;
      RAISE NOTICE '✅ Added payment_status and copied data from status column';
    ELSE
      RAISE NOTICE '✅ Added payment_status column';
    END IF;
  ELSE
    RAISE NOTICE '✅ payment_status column already exists';
  END IF;
END $$;

-- Step 3: Ensure sold_by exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_sales' AND column_name = 'sold_by'
  ) THEN
    ALTER TABLE lats_sales ADD COLUMN sold_by TEXT;
    
    -- If created_by exists, copy data over
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'lats_sales' AND column_name = 'created_by'
    ) THEN
      UPDATE lats_sales SET sold_by = created_by WHERE created_by IS NOT NULL;
      RAISE NOTICE '✅ Added sold_by and copied data from created_by';
    ELSE
      RAISE NOTICE '✅ Added sold_by column';
    END IF;
  ELSE
    RAISE NOTICE '✅ sold_by column already exists';
  END IF;
END $$;

-- Step 4: Ensure discount column exists (not discount_amount, discount_type, discount_value)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_sales' AND column_name = 'discount'
  ) THEN
    ALTER TABLE lats_sales ADD COLUMN discount NUMERIC DEFAULT 0;
    
    -- If discount_amount exists, copy data over then drop it
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'lats_sales' AND column_name = 'discount_amount'
    ) THEN
      UPDATE lats_sales SET discount = discount_amount WHERE discount_amount IS NOT NULL;
      ALTER TABLE lats_sales DROP COLUMN discount_amount;
      RAISE NOTICE '✅ Added discount, migrated from discount_amount, and dropped discount_amount';
    ELSE
      RAISE NOTICE '✅ Added discount column';
    END IF;
  ELSE
    RAISE NOTICE '✅ discount column already exists';
  END IF;
  
  -- Drop discount_type if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_sales' AND column_name = 'discount_type'
  ) THEN
    ALTER TABLE lats_sales DROP COLUMN discount_type;
    RAISE NOTICE '✅ Dropped discount_type column (not needed)';
  END IF;
  
  -- Drop discount_value if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_sales' AND column_name = 'discount_value'
  ) THEN
    ALTER TABLE lats_sales DROP COLUMN discount_value;
    RAISE NOTICE '✅ Dropped discount_value column (not needed)';
  END IF;
END $$;

-- Step 5: Ensure tax column exists (not tax_amount)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_sales' AND column_name = 'tax'
  ) THEN
    ALTER TABLE lats_sales ADD COLUMN tax NUMERIC DEFAULT 0;
    
    -- If tax_amount exists, copy data over then drop it
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'lats_sales' AND column_name = 'tax_amount'
    ) THEN
      UPDATE lats_sales SET tax = tax_amount WHERE tax_amount IS NOT NULL;
      ALTER TABLE lats_sales DROP COLUMN tax_amount;
      RAISE NOTICE '✅ Added tax, migrated from tax_amount, and dropped tax_amount';
    ELSE
      RAISE NOTICE '✅ Added tax column';
    END IF;
  ELSE
    RAISE NOTICE '✅ tax column already exists';
  END IF;
END $$;

-- Step 6: Ensure all required columns exist
DO $$ 
BEGIN
  -- customer_name
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_sales' AND column_name = 'customer_name'
  ) THEN
    ALTER TABLE lats_sales ADD COLUMN customer_name TEXT;
    RAISE NOTICE '✅ Added customer_name column';
  END IF;
  
  -- customer_phone
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_sales' AND column_name = 'customer_phone'
  ) THEN
    ALTER TABLE lats_sales ADD COLUMN customer_phone TEXT;
    RAISE NOTICE '✅ Added customer_phone column';
  END IF;
  
  -- customer_email
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_sales' AND column_name = 'customer_email'
  ) THEN
    ALTER TABLE lats_sales ADD COLUMN customer_email TEXT;
    RAISE NOTICE '✅ Added customer_email column';
  END IF;
  
  -- subtotal
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_sales' AND column_name = 'subtotal'
  ) THEN
    ALTER TABLE lats_sales ADD COLUMN subtotal NUMERIC DEFAULT 0;
    RAISE NOTICE '✅ Added subtotal column';
  END IF;
  
  -- notes
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_sales' AND column_name = 'notes'
  ) THEN
    ALTER TABLE lats_sales ADD COLUMN notes TEXT;
    RAISE NOTICE '✅ Added notes column';
  END IF;
END $$;

DO $$ 
BEGIN
  RAISE NOTICE '========== FIXING lats_sale_items TABLE ==========';
END $$;

-- Step 7: Ensure all lats_sale_items columns exist
DO $$ 
BEGIN
  -- product_name
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_sale_items' AND column_name = 'product_name'
  ) THEN
    ALTER TABLE lats_sale_items ADD COLUMN product_name TEXT;
    RAISE NOTICE '✅ Added product_name column to lats_sale_items';
  END IF;
  
  -- variant_name
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_sale_items' AND column_name = 'variant_name'
  ) THEN
    ALTER TABLE lats_sale_items ADD COLUMN variant_name TEXT;
    RAISE NOTICE '✅ Added variant_name column to lats_sale_items';
  END IF;
  
  -- sku
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_sale_items' AND column_name = 'sku'
  ) THEN
    ALTER TABLE lats_sale_items ADD COLUMN sku TEXT;
    RAISE NOTICE '✅ Added sku column to lats_sale_items';
  END IF;
  
  -- unit_price
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_sale_items' AND column_name = 'unit_price'
  ) THEN
    ALTER TABLE lats_sale_items ADD COLUMN unit_price NUMERIC DEFAULT 0;
    RAISE NOTICE '✅ Added unit_price column to lats_sale_items';
  END IF;
  
  -- total_price
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_sale_items' AND column_name = 'total_price'
  ) THEN
    ALTER TABLE lats_sale_items ADD COLUMN total_price NUMERIC DEFAULT 0;
    RAISE NOTICE '✅ Added total_price column to lats_sale_items';
  END IF;
  
  -- cost_price
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_sale_items' AND column_name = 'cost_price'
  ) THEN
    ALTER TABLE lats_sale_items ADD COLUMN cost_price NUMERIC DEFAULT 0;
    RAISE NOTICE '✅ Added cost_price column to lats_sale_items';
  END IF;
  
  -- profit
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_sale_items' AND column_name = 'profit'
  ) THEN
    ALTER TABLE lats_sale_items ADD COLUMN profit NUMERIC DEFAULT 0;
    RAISE NOTICE '✅ Added profit column to lats_sale_items';
  END IF;
END $$;

DO $$ 
BEGIN
  RAISE NOTICE '========== SCHEMA FIX COMPLETE ==========';
  RAISE NOTICE 'All database columns are now aligned with the code!';
END $$;

-- Show final schema
DO $$ 
BEGIN
  RAISE NOTICE '========== FINAL lats_sales SCHEMA ==========';
END $$;

SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'lats_sales' 
ORDER BY ordinal_position;

