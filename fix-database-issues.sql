-- ================================================
-- FIX DATABASE ISSUES IDENTIFIED BY VALIDATION
-- ================================================
-- Generated: October 26, 2025
-- Database Health Score: 86% → Target: 100%
-- ================================================

-- ================================================
-- ISSUE #1: INVALID IMEI FORMAT (CRITICAL)
-- ================================================
-- Problem: 10 variants have 15-digit IMEIs but failing validation
-- Likely issue: IMEIs might have non-numeric characters or be test data

-- First, let's see what these IMEIs look like
SELECT 
    id,
    variant_name,
    variant_attributes->>'imei' as imei,
    LENGTH(variant_attributes->>'imei') as imei_length,
    variant_attributes->>'imei' ~ '^\d{15}$' as is_valid_format
FROM lats_product_variants
WHERE variant_attributes->>'imei' IS NOT NULL
    AND TRIM(variant_attributes->>'imei') != ''
    AND variant_attributes->>'imei' !~ '^\d{15,17}$'
ORDER BY variant_name;

-- SOLUTION OPTIONS:

-- Option 1: If these are test/invalid IMEIs, mark variants as inactive
-- (Recommended for test data)
/*
UPDATE lats_product_variants
SET is_active = false
WHERE variant_attributes->>'imei' IS NOT NULL
    AND TRIM(variant_attributes->>'imei') != ''
    AND variant_attributes->>'imei' !~ '^\d{15,17}$';
*/

-- Option 2: Remove invalid IMEIs but keep variants active
-- (Use if the product is valid but IMEI is wrong)
/*
UPDATE lats_product_variants
SET variant_attributes = variant_attributes - 'imei'
WHERE variant_attributes->>'imei' IS NOT NULL
    AND TRIM(variant_attributes->>'imei') != ''
    AND variant_attributes->>'imei' !~ '^\d{15,17}$';
*/

-- Option 3: Correct specific IMEIs manually
-- (Use when you know the correct IMEI)
/*
-- Example: Fix a specific IMEI
UPDATE lats_product_variants
SET variant_attributes = jsonb_set(
    variant_attributes,
    '{imei}',
    '"123456789012345"'::jsonb  -- Replace with correct 15-digit IMEI
)
WHERE id = 'VARIANT_ID_HERE';
*/

-- ================================================
-- ISSUE #2: SALE ITEMS WITH INCORRECT SUBTOTAL (WARNING)
-- ================================================
-- Problem: 3 sale items where subtotal doesn't match quantity × unit_price

-- View the problematic records
SELECT 
    id,
    sale_id,
    quantity,
    unit_price,
    subtotal,
    (quantity * unit_price) as expected_subtotal,
    (quantity * unit_price) - subtotal as difference
FROM lats_sale_items
WHERE ABS(subtotal - (quantity * unit_price)) > 0.01
ORDER BY created_at DESC;

-- SOLUTION: Fix the subtotals

-- Automatic fix: Update subtotals to match calculation
UPDATE lats_sale_items
SET subtotal = quantity * unit_price
WHERE ABS(subtotal - (quantity * unit_price)) > 0.01;

-- Verify the fix
SELECT 
    'After Fix' as status,
    COUNT(*) as remaining_issues
FROM lats_sale_items
WHERE ABS(subtotal - (quantity * unit_price)) > 0.01;

-- ================================================
-- ISSUE #3: ORPHANED SALES (WARNING)
-- ================================================
-- Problem: 2 sales referencing customers that don't exist

-- View the problematic records
SELECT 
    s.id,
    s.sale_number,
    s.customer_id,
    s.total_amount,
    s.created_at
FROM lats_sales s
LEFT JOIN lats_customers c ON s.customer_id = c.id
WHERE s.customer_id IS NOT NULL 
    AND c.id IS NULL
ORDER BY s.created_at DESC;

-- SOLUTION OPTIONS:

-- Option 1: Set customer_id to NULL (walk-in customer)
-- (Recommended - preserves the sale)
UPDATE lats_sales s
SET customer_id = NULL
FROM lats_sales s2
LEFT JOIN lats_customers c ON s2.customer_id = c.id
WHERE s.id = s2.id
    AND s2.customer_id IS NOT NULL 
    AND c.id IS NULL;

