-- Fix sync_sale_to_payment_transaction function to handle payment_method properly
-- The function was trying to use JSON operator on a text column

CREATE OR REPLACE FUNCTION public.sync_sale_to_payment_transaction() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_customer_name TEXT;
  v_customer_email TEXT;
  v_customer_phone TEXT;
  v_payment_type TEXT;
  v_payment_method_jsonb JSONB;
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
    
    -- Extract payment type from payment_method
    -- payment_method can be JSONB or TEXT, so we always cast to JSONB first
    IF NEW.payment_method IS NULL THEN
      v_payment_type := 'cash';
      v_payment_method_jsonb := jsonb_build_object('type', 'cash');
    ELSE
      BEGIN
        -- Cast to JSONB (works whether it's already JSONB or TEXT)
        v_payment_method_jsonb := NEW.payment_method::jsonb;
        v_payment_type := COALESCE(v_payment_method_jsonb->>'type', 'cash');
      EXCEPTION WHEN OTHERS THEN
        -- If casting fails, treat as simple string payment method
        v_payment_type := COALESCE(NEW.payment_method::text, 'cash');
        v_payment_method_jsonb := jsonb_build_object('type', v_payment_type);
      END;
    END IF;
    
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
      v_payment_type,
      NEW.total_amount,
      'TZS',
      COALESCE(NEW.payment_status, 'completed'),
      NEW.customer_id,
      COALESCE(v_customer_name, NEW.customer_name),
      COALESCE(v_customer_email, NEW.customer_email),
      COALESCE(v_customer_phone, NEW.customer_phone),
      'SALE-' || COALESCE(NEW.sale_number, NEW.id::text),
      jsonb_build_object(
        'sale_number', COALESCE(NEW.sale_number, 'N/A'),
        'payment_method', v_payment_type,
        'payment_details', COALESCE(v_payment_method_jsonb, jsonb_build_object('type', v_payment_type)),
        'auto_synced', true,
        'sync_date', NOW()::text
      ),
      NEW.id,
      'SYSTEM',
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
$$;

COMMENT ON FUNCTION public.sync_sale_to_payment_transaction() IS 'Syncs sales to payment_transactions table. Handles payment_method as both JSONB and TEXT.';

