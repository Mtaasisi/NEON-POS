-- ================================================
-- COMPREHENSIVE DATABASE VALIDATION SCRIPT
-- ================================================
-- This script checks for all types of invalid data in your POS database
-- Generated: $(date)
-- ================================================

-- Create a temp table to store validation results
DROP TABLE IF EXISTS validation_results;
CREATE TEMP TABLE validation_results (
    check_id SERIAL,
    severity TEXT,          -- 'CRITICAL', 'WARNING', 'INFO'
    category TEXT,          -- 'FOREIGN_KEYS', 'DATA_INTEGRITY', 'IMEI', etc.
    check_name TEXT,
    issue_count INTEGER,
    details TEXT,
    sample_data TEXT
);

-- ================================================
-- SECTION 1: FOREIGN KEY ORPHANS
-- ================================================

-- Check orphaned products (invalid category_id)
INSERT INTO validation_results (severity, category, check_name, issue_count, details, sample_data)
SELECT 
    'WARNING' as severity,
    'FOREIGN_KEYS' as category,
    'Products with invalid category_id' as check_name,
    COUNT(*) as issue_count,
    'Products referencing non-existent categories' as details,
    STRING_AGG(DISTINCT p.name || ' (ID: ' || p.id::TEXT || ')', ', ' ORDER BY p.name LIMIT 5) as sample_data
FROM lats_products p
LEFT JOIN lats_categories c ON p.category_id = c.id
WHERE p.category_id IS NOT NULL AND c.id IS NULL;

-- Check orphaned products (invalid brand_id)
INSERT INTO validation_results (severity, category, check_name, issue_count, details, sample_data)
SELECT 
    'WARNING' as severity,
    'FOREIGN_KEYS' as category,
    'Products with invalid brand_id' as check_name,
    COUNT(*) as issue_count,
    'Products referencing non-existent brands' as details,
    STRING_AGG(DISTINCT p.name || ' (ID: ' || p.id::TEXT || ')', ', ' ORDER BY p.name LIMIT 5) as sample_data
FROM lats_products p
LEFT JOIN lats_brands b ON p.brand_id = b.id
WHERE p.brand_id IS NOT NULL AND b.id IS NULL;

-- Check orphaned products (invalid supplier_id)
INSERT INTO validation_results (severity, category, check_name, issue_count, details, sample_data)
SELECT 
    'WARNING' as severity,
    'FOREIGN_KEYS' as category,
    'Products with invalid supplier_id' as check_name,
    COUNT(*) as issue_count,
    'Products referencing non-existent suppliers' as details,
    STRING_AGG(DISTINCT p.name || ' (ID: ' || p.id::TEXT || ')', ', ' ORDER BY p.name LIMIT 5) as sample_data
FROM lats_products p
LEFT JOIN lats_suppliers s ON p.supplier_id = s.id
WHERE p.supplier_id IS NOT NULL AND s.id IS NULL;

-- Check orphaned variants (invalid product_id)
INSERT INTO validation_results (severity, category, check_name, issue_count, details, sample_data)
SELECT 
    'CRITICAL' as severity,
    'FOREIGN_KEYS' as category,
    'Variants with invalid product_id' as check_name,
    COUNT(*) as issue_count,
    'Product variants referencing non-existent products' as details,
    STRING_AGG(DISTINCT v.variant_name || ' (ID: ' || v.id::TEXT || ')', ', ' ORDER BY v.variant_name LIMIT 5) as sample_data
FROM lats_product_variants v
LEFT JOIN lats_products p ON v.product_id = p.id
WHERE p.id IS NULL;

-- Check orphaned sale items (invalid sale_id)
INSERT INTO validation_results (severity, category, check_name, issue_count, details, sample_data)
SELECT 
    'CRITICAL' as severity,
    'FOREIGN_KEYS' as category,
    'Sale items with invalid sale_id' as check_name,
    COUNT(*) as issue_count,
    'Sale items referencing non-existent sales' as details,
    STRING_AGG(DISTINCT 'Item ID: ' || si.id::TEXT, ', ' LIMIT 5) as sample_data
FROM lats_sale_items si
LEFT JOIN lats_sales s ON si.sale_id = s.id
WHERE s.id IS NULL;

-- Check orphaned sale items (invalid product_id)
INSERT INTO validation_results (severity, category, check_name, issue_count, details, sample_data)
SELECT 
    'CRITICAL' as severity,
    'FOREIGN_KEYS' as category,
    'Sale items with invalid product_id' as check_name,
    COUNT(*) as issue_count,
    'Sale items referencing non-existent products' as details,
    STRING_AGG(DISTINCT 'Item ID: ' || si.id::TEXT, ', ' LIMIT 5) as sample_data
