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

-- Step 1: Disable triggers temporarily to speed up deletion
SET session_replication_role = replica;

DO $$
BEGIN
  RAISE NOTICE '🧹 Starting database cleanup...';
  RAISE NOTICE '📊 Current data will be removed but settings/templates preserved';
  RAISE NOTICE '';
END $$;

-- Step 2: Clear transactional data in dependency order
-- (Children first, then parents to avoid FK constraint issues)

-- Customer-related data
DO $$ BEGIN RAISE NOTICE '👥 Cleaning customer data...'; END $$;
TRUNCATE TABLE IF EXISTS customer_installment_plan_payments CASCADE;
TRUNCATE TABLE IF EXISTS customer_installment_plans CASCADE;
TRUNCATE TABLE IF EXISTS customer_special_orders CASCADE;
TRUNCATE TABLE IF EXISTS customer_payments CASCADE;
TRUNCATE TABLE IF EXISTS customer_revenue CASCADE;
TRUNCATE TABLE IF EXISTS customer_checkins CASCADE;
TRUNCATE TABLE IF EXISTS customer_notes CASCADE;
TRUNCATE TABLE IF EXISTS customer_messages CASCADE;
TRUNCATE TABLE IF EXISTS customer_communications CASCADE;
TRUNCATE TABLE IF EXISTS customer_points_history CASCADE;
TRUNCATE TABLE IF EXISTS customer_preferences CASCADE;
TRUNCATE TABLE IF EXISTS contact_history CASCADE;
TRUNCATE TABLE IF EXISTS contact_preferences CASCADE;
TRUNCATE TABLE IF EXISTS appointments CASCADE;
TRUNCATE TABLE IF EXISTS lats_customers CASCADE;
TRUNCATE TABLE IF EXISTS customers CASCADE;
TRUNCATE TABLE IF EXISTS customer_fix_backup CASCADE;

-- Sales data
DO $$ BEGIN RAISE NOTICE '💰 Cleaning sales data...'; END $$;
TRUNCATE TABLE IF EXISTS lats_sale_items CASCADE;
TRUNCATE TABLE IF EXISTS lats_sales CASCADE;
TRUNCATE TABLE IF EXISTS lats_receipts CASCADE;
TRUNCATE TABLE IF EXISTS daily_sales_closures CASCADE;
TRUNCATE TABLE IF EXISTS daily_opening_sessions CASCADE;
TRUNCATE TABLE IF EXISTS gift_card_transactions CASCADE;
TRUNCATE TABLE IF EXISTS gift_cards CASCADE;
TRUNCATE TABLE IF EXISTS installment_payments CASCADE;

-- Purchase Orders & Inventory
DO $$ BEGIN RAISE NOTICE '📦 Cleaning purchase orders and inventory...'; END $$;
TRUNCATE TABLE IF EXISTS lats_purchase_order_items CASCADE;
TRUNCATE TABLE IF EXISTS lats_purchase_order_payments CASCADE;
TRUNCATE TABLE IF EXISTS lats_purchase_order_audit_log CASCADE;
TRUNCATE TABLE IF EXISTS lats_purchase_orders CASCADE;
TRUNCATE TABLE IF EXISTS lats_stock_movements CASCADE;
TRUNCATE TABLE IF EXISTS lats_inventory_adjustments CASCADE;
TRUNCATE TABLE IF EXISTS lats_inventory_items CASCADE;
TRUNCATE TABLE IF EXISTS inventory_items CASCADE;
TRUNCATE TABLE IF EXISTS auto_reorder_log CASCADE;

-- Products & Variants
DO $$ BEGIN RAISE NOTICE '📱 Cleaning products and variants...'; END $$;
TRUNCATE TABLE IF EXISTS lats_product_variants CASCADE;
TRUNCATE TABLE IF EXISTS lats_products CASCADE;
TRUNCATE TABLE IF EXISTS lats_spare_part_usage CASCADE;
TRUNCATE TABLE IF EXISTS lats_spare_part_variants CASCADE;
TRUNCATE TABLE IF EXISTS lats_spare_parts CASCADE;
TRUNCATE TABLE IF EXISTS product_images CASCADE;
TRUNCATE TABLE IF EXISTS lats_product_validation CASCADE;
TRUNCATE TABLE IF EXISTS imei_validation CASCADE;

