-- Check the actual schema of finance_accounts table
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'finance_accounts'
ORDER BY ordinal_position;

