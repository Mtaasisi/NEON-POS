-- ============================================
-- FIX ALL MISSING RPC FUNCTIONS
-- Run this in your Neon database SQL editor
-- ============================================
-- This script creates all the missing database functions that are causing 400 errors
-- ============================================

-- 1. PURCHASE ORDER PAYMENT PROCESSING FUNCTION
CREATE OR REPLACE FUNCTION process_purchase_order_payment(
  purchase_order_id_param UUID,
  payment_account_id_param UUID,
  amount_param DECIMAL,
  currency_param TEXT,
  payment_method_param TEXT,
  payment_method_id_param UUID,
  user_id_param UUID,
  reference_param TEXT DEFAULT NULL,
  notes_param TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_payment_id UUID;
  v_po_total DECIMAL;
  v_total_paid DECIMAL;
  v_new_payment_status TEXT;
  v_account_balance_before DECIMAL;
  v_account_balance_after DECIMAL;
  v_po_number TEXT;
  v_supplier_name TEXT;
  v_has_method_column BOOLEAN;
  v_has_payment_method_column BOOLEAN;
BEGIN
  -- Validate purchase order exists
  IF NOT EXISTS (SELECT 1 FROM lats_purchase_orders WHERE id = purchase_order_id_param) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Purchase order not found',
      'error_code', 'PO_NOT_FOUND'
    );
  END IF;

  -- Get purchase order details
  SELECT total_amount, po_number INTO v_po_total, v_po_number
  FROM lats_purchase_orders
  WHERE id = purchase_order_id_param;

  -- Get supplier name (if available)
  BEGIN
    SELECT s.name INTO v_supplier_name
    FROM lats_purchase_orders po
    LEFT JOIN lats_suppliers s ON po.supplier_id = s.id
    WHERE po.id = purchase_order_id_param;
  EXCEPTION WHEN OTHERS THEN
    v_supplier_name := 'Unknown Supplier';
  END;

  -- Get current account balance
  SELECT COALESCE(balance, 0) INTO v_account_balance_before
  FROM finance_accounts
  WHERE id = payment_account_id_param;

  -- Check which payment method columns exist
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_order_payments' AND column_name = 'method'
  ) INTO v_has_method_column;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_order_payments' AND column_name = 'payment_method'
  ) INTO v_has_payment_method_column;

  -- Insert payment record (handling different column combinations)
  IF v_has_method_column AND v_has_payment_method_column THEN
    INSERT INTO purchase_order_payments (
      purchase_order_id,
      payment_account_id,
      payment_method_id,
      method,
      payment_method,
      amount,
      currency,
      status,
      reference,
      notes,
      user_id,
      created_by,
      payment_date,
      created_at,
      updated_at
    ) VALUES (
      purchase_order_id_param,
      payment_account_id_param,
      NULLIF(payment_method_id_param, '00000000-0000-0000-0000-000000000000'::UUID),
      payment_method_param,
      payment_method_param,
      amount_param,
      currency_param,
      'completed',
      reference_param,
      notes_param,
      user_id_param,
      user_id_param,
      NOW(),
      NOW(),
      NOW()
    )
    RETURNING id INTO v_payment_id;
    
  ELSIF v_has_method_column THEN
    INSERT INTO purchase_order_payments (
      purchase_order_id,
      payment_account_id,
      payment_method_id,
      method,
      amount,
      currency,
      status,
      reference,
      notes,
      user_id,
      created_by,
      payment_date,
      created_at,
      updated_at
    ) VALUES (
      purchase_order_id_param,
      payment_account_id_param,
      NULLIF(payment_method_id_param, '00000000-0000-0000-0000-000000000000'::UUID),
      payment_method_param,
      amount_param,
      currency_param,
      'completed',
      reference_param,
      notes_param,
      user_id_param,
      user_id_param,
      NOW(),
      NOW(),
      NOW()
    )
    RETURNING id INTO v_payment_id;
    
  ELSIF v_has_payment_method_column THEN
    INSERT INTO purchase_order_payments (
      purchase_order_id,
      payment_account_id,
      payment_method_id,
      payment_method,
      amount,
      currency,
      status,
      reference,
      notes,
      user_id,
      created_by,
      payment_date,
      created_at,
      updated_at
    ) VALUES (
      purchase_order_id_param,
      payment_account_id_param,
      NULLIF(payment_method_id_param, '00000000-0000-0000-0000-000000000000'::UUID),
      payment_method_param,
      amount_param,
      currency_param,
      'completed',
      reference_param,
      notes_param,
      user_id_param,
      user_id_param,
      NOW(),
      NOW(),
      NOW()
    )
    RETURNING id INTO v_payment_id;
    
  ELSE
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Neither method nor payment_method column exists',
      'error_code', 'SCHEMA_ERROR'
    );
  END IF;

  -- Update finance account balance (deduct amount)
  UPDATE finance_accounts
  SET 
    balance = balance - amount_param,
    updated_at = NOW()
  WHERE id = payment_account_id_param;

  -- Get new balance
  SELECT COALESCE(balance, 0) INTO v_account_balance_after
  FROM finance_accounts
  WHERE id = payment_account_id_param;

  -- Create account transaction for spending tracking
  BEGIN
    INSERT INTO account_transactions (
      account_id,
      transaction_type,
      amount,
      balance_before,
      balance_after,
      description,
      reference_number,
      related_transaction_id,
      metadata,
      created_by,
      created_at,
      updated_at
    ) VALUES (
      payment_account_id_param,
      'expense',
      amount_param,
      v_account_balance_before,
      v_account_balance_after,
      'PO Payment: ' || COALESCE(v_po_number, 'N/A') || ' - ' || COALESCE(v_supplier_name, 'Unknown'),
      COALESCE(reference_param, 'PO-PAY-' || substring(v_payment_id::TEXT, 1, 8)),
      v_payment_id,
      jsonb_build_object(
        'type', 'purchase_order_payment',
        'purchase_order_id', purchase_order_id_param,
        'payment_id', v_payment_id,
        'po_reference', v_po_number,
        'supplier', v_supplier_name,
        'payment_method', payment_method_param
      ),
      user_id_param,
      NOW(),
      NOW()
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to create account transaction: %', SQLERRM;
  END;

  -- Calculate total paid
  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
  FROM purchase_order_payments
  WHERE purchase_order_id = purchase_order_id_param
    AND status = 'completed';

  -- Determine payment status
  IF v_total_paid >= v_po_total THEN
    v_new_payment_status := 'paid';
  ELSIF v_total_paid > 0 THEN
    v_new_payment_status := 'partial';
  ELSE
    v_new_payment_status := 'unpaid';
  END IF;

  -- Update purchase order payment status
  UPDATE lats_purchase_orders
  SET 
    payment_status = v_new_payment_status,
    updated_at = NOW()
  WHERE id = purchase_order_id_param;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Payment processed successfully',
    'data', jsonb_build_object(
      'payment_id', v_payment_id,
      'amount_paid', amount_param,
      'total_paid', v_total_paid,
      'po_total', v_po_total,
      'payment_status', v_new_payment_status,
      'balance_before', v_account_balance_before,
      'balance_after', v_account_balance_after
    )
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Payment processing failed: ' || SQLERRM,
      'error_code', 'PROCESSING_ERROR'
    );
