-- ============================================================
-- DIAGNOSTIC: Check payment_method column status
-- ============================================================

-- Check if table exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_name = 'lats_sales'
    ) 
    THEN 'Table lats_sales EXISTS ✅'
    ELSE 'Table lats_sales DOES NOT EXIST ❌'
  END as table_status;

-- Check payment_method column type
SELECT 
  column_name,
  data_type,
  udt_name,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'lats_sales' 
AND column_name = 'payment_method';

-- Check sample data in payment_method column
SELECT 
  id,
  sale_number,
  payment_method,
  pg_typeof(payment_method) as current_type
FROM lats_sales 
LIMIT 3;

-- Count records with payment_method data
SELECT 
  COUNT(*) as total_sales,
  COUNT(payment_method) as sales_with_payment_method,
  COUNT(*) - COUNT(payment_method) as sales_without_payment_method
FROM lats_sales;

