-- Database Cleanup Verification Script
-- This script helps you verify the database structure and test the cleanup functionality

-- ============================================================================
-- SECTION 1: Get all tables with row counts
-- ============================================================================
SELECT 
    schemaname,
    tablename,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = tablename AND table_schema = 'public') as column_count
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- ============================================================================
-- SECTION 2: Get row counts for all tables
-- ============================================================================
-- Note: This will take some time for large databases
DO $$
DECLARE
    table_record RECORD;
    row_count INTEGER;
BEGIN
    RAISE NOTICE 'TABLE NAME | ROW COUNT';
    RAISE NOTICE '------------------------';
    
    FOR table_record IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        ORDER BY tablename
    LOOP
        EXECUTE format('SELECT COUNT(*) FROM %I', table_record.tablename) INTO row_count;
        RAISE NOTICE '% | %', table_record.tablename, row_count;
    END LOOP;
END $$;

-- ============================================================================
-- SECTION 3: Get database size information
-- ============================================================================
SELECT 
    pg_size_pretty(pg_database_size(current_database())) as database_size,
    current_database() as database_name;

-- ============================================================================
-- SECTION 4: Get table sizes
-- ============================================================================
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
    pg_total_relation_size(schemaname||'.'||tablename) AS size_bytes
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 50;

-- ============================================================================
-- SECTION 5: Get tables by category (Sales & Transactions)
-- ============================================================================
SELECT 
    tablename,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = tablename AND table_schema = 'public') as columns
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'lats_sales',
    'lats_sale_items',
    'lats_receipts',
    'account_transactions',
    'payment_transactions',
    'mobile_money_transactions',
    'customer_payments',
    'installment_payments',
    'gift_card_transactions',
    'points_transactions'
  )
ORDER BY tablename;

-- ============================================================================
-- SECTION 6: Get tables by category (Customers)
-- ============================================================================
SELECT 
    tablename,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = tablename AND table_schema = 'public') as columns
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'lats_customers',
    'customer_notes',
    'customer_messages',
    'customer_communications',
    'customer_checkins',
    'customer_preferences',
    'customer_revenue',
    'customer_special_orders',
    'customer_installment_plans',
    'customer_installment_plan_payments',
    'customer_points_history',
    'whatsapp_customers',
    'contact_history',
    'contact_methods',
    'contact_preferences',
    'buyer_details'
  )
ORDER BY tablename;

-- ============================================================================
-- SECTION 7: Sample row counts for major tables
-- ============================================================================
SELECT 
    'lats_sales' as table_name,
    COUNT(*) as row_count
FROM lats_sales
UNION ALL
SELECT 
    'lats_customers',
    COUNT(*)
FROM lats_customers
UNION ALL
SELECT 
    'lats_products',
    COUNT(*)
FROM lats_products
UNION ALL
SELECT 
    'lats_inventory_items',
    COUNT(*)
FROM lats_inventory_items
UNION ALL
SELECT 
    'lats_purchase_orders',
    COUNT(*)
FROM lats_purchase_orders
UNION ALL
SELECT 
    'audit_logs',
    COUNT(*)
FROM audit_logs
ORDER BY row_count DESC;

-- ============================================================================
-- SECTION 8: Check for foreign key constraints (Important before deletion!)
-- ============================================================================
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM
    information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- ============================================================================
-- SECTION 9: Verify cleanup (Run after cleanup to verify)
-- ============================================================================
-- Uncomment the tables you want to verify after cleanup
/*
SELECT 'lats_sales' as table_name, COUNT(*) as remaining_rows FROM lats_sales
UNION ALL
SELECT 'lats_customers', COUNT(*) FROM lats_customers
UNION ALL
SELECT 'audit_logs', COUNT(*) FROM audit_logs;
*/

-- ============================================================================
-- SECTION 10: Emergency restore info
-- ============================================================================
-- If you need to restore from backup, use pg_restore:
-- pg_restore -h hostname -U username -d database_name backup_file.dump

-- ============================================================================
-- NOTES:
-- ============================================================================
-- 1. Always backup your database before running any cleanup!
-- 2. The cleanup panel in the admin settings will handle cascading deletes
-- 3. Some tables may have foreign key constraints that prevent deletion
-- 4. Review the foreign key constraints (Section 8) before cleanup
-- 5. Test on a development/staging database first!

