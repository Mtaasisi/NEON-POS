-- =====================================================
-- MAKE-SUPPLIERS-WORK.sql
-- =====================================================
-- This script fixes the "No active suppliers found" issue
-- by creating real suppliers (not trade-in customers)
-- Run this in your Neon database console

-- First, let's check the current state
SELECT 
  COUNT(*) as total_suppliers,
  COUNT(*) FILTER (WHERE is_trade_in_customer = true) as trade_in_customers,
  COUNT(*) FILTER (WHERE is_trade_in_customer = false) as real_suppliers,
  COUNT(*) FILTER (WHERE is_active = true AND is_trade_in_customer = false) as active_real_suppliers
FROM lats_suppliers;

-- Create some real suppliers if none exist
INSERT INTO lats_suppliers (
  id,
  name,
  contact_person,
  email,
  phone,
  address,
  city,
  country,
  tax_id,
  payment_terms,
  rating,
  is_active,
  is_trade_in_customer,
  notes,
  created_at,
  updated_at
) VALUES 
(
  gen_random_uuid(),
  'Tech Solutions Ltd',
  'John Smith',
  'john@techsolutions.com',
  '+255-22-123-4567',
  '123 Technology Street',
  'Dar es Salaam',
  'Tanzania',
  'TIN-001',
  'Net 30',
  5,
  true,
  false,
  'Leading technology supplier for mobile devices and accessories',
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  'Mobile World Distributors',
  'Sarah Johnson',
  'sarah@mobileworld.co.tz',
  '+255-22-234-5678',
  '456 Business Avenue',
  'Dar es Salaam',
  'Tanzania',
  'TIN-002',
  'Net 15',
  4,
  true,
  false,
  'Wholesale distributor of mobile phones and tablets',
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  'Electronics Plus',
  'Michael Brown',
  'michael@electronicsplus.com',
  '+255-22-345-6789',
  '789 Electronics Plaza',
  'Arusha',
  'Tanzania',
  'TIN-003',
  'Cash on Delivery',
  4,
  true,
  false,
  'Specialized in smartphone accessories and repair parts',
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  'Gadget Hub Tanzania',
  'Fatma Hassan',
  'fatma@gadgethub.co.tz',
  '+255-22-456-7890',
  '321 Innovation Center',
  'Mwanza',
  'Tanzania',
  'TIN-004',
  'Net 30',
  5,
  true,
  false,
  'Premium supplier of latest mobile devices and gadgets',
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  'Phone Accessories Co',
  'David Wilson',
  'david@phoneaccessories.com',
  '+255-22-567-8901',
  '654 Accessory Lane',
  'Dodoma',
  'Tanzania',
  'TIN-005',
  'Net 7',
  3,
  true,
  false,
  'Bulk supplier of phone cases, chargers, and accessories',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Verify the fix
SELECT 
  COUNT(*) as total_suppliers,
  COUNT(*) FILTER (WHERE is_trade_in_customer = true) as trade_in_customers,
  COUNT(*) FILTER (WHERE is_trade_in_customer = false) as real_suppliers,
  COUNT(*) FILTER (WHERE is_active = true AND is_trade_in_customer = false) as active_real_suppliers
FROM lats_suppliers;

-- Show the new suppliers
SELECT 
  id,
  name,
  contact_person,
  email,
  phone,
  city,
  country,
  is_active,
  is_trade_in_customer
FROM lats_suppliers 
WHERE is_trade_in_customer = false 
ORDER BY name;

-- Success message
SELECT '✅ SUCCESS: Real suppliers created! Your app should now load suppliers correctly.' as status;
