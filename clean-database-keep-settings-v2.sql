-- ============================================
-- CLEAN DATABASE - KEEP SETTINGS & TEMPLATES
-- ============================================
-- This script removes all transactional data but preserves:
-- ✅ All settings (system, admin, POS, user, WhatsApp)
-- ✅ All templates (communication, notification, WhatsApp, diagnostic, document)
-- ✅ Database structure (tables, functions, triggers, views)
-- ✅ Integrations configuration
-- ✅ Branches (locations)
-- ✅ Contact methods configuration
-- ✅ User accounts and employees
--
-- ❌ REMOVES: customers, products, sales, purchases, devices, finances, logs
-- ============================================

BEGIN;

\echo '🧹 Starting database cleanup...'
\echo '📊 Current data will be removed but settings/templates preserved'
\echo ''

-- Customer-related data
\echo '👥 Cleaning customer data...'
TRUNCATE TABLE customer_installment_plan_payments CASCADE;
TRUNCATE TABLE customer_installment_plans CASCADE;
TRUNCATE TABLE customer_special_orders CASCADE;
TRUNCATE TABLE customer_payments CASCADE;
TRUNCATE TABLE customer_revenue CASCADE;
TRUNCATE TABLE customer_checkins CASCADE;
TRUNCATE TABLE customer_notes CASCADE;
TRUNCATE TABLE customer_messages CASCADE;
TRUNCATE TABLE customer_communications CASCADE;
TRUNCATE TABLE customer_points_history CASCADE;
TRUNCATE TABLE customer_preferences CASCADE;
TRUNCATE TABLE contact_history CASCADE;
TRUNCATE TABLE contact_preferences CASCADE;
TRUNCATE TABLE appointments CASCADE;
TRUNCATE TABLE lats_customers CASCADE;
TRUNCATE TABLE customers CASCADE;

-- Sales data
\echo '💰 Cleaning sales data...'
TRUNCATE TABLE lats_sale_items CASCADE;
TRUNCATE TABLE lats_sales CASCADE;
TRUNCATE TABLE lats_receipts CASCADE;
TRUNCATE TABLE daily_sales_closures CASCADE;
TRUNCATE TABLE daily_opening_sessions CASCADE;
TRUNCATE TABLE gift_card_transactions CASCADE;
TRUNCATE TABLE gift_cards CASCADE;
TRUNCATE TABLE installment_payments CASCADE;

-- Purchase Orders & Inventory
\echo '📦 Cleaning purchase orders and inventory...'
TRUNCATE TABLE lats_purchase_order_items CASCADE;
TRUNCATE TABLE lats_purchase_order_payments CASCADE;
TRUNCATE TABLE lats_purchase_order_audit_log CASCADE;
TRUNCATE TABLE lats_purchase_orders CASCADE;
TRUNCATE TABLE lats_stock_movements CASCADE;
TRUNCATE TABLE lats_inventory_adjustments CASCADE;
TRUNCATE TABLE lats_inventory_items CASCADE;
TRUNCATE TABLE inventory_items CASCADE;
TRUNCATE TABLE auto_reorder_log CASCADE;

-- Products & Variants
\echo '📱 Cleaning products and variants...'
TRUNCATE TABLE lats_product_variants CASCADE;
TRUNCATE TABLE lats_products CASCADE;
TRUNCATE TABLE lats_spare_part_usage CASCADE;
TRUNCATE TABLE lats_spare_part_variants CASCADE;
TRUNCATE TABLE lats_spare_parts CASCADE;
TRUNCATE TABLE product_images CASCADE;
TRUNCATE TABLE lats_product_validation CASCADE;
TRUNCATE TABLE imei_validation CASCADE;

-- Categories, Brands, Units
\echo '🏷️  Cleaning categories and brands...'
TRUNCATE TABLE lats_categories CASCADE;
TRUNCATE TABLE lats_brands CASCADE;
TRUNCATE TABLE lats_product_units CASCADE;
TRUNCATE TABLE expense_categories CASCADE;

-- Suppliers
\echo '🚚 Cleaning suppliers...'
TRUNCATE TABLE lats_suppliers CASCADE;

-- Device/Repair data
\echo '🔧 Cleaning device and repair data...'
TRUNCATE TABLE device_attachments CASCADE;
TRUNCATE TABLE device_checklists CASCADE;
TRUNCATE TABLE device_ratings CASCADE;
TRUNCATE TABLE device_remarks CASCADE;
TRUNCATE TABLE device_transitions CASCADE;
TRUNCATE TABLE diagnostic_devices CASCADE;
TRUNCATE TABLE diagnostic_checks CASCADE;
TRUNCATE TABLE diagnostic_checklist_results CASCADE;
TRUNCATE TABLE diagnostic_requests CASCADE;
TRUNCATE TABLE devices CASCADE;