FROM lats_sale_items si
LEFT JOIN lats_products p ON si.product_id = p.id
WHERE si.product_id IS NOT NULL AND p.id IS NULL;

-- Check orphaned purchase order items
INSERT INTO validation_results (severity, category, check_name, issue_count, details, sample_data)
SELECT 
    'CRITICAL' as severity,
    'FOREIGN_KEYS' as category,
    'PO items with invalid purchase_order_id' as check_name,
    COUNT(*) as issue_count,
    'Purchase order items referencing non-existent POs' as details,
    STRING_AGG(DISTINCT 'Item ID: ' || poi.id::TEXT, ', ' LIMIT 5) as sample_data
FROM lats_purchase_order_items poi
LEFT JOIN lats_purchase_orders po ON poi.purchase_order_id = po.id
WHERE po.id IS NULL;

-- Check orphaned sales (invalid customer_id)
INSERT INTO validation_results (severity, category, check_name, issue_count, details, sample_data)
SELECT 
    'WARNING' as severity,
    'FOREIGN_KEYS' as category,
    'Sales with invalid customer_id' as check_name,
    COUNT(*) as issue_count,
    'Sales referencing non-existent customers' as details,
    STRING_AGG(DISTINCT s.sale_number, ', ' ORDER BY s.sale_number LIMIT 5) as sample_data
FROM lats_sales s
LEFT JOIN lats_customers c ON s.customer_id = c.id
WHERE s.customer_id IS NOT NULL AND c.id IS NULL;

-- Check orphaned devices (invalid customer_id)
INSERT INTO validation_results (severity, category, check_name, issue_count, details, sample_data)
SELECT 
    'WARNING' as severity,
    'FOREIGN_KEYS' as category,
    'Devices with invalid customer_id' as check_name,
    COUNT(*) as issue_count,
    'Devices referencing non-existent customers' as details,
    STRING_AGG(DISTINCT d.device_name || ' (ID: ' || d.id::TEXT || ')', ', ' ORDER BY d.device_name LIMIT 5) as sample_data
FROM devices d
LEFT JOIN customers c ON d.customer_id = c.id
WHERE d.customer_id IS NOT NULL AND c.id IS NULL;

-- ================================================
-- SECTION 2: IMEI VALIDATION
-- ================================================

-- Check invalid IMEIs in variants (not 15-17 digits)
INSERT INTO validation_results (severity, category, check_name, issue_count, details, sample_data)
SELECT 
    'CRITICAL' as severity,
    'IMEI' as category,
    'Invalid IMEI format in variants' as check_name,
    COUNT(*) as issue_count,
    'IMEIs that are not 15-17 numeric digits' as details,
    STRING_AGG(DISTINCT 
        COALESCE(variant_attributes->>'imei', 'NULL') || ' (Variant: ' || variant_name || ')', 
        ', ' 
        ORDER BY COALESCE(variant_attributes->>'imei', 'NULL') 
        LIMIT 5
    ) as sample_data
FROM lats_product_variants
WHERE variant_attributes->>'imei' IS NOT NULL
    AND TRIM(variant_attributes->>'imei') != ''
    AND (
        variant_attributes->>'imei' !~ '^\d{15,17}$'  -- Not 15-17 digits
    );

-- Check duplicate IMEIs in variants
INSERT INTO validation_results (severity, category, check_name, issue_count, details, sample_data)
SELECT 
    'CRITICAL' as severity,
    'IMEI' as category,
    'Duplicate IMEIs in variants' as check_name,
    COUNT(*) as issue_count,
    'Same IMEI appears multiple times' as details,
    STRING_AGG(DISTINCT 
        imei || ' (' || duplicate_count::TEXT || ' times)', 
        ', ' 
        ORDER BY imei 
        LIMIT 5
    ) as sample_data
FROM (
    SELECT 
        variant_attributes->>'imei' as imei,
        COUNT(*) as duplicate_count
    FROM lats_product_variants
    WHERE variant_attributes->>'imei' IS NOT NULL
        AND TRIM(variant_attributes->>'imei') != ''
        AND variant_attributes->>'imei' ~ '^\d{15,17}$'  -- Valid format only
    GROUP BY variant_attributes->>'imei'
    HAVING COUNT(*) > 1
) duplicates;

