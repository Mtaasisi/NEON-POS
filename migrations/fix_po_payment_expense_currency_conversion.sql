-- ================================================
-- FIX PURCHASE ORDER PAYMENT EXPENSE CURRENCY CONVERSION
-- ================================================
-- This migration updates the trigger that creates finance expenses
-- from purchase order payments to properly handle currency conversion
-- using the purchase order's exchange rate.
-- ================================================

-- Drop the existing trigger first
DROP TRIGGER IF EXISTS trigger_create_expense_from_po_payment ON purchase_order_payments;

-- Recreate the function with proper currency conversion
CREATE OR REPLACE FUNCTION public.trigger_create_expense_from_po_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_po_reference TEXT;
  v_po_supplier TEXT;
  v_account_name TEXT;
  v_user_id UUID;
  v_category_id UUID;
  v_branch_id UUID;
  v_po_currency TEXT;
  v_po_exchange_rate NUMERIC;
  v_po_base_currency TEXT;
  v_po_total_amount NUMERIC;
  v_po_total_base_currency NUMERIC;
  v_expense_amount_base_currency NUMERIC;
  v_payment_percentage NUMERIC;
BEGIN
  IF NEW.status = 'completed' THEN
    
    -- Get PO category ID
    SELECT id INTO v_category_id
    FROM finance_expense_categories
    WHERE category_name = 'Purchase Orders'
    LIMIT 1;
    
    -- Get PO details including currency and exchange rate information
    SELECT 
      COALESCE(po.po_number, 'PO-' || po.id::TEXT),
      COALESCE(s.name, 'Unknown Supplier'),
      po.branch_id,
      COALESCE(po.currency, 'TZS'),
      COALESCE(po.exchange_rate, 1.0),
      COALESCE(po.base_currency, 'TZS'),
      po.total_amount,
      po.total_amount_base_currency
    INTO 
      v_po_reference, 
      v_po_supplier, 
      v_branch_id,
      v_po_currency,
      v_po_exchange_rate,
      v_po_base_currency,
      v_po_total_amount,
      v_po_total_base_currency
    FROM lats_purchase_orders po
    LEFT JOIN lats_suppliers s ON s.id = po.supplier_id
    WHERE po.id = NEW.purchase_order_id;
    
    -- If PO doesn't have branch, try to get from payment account or user
    IF v_branch_id IS NULL THEN
      -- Get first active branch as fallback
      SELECT id INTO v_branch_id
      FROM store_locations
      WHERE is_active = true
      ORDER BY created_at
      LIMIT 1;
    END IF;
    
    SELECT name INTO v_account_name
    FROM finance_accounts
    WHERE id = NEW.payment_account_id;
    
    v_user_id := NEW.created_by;
    IF v_user_id IS NULL THEN
      SELECT id INTO v_user_id FROM users LIMIT 1;
    END IF;
    
    -- Calculate expense amount in base currency
    -- This ensures proper expense tracking regardless of payment currency
    IF v_po_currency != v_po_base_currency AND v_po_exchange_rate != 1.0 THEN
      -- Calculate what percentage of the PO total this payment represents
      IF v_po_total_amount > 0 THEN
        v_payment_percentage := NEW.amount / v_po_total_amount;
      ELSE
        v_payment_percentage := 1.0;
      END IF;
      
      -- Calculate the base currency amount for this payment
      v_expense_amount_base_currency := COALESCE(v_po_total_base_currency, NEW.amount * v_po_exchange_rate) * v_payment_percentage;
      
      RAISE NOTICE '💱 Currency conversion for expense: PO Currency=%, Amount=%, Exchange Rate=%, Base Currency Amount=%', 
        v_po_currency, NEW.amount, v_po_exchange_rate, v_expense_amount_base_currency;
    ELSE
      -- Same currency, no conversion needed
      v_expense_amount_base_currency := NEW.amount;
      RAISE NOTICE '💰 Same currency transaction - no conversion needed';
    END IF;
    
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'finance_expenses'
      ) THEN
        INSERT INTO finance_expenses (
          title,
          expense_category_id,
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
          branch_id,
          created_at,
          updated_at
        ) VALUES (
          'Purchase Order Payment: ' || v_po_reference,
          v_category_id,
          NEW.payment_account_id,
          v_expense_amount_base_currency, -- Use calculated base currency amount
          COALESCE(NEW.notes, 'Payment for ' || v_po_reference || ' - ' || v_po_supplier) || 
            CASE 
              WHEN v_po_currency != v_po_base_currency 
              THEN E'\n[Original: ' || NEW.amount || ' ' || NEW.currency || ' @ rate ' || v_po_exchange_rate || ']'
              ELSE ''
            END,
          COALESCE(NEW.payment_date::DATE, CURRENT_DATE),
          COALESCE(NEW.method, NEW.payment_method, 'cash'),
          'approved',
          COALESCE(NEW.reference, 'PO-PAY-' || SUBSTRING(NEW.id::TEXT FROM 1 FOR 8)),
          v_po_supplier,
          v_user_id,
          v_user_id,
          v_branch_id,
          NOW(),
          NOW()
        )
        ON CONFLICT DO NOTHING;
        
        RAISE NOTICE '✅ Created expense for PO payment % with branch %. Amount in base currency: % %', 
          NEW.id, v_branch_id, v_expense_amount_base_currency, v_po_base_currency;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to create expense: %', SQLERRM;
    END;
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER trigger_create_expense_from_po_payment
  AFTER INSERT OR UPDATE OF status ON purchase_order_payments
  FOR EACH ROW
  EXECUTE FUNCTION trigger_create_expense_from_po_payment();

-- Add comment
COMMENT ON FUNCTION trigger_create_expense_from_po_payment() IS 'Creates finance expense records from purchase order payments with proper currency conversion using PO exchange rates';

-- Verification query
SELECT 
  'Trigger created successfully' as status,
  COUNT(*) as existing_po_payments
FROM purchase_order_payments
WHERE status = 'completed';














