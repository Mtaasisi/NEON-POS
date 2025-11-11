-- Check the current status of suppliers in the database
SELECT 
  name,
  company_name,
  is_active,
  is_trade_in_customer,
  city,
  country,
  created_at
FROM lats_suppliers
ORDER BY name
LIMIT 10;