END;
$$;

-- 2. GET PURCHASE ORDER PAYMENT SUMMARY
CREATE OR REPLACE FUNCTION get_purchase_order_payment_summary(
  purchase_order_id_param UUID
)
RETURNS TABLE (
  total_amount DECIMAL,
  total_paid DECIMAL,
  remaining_amount DECIMAL,
  payment_status TEXT,
  payment_count INTEGER,
  last_payment_date TIMESTAMPTZ
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    po.total_amount,
    COALESCE(SUM(pop.amount), 0) as total_paid,
    po.total_amount - COALESCE(SUM(pop.amount), 0) as remaining_amount,
    COALESCE(po.payment_status, 'unpaid')::TEXT as payment_status,
    COUNT(pop.id)::INTEGER as payment_count,
    MAX(pop.payment_date) as last_payment_date
  FROM lats_purchase_orders po
  LEFT JOIN purchase_order_payments pop 
    ON po.id = pop.purchase_order_id 
    AND pop.status = 'completed'
  WHERE po.id = purchase_order_id_param
  GROUP BY po.id, po.total_amount, po.payment_status;
END;
$$;

-- 3. GET PURCHASE ORDER PAYMENT HISTORY
CREATE OR REPLACE FUNCTION get_purchase_order_payment_history(
  purchase_order_id_param UUID
)
RETURNS TABLE (
  id UUID,
  payment_date TIMESTAMPTZ,
  amount DECIMAL,
  currency TEXT,
  payment_method TEXT,
  reference TEXT,
  notes TEXT,
  status TEXT,
  account_name TEXT,
  created_by_name TEXT
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pop.id,
    pop.payment_date,
    pop.amount,
    pop.currency,
    COALESCE(pop.payment_method, pop.method) as payment_method,
    pop.reference,
    pop.notes,
    pop.status,
    fa.name as account_name,
    COALESCE(u.full_name, u.email, 'Unknown') as created_by_name
  FROM purchase_order_payments pop
  LEFT JOIN finance_accounts fa ON pop.payment_account_id = fa.id
  LEFT JOIN users u ON pop.created_by = u.id
  WHERE pop.purchase_order_id = purchase_order_id_param
  ORDER BY pop.payment_date DESC;
END;
$$;

-- 4. GET PURCHASE ORDER ITEMS WITH PRODUCTS (if not exists)
CREATE OR REPLACE FUNCTION get_purchase_order_items_with_products(
  purchase_order_id_param UUID
)
RETURNS TABLE (
  id UUID,
  purchase_order_id UUID,
  product_id UUID,
  variant_id UUID,
  quantity INTEGER,
  received_quantity INTEGER,
  unit_cost DECIMAL,
  total_cost DECIMAL,
  notes TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  product_name TEXT,
  product_sku TEXT,
  variant_name TEXT,
  variant_sku TEXT
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    poi.id,
    poi.purchase_order_id,
    poi.product_id,
    poi.variant_id,
    poi.quantity_ordered::INTEGER as quantity,
    COALESCE(poi.quantity_received, 0)::INTEGER as received_quantity,
    poi.unit_cost,
    (poi.quantity_ordered * poi.unit_cost) as total_cost,
    poi.notes,
    poi.created_at,
    poi.updated_at,
    p.name as product_name,
    p.sku as product_sku,
    pv.name as variant_name,
    pv.sku as variant_sku
  FROM lats_purchase_order_items poi
  LEFT JOIN lats_products p ON poi.product_id = p.id
  LEFT JOIN lats_product_variants pv ON poi.variant_id = pv.id
  WHERE poi.purchase_order_id = purchase_order_id_param
  ORDER BY poi.created_at ASC;
END;
$$;

-- 5. VERIFY ALL FUNCTIONS WERE CREATED
DO $$
DECLARE
  function_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO function_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.proname IN (
      'process_purchase_order_payment',
      'get_purchase_order_payment_summary',
      'get_purchase_order_payment_history',
      'get_purchase_order_items_with_products'
    );
  
  RAISE NOTICE '✅ Created/Updated % database functions', function_count;
END $$;

-- Success message
SELECT '✅ All RPC functions created successfully! You can now refresh your app.' as status;