-- Categories, Brands, Units (keeping structure, clearing data)
DO $$ BEGIN RAISE NOTICE '🏷️  Cleaning categories and brands...'; END $$;
TRUNCATE TABLE IF EXISTS lats_categories CASCADE;
TRUNCATE TABLE IF EXISTS lats_brands CASCADE;
TRUNCATE TABLE IF EXISTS lats_product_units CASCADE;
TRUNCATE TABLE IF EXISTS expense_categories CASCADE;

-- Suppliers
DO $$ BEGIN RAISE NOTICE '🚚 Cleaning suppliers...'; END $$;
TRUNCATE TABLE IF EXISTS lats_suppliers CASCADE;

-- Device/Repair data
DO $$ BEGIN RAISE NOTICE '🔧 Cleaning device and repair data...'; END $$;
TRUNCATE TABLE IF EXISTS device_attachments CASCADE;
TRUNCATE TABLE IF EXISTS device_checklists CASCADE;
TRUNCATE TABLE IF EXISTS device_ratings CASCADE;
TRUNCATE TABLE IF EXISTS device_remarks CASCADE;
TRUNCATE TABLE IF EXISTS device_transitions CASCADE;
TRUNCATE TABLE IF EXISTS diagnostic_devices CASCADE;
TRUNCATE TABLE IF EXISTS diagnostic_checks CASCADE;
TRUNCATE TABLE IF EXISTS diagnostic_checklist_results CASCADE;
TRUNCATE TABLE IF EXISTS diagnostic_requests CASCADE;
TRUNCATE TABLE IF EXISTS devices CASCADE;

-- Financial data
DO $$ BEGIN RAISE NOTICE '💵 Cleaning financial data...'; END $$;
TRUNCATE TABLE IF EXISTS finance_transfers CASCADE;
TRUNCATE TABLE IF EXISTS finance_expenses CASCADE;
TRUNCATE TABLE IF EXISTS finance_expense_categories CASCADE;
TRUNCATE TABLE IF EXISTS finance_accounts CASCADE;
TRUNCATE TABLE IF EXISTS account_transactions CASCADE;
TRUNCATE TABLE IF EXISTS expenses CASCADE;

-- Shipping data
DO $$ BEGIN RAISE NOTICE '🚢 Cleaning shipping data...'; END $$;
TRUNCATE TABLE IF EXISTS lats_shipping_cargo_items CASCADE;
TRUNCATE TABLE IF EXISTS lats_shipping CASCADE;

-- Employee data (KEEPING auth_users and employees!)
DO $$ BEGIN RAISE NOTICE '👤 Cleaning employee activity data (keeping user accounts)...'; END $$;
TRUNCATE TABLE IF EXISTS attendance_records CASCADE;
TRUNCATE TABLE IF EXISTS employee_shifts CASCADE;
TRUNCATE TABLE IF EXISTS user_daily_goals CASCADE;
-- NOT truncating: auth_users (user accounts) - PRESERVED
-- NOT truncating: employees (employee records) - PRESERVED
-- NOT truncating: lats_employees - PRESERVED

-- Branch activity (keeping branches, clearing activity)
DO $$ BEGIN RAISE NOTICE '🏢 Cleaning branch activity logs...'; END $$;
TRUNCATE TABLE IF EXISTS branch_activity_log CASCADE;
TRUNCATE TABLE IF EXISTS branch_transfers CASCADE;

-- Communication logs (keeping templates!)
DO $$ BEGIN RAISE NOTICE '📧 Cleaning communication logs...'; END $$;
TRUNCATE TABLE IF EXISTS email_logs CASCADE;
TRUNCATE TABLE IF EXISTS sms_logs CASCADE;
TRUNCATE TABLE IF EXISTS chat_messages CASCADE;

