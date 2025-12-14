-- Update create_account_transaction function to include branch_id
-- This ensures all transactions created by the database function are branch-aware

-- Drop and recreate the function with branch_id support
CREATE OR REPLACE FUNCTION public.create_account_transaction(
    p_account_id uuid,
    p_transaction_type text,
    p_amount numeric,
    p_reference_number text DEFAULT NULL::text,
    p_description text DEFAULT NULL::text,
    p_metadata jsonb DEFAULT NULL::jsonb,
    p_created_by uuid DEFAULT NULL::uuid
) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_transaction_id UUID;
  v_current_balance NUMERIC;
  v_new_balance NUMERIC;
  v_branch_id UUID;
BEGIN
  -- Get current balance and branch_id from account
  SELECT balance, branch_id INTO v_current_balance, v_branch_id
  FROM finance_accounts
  WHERE id = p_account_id;

  -- Calculate new balance based on transaction type
  IF p_transaction_type IN ('payment_received', 'transfer_in') THEN
    v_new_balance := v_current_balance + p_amount;
  ELSE
    v_new_balance := v_current_balance - p_amount;
  END IF;

  -- Insert transaction with branch_id
  INSERT INTO account_transactions (
    account_id,
    transaction_type,
    amount,
    balance_before,
    balance_after,
    reference_number,
    description,
    metadata,
    created_by,
    branch_id
  ) VALUES (
    p_account_id,
    p_transaction_type,
    p_amount,
    v_current_balance,
    v_new_balance,
    p_reference_number,
    p_description,
    p_metadata,
    p_created_by,
    v_branch_id
  ) RETURNING id INTO v_transaction_id;

  -- Update account balance
  UPDATE finance_accounts
  SET balance = v_new_balance,
      updated_at = NOW()
  WHERE id = p_account_id;

  RETURN v_transaction_id;
END;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION public.create_account_transaction(uuid, text, numeric, text, text, jsonb, uuid) IS 'Creates an account transaction with automatic branch isolation based on the account branch_id';