-- Option 2: Create placeholder customers for orphaned sales
-- (Use if you need to maintain customer references)
/*
-- First, create a "Unknown Customer" placeholder
INSERT INTO lats_customers (id, name, phone, email)
VALUES 
    (gen_random_uuid(), 'Unknown Customer', '0000000000', 'unknown@placeholder.com')
ON CONFLICT DO NOTHING;

-- Then update orphaned sales to point to placeholder
WITH placeholder_customer AS (
    SELECT id FROM lats_customers WHERE name = 'Unknown Customer' LIMIT 1
)
UPDATE lats_sales s
SET customer_id = (SELECT id FROM placeholder_customer)
FROM lats_sales s2
LEFT JOIN lats_customers c ON s2.customer_id = c.id
WHERE s.id = s2.id
    AND s2.customer_id IS NOT NULL 
    AND c.id IS NULL;
*/

-- Option 3: Delete orphaned sales (USE WITH EXTREME CAUTION!)
-- Only use if these are test sales that should be removed
/*
DELETE FROM lats_sales s
USING lats_sales s2
LEFT JOIN lats_customers c ON s2.customer_id = c.id
WHERE s.id = s2.id
    AND s2.customer_id IS NOT NULL 
    AND c.id IS NULL;
*/

-- ================================================
-- VERIFICATION QUERIES
-- ================================================

-- Verify Fix #1: Check remaining invalid IMEIs
SELECT 
    'Invalid IMEIs' as issue,
    COUNT(*) as remaining_count
FROM lats_product_variants
WHERE variant_attributes->>'imei' IS NOT NULL
    AND TRIM(variant_attributes->>'imei') != ''
    AND variant_attributes->>'imei' !~ '^\d{15,17}$';

-- Verify Fix #2: Check remaining incorrect subtotals
SELECT 
    'Incorrect Subtotals' as issue,
    COUNT(*) as remaining_count
FROM lats_sale_items
WHERE ABS(subtotal - (quantity * unit_price)) > 0.01;

-- Verify Fix #3: Check remaining orphaned sales
SELECT 
    'Orphaned Sales' as issue,
    COUNT(*) as remaining_count
FROM lats_sales s
LEFT JOIN lats_customers c ON s.customer_id = c.id
WHERE s.customer_id IS NOT NULL AND c.id IS NULL;

-- ================================================
-- SUMMARY
-- ================================================

-- Run all verification queries at once
SELECT 
    'CRITICAL: Invalid IMEIs' as check_name,
    (SELECT COUNT(*) 
     FROM lats_product_variants
     WHERE variant_attributes->>'imei' IS NOT NULL
         AND TRIM(variant_attributes->>'imei') != ''
         AND variant_attributes->>'imei' !~ '^\d{15,17}$'
    ) as issue_count,
    'Expected: 0' as target

UNION ALL

SELECT 
    'WARNING: Incorrect Subtotals' as check_name,
    (SELECT COUNT(*) 
     FROM lats_sale_items
     WHERE ABS(subtotal - (quantity * unit_price)) > 0.01
    ) as issue_count,
    'Expected: 0' as target

UNION ALL

SELECT 
    'WARNING: Orphaned Sales' as check_name,
    (SELECT COUNT(*) 
     FROM lats_sales s
     LEFT JOIN lats_customers c ON s.customer_id = c.id
     WHERE s.customer_id IS NOT NULL AND c.id IS NULL
    ) as issue_count,
    'Expected: 0' as target;

-- ================================================
-- INSTRUCTIONS
-- ================================================

/*
HOW TO USE THIS SCRIPT:

1. REVIEW FIRST:
   - Run the SELECT queries to see the problematic data
   - Understand what will be changed

2. CHOOSE YOUR APPROACH:
   - Uncomment the appropriate UPDATE/DELETE statements
   - Only uncomment one solution per issue

3. RECOMMENDED FIXES:
   - Issue #1 (Invalid IMEIs): Option 1 or 2
   - Issue #2 (Subtotals): Automatic fix (already uncommented)
   - Issue #3 (Orphaned Sales): Option 1

4. APPLY FIXES:
   - Run the uncommented UPDATE statements
   - Run the verification queries

5. RE-VALIDATE:
   - Run: npm run db:validate
   - Verify health score improved to 100%

SAFETY NOTES:
- Always backup your database before running fixes
- Test on a development database first
- Review each change before applying to production
- Keep a log of what you changed

*/

-- ================================================
-- END OF FIX SCRIPT
-- ================================================

