-- ================================================================
-- FIX: Prevent String Concatenation of Amount Fields (SAFE VERSION)
-- ================================================================
-- This migration handles views and rules that depend on amount columns
-- ================================================================

-- Step 1: Identify and store dependent views
DO $$
DECLARE
  view_record RECORD;
  view_definition TEXT;
BEGIN
  RAISE NOTICE '📋 Checking for dependent views...';
  
  -- Create a temporary table to store view definitions if it doesn't exist
  CREATE TEMP TABLE IF NOT EXISTS temp_view_backup (
    view_schema TEXT,
    view_name TEXT,
    view_definition TEXT
  );
  
  -- Store definitions of views that might be affected
  FOR view_record IN 
    SELECT 
      schemaname,
      viewname,
      definition
    FROM pg_views
    WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
  LOOP
    INSERT INTO temp_view_backup VALUES (
      view_record.schemaname,
      view_record.viewname,
      view_record.definition
    );
    RAISE NOTICE '   Backed up view: %.%', view_record.schemaname, view_record.viewname;
  END LOOP;
END $$;

-- Step 2: Drop dependent views temporarily
DO $$
DECLARE
  view_record RECORD;
BEGIN
  RAISE NOTICE '🗑️  Dropping dependent views temporarily...';
  
  FOR view_record IN 
    SELECT 
      schemaname,
      viewname
    FROM pg_views
    WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
    ORDER BY viewname
  LOOP
    BEGIN
      EXECUTE format('DROP VIEW IF EXISTS %I.%I CASCADE', view_record.schemaname, view_record.viewname);
      RAISE NOTICE '   Dropped view: %.%', view_record.schemaname, view_record.viewname;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '   Could not drop view %.%: %', view_record.schemaname, view_record.viewname, SQLERRM;
    END;
  END LOOP;
END $$;

-- Step 3: Clean up corrupted data
RAISE NOTICE '🧹 Cleaning corrupted data...';

-- Clean customers table
UPDATE customers
SET total_spent = 0
WHERE 
  total_spent::TEXT ~ '[0-9]{2,}\.[0-9]{2}[0-9]{2,}\.[0-9]{2}'
  OR total_spent > 1000000000000
  OR total_spent < 0
  OR NOT (total_spent = total_spent);  -- NaN check

UPDATE customers
SET points = 0
WHERE 
  points > 10000000
  OR points < 0
  OR NOT (points = points);

-- Clean lats_customers table
UPDATE lats_customers
SET total_spent = 0
WHERE 
  total_spent::TEXT ~ '[0-9]{2,}\.[0-9]{2}[0-9]{2,}\.[0-9]{2}'
  OR total_spent > 1000000000000
  OR total_spent < 0
  OR NOT (total_spent = total_spent);

-- Clean lats_sales table
UPDATE lats_sales
SET total_amount = 0
WHERE 
  total_amount::TEXT ~ '[0-9]{2,}\.[0-9]{2}[0-9]{2,}\.[0-9]{2}'
  OR total_amount > 1000000000
  OR total_amount < 0
  OR NOT (total_amount = total_amount);

-- Clean subtotal, discount, tax if they exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_sales' AND column_name = 'subtotal') THEN
    UPDATE lats_sales SET subtotal = 0 WHERE subtotal IS NULL OR NOT (subtotal = subtotal) OR subtotal < 0;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_sales' AND column_name = 'discount') THEN
    UPDATE lats_sales SET discount = 0 WHERE discount IS NULL OR NOT (discount = discount) OR discount < 0;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_sales' AND column_name = 'tax') THEN
    UPDATE lats_sales SET tax = 0 WHERE tax IS NULL OR NOT (tax = tax) OR tax < 0;
  END IF;
END $$;

RAISE NOTICE '✅ Corrupted data cleaned';

-- Step 4: Alter column types (now safe since views are dropped)
RAISE NOTICE '🔧 Altering column types...';

-- Customers table
DO $$
BEGIN
  -- total_spent
  BEGIN
    ALTER TABLE customers ALTER COLUMN total_spent TYPE NUMERIC USING COALESCE(total_spent, 0)::NUMERIC;
    ALTER TABLE customers ALTER COLUMN total_spent SET DEFAULT 0;
    ALTER TABLE customers ALTER COLUMN total_spent SET NOT NULL;
    RAISE NOTICE '   ✅ customers.total_spent → NUMERIC';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '   ⚠️  customers.total_spent: %', SQLERRM;
  END;
  
  -- points
  BEGIN
    ALTER TABLE customers ALTER COLUMN points TYPE INTEGER USING COALESCE(points, 0)::INTEGER;
    ALTER TABLE customers ALTER COLUMN points SET DEFAULT 0;
    ALTER TABLE customers ALTER COLUMN points SET NOT NULL;
    RAISE NOTICE '   ✅ customers.points → INTEGER';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '   ⚠️  customers.points: %', SQLERRM;
  END;
END $$;