-- Check invalid IMEIs in devices
INSERT INTO validation_results (severity, category, check_name, issue_count, details, sample_data)
SELECT 
    'WARNING' as severity,
    'IMEI' as category,
    'Invalid IMEI format in devices' as check_name,
    COUNT(*) as issue_count,
    'Device IMEIs that are not 15-17 numeric digits' as details,
    STRING_AGG(DISTINCT 
        COALESCE(imei, 'NULL') || ' (Device: ' || device_name || ')', 
        ', ' 
        ORDER BY COALESCE(imei, 'NULL') 
        LIMIT 5
    ) as sample_data
FROM devices
WHERE imei IS NOT NULL
    AND TRIM(imei) != ''
    AND imei !~ '^\d{15,17}$';

-- Check for inventory items with invalid IMEI
INSERT INTO validation_results (severity, category, check_name, issue_count, details, sample_data)
SELECT 
    'WARNING' as severity,
    'IMEI' as category,
    'Invalid IMEI in inventory_items' as check_name,
    COUNT(*) as issue_count,
    'Inventory items with invalid IMEI format' as details,
    STRING_AGG(DISTINCT 
        COALESCE(imei, 'NULL') || ' (Serial: ' || serial_number || ')', 
        ', ' 
        ORDER BY COALESCE(imei, 'NULL') 
        LIMIT 5
    ) as sample_data
FROM inventory_items
WHERE imei IS NOT NULL
    AND TRIM(imei) != ''
    AND imei !~ '^\d{15,17}$';

-- ================================================
-- SECTION 3: NEGATIVE VALUES
-- ================================================

-- Check negative prices in products
INSERT INTO validation_results (severity, category, check_name, issue_count, details, sample_data)
SELECT 
    'CRITICAL' as severity,
    'DATA_INTEGRITY' as category,
    'Negative prices in products' as check_name,
    COUNT(*) as issue_count,
    'Products with negative cost or selling prices' as details,
    STRING_AGG(DISTINCT 
        name || ' (Cost: ' || cost_price::TEXT || ', Selling: ' || selling_price::TEXT || ')', 
        ', ' 
        ORDER BY name 
        LIMIT 5
    ) as sample_data
FROM lats_products
WHERE cost_price < 0 OR selling_price < 0;

-- Check negative prices in variants
INSERT INTO validation_results (severity, category, check_name, issue_count, details, sample_data)
SELECT 
    'CRITICAL' as severity,
    'DATA_INTEGRITY' as category,
    'Negative prices in variants' as check_name,
    COUNT(*) as issue_count,
    'Variants with negative cost or selling prices' as details,
    STRING_AGG(DISTINCT 
        variant_name || ' (Cost: ' || cost_price::TEXT || ', Selling: ' || selling_price::TEXT || ')', 
        ', ' 
        ORDER BY variant_name 
        LIMIT 5
    ) as sample_data
FROM lats_product_variants
WHERE cost_price < 0 OR selling_price < 0;

-- Check negative quantities in products
INSERT INTO validation_results (severity, category, check_name, issue_count, details, sample_data)
SELECT 
    'CRITICAL' as severity,
    'DATA_INTEGRITY' as category,
    'Negative stock quantities in products' as check_name,
    COUNT(*) as issue_count,
    'Products with negative stock quantities' as details,
    STRING_AGG(DISTINCT 
        name || ' (Stock: ' || stock_quantity::TEXT || ')', 
        ', ' 
        ORDER BY name 
        LIMIT 5
    ) as sample_data
FROM lats_products
WHERE stock_quantity < 0;

-- Check negative quantities in variants
INSERT INTO validation_results (severity, category, check_name, issue_count, details, sample_data)
SELECT 
    'CRITICAL' as severity,
    'DATA_INTEGRITY' as category,
    'Negative stock quantities in variants' as check_name,
    COUNT(*) as issue_count,
    'Variants with negative stock quantities' as details,
    STRING_AGG(DISTINCT 
        variant_name || ' (Stock: ' || stock_quantity::TEXT || ')', 
        ', ' 
        ORDER BY variant_name 
        LIMIT 5
    ) as sample_data
FROM lats_product_variants
WHERE stock_quantity < 0;

-- Check negative amounts in sales
INSERT INTO validation_results (severity, category, check_name, issue_count, details, sample_data)
SELECT 
    'CRITICAL' as severity,
    'DATA_INTEGRITY' as category,
    'Negative amounts in sales' as check_name,
    COUNT(*) as issue_count,
    'Sales with negative total amounts' as details,
    STRING_AGG(DISTINCT 
        sale_number || ' (Total: ' || total_amount::TEXT || ')', 
        ', ' 
        ORDER BY sale_number 
        LIMIT 5
    ) as sample_data
FROM lats_sales
WHERE total_amount < 0;

