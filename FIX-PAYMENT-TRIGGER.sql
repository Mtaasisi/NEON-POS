-- ============================================
-- FIX: Update trigger to handle JSONB payment_method
-- ✅ TESTED AND WORKING
-- ============================================

CREATE OR REPLACE FUNCTION sync_sale_to_payment_transaction()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_name TEXT;
  v_customer_email TEXT;
  v_customer_phone TEXT;
  v_payment_type TEXT;
BEGIN
  -- Only process if sale has an amount
  IF NEW.total_amount > 0 THEN
    
    -- Get customer details if customer_id exists
    IF NEW.customer_id IS NOT NULL THEN
      SELECT name, email, phone 
      INTO v_customer_name, v_customer_email, v_customer_phone
      FROM customers 
      WHERE id = NEW.customer_id;
    END IF;
    
    -- Extract payment type from JSONB or use default
    -- payment_method is now JSONB like: {"type":"CRDB Bank","amount":100,"details":{...}}
    v_payment_type := COALESCE(NEW.payment_method->>'type', 'cash');
    
    -- Insert or update payment transaction
    INSERT INTO payment_transactions (
      id,
      order_id,
      provider,
      amount,
      currency,
      status,
      customer_id,
      customer_name,
      customer_email,
      customer_phone,
      reference,
      metadata,
      sale_id,
      pos_session_id,
      created_at,
      updated_at,
      completed_at
    ) VALUES (
      gen_random_uuid(),
      COALESCE(NEW.sale_number, 'SALE-' || NEW.id::text),
      v_payment_type,  -- ✅ Now using extracted type
      NEW.total_amount,
      'TZS',
      COALESCE(NEW.payment_status, 'completed'),  -- ✅ Fixed: Use payment_status directly
      NEW.customer_id,
      COALESCE(v_customer_name, NEW.customer_name),
      COALESCE(v_customer_email, NEW.customer_email),
      COALESCE(v_customer_phone, NEW.customer_phone),
      'SALE-' || COALESCE(NEW.sale_number, NEW.id::text),
      jsonb_build_object(
        'sale_number', COALESCE(NEW.sale_number, 'N/A'),
        'payment_method', v_payment_type,  -- ✅ Now using extracted type
        'payment_details', NEW.payment_method,  -- ✅ Store full JSONB details
        'auto_synced', true,
        'sync_date', NOW()::text
      )::json,
      NEW.id,
      'SYSTEM',  -- ✅ Fixed: Don't use session_id column (doesn't exist)
      COALESCE(NEW.created_at, NOW()),
      COALESCE(NEW.created_at, NOW()),
      CASE WHEN COALESCE(NEW.payment_status, 'completed') = 'completed' THEN COALESCE(NEW.created_at, NOW()) ELSE NULL END
    )
    ON CONFLICT (sale_id) 
    WHERE sale_id IS NOT NULL
    DO UPDATE SET
      amount = EXCLUDED.amount,
      status = EXCLUDED.status,
      provider = EXCLUDED.provider,
      customer_name = EXCLUDED.customer_name,
      customer_email = EXCLUDED.customer_email,
      customer_phone = EXCLUDED.customer_phone,
      updated_at = NOW(),
      completed_at = CASE 
        WHEN EXCLUDED.status = 'completed' THEN NOW() 
        ELSE payment_transactions.completed_at 
      END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Verify the function was updated
SELECT 
  proname as function_name,
  pg_get_functiondef(oid) as definition
FROM pg_proc 
WHERE proname = 'sync_sale_to_payment_transaction';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Trigger function updated to handle JSONB payment_method!';
END $$;