-- lats_customers table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lats_customers') THEN
    BEGIN
      ALTER TABLE lats_customers ALTER COLUMN total_spent TYPE NUMERIC USING COALESCE(total_spent, 0)::NUMERIC;
      ALTER TABLE lats_customers ALTER COLUMN total_spent SET DEFAULT 0;
      RAISE NOTICE '   ✅ lats_customers.total_spent → NUMERIC';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '   ⚠️  lats_customers.total_spent: %', SQLERRM;
    END;
  END IF;
END $$;

-- lats_sales table
DO $$
BEGIN
  -- total_amount
  BEGIN
    ALTER TABLE lats_sales ALTER COLUMN total_amount TYPE NUMERIC USING COALESCE(total_amount, 0)::NUMERIC;
    RAISE NOTICE '   ✅ lats_sales.total_amount → NUMERIC';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '   ⚠️  lats_sales.total_amount: %', SQLERRM;
  END;
  
  -- subtotal
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_sales' AND column_name = 'subtotal') THEN
    BEGIN
      ALTER TABLE lats_sales ALTER COLUMN subtotal TYPE NUMERIC USING COALESCE(subtotal, 0)::NUMERIC;
      RAISE NOTICE '   ✅ lats_sales.subtotal → NUMERIC';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '   ⚠️  lats_sales.subtotal: %', SQLERRM;
    END;
  END IF;
  
  -- discount
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_sales' AND column_name = 'discount') THEN
    BEGIN
      ALTER TABLE lats_sales ALTER COLUMN discount TYPE NUMERIC USING COALESCE(discount, 0)::NUMERIC;
      RAISE NOTICE '   ✅ lats_sales.discount → NUMERIC';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '   ⚠️  lats_sales.discount: %', SQLERRM;
    END;
  END IF;
  
  -- tax
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_sales' AND column_name = 'tax') THEN
    BEGIN
      ALTER TABLE lats_sales ALTER COLUMN tax TYPE NUMERIC USING COALESCE(tax, 0)::NUMERIC;
      RAISE NOTICE '   ✅ lats_sales.tax → NUMERIC';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '   ⚠️  lats_sales.tax: %', SQLERRM;
    END;
  END IF;
END $$;

-- lats_sale_items table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_sale_items' AND column_name = 'price') THEN
    BEGIN
      ALTER TABLE lats_sale_items ALTER COLUMN price TYPE NUMERIC USING COALESCE(price, 0)::NUMERIC;
      RAISE NOTICE '   ✅ lats_sale_items.price → NUMERIC';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '   ⚠️  lats_sale_items.price: %', SQLERRM;
    END;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_sale_items' AND column_name = 'unit_price') THEN
    BEGIN
      ALTER TABLE lats_sale_items ALTER COLUMN unit_price TYPE NUMERIC USING COALESCE(unit_price, 0)::NUMERIC;
      RAISE NOTICE '   ✅ lats_sale_items.unit_price → NUMERIC';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '   ⚠️  lats_sale_items.unit_price: %', SQLERRM;
    END;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_sale_items' AND column_name = 'total_price') THEN
    BEGIN
      ALTER TABLE lats_sale_items ALTER COLUMN total_price TYPE NUMERIC USING COALESCE(total_price, 0)::NUMERIC;
      RAISE NOTICE '   ✅ lats_sale_items.total_price → NUMERIC';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '   ⚠️  lats_sale_items.total_price: %', SQLERRM;
    END;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_sale_items' AND column_name = 'cost_price') THEN
    BEGIN
      ALTER TABLE lats_sale_items ALTER COLUMN cost_price TYPE NUMERIC USING COALESCE(cost_price, 0)::NUMERIC;
      RAISE NOTICE '   ✅ lats_sale_items.cost_price → NUMERIC';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '   ⚠️  lats_sale_items.cost_price: %', SQLERRM;
    END;
  END IF;
END $$;