-- Check negative amounts in payments
INSERT INTO validation_results (severity, category, check_name, issue_count, details, sample_data)
SELECT 
    'CRITICAL' as severity,
    'DATA_INTEGRITY' as category,
    'Negative amounts in payments' as check_name,
    COUNT(*) as issue_count,
    'Payments with negative amounts' as details,
    STRING_AGG(DISTINCT 
        'Payment ID: ' || id::TEXT || ' (Amount: ' || amount::TEXT || ')', 
        ', ' 
        LIMIT 5
    ) as sample_data
FROM customer_payments
WHERE amount < 0;

-- ================================================
-- SECTION 4: NULL VALUES IN REQUIRED FIELDS
-- ================================================

-- Check products with missing names
INSERT INTO validation_results (severity, category, check_name, issue_count, details, sample_data)
SELECT 
    'CRITICAL' as severity,
    'DATA_INTEGRITY' as category,
    'Products with NULL or empty names' as check_name,
    COUNT(*) as issue_count,
    'Products must have a name' as details,
    STRING_AGG(DISTINCT 'Product ID: ' || id::TEXT, ', ' LIMIT 5) as sample_data
FROM lats_products
WHERE name IS NULL OR TRIM(name) = '';

-- Check customers with missing names
INSERT INTO validation_results (severity, category, check_name, issue_count, details, sample_data)
SELECT 
    'CRITICAL' as severity,
    'DATA_INTEGRITY' as category,
    'Customers with NULL or empty names' as check_name,
    COUNT(*) as issue_count,
    'Customers must have a name' as details,
    STRING_AGG(DISTINCT 'Customer ID: ' || id::TEXT, ', ' LIMIT 5) as sample_data
FROM lats_customers
WHERE name IS NULL OR TRIM(name) = '';

-- Check legacy customers with missing names
INSERT INTO validation_results (severity, category, check_name, issue_count, details, sample_data)
SELECT 
    'CRITICAL' as severity,
    'DATA_INTEGRITY' as category,
    'Legacy customers with NULL or empty names' as check_name,
    COUNT(*) as issue_count,
    'Customers must have a name' as details,
    STRING_AGG(DISTINCT 'Customer ID: ' || id::TEXT, ', ' LIMIT 5) as sample_data
FROM customers
WHERE name IS NULL OR TRIM(name) = '';

-- Check sales with missing sale_number
INSERT INTO validation_results (severity, category, check_name, issue_count, details, sample_data)
SELECT 
    'CRITICAL' as severity,
    'DATA_INTEGRITY' as category,
    'Sales with NULL or empty sale_number' as check_name,
    COUNT(*) as issue_count,
    'Sales must have a sale number' as details,
    STRING_AGG(DISTINCT 'Sale ID: ' || id::TEXT, ', ' LIMIT 5) as sample_data
FROM lats_sales
WHERE sale_number IS NULL OR TRIM(sale_number) = '';

-- ================================================
-- SECTION 5: DUPLICATE RECORDS
-- ================================================

-- Check duplicate product SKUs
INSERT INTO validation_results (severity, category, check_name, issue_count, details, sample_data)
SELECT 
    'WARNING' as severity,
    'DUPLICATES' as category,
    'Duplicate product SKUs' as check_name,
    COUNT(*) as issue_count,
    'Multiple products with the same SKU' as details,
    STRING_AGG(DISTINCT 
        sku || ' (' || duplicate_count::TEXT || ' times)', 
        ', ' 
        ORDER BY sku 
        LIMIT 5
    ) as sample_data
FROM (
    SELECT sku, COUNT(*) as duplicate_count
    FROM lats_products
    WHERE sku IS NOT NULL AND TRIM(sku) != ''
    GROUP BY sku
    HAVING COUNT(*) > 1
) duplicates;

-- Check duplicate sale numbers
INSERT INTO validation_results (severity, category, check_name, issue_count, details, sample_data)
SELECT 
    'CRITICAL' as severity,
    'DUPLICATES' as category,
    'Duplicate sale numbers' as check_name,
    COUNT(*) as issue_count,
    'Multiple sales with the same sale number' as details,
    STRING_AGG(DISTINCT 
        sale_number || ' (' || duplicate_count::TEXT || ' times)', 
        ', ' 
        ORDER BY sale_number 
        LIMIT 5
    ) as sample_data
FROM (
    SELECT sale_number, COUNT(*) as duplicate_count
    FROM lats_sales
    WHERE sale_number IS NOT NULL
    GROUP BY sale_number
    HAVING COUNT(*) > 1
) duplicates;

