-- Check what branch filtering does
SELECT * FROM account_transactions
WHERE account_id = 'd03127cf-dee6-4d14-855e-448996872963'
ORDER BY created_at DESC
LIMIT 5;

-- Check if our transaction has branch_id
SELECT id, account_id, created_at, branch_id, metadata
FROM account_transactions
WHERE related_entity_id = '01d72a09-906d-4ffe-b1f5-0611d62d52cb';

-- Check what branch the account belongs to
SELECT fa.id, fa.name, fa.branch_id, b.name as branch_name
FROM finance_accounts fa
LEFT JOIN branches b ON fa.branch_id = b.id
WHERE fa.id = 'd03127cf-dee6-4d14-855e-448996872963';

-- Check what the current user's branch is (if any)
SELECT u.id, u.email, u.branch_id, b.name as branch_name
FROM users u
LEFT JOIN branches b ON u.branch_id = b.id
WHERE u.id = '6ceeb7d6-53fe-40e6-b1c8-a9bfe9978a60';