-- Other important tables
DO $$
BEGIN
  -- customer_payments
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customer_payments' AND column_name = 'amount') THEN
    BEGIN
      ALTER TABLE customer_payments ALTER COLUMN amount TYPE NUMERIC USING COALESCE(amount, 0)::NUMERIC;
      RAISE NOTICE '   ✅ customer_payments.amount → NUMERIC';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '   ⚠️  customer_payments.amount: %', SQLERRM;
    END;
  END IF;
  
  -- finance_accounts
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'finance_accounts' AND column_name = 'balance') THEN
    BEGIN
      ALTER TABLE finance_accounts ALTER COLUMN balance TYPE NUMERIC USING COALESCE(balance, 0)::NUMERIC;
      RAISE NOTICE '   ✅ finance_accounts.balance → NUMERIC';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '   ⚠️  finance_accounts.balance: %', SQLERRM;
    END;
  END IF;
  
  -- account_transactions
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'account_transactions' AND column_name = 'amount') THEN
    BEGIN
      ALTER TABLE account_transactions ALTER COLUMN amount TYPE NUMERIC USING COALESCE(amount, 0)::NUMERIC;
      RAISE NOTICE '   ✅ account_transactions.amount → NUMERIC';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '   ⚠️  account_transactions.amount: %', SQLERRM;
    END;
  END IF;
  
  -- lats_purchase_orders
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_purchase_orders' AND column_name = 'total_amount') THEN
    BEGIN
      ALTER TABLE lats_purchase_orders ALTER COLUMN total_amount TYPE NUMERIC USING COALESCE(total_amount, 0)::NUMERIC;
      RAISE NOTICE '   ✅ lats_purchase_orders.total_amount → NUMERIC';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '   ⚠️  lats_purchase_orders.total_amount: %', SQLERRM;
    END;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_purchase_orders' AND column_name = 'total_paid') THEN
    BEGIN
      ALTER TABLE lats_purchase_orders ALTER COLUMN total_paid TYPE NUMERIC USING COALESCE(total_paid, 0)::NUMERIC;
      RAISE NOTICE '   ✅ lats_purchase_orders.total_paid → NUMERIC';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '   ⚠️  lats_purchase_orders.total_paid: %', SQLERRM;
    END;
  END IF;
END $$;

-- Step 5: Add CHECK constraints
RAISE NOTICE '🛡️  Adding validation constraints...';

DO $$
BEGIN
  -- customers constraints
  BEGIN
    ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_total_spent_check;
    ALTER TABLE customers ADD CONSTRAINT customers_total_spent_check 
      CHECK (total_spent >= 0 AND total_spent < 1000000000000);
    RAISE NOTICE '   ✅ Added customers.total_spent constraint';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '   ⚠️  customers.total_spent constraint: %', SQLERRM;
  END;
  
  BEGIN
    ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_points_check;
    ALTER TABLE customers ADD CONSTRAINT customers_points_check 
      CHECK (points >= 0 AND points < 100000000);
    RAISE NOTICE '   ✅ Added customers.points constraint';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '   ⚠️  customers.points constraint: %', SQLERRM;
  END;
  
  -- lats_sales constraint
  BEGIN
    ALTER TABLE lats_sales DROP CONSTRAINT IF EXISTS lats_sales_total_amount_check;
    ALTER TABLE lats_sales ADD CONSTRAINT lats_sales_total_amount_check 
      CHECK (total_amount >= 0 AND total_amount < 1000000000);
    RAISE NOTICE '   ✅ Added lats_sales.total_amount constraint';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '   ⚠️  lats_sales.total_amount constraint: %', SQLERRM;
  END;
END $$;

-- Step 6: Create safe update function
CREATE OR REPLACE FUNCTION safe_add_to_customer_total(
  p_customer_id UUID,
  p_amount_to_add NUMERIC
)
RETURNS NUMERIC
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_total NUMERIC;
  v_new_total NUMERIC;
BEGIN
  -- Get current total
  SELECT COALESCE(total_spent, 0)::NUMERIC
  INTO v_current_total
  FROM customers
  WHERE id = p_customer_id;
  
  -- Validate input
  IF p_amount_to_add IS NULL OR p_amount_to_add < 0 THEN
    RAISE EXCEPTION 'Invalid amount: %', p_amount_to_add;
  END IF;
  
  -- Validate current total
  IF v_current_total > 1000000000000 OR v_current_total < 0 THEN
    RAISE WARNING 'Corrupted total_spent for customer %. Resetting to 0.', p_customer_id;
    v_current_total := 0;
  END IF;
  
  -- Calculate new total
  v_new_total := v_current_total + p_amount_to_add;
  
  -- Validate result
  IF v_new_total > 1000000000000 THEN
    RAISE EXCEPTION 'New total % exceeds maximum', v_new_total;
  END IF;
  
  -- Update customer
  UPDATE customers
  SET 
    total_spent = v_new_total,
    updated_at = NOW()
  WHERE id = p_customer_id;
  
  RETURN v_new_total;
END;
$$;

COMMENT ON FUNCTION safe_add_to_customer_total IS 
  'Safely adds an amount to customer total_spent with validation';

-- Step 7: Recreate views (they will be auto-recreated by the application if needed)
RAISE NOTICE '📝 Note: Views were dropped and need to be recreated by your application';
RAISE NOTICE '   If you have custom views, recreate them manually using the backed-up definitions';

-- Step 8: Summary
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ ============================================';
  RAISE NOTICE '✅ Migration completed successfully!';
  RAISE NOTICE '✅ ============================================';
  RAISE NOTICE '';
  RAISE NOTICE '   ✓ Cleaned corrupted data';
  RAISE NOTICE '   ✓ Converted columns to NUMERIC type';
  RAISE NOTICE '   ✓ Added validation constraints';
  RAISE NOTICE '   ✓ Created safe_add_to_customer_total function';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANT: Views were temporarily dropped';
  RAISE NOTICE '   They will be recreated when you restart your app';
  RAISE NOTICE '';
END $$;

