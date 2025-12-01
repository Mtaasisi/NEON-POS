-- Sample Data Insertion Script for NEON POS
-- Run this script in your Supabase SQL Editor or psql to add sample data

-- ============================================
-- 1. ADD SAMPLE PRODUCTS
-- ============================================
INSERT INTO lats_products (id, name, description, sku, barcode, selling_price, cost_price, stock_quantity, category_id, is_active, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'Sample Product 1', 'Description for product 1', 'SKU-001', 'BAR-001', 10000.00, 7000.00, 50, NULL, true, NOW(), NOW()),
  (gen_random_uuid(), 'Sample Product 2', 'Description for product 2', 'SKU-002', 'BAR-002', 15000.00, 10000.00, 30, NULL, true, NOW(), NOW()),
  (gen_random_uuid(), 'Sample Product 3', 'Description for product 3', 'SKU-003', 'BAR-003', 20000.00, 15000.00, 25, NULL, true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 2. ADD SAMPLE CUSTOMERS
-- ============================================
INSERT INTO customers (id, name, phone, email, city, is_active, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'John Doe', '+255123456789', 'john@example.com', 'Dar es Salaam', true, NOW(), NOW()),
  (gen_random_uuid(), 'Jane Smith', '+255987654321', 'jane@example.com', 'Arusha', true, NOW(), NOW()),
  (gen_random_uuid(), 'Mike Johnson', '+255555123456', 'mike@example.com', 'Mwanza', true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 3. ADD SAMPLE DEVICES
-- ============================================
INSERT INTO devices (id, model, serial_number, status, problem_description, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'iPhone 13', 'SN-IP13-001', 'in_repair', 'Screen replacement needed', NOW(), NOW()),
  (gen_random_uuid(), 'Samsung Galaxy S21', 'SN-SGS21-001', 'waiting', 'Battery replacement', NOW(), NOW()),
  (gen_random_uuid(), 'iPad Pro', 'SN-IPAD-001', 'completed', 'Screen repair completed', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 4. ADD SAMPLE SALES (if you have a branch_id)
-- ============================================
-- Note: Replace 'YOUR_BRANCH_ID_HERE' with an actual branch_id from your database
-- You can get branch IDs with: SELECT id FROM branches LIMIT 1;

-- Uncomment and modify the following if you have branches:
/*
INSERT INTO lats_sales (id, sale_number, customer_name, customer_phone, total_amount, branch_id, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  'SALE-' || to_char(NOW(), 'YYYYMMDD') || '-' || LPAD(ROW_NUMBER() OVER ()::text, 4, '0'),
  c.name,
  c.phone,
  50000.00,
  (SELECT id FROM branches LIMIT 1),
  NOW(),
  NOW()
FROM customers c
LIMIT 5
ON CONFLICT (id) DO NOTHING;
*/

-- ============================================
-- 5. ADD SAMPLE PRODUCT VARIANTS
-- ============================================
-- First, get a product ID to attach variants to
-- Replace 'PRODUCT_ID_HERE' with an actual product ID from your database
-- You can get product IDs with: SELECT id FROM lats_products LIMIT 1;

-- Uncomment and modify the following:
/*
INSERT INTO lats_product_variants (id, product_id, name, variant_name, sku, selling_price, cost_price, quantity, is_parent, is_active, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  p.id,
  'Variant ' || generate_series(1, 3),
  'Variant Name ' || generate_series(1, 3),
  'VAR-' || p.sku || '-' || generate_series(1, 3),
  10000.00 + (generate_series(1, 3) * 1000),
  7000.00 + (generate_series(1, 3) * 700),
  10 + generate_series(1, 3),
  false,
  true,
  NOW(),
  NOW()
FROM lats_products p
LIMIT 3
ON CONFLICT (id) DO NOTHING;
*/

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify data was added:

-- Count products
SELECT COUNT(*) as total_products FROM lats_products WHERE is_active = true;

-- Count customers
SELECT COUNT(*) as total_customers FROM customers WHERE is_active = true;

-- Count devices
SELECT COUNT(*) as total_devices FROM devices;

-- Count sales
SELECT COUNT(*) as total_sales FROM lats_sales;

-- Count variants
SELECT COUNT(*) as total_variants FROM lats_product_variants WHERE is_active = true;

-- ============================================
-- BULK DATA INSERTION (Optional - for testing)
-- ============================================
-- Uncomment to add 100 sample products:

/*
INSERT INTO lats_products (id, name, description, sku, barcode, selling_price, cost_price, stock_quantity, is_active, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  'Product ' || generate_series(1, 100),
  'Description for product ' || generate_series(1, 100),
  'SKU-' || LPAD(generate_series(1, 100)::text, 6, '0'),
  'BAR-' || LPAD(generate_series(1, 100)::text, 6, '0'),
  10000.00 + (random() * 50000),
  7000.00 + (random() * 35000),
  floor(random() * 100)::int,
  true,
  NOW() - (random() * interval '365 days'),
  NOW()
ON CONFLICT (id) DO NOTHING;
*/