-- Check duplicate PO numbers
INSERT INTO validation_results (severity, category, check_name, issue_count, details, sample_data)
SELECT 
    'CRITICAL' as severity,
    'DUPLICATES' as category,
    'Duplicate purchase order numbers' as check_name,
    COUNT(*) as issue_count,
    'Multiple POs with the same PO number' as details,
    STRING_AGG(DISTINCT 
        po_number || ' (' || duplicate_count::TEXT || ' times)', 
        ', ' 
        ORDER BY po_number 
        LIMIT 5
    ) as sample_data
FROM (
    SELECT po_number, COUNT(*) as duplicate_count
    FROM lats_purchase_orders
    WHERE po_number IS NOT NULL
    GROUP BY po_number
    HAVING COUNT(*) > 1
) duplicates;

-- Check duplicate customer emails
INSERT INTO validation_results (severity, category, check_name, issue_count, details, sample_data)
SELECT 
    'WARNING' as severity,
    'DUPLICATES' as category,
    'Duplicate customer emails' as check_name,
    COUNT(*) as issue_count,
    'Multiple customers with the same email' as details,
    STRING_AGG(DISTINCT 
        email || ' (' || duplicate_count::TEXT || ' times)', 
        ', ' 
        ORDER BY email 
        LIMIT 5
    ) as sample_data
FROM (
    SELECT email, COUNT(*) as duplicate_count
    FROM lats_customers
    WHERE email IS NOT NULL AND TRIM(email) != ''
    GROUP BY email
    HAVING COUNT(*) > 1
) duplicates;

-- ================================================
-- SECTION 6: INVALID STATUS VALUES
-- ================================================

-- Check invalid sale statuses
INSERT INTO validation_results (severity, category, check_name, issue_count, details, sample_data)
SELECT 
    'WARNING' as severity,
    'DATA_INTEGRITY' as category,
    'Invalid sale status values' as check_name,
    COUNT(*) as issue_count,
    'Sales with unexpected status values' as details,
    STRING_AGG(DISTINCT 
        status || ' (Count: ' || status_count::TEXT || ')', 
        ', ' 
        ORDER BY status 
        LIMIT 5
    ) as sample_data
FROM (
    SELECT status, COUNT(*) as status_count
    FROM lats_sales
    WHERE status NOT IN ('completed', 'pending', 'cancelled', 'refunded')
        AND status IS NOT NULL
    GROUP BY status
) invalid_statuses;

-- Check invalid payment statuses
INSERT INTO validation_results (severity, category, check_name, issue_count, details, sample_data)
SELECT 
    'WARNING' as severity,
    'DATA_INTEGRITY' as category,
    'Invalid payment status values' as check_name,
    COUNT(*) as issue_count,
    'Sales with unexpected payment status values' as details,
    STRING_AGG(DISTINCT 
        payment_status || ' (Count: ' || status_count::TEXT || ')', 
        ', ' 
        ORDER BY payment_status 
        LIMIT 5
    ) as sample_data
FROM (
    SELECT payment_status, COUNT(*) as status_count
    FROM lats_sales
    WHERE payment_status NOT IN ('paid', 'unpaid', 'partial', 'pending', 'refunded')
        AND payment_status IS NOT NULL
    GROUP BY payment_status
) invalid_statuses;

-- Check invalid device statuses
INSERT INTO validation_results (severity, category, check_name, issue_count, details, sample_data)
SELECT 
    'WARNING' as severity,
    'DATA_INTEGRITY' as category,
    'Invalid device status values' as check_name,
    COUNT(*) as issue_count,
    'Devices with unexpected status values' as details,
    STRING_AGG(DISTINCT 
        status || ' (Count: ' || status_count::TEXT || ')', 
        ', ' 
        ORDER BY status 
        LIMIT 5
    ) as sample_data
FROM (
    SELECT status, COUNT(*) as status_count
    FROM devices
    WHERE status NOT IN ('pending', 'in_progress', 'completed', 'picked_up', 'cancelled')
        AND status IS NOT NULL
    GROUP BY status
) invalid_statuses;

-- Check invalid PO statuses
INSERT INTO validation_results (severity, category, check_name, issue_count, details, sample_data)
SELECT 
    'WARNING' as severity,
    'DATA_INTEGRITY' as category,
    'Invalid purchase order status values' as check_name,
    COUNT(*) as issue_count,
    'Purchase orders with unexpected status values' as details,
    STRING_AGG(DISTINCT 
        status || ' (Count: ' || status_count::TEXT || ')', 
        ', ' 
        ORDER BY status 
        LIMIT 5
    ) as sample_data
FROM (
    SELECT status, COUNT(*) as status_count
    FROM lats_purchase_orders
    WHERE status NOT IN ('pending', 'approved', 'received', 'cancelled', 'partially_received')
        AND status IS NOT NULL
    GROUP BY status
) invalid_statuses;

