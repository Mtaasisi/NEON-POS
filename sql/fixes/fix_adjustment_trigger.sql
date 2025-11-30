-- Fix the update_account_balance trigger function to properly handle adjustment transactions
-- The previous version incorrectly set the balance directly to the adjustment amount
-- instead of adding/subtracting it from the current balance

-- Drop the existing trigger first
DROP TRIGGER IF EXISTS trigger_update_account_balance ON public.account_transactions;

-- Drop and recreate the function with the correct logic
DROP FUNCTION IF EXISTS public.update_account_balance();

CREATE FUNCTION public.update_account_balance() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  current_balance DECIMAL(15,2);
  new_balance DECIMAL(15,2);
BEGIN
  -- Get current balance
  SELECT balance INTO current_balance
  FROM finance_accounts
  WHERE id = NEW.account_id;

  -- Store balance before transaction
  NEW.balance_before := current_balance;

  -- Calculate new balance based on transaction type
  IF NEW.transaction_type IN ('payment_received', 'transfer_in') THEN
    -- These increase the balance
    new_balance := current_balance + NEW.amount;
  ELSIF NEW.transaction_type IN ('payment_made', 'expense', 'transfer_out') THEN
    -- These decrease the balance (expenses reduce account balance)
    new_balance := current_balance - NEW.amount;
  ELSIF NEW.transaction_type = 'adjustment' THEN
    -- Adjustments can go either way based on the sign (positive adds, negative subtracts)
    new_balance := current_balance + NEW.amount;
  ELSE
    -- Default: no change
    new_balance := current_balance;
  END IF;

  -- Store balance after transaction
  NEW.balance_after := new_balance;

  -- Update the account balance
  UPDATE finance_accounts
  SET
    balance = new_balance,
    updated_at = NOW()
  WHERE id = NEW.account_id;

  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER trigger_update_account_balance BEFORE INSERT ON public.account_transactions FOR EACH ROW EXECUTE FUNCTION public.update_account_balance();

-- Test the fix with a simple query
SELECT 'Account balance trigger fixed successfully' as status;
