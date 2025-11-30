-- Check actual account balances in database
SELECT 
  id,
  name,
  account_type,
  currency,
  balance,
  is_active,
  updated_at
FROM finance_accounts
WHERE is_active = true
ORDER BY name;

-- Also check recent transactions
SELECT 
  fa.name as account_name,
  at.transaction_type,
  at.amount,
  at.balance_before,
  at.balance_after,
  at.description,
  at.created_at
FROM account_transactions at
JOIN finance_accounts fa ON at.account_id = fa.id
WHERE fa.is_active = true
ORDER BY at.created_at DESC
LIMIT 20;
