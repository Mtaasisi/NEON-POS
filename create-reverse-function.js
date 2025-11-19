#!/usr/bin/env node
import { neon } from '@neondatabase/serverless';

// Load environment variables
const DATABASE_URL = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ No DATABASE_URL found in environment');
  process.exit(1);
}

async function createReverseFunction() {
  const sql = neon(DATABASE_URL);

  try {
    console.log('🔧 Creating reverse_purchase_order_payment function...');

    // Test connection
    await sql`SELECT 1`;

    // Create the function using the exact same pattern as process_purchase_order_payment
    const createFunctionSQL = `
CREATE OR REPLACE FUNCTION public.reverse_purchase_order_payment(
  payment_id_param uuid,
  user_id_param uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
)
RETURNS json
LANGUAGE plpgsql
AS $function$
DECLARE
  v_payment purchase_order_payments%ROWTYPE;
  v_po lats_purchase_orders%ROWTYPE;
  v_total_base DECIMAL;
  v_new_total_paid DECIMAL;
  v_new_status VARCHAR;
  v_account finance_accounts%ROWTYPE;
  v_deleted_transactions INTEGER := 0;
  v_deleted_expenses INTEGER := 0;
  v_receipt_number VARCHAR;
BEGIN
  -- Lock payment row to prevent concurrent reversals
  SELECT *
  INTO v_payment
  FROM purchase_order_payments
  WHERE id = payment_id_param
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Payment not found'
    );
  END IF;

  -- Lock the related purchase order row
  SELECT *,
         COALESCE(total_amount_base_currency, total_amount, 0) AS total_base
  INTO v_po
  FROM lats_purchase_orders
  WHERE id = v_payment.purchase_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Related purchase order not found'
    );
  END IF;

  -- Calculate new totals and payment status
  v_new_total_paid := GREATEST(COALESCE(v_po.total_paid, 0) - COALESCE(v_payment.amount, 0), 0);
  v_total_base := COALESCE(v_po.total_base, 0);

  IF v_new_total_paid <= 0 THEN
    v_new_status := 'unpaid';
  ELSIF v_total_base > 0 AND v_new_total_paid >= v_total_base THEN
    v_new_status := 'paid';
  ELSE
    v_new_status := 'partial';
  END IF;

  -- Restore finance account balance
  UPDATE finance_accounts
  SET balance = balance + COALESCE(v_payment.amount, 0),
      updated_at = NOW()
  WHERE id = v_payment.payment_account_id
  RETURNING * INTO v_account;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Related finance account not found'
    );
  END IF;

  -- Remove linked account transactions
  DELETE FROM account_transactions
  WHERE related_entity_type = 'purchase_order_payment'
    AND related_entity_id = v_payment.id;
  GET DIAGNOSTICS v_deleted_transactions = ROW_COUNT;

  -- Remove any finance expense created by the payment trigger
  v_receipt_number := COALESCE(v_payment.reference, 'PO-PAY-' || SUBSTRING(v_payment.id::TEXT, 1, 8));

  DELETE FROM finance_expenses
  WHERE receipt_number = v_receipt_number
     OR description ILIKE '%' || v_payment.id::TEXT || '%';
  GET DIAGNOSTICS v_deleted_expenses = ROW_COUNT;

  -- Delete the payment record itself
  DELETE FROM purchase_order_payments
  WHERE id = v_payment.id;

  -- Update purchase order totals and status
  UPDATE lats_purchase_orders
  SET total_paid = v_new_total_paid,
      payment_status = v_new_status,
      updated_at = NOW()
  WHERE id = v_payment.purchase_order_id;

  RETURN json_build_object(
    'success', true,
    'message', 'Payment reversed successfully',
    'data', json_build_object(
      'purchase_order_id', v_payment.purchase_order_id,
      'amount_reversed', v_payment.amount,
      'new_total_paid', v_new_total_paid,
      'payment_status', v_new_status,
      'account_id', v_account.id,
      'account_balance', v_account.balance,
      'transactions_removed', v_deleted_transactions,
      'expenses_removed', v_deleted_expenses,
      'performed_by', user_id_param,
      'performed_at', NOW()
    )
  );
END;
$function$;
`;

    console.log('📝 Executing CREATE OR REPLACE FUNCTION...');
    await sql.unsafe(createFunctionSQL);

    console.log('📝 Executing GRANT...');
    await sql.unsafe(`GRANT EXECUTE ON FUNCTION public.reverse_purchase_order_payment(uuid, uuid) TO authenticated;`);

    console.log('✅ Function created. Verifying...');

    // Check if function exists
    const funcCheck = await sql`SELECT proname FROM pg_proc WHERE proname = 'reverse_purchase_order_payment'`;

    if (funcCheck.length > 0) {
      console.log('🎉 SUCCESS: reverse_purchase_order_payment function created!');

      // Test the function
      try {
        const testResult = await sql`SELECT * FROM reverse_purchase_order_payment('00000000-0000-0000-0000-000000000000'::uuid)`;
        console.log('✅ Function test result:', testResult);
        console.log('🎉 The undo payment functionality should now work!');
      } catch (error) {
        if (error.message && error.message.includes('Payment not found')) {
          console.log('✅ Function test successful (expected "Payment not found" error)');
          console.log('🎉 The undo payment functionality should now work!');
        } else {
          console.log('⚠️ Function test returned unexpected result:', error.message);
        }
      }
    } else {
      console.error('❌ Function still does not exist after creation');
    }

  } catch (error) {
    console.error('❌ Error creating function:', error.message);
    console.error('Stack:', error.stack);
  }
}

createReverseFunction();
