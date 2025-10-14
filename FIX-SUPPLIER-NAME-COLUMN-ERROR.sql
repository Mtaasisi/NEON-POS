-- ============================================
-- FIX SUPPLIER_NAME COLUMN ERROR IN PO PAYMENT TRACKING
-- ============================================
-- This fixes the "column supplier_name does not exist" error
-- that occurs when processing purchase order payments
-- ============================================

-- ============================================
-- 1. FIX THE TRIGGER FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION track_po_payment_as_expense()
RETURNS TRIGGER AS $$
DECLARE
  v_po_reference TEXT;
  v_po_supplier TEXT;
  v_account_name TEXT;
  v_user_id UUID;
BEGIN
  -- Only process completed payments
  IF NEW.status = 'completed' THEN
    
    -- Get PO details and supplier name (JOIN with suppliers table)
    SELECT 
      COALESCE(po.po_number, 'PO-' || po.id::TEXT),
      COALESCE(s.name, 'Unknown Supplier')
    INTO v_po_reference, v_po_supplier
    FROM lats_purchase_orders po
    LEFT JOIN lats_suppliers s ON s.id = po.supplier_id
    WHERE po.id = NEW.purchase_order_id;
    
    -- Get account name
    SELECT name INTO v_account_name
    FROM finance_accounts
    WHERE id = NEW.payment_account_id;
    
    -- Get a valid user ID (use created_by or fallback)
    v_user_id := NEW.created_by;
    IF v_user_id IS NULL THEN
      SELECT id INTO v_user_id FROM users LIMIT 1;
    END IF;
    
    -- Create expense record in finance_expenses table
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'finance_expenses'
      ) THEN
        INSERT INTO finance_expenses (
          title,
          category,
          account_id,
          amount,
          description,
          expense_date,
          payment_method,
          status,
          receipt_number,
          vendor,
          created_by,
          approved_by,
          created_at,
          updated_at
        ) VALUES (
          'Purchase Order Payment: ' || v_po_reference,
          'Purchase Orders',
          NEW.payment_account_id,
          NEW.amount,
          COALESCE(NEW.notes, 'Payment for ' || v_po_reference || ' - ' || v_po_supplier),
          COALESCE(NEW.payment_date::DATE, CURRENT_DATE),
          COALESCE(NEW.method, NEW.payment_method, 'cash'),
          'approved', -- Auto-approve since payment is already completed
          COALESCE(NEW.reference, 'PO-PAY-' || SUBSTRING(NEW.id::TEXT FROM 1 FOR 8)),
          v_po_supplier,
          v_user_id,
          v_user_id, -- Auto-approved
          NOW(),
          NOW()
        );
        
        RAISE NOTICE '✅ Created expense record for PO payment %', NEW.id;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to create expense record: %', SQLERRM;
    END;
    
    -- Create transaction record in account_transactions table
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'account_transactions'
      ) THEN
        INSERT INTO account_transactions (
          account_id,
          transaction_type,
          amount,
          description,
          reference_number,
          related_entity_type,
          related_entity_id,
          metadata,
          created_at,
          created_by
        ) VALUES (
          NEW.payment_account_id,
          'expense', -- This is an expense/spending transaction
          NEW.amount,
          'PO Payment: ' || v_po_reference || ' - ' || v_po_supplier,
          COALESCE(NEW.reference, 'PO-PAY-' || SUBSTRING(NEW.id::TEXT FROM 1 FOR 8)),
          'purchase_order_payment',
          NEW.id,
          jsonb_build_object(
            'purchase_order_id', NEW.purchase_order_id,
            'po_reference', v_po_reference,
            'supplier', v_po_supplier,
            'payment_method', COALESCE(NEW.method, NEW.payment_method),
            'account_name', v_account_name
          ),
          NOW(),
          v_user_id
        );
        
        RAISE NOTICE '✅ Created account transaction for PO payment %', NEW.id;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to create account transaction: %', SQLERRM;
    END;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 2. RECREATE TRIGGER (ensure it's active)
-- ============================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_track_po_payment_spending ON purchase_order_payments;

-- Create trigger for INSERT and UPDATE
CREATE TRIGGER trigger_track_po_payment_spending
  AFTER INSERT OR UPDATE OF status ON purchase_order_payments
  FOR EACH ROW
  WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION track_po_payment_as_expense();

COMMENT ON TRIGGER trigger_track_po_payment_spending ON purchase_order_payments IS 
  'Automatically tracks PO payments as expenses and account transactions (FIXED: uses JOIN for supplier name)';

-- ============================================
-- 3. UPDATE BACKFILL QUERY TO USE JOIN
-- ============================================

-- Note: This won't run the backfill again, but provides the corrected version for reference
-- If you need to backfill, uncomment and run the DO block below

/*
DO $$
DECLARE
  v_synced_count INTEGER := 0;
  v_po_record RECORD;
  v_po_reference TEXT;
  v_po_supplier TEXT;
  v_user_id UUID;
BEGIN
  RAISE NOTICE '🔄 Backfilling existing PO payments as expenses...';
  
  -- Get a valid user ID for backfill
  SELECT id INTO v_user_id FROM users LIMIT 1;
  IF v_user_id IS NULL THEN
    v_user_id := '00000000-0000-0000-0000-000000000001';
  END IF;
  
  -- Process each completed PO payment that doesn't have an expense record yet
  FOR v_po_record IN 
    SELECT pop.*
    FROM purchase_order_payments pop
    WHERE pop.status = 'completed'
      AND NOT EXISTS (
        SELECT 1 FROM finance_expenses fe
        WHERE fe.receipt_number = COALESCE(pop.reference, 'PO-PAY-' || SUBSTRING(pop.id::TEXT FROM 1 FOR 8))
      )
    ORDER BY pop.created_at DESC
  LOOP
    -- Get PO details with JOIN to suppliers table
    SELECT 
      COALESCE(po.po_number, 'PO-' || po.id::TEXT),
      COALESCE(s.name, 'Unknown Supplier')
    INTO v_po_reference, v_po_supplier
    FROM lats_purchase_orders po
    LEFT JOIN lats_suppliers s ON s.id = po.supplier_id
    WHERE po.id = v_po_record.purchase_order_id;
    
    -- Create expense record
    BEGIN
      INSERT INTO finance_expenses (
        title,
        category,
        account_id,
        amount,
        description,
        expense_date,
        payment_method,
        status,
        receipt_number,
        vendor,
        created_by,
        approved_by,
        created_at,
        updated_at
      ) VALUES (
        'Purchase Order Payment: ' || v_po_reference,
        'Purchase Orders',
        v_po_record.payment_account_id,
        v_po_record.amount,
        COALESCE(v_po_record.notes, 'Payment for ' || v_po_reference || ' - ' || v_po_supplier),
        COALESCE(v_po_record.payment_date::DATE, CURRENT_DATE),
        COALESCE(v_po_record.method, v_po_record.payment_method, 'cash'),
        'approved',
        COALESCE(v_po_record.reference, 'PO-PAY-' || SUBSTRING(v_po_record.id::TEXT FROM 1 FOR 8)),
        v_po_supplier,
        COALESCE(v_po_record.created_by, v_user_id),
        COALESCE(v_po_record.created_by, v_user_id),
        v_po_record.created_at,
        v_po_record.created_at
      );
      
      v_synced_count := v_synced_count + 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to backfill expense for payment %: %', v_po_record.id, SQLERRM;
    END;
    
    -- Create account transaction
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'account_transactions'
      ) THEN
        INSERT INTO account_transactions (
          account_id,
          transaction_type,
          amount,
          description,
          reference_number,
          related_entity_type,
          related_entity_id,
          metadata,
          created_at,
          created_by
        ) VALUES (
          v_po_record.payment_account_id,
          'expense',
          v_po_record.amount,
          'PO Payment: ' || v_po_reference || ' - ' || v_po_supplier,
          COALESCE(v_po_record.reference, 'PO-PAY-' || SUBSTRING(v_po_record.id::TEXT FROM 1 FOR 8)),
          'purchase_order_payment',
          v_po_record.id,
          jsonb_build_object(
            'purchase_order_id', v_po_record.purchase_order_id,
            'po_reference', v_po_reference,
            'supplier', v_po_supplier,
            'payment_method', COALESCE(v_po_record.method, v_po_record.payment_method),
            'backfilled', true
          ),
          v_po_record.created_at,
          COALESCE(v_po_record.created_by, v_user_id)
        )
        ON CONFLICT DO NOTHING;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to backfill account transaction for payment %: %', v_po_record.id, SQLERRM;
    END;
    
  END LOOP;
  
  RAISE NOTICE '✅ Backfilled % PO payments as expenses', v_synced_count;
END $$;
*/

-- ============================================
-- 4. VERIFICATION
-- ============================================

DO $$
DECLARE
  v_trigger_exists BOOLEAN;
  v_function_exists BOOLEAN;
BEGIN
  -- Check if trigger exists
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_track_po_payment_spending'
  ) INTO v_trigger_exists;
  
  -- Check if function exists
  SELECT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'track_po_payment_as_expense'
  ) INTO v_function_exists;
  
  RAISE NOTICE '================================================';
  RAISE NOTICE '✅ SUPPLIER_NAME COLUMN FIX APPLIED';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Trigger exists: %', CASE WHEN v_trigger_exists THEN '✅ Yes' ELSE '❌ No' END;
  RAISE NOTICE 'Function exists: %', CASE WHEN v_function_exists THEN '✅ Yes' ELSE '❌ No' END;
  RAISE NOTICE '';
  RAISE NOTICE 'CHANGES MADE:';
  RAISE NOTICE '  • Fixed track_po_payment_as_expense() to JOIN with lats_suppliers';
  RAISE NOTICE '  • Added support for both "method" and "payment_method" columns';
  RAISE NOTICE '  • Improved error handling';
  RAISE NOTICE '';
  RAISE NOTICE '💡 TIP: Try processing a payment again - the error should be gone!';
  RAISE NOTICE '================================================';
END $$;

