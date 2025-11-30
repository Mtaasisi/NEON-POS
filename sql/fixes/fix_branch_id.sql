-- Check what branch_id the finance account has
SELECT id, name, branch_id FROM finance_accounts WHERE id = 'd03127cf-dee6-4d14-855e-448996872963';

-- Check what branch_id other transactions for this account have
SELECT DISTINCT branch_id FROM account_transactions
WHERE account_id = 'd03127cf-dee6-4d14-855e-448996872963' AND branch_id IS NOT NULL;

-- Update our transaction with the correct branch_id
UPDATE account_transactions
SET branch_id = (
    SELECT branch_id FROM finance_accounts WHERE id = 'd03127cf-dee6-4d14-855e-448996872963'
)
WHERE id = '19aa10aa-83c8-4a23-bf2f-a01a5851a833';

-- Verify the update
SELECT id, account_id, branch_id, created_at FROM account_transactions
WHERE id = '19aa10aa-83c8-4a23-bf2f-a01a5851a833';
