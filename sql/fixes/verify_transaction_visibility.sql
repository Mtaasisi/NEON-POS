-- Verify that our transaction is now visible with branch filtering
SELECT id, transaction_type, amount, description, created_at, branch_id
FROM account_transactions
WHERE account_id = 'd03127cf-dee6-4d14-855e-448996872963'
AND branch_id = '115e0e51-d0d6-437b-9fda-dfe11241b167'
ORDER BY created_at DESC
LIMIT 10;

-- Check the total count of transactions for this account with branch filtering
SELECT COUNT(*) as total_transactions
FROM account_transactions
WHERE account_id = 'd03127cf-dee6-4d14-855e-448996872963'
AND branch_id = '115e0e51-d0d6-437b-9fda-dfe11241b167';

-- Double-check our specific transaction
SELECT * FROM account_transactions
WHERE id = '19aa10aa-83c8-4a23-bf2f-a01a5851a833';
