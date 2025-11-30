-- Test Script for User Permissions System
-- This script helps you test that permissions are working correctly

-- ============================================
-- 1. View Current User Permissions
-- ============================================

-- Check all users and their permissions
SELECT 
    id,
    email,
    full_name,
    role,
    permissions,
    is_active
FROM users
ORDER BY email;

-- ============================================
-- 2. Example: Grant POS Access to a Technician
-- ============================================

-- Find a technician user (replace with actual email)
-- SELECT * FROM users WHERE role = 'technician' LIMIT 1;

-- Grant POS access to a specific technician
-- UNCOMMENT AND UPDATE EMAIL TO TEST:
/*
UPDATE users 
SET permissions = ARRAY[
    'view_devices',
    'update_device_status',
    'view_customers',
    'view_inventory',
    'view_spare_parts',
    'access_pos',           -- NEW: Grant POS access
    'process_sales'         -- NEW: Grant sales processing
]
WHERE email = 'technician@example.com';
*/

-- ============================================
-- 3. Example: Grant Custom Permissions to Customer Care
-- ============================================

-- Grant additional permissions to customer care user
-- UNCOMMENT AND UPDATE EMAIL TO TEST:
/*
UPDATE users 
SET permissions = ARRAY[
    'view_devices',
    'add_device',
    'edit_device',
    'assign_devices',
    'view_customers',
    'create_customers',
    'edit_customers',
    'access_pos',
    'process_sales',
    'apply_discounts',
    'view_reports',
    'view_inventory',       -- NEW: Grant inventory viewing
    'add_products',         -- NEW: Grant product addition
    'edit_products'         -- NEW: Grant product editing
]
WHERE email = 'customercare@example.com';
*/

-- ============================================
-- 4. Example: Create a Reports-Only User
-- ============================================

-- Grant only report viewing permissions
-- UNCOMMENT AND UPDATE EMAIL TO TEST:
/*
UPDATE users 
SET permissions = ARRAY[
    'view_reports',
    'view_financial_reports',
    'daily_close'
]
WHERE email = 'auditor@example.com';
*/

-- ============================================
-- 5. Example: Grant All Permissions to a User
-- ============================================

-- Make a user admin-level (without changing their role)
-- UNCOMMENT AND UPDATE EMAIL TO TEST:
/*
UPDATE users 
SET permissions = ARRAY['all']
WHERE email = 'manager@example.com';
*/

-- ============================================
-- 6. Reset User to Role-Based Permissions
-- ============================================

-- Remove custom permissions (will use role defaults)
-- UNCOMMENT AND UPDATE EMAIL TO TEST:
/*
UPDATE users 
SET permissions = ARRAY[]::text[]
WHERE email = 'user@example.com';
*/

-- ============================================
-- 7. Verify Permission Changes
-- ============================================

-- Check a specific user's permissions
-- REPLACE EMAIL TO TEST:
/*
SELECT 
    email,
    role,
    permissions,
    is_active,
    created_at,
    updated_at
FROM users 
WHERE email = 'your-test-user@example.com';
*/

-- ============================================
-- 8. Common Permission Sets
-- ============================================

-- Cashier Permissions
/*
UPDATE users 
SET permissions = ARRAY[
    'access_pos',
    'process_sales',
    'apply_discounts',
    'view_customers',
    'create_customers',
    'view_inventory'
]
WHERE email = 'cashier@example.com';
*/

-- Inventory Manager Permissions
/*
UPDATE users 
SET permissions = ARRAY[
    'view_inventory',
    'add_products',
    'edit_products',
    'adjust_stock',
    'view_stock_history',
    'view_purchase_orders',
    'create_purchase_orders',
    'edit_purchase_orders',
    'view_suppliers'
]
WHERE email = 'inventory-manager@example.com';
*/

-- Sales Manager Permissions
/*
UPDATE users 
SET permissions = ARRAY[
    'access_pos',
    'process_sales',
    'process_refunds',
    'apply_discounts',
    'view_customers',
    'create_customers',
    'edit_customers',
    'view_reports',
    'view_financial_reports',
    'daily_close'
]
WHERE email = 'sales-manager@example.com';
*/

-- ============================================
-- 9. Troubleshooting Queries
-- ============================================

-- Find users with specific permission
-- REPLACE 'permission_name' WITH ACTUAL PERMISSION:
/*
SELECT email, role, permissions 
FROM users 
WHERE 'access_pos' = ANY(permissions);
*/

-- Find users without any custom permissions (using role defaults)
SELECT email, role, permissions 
FROM users 
WHERE permissions IS NULL OR array_length(permissions, 1) IS NULL OR permissions = ARRAY[]::text[];

-- Find users with 'all' permission (super admins)
SELECT email, role, permissions 
FROM users 
WHERE 'all' = ANY(permissions);

-- Count users by their permission sets
SELECT 
    CASE 
        WHEN 'all' = ANY(permissions) THEN 'Admin (all permissions)'
        WHEN array_length(permissions, 1) > 0 THEN 'Custom permissions'
        ELSE 'Role-based (default)'
    END as permission_type,
    role,
    COUNT(*) as user_count
FROM users
GROUP BY 
    CASE 
        WHEN 'all' = ANY(permissions) THEN 'Admin (all permissions)'
        WHEN array_length(permissions, 1) > 0 THEN 'Custom permissions'
        ELSE 'Role-based (default)'
    END,
    role
ORDER BY permission_type, role;

-- ============================================
-- 10. Available Permissions Reference
-- ============================================

/*
DEVICE PERMISSIONS:
- view_devices
- add_device
- edit_device
- delete_device
- update_device_status
- assign_devices

CUSTOMER PERMISSIONS:
- view_customers
- create_customers
- edit_customers
- delete_customers

INVENTORY PERMISSIONS:
- view_inventory
- add_products
- edit_products
- delete_products
- adjust_stock
- view_stock_history

POS & SALES PERMISSIONS:
- access_pos
- process_sales
- process_refunds
- apply_discounts

REPORTS PERMISSIONS:
- view_reports
- view_financial_reports
- daily_close

SETTINGS PERMISSIONS:
- view_settings
- edit_settings
- manage_users

PURCHASE ORDER PERMISSIONS:
- view_purchase_orders
- create_purchase_orders
- edit_purchase_orders
- delete_purchase_orders
- approve_purchase_orders

SPARE PARTS PERMISSIONS:
- view_spare_parts
- create_spare_parts
- edit_spare_parts
- delete_spare_parts

SPECIAL PERMISSIONS:
- all (grants all permissions, admin level)
*/

-- ============================================
-- Testing Instructions:
-- ============================================
/*
1. Run query #1 to see all users and their current permissions
2. Choose a test user
3. Uncomment and modify one of the UPDATE queries (2-8)
4. Run the UPDATE query to set permissions
5. Run query #7 to verify the changes
6. Log in as that user in the application
7. Verify they can access features based on their permissions
8. Check the browser console to see loaded permissions
9. Try accessing features they should and shouldn't have access to

IMPORTANT: After testing, you may want to restore original permissions
or remove test permissions by running query #6 (reset to role-based)
*/