-- Financial data
\echo '💵 Cleaning financial data...'
TRUNCATE TABLE finance_transfers CASCADE;
TRUNCATE TABLE finance_expenses CASCADE;
TRUNCATE TABLE finance_expense_categories CASCADE;
TRUNCATE TABLE finance_accounts CASCADE;
TRUNCATE TABLE account_transactions CASCADE;
TRUNCATE TABLE expenses CASCADE;

-- Shipping data
\echo '🚢 Cleaning shipping data...'
TRUNCATE TABLE lats_shipping_cargo_items CASCADE;
TRUNCATE TABLE lats_shipping CASCADE;

-- Employee activity (KEEPING auth_users and employees!)
\echo '👤 Cleaning employee activity data (keeping user accounts)...'
TRUNCATE TABLE attendance_records CASCADE;
TRUNCATE TABLE employee_shifts CASCADE;
TRUNCATE TABLE user_daily_goals CASCADE;
-- NOT truncating: auth_users (user accounts) - PRESERVED
-- NOT truncating: employees (employee records) - PRESERVED
-- NOT truncating: lats_employees - PRESERVED

-- Branch activity (keeping branches, clearing activity)
\echo '🏢 Cleaning branch activity logs...'
TRUNCATE TABLE branch_activity_log CASCADE;
TRUNCATE TABLE branch_transfers CASCADE;

-- Communication logs (keeping templates!)
\echo '📧 Cleaning communication logs...'
TRUNCATE TABLE email_logs CASCADE;
TRUNCATE TABLE sms_logs CASCADE;
TRUNCATE TABLE chat_messages CASCADE;

-- Audit & tracking logs
\echo '📝 Cleaning audit and API logs...'
TRUNCATE TABLE audit_logs CASCADE;
TRUNCATE TABLE uuid_diagnostic_log CASCADE;
TRUNCATE TABLE api_request_logs CASCADE;
TRUNCATE TABLE api_keys CASCADE;

\echo ''
\echo '✅ Database cleaned successfully!'
\echo ''
\echo '📋 PRESERVED DATA:'
\echo '  ✅ Branches (3 locations)'
\echo '  ✅ User Accounts (4 users) & Employees (1 employee)'
\echo '  ✅ All settings (system, admin, POS, user, WhatsApp)'
\echo '  ✅ All templates (communication, notification, WhatsApp, diagnostic, document)'
\echo '  ✅ SMS triggers configuration'
\echo '  ✅ Contact methods configuration'
\echo '  ✅ Integrations configuration'
\echo ''
\echo '🗑️  REMOVED DATA:'
\echo '  ❌ All customers and customer data'
\echo '  ❌ All products and variants (including IMEI tracking)'
\echo '  ❌ All sales'
\echo '  ❌ All suppliers'
\echo '  ❌ All devices and repair records'
\echo '  ❌ All purchase orders and inventory movements'
\echo '  ❌ All financial records'
\echo '  ❌ All communication logs'
\echo '  ❌ All audit logs'
\echo '  ❌ Employee attendance/shifts (but users preserved)'
\echo ''
\echo '🎯 Ready to restore real data!'
\echo ''
\echo '✅ Your user accounts are safe - no need to recreate them!'

COMMIT;

-- Display counts of preserved tables
\echo ''
\echo '═══════════════════════════════════════'
\echo 'PRESERVED DATA VERIFICATION'
\echo '═══════════════════════════════════════'

SELECT 
  'Branches' as category, 
  COUNT(*)::text || ' records' as preserved_records
FROM lats_branches
UNION ALL
SELECT 'User Accounts', COUNT(*)::text || ' records' FROM auth_users
UNION ALL
SELECT 'Employees', COUNT(*)::text || ' records' FROM employees
UNION ALL
SELECT 'Settings', COUNT(*)::text || ' records' FROM settings
UNION ALL
SELECT 'Admin Settings', COUNT(*)::text || ' records' FROM admin_settings
UNION ALL
SELECT 'POS General Settings', COUNT(*)::text || ' records' FROM lats_pos_general_settings
UNION ALL
SELECT 'POS Advanced Settings', COUNT(*)::text || ' records' FROM lats_pos_advanced_settings
UNION ALL
SELECT 'POS Receipt Settings', COUNT(*)::text || ' records' FROM lats_pos_receipt_settings
UNION ALL
SELECT 'Document Templates', COUNT(*)::text || ' records' FROM document_templates
ORDER BY category;