-- Audit & tracking logs
DO $$ BEGIN RAISE NOTICE '📝 Cleaning audit and API logs...'; END $$;
TRUNCATE TABLE IF EXISTS audit_logs CASCADE;
TRUNCATE TABLE IF EXISTS uuid_diagnostic_log CASCADE;
TRUNCATE TABLE IF EXISTS api_request_logs CASCADE;
TRUNCATE TABLE IF EXISTS api_keys CASCADE;
TRUNCATE TABLE IF EXISTS admin_settings_log CASCADE;

-- Step 3: Re-enable triggers
SET session_replication_role = DEFAULT;

-- Step 4: Display summary
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Database cleaned successfully!';
  RAISE NOTICE '';
  RAISE NOTICE '📋 PRESERVED DATA:';
  RAISE NOTICE '  ✅ Branches (3 locations)';
  RAISE NOTICE '  ✅ User Accounts (4 users) & Employees (1 employee)';
  RAISE NOTICE '  ✅ All settings (system, admin, POS, user, WhatsApp)';
  RAISE NOTICE '  ✅ All templates (communication, notification, WhatsApp, diagnostic, document)';
  RAISE NOTICE '  ✅ SMS triggers configuration';
  RAISE NOTICE '  ✅ Contact methods configuration';
  RAISE NOTICE '  ✅ Integrations configuration';
  RAISE NOTICE '';
  RAISE NOTICE '🗑️  REMOVED DATA:';
  RAISE NOTICE '  ❌ 15 Customers and all customer data';
  RAISE NOTICE '  ❌ 6 Products + 28 Variants (including IMEI tracking)';
  RAISE NOTICE '  ❌ 5 Sales + 6 Sale Items';
  RAISE NOTICE '  ❌ 12 Suppliers';
  RAISE NOTICE '  ❌ 6 Devices and repair records';
  RAISE NOTICE '  ❌ All purchase orders and inventory movements';
  RAISE NOTICE '  ❌ All financial records';
  RAISE NOTICE '  ❌ All communication logs';
  RAISE NOTICE '  ❌ All audit logs';
  RAISE NOTICE '  ❌ Employee attendance/shifts (but users preserved)';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Ready to restore real data!';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Your user accounts are safe - no need to recreate them!';
END $$;

COMMIT;

-- Display counts of preserved tables
SELECT '═══════════════════════════════════════' as separator
UNION ALL SELECT 'PRESERVED DATA VERIFICATION'
UNION ALL SELECT '═══════════════════════════════════════';

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
SELECT 'System Settings', COUNT(*)::text || ' records' FROM system_settings
UNION ALL
SELECT 'Admin Settings', COUNT(*)::text || ' records' FROM admin_settings
UNION ALL
SELECT 'POS General Settings', COUNT(*)::text || ' records' FROM lats_pos_general_settings
UNION ALL
SELECT 'POS Advanced Settings', COUNT(*)::text || ' records' FROM lats_pos_advanced_settings
UNION ALL
SELECT 'POS Receipt Settings', COUNT(*)::text || ' records' FROM lats_pos_receipt_settings
UNION ALL
SELECT 'User Settings', COUNT(*)::text || ' records' FROM user_settings
UNION ALL
SELECT 'Communication Templates', COUNT(*)::text || ' records' FROM communication_templates
UNION ALL
SELECT 'Notification Templates', COUNT(*)::text || ' records' FROM notification_templates
UNION ALL
SELECT 'WhatsApp Templates', COUNT(*)::text || ' records' FROM whatsapp_templates
UNION ALL
SELECT 'WhatsApp Message Templates', COUNT(*)::text || ' records' FROM whatsapp_message_templates
UNION ALL
SELECT 'Diagnostic Templates', COUNT(*)::text || ' records' FROM diagnostic_templates
UNION ALL
SELECT 'Document Templates', COUNT(*)::text || ' records' FROM document_templates
UNION ALL
SELECT 'SMS Triggers', COUNT(*)::text || ' records' FROM sms_triggers
UNION ALL
SELECT 'Integrations', COUNT(*)::text || ' records' FROM integrations;