-- ================================================
-- SECTION 7: FINANCIAL INCONSISTENCIES
-- ================================================

-- Check sale items where subtotal != quantity * unit_price
INSERT INTO validation_results (severity, category, check_name, issue_count, details, sample_data)
SELECT 
    'WARNING' as severity,
    'FINANCIAL' as category,
    'Sale items with incorrect subtotal' as check_name,
    COUNT(*) as issue_count,
    'Sale items where subtotal does not match quantity * unit_price' as details,
    STRING_AGG(DISTINCT 
        'Item ID: ' || id::TEXT || 
        ' (Expected: ' || (quantity * unit_price)::TEXT || 
        ', Actual: ' || subtotal::TEXT || ')', 
        ', ' 
        LIMIT 5
    ) as sample_data
FROM lats_sale_items
WHERE ABS(subtotal - (quantity * unit_price)) > 0.01;

-- Check sales where total != subtotal + tax - discount
INSERT INTO validation_results (severity, category, check_name, issue_count, details, sample_data)
SELECT 
    'WARNING' as severity,
    'FINANCIAL' as category,
    'Sales with incorrect total calculation' as check_name,
    COUNT(*) as issue_count,
    'Sales where total does not match subtotal + tax - discount' as details,
    STRING_AGG(DISTINCT 
        sale_number || 
        ' (Expected: ' || (subtotal + tax_amount - discount_amount)::TEXT || 
        ', Actual: ' || total_amount::TEXT || ')', 
        ', ' 
        ORDER BY sale_number 
        LIMIT 5
    ) as sample_data
FROM lats_sales
WHERE ABS(total_amount - (subtotal + tax_amount - discount_amount)) > 0.01;

-- Check device balance calculation
INSERT INTO validation_results (severity, category, check_name, issue_count, details, sample_data)
SELECT 
    'WARNING' as severity,
    'FINANCIAL' as category,
    'Devices with incorrect balance' as check_name,
    COUNT(*) as issue_count,
    'Devices where balance does not match cost - deposit' as details,
    STRING_AGG(DISTINCT 
        device_name || 
        ' (Expected: ' || (actual_cost - deposit_amount)::TEXT || 
        ', Actual: ' || balance_amount::TEXT || ')', 
        ', ' 
        ORDER BY device_name 
        LIMIT 5
    ) as sample_data
FROM devices
WHERE ABS(balance_amount - (actual_cost - deposit_amount)) > 0.01
    AND actual_cost > 0;

-- ================================================
-- SECTION 8: INVALID DATES
-- ================================================

-- Check future created_at dates
INSERT INTO validation_results (severity, category, check_name, issue_count, details, sample_data)
SELECT 
    'WARNING' as severity,
    'DATA_INTEGRITY' as category,
    'Products with future creation dates' as check_name,
    COUNT(*) as issue_count,
    'Products created in the future' as details,
    STRING_AGG(DISTINCT 
        name || ' (Created: ' || created_at::TEXT || ')', 
        ', ' 
        ORDER BY name 
        LIMIT 5
    ) as sample_data
FROM lats_products
WHERE created_at > NOW();

-- Check sales with future dates
INSERT INTO validation_results (severity, category, check_name, issue_count, details, sample_data)
SELECT 
    'WARNING' as severity,
    'DATA_INTEGRITY' as category,
    'Sales with future dates' as check_name,
    COUNT(*) as issue_count,
    'Sales created in the future' as details,
    STRING_AGG(DISTINCT 
        sale_number || ' (Created: ' || created_at::TEXT || ')', 
        ', ' 
        ORDER BY sale_number 
        LIMIT 5
    ) as sample_data
FROM lats_sales
WHERE created_at > NOW();

-- Check appointments in the past that are still "scheduled"
INSERT INTO validation_results (severity, category, check_name, issue_count, details, sample_data)
SELECT 
    'INFO' as severity,
    'DATA_INTEGRITY' as category,
    'Past appointments still marked as scheduled' as check_name,
    COUNT(*) as issue_count,
    'Appointments in the past that were not marked as completed/cancelled' as details,
    STRING_AGG(DISTINCT 
        title || ' (Date: ' || appointment_date::TEXT || ')', 
        ', ' 
        ORDER BY appointment_date 
        LIMIT 5
    ) as sample_data
FROM appointments
WHERE appointment_date < NOW()
    AND status = 'scheduled';

