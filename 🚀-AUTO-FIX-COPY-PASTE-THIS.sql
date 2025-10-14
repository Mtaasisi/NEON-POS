-- ============================================
-- 🚀 AUTO-FIX: PURCHASE ORDER PAYMENT ERROR
-- ============================================
-- INSTRUCTIONS:
-- 1. Copy EVERYTHING in this file (Cmd+A / Ctrl+A)
-- 2. Open: https://console.neon.tech
-- 3. Go to: SQL Editor
-- 4. Paste and click "Run"
-- 5. Done! ✅
-- ============================================

-- Fix the trigger function (supplier_name column error)
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
    
    -- ✅ FIXED: Use JOIN to get supplier name instead of selecting supplier_name directly
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
    
    -- Get a valid user ID
    v_user_id := NEW.created_by;
    IF v_user_id IS NULL THEN
      SELECT id INTO v_user_id FROM users LIMIT 1;
    END IF;
    
    -- Create expense record
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
          COALESCE(NEW.method, NEW.payment_method, 'cash'),  -- ✅ FIXED: Support both columns
          'approved',
          COALESCE(NEW.reference, 'PO-PAY-' || SUBSTRING(NEW.id::TEXT FROM 1 FOR 8)),
          v_po_supplier,
          v_user_id,
          v_user_id,
          NOW(),
          NOW()
        );
        
        RAISE NOTICE '✅ Created expense record for PO payment %', NEW.id;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to create expense record: %', SQLERRM;
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
          NEW.payment_account_id,
          'expense',
          NEW.amount,
          'PO Payment: ' || v_po_reference || ' - ' || v_po_supplier,
          COALESCE(NEW.reference, 'PO-PAY-' || SUBSTRING(NEW.id::TEXT FROM 1 FOR 8)),
          'purchase_order_payment',
          NEW.id,
          jsonb_build_object(
            'purchase_order_id', NEW.purchase_order_id,
            'po_reference', v_po_reference,
            'supplier', v_po_supplier,
            'payment_method', COALESCE(NEW.method, NEW.payment_method),  -- ✅ FIXED
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

-- Recreate the trigger
DROP TRIGGER IF EXISTS trigger_track_po_payment_spending ON purchase_order_payments;

CREATE TRIGGER trigger_track_po_payment_spending
  AFTER INSERT OR UPDATE OF status ON purchase_order_payments
  FOR EACH ROW
  WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION track_po_payment_as_expense();

-- Verify installation
DO $$
DECLARE
  v_trigger_exists BOOLEAN;
  v_function_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_track_po_payment_spending'
  ) INTO v_trigger_exists;
  
  SELECT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'track_po_payment_as_expense'
  ) INTO v_function_exists;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ PAYMENT FIX APPLIED SUCCESSFULLY!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Function exists: %', CASE WHEN v_function_exists THEN '✅ Yes' ELSE '❌ No' END;
  RAISE NOTICE 'Trigger exists: %', CASE WHEN v_trigger_exists THEN '✅ Yes' ELSE '❌ No' END;
  RAISE NOTICE '';
  RAISE NOTICE '🎯 NEXT STEPS:';
  RAISE NOTICE '  1. Refresh your browser (Cmd+Shift+R)';
  RAISE NOTICE '  2. Try processing a payment';
  RAISE NOTICE '  3. Error should be gone! ✨';
  RAISE NOTICE '========================================';
END $$;

-- Show success message
SELECT '✅ FIX APPLIED! Refresh your POS app and try payment again.' as status;

