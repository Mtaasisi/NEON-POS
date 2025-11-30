-- Add branch_id column to account_transactions table for branch isolation
-- This ensures transactions are properly isolated by branch

ALTER TABLE public.account_transactions
ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.store_locations(id);

-- Add index for performance on branch filtering
CREATE INDEX IF NOT EXISTS idx_account_transactions_branch_id
ON public.account_transactions(branch_id);

-- Add comment for documentation
COMMENT ON COLUMN public.account_transactions.branch_id IS 'Branch ID for data isolation - references store_locations.id';

-- Update existing transactions to have the same branch_id as their account
UPDATE public.account_transactions
SET branch_id = finance_accounts.branch_id
FROM public.finance_accounts
WHERE account_transactions.account_id = finance_accounts.id
AND account_transactions.branch_id IS NULL;

-- Make branch_id NOT NULL after populating existing data
-- Note: This might fail if there are accounts without branch_id, so we'll keep it nullable for now
-- but add a check constraint to ensure it's set for new transactions

-- Add check constraint to ensure branch_id is set (optional - uncomment if needed)
-- ALTER TABLE public.account_transactions
-- ADD CONSTRAINT account_transactions_branch_id_not_null
-- CHECK (branch_id IS NOT NULL);