-- Check devices with completion date before intake date
INSERT INTO validation_results (severity, category, check_name, issue_count, details, sample_data)
SELECT 
    'WARNING' as severity,
    'DATA_INTEGRITY' as category,
    'Devices completed before intake' as check_name,
    COUNT(*) as issue_count,
    'Devices with completion date before intake date' as details,
    STRING_AGG(DISTINCT 
        device_name || 
        ' (Intake: ' || intake_date::TEXT || 
        ', Completed: ' || actual_completion_date::TEXT || ')', 
        ', ' 
        ORDER BY device_name 
        LIMIT 5
    ) as sample_data
FROM devices
WHERE actual_completion_date IS NOT NULL
    AND actual_completion_date < intake_date;

-- ================================================
-- SECTION 9: STOCK INCONSISTENCIES
-- ================================================

-- Check if parent variant stock doesn't match sum of child variants
INSERT INTO validation_results (severity, category, check_name, issue_count, details, sample_data)
SELECT 
    'WARNING' as severity,
    'STOCK_CONSISTENCY' as category,
    'Parent variant stock mismatch' as check_name,
    COUNT(*) as issue_count,
    'Parent variants where stock does not match sum of children' as details,
    STRING_AGG(DISTINCT 
        parent.variant_name || 
        ' (Parent: ' || COALESCE(parent.stock_quantity, 0)::TEXT || 
        ', Children Sum: ' || COALESCE(children_sum, 0)::TEXT || ')', 
        ', ' 
        ORDER BY parent.variant_name 
        LIMIT 5
    ) as sample_data
FROM lats_product_variants parent
LEFT JOIN (
    SELECT 
        parent_variant_id,
        SUM(stock_quantity) as children_sum
    FROM lats_product_variants
    WHERE parent_variant_id IS NOT NULL
    GROUP BY parent_variant_id
) children ON parent.id = children.parent_variant_id
WHERE parent.is_parent = true
    AND ABS(COALESCE(parent.stock_quantity, 0) - COALESCE(children.children_sum, 0)) > 0;

-- Check PO items where received_quantity > ordered quantity
INSERT INTO validation_results (severity, category, check_name, issue_count, details, sample_data)
SELECT 
    'WARNING' as severity,
    'STOCK_CONSISTENCY' as category,
    'PO items with excess received quantity' as check_name,
    COUNT(*) as issue_count,
    'Purchase order items where received quantity exceeds ordered quantity' as details,
    STRING_AGG(DISTINCT 
        'PO Item ID: ' || id::TEXT || 
        ' (Ordered: ' || quantity::TEXT || 
        ', Received: ' || received_quantity::TEXT || ')', 
        ', ' 
        LIMIT 5
    ) as sample_data
FROM lats_purchase_order_items
WHERE received_quantity > quantity;

-- ================================================
-- SECTION 10: EMAIL & PHONE VALIDATION
-- ================================================

-- Check invalid email formats
INSERT INTO validation_results (severity, category, check_name, issue_count, details, sample_data)
SELECT 
    'WARNING' as severity,
    'DATA_INTEGRITY' as category,
    'Invalid email formats in customers' as check_name,
    COUNT(*) as issue_count,
    'Customer emails that do not match standard email format' as details,
    STRING_AGG(DISTINCT 
        email || ' (Customer: ' || name || ')', 
        ', ' 
        ORDER BY email 
        LIMIT 5
    ) as sample_data
FROM lats_customers
WHERE email IS NOT NULL 
    AND TRIM(email) != ''
    AND email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';

-- Check invalid phone formats (assuming TZ format)
INSERT INTO validation_results (severity, category, check_name, issue_count, details, sample_data)
SELECT 
    'INFO' as severity,
    'DATA_INTEGRITY' as category,
    'Non-standard phone formats in customers' as check_name,
    COUNT(*) as issue_count,
    'Customer phone numbers that may need formatting review' as details,
    STRING_AGG(DISTINCT 
        phone || ' (Customer: ' || name || ')', 
        ', ' 
        ORDER BY phone 
        LIMIT 5
    ) as sample_data
FROM lats_customers
WHERE phone IS NOT NULL 
    AND TRIM(phone) != ''
    AND phone !~ '^\+?[0-9]{9,15}$';

-- ================================================
-- SECTION 11: ORPHANED CHILD VARIANTS
-- ================================================

-- Check child variants with invalid parent_variant_id
INSERT INTO validation_results (severity, category, check_name, issue_count, details, sample_data)
SELECT 
    'CRITICAL' as severity,
    'FOREIGN_KEYS' as category,
    'Child variants with invalid parent_variant_id' as check_name,
    COUNT(*) as issue_count,
    'Child variants referencing non-existent parent variants' as details,
    STRING_AGG(DISTINCT 
        child.variant_name || ' (ID: ' || child.id::TEXT || ')', 
        ', ' 
        ORDER BY child.variant_name 
        LIMIT 5
    ) as sample_data
FROM lats_product_variants child
LEFT JOIN lats_product_variants parent ON child.parent_variant_id = parent.id
WHERE child.parent_variant_id IS NOT NULL 
    AND parent.id IS NULL;

-- ================================================
-- GENERATE FINAL REPORT
-- ================================================

-- Display results
SELECT 
    '================================================================' as divider,
    '🔍 COMPREHENSIVE DATABASE VALIDATION REPORT' as title,
    '================================================================' as divider2
UNION ALL
SELECT 
    'Generated at: ' || NOW()::TEXT,
    '',
    ''
UNION ALL
SELECT 
    '================================================================',
    '',
    '';

-- Summary statistics
WITH summary AS (
    SELECT 
        COUNT(*) as total_checks,
        SUM(CASE WHEN severity = 'CRITICAL' AND issue_count > 0 THEN 1 ELSE 0 END) as critical_issues,
        SUM(CASE WHEN severity = 'WARNING' AND issue_count > 0 THEN 1 ELSE 0 END) as warnings,
        SUM(CASE WHEN severity = 'INFO' AND issue_count > 0 THEN 1 ELSE 0 END) as info_items,
        SUM(CASE WHEN issue_count > 0 THEN issue_count ELSE 0 END) as total_issues
    FROM validation_results
)
SELECT 
    '📊 SUMMARY' as section,
    '──────────' as divider,
    'Total Checks Run: ' || total_checks::TEXT as stat1,
    '🔴 Critical Issues: ' || critical_issues::TEXT as stat2,
    '🟡 Warnings: ' || warnings::TEXT as stat3,
    '🔵 Info Items: ' || info_items::TEXT as stat4,
    'Total Issues Found: ' || total_issues::TEXT as stat5,
    '' as blank
FROM summary;

-- Detailed results
SELECT 
    '================================================================' as header,
    '📋 DETAILED RESULTS' as title,
    '================================================================' as header2
UNION ALL
SELECT '', '', '';

-- Show all checks with issues
SELECT 
    ROW_NUMBER() OVER (ORDER BY 
        CASE severity 
            WHEN 'CRITICAL' THEN 1 
            WHEN 'WARNING' THEN 2 
            WHEN 'INFO' THEN 3 
        END,
        category,
        check_name
    ) as "#",
    CASE severity
        WHEN 'CRITICAL' THEN '🔴 CRITICAL'
        WHEN 'WARNING' THEN '🟡 WARNING'
        WHEN 'INFO' THEN '🔵 INFO'
    END as severity,
    category,
    check_name,
    issue_count::TEXT || ' issue(s)' as count,
    details,
    CASE 
        WHEN sample_data IS NOT NULL AND sample_data != '' 
        THEN 'Examples: ' || sample_data
        ELSE ''
    END as examples
FROM validation_results
WHERE issue_count > 0
ORDER BY 
    CASE severity 
        WHEN 'CRITICAL' THEN 1 
        WHEN 'WARNING' THEN 2 
        WHEN 'INFO' THEN 3 
    END,
    category,
    check_name;

-- Show checks that passed
SELECT 
    '================================================================' as header,
    '✅ PASSED CHECKS' as title,
    '================================================================' as header2
UNION ALL
SELECT '', '', '';

SELECT 
    ROW_NUMBER() OVER (ORDER BY category, check_name) as "#",
    '✅' as status,
    category,
    check_name,
    'No issues found' as result,
    '',
    ''
FROM validation_results
WHERE issue_count = 0
ORDER BY category, check_name;

-- Footer
SELECT 
    '================================================================' as footer,
    '🎯 RECOMMENDATIONS' as title,
    '================================================================' as footer2
UNION ALL
SELECT 
    '',
    '1. Fix CRITICAL issues immediately - they can cause system failures',
    '2. Review and fix WARNING issues - they indicate data quality problems'
UNION ALL
SELECT 
    '3. INFO items are for your awareness and may not need immediate action',
    '4. Use the sample data provided to investigate and fix issues',
    '5. Re-run this validation after making fixes to verify improvements'
UNION ALL
SELECT 
    '',
    '================================================================',
    '';

-- Export detailed validation results for further analysis
SELECT 
    check_id,
    severity,
    category,
    check_name,
    issue_count,
    details,
    sample_data
FROM validation_results
ORDER BY 
    CASE severity 
        WHEN 'CRITICAL' THEN 1 
        WHEN 'WARNING' THEN 2 
        WHEN 'INFO' THEN 3 
    END,
    category,
    check_name;

