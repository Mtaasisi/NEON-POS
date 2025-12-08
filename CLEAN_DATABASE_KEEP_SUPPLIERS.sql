-- ============================================================================
-- COMPREHENSIVE DATABASE CLEANUP - KEEP SUPPLIERS
-- ============================================================================
-- This script deletes all business data but keeps suppliers (cleans their data)
-- 
-- DELETES:
-- - All products and variants
-- - All customers and customer data
-- - All sales and transactions
-- - All purchase orders
-- - All inventory items
-- - All special orders and installments
-- - All stock movements
-- - All appointments and reminders
-- - All trade-in data
--
-- KEEPS BUT CLEANS:
-- - Suppliers (keeps records, resets stats/data)
-- - Supplier categories and tags
-- - Supplier documents, communications, contracts, ratings
-- ============================================================================

DO $$
DECLARE
    deleted_count INT;
    total_deleted INT := 0;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'DATABASE CLEANUP - KEEP SUPPLIERS';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';

    -- ============================================================================
    -- STEP 1: Delete all transaction-related data
    -- ============================================================================
    RAISE NOTICE 'STEP 1: Deleting transactions...';
    
    DELETE FROM payment_transactions;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    total_deleted := total_deleted + deleted_count;
    RAISE NOTICE '   Deleted % payment_transactions', deleted_count;
    
    DELETE FROM finance_expenses;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    total_deleted := total_deleted + deleted_count;
    RAISE NOTICE '   Deleted % finance_expenses', deleted_count;
    
    DELETE FROM finance_transfers;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    total_deleted := total_deleted + deleted_count;
    RAISE NOTICE '   Deleted % finance_transfers', deleted_count;
    
    DELETE FROM recurring_expenses;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    total_deleted := total_deleted + deleted_count;
    RAISE NOTICE '   Deleted % recurring_expenses', deleted_count;
    
    DELETE FROM scheduled_transfers;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    total_deleted := total_deleted + deleted_count;
    RAISE NOTICE '   Deleted % scheduled_transfers', deleted_count;
    
    DELETE FROM expenses;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    total_deleted := total_deleted + deleted_count;
    RAISE NOTICE '   Deleted % expenses', deleted_count;

    -- ============================================================================
    -- STEP 2: Delete all sales data
    -- ============================================================================
    RAISE NOTICE '';
    RAISE NOTICE 'STEP 2: Deleting sales data...';
    
    DELETE FROM sale_inventory_items;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    total_deleted := total_deleted + deleted_count;
    RAISE NOTICE '   Deleted % sale_inventory_items', deleted_count;
    
    DELETE FROM lats_sale_items;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    total_deleted := total_deleted + deleted_count;
    RAISE NOTICE '   Deleted % lats_sale_items', deleted_count;
    
    DELETE FROM lats_sales;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    total_deleted := total_deleted + deleted_count;
    RAISE NOTICE '   Deleted % lats_sales', deleted_count;

    -- ============================================================================
    -- STEP 3: Delete all purchase order data
    -- ============================================================================
    RAISE NOTICE '';
    RAISE NOTICE 'STEP 3: Deleting purchase orders...';
    
    DELETE FROM purchase_order_payments;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    total_deleted := total_deleted + deleted_count;
    RAISE NOTICE '   Deleted % purchase_order_payments', deleted_count;
    
    DELETE FROM lats_purchase_order_items;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    total_deleted := total_deleted + deleted_count;
    RAISE NOTICE '   Deleted % lats_purchase_order_items', deleted_count;
    
    DELETE FROM lats_purchase_orders;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    total_deleted := total_deleted + deleted_count;
    RAISE NOTICE '   Deleted % lats_purchase_orders', deleted_count;

    -- ============================================================================
    -- STEP 4: Delete all special orders and installments
    -- ============================================================================
    RAISE NOTICE '';
    RAISE NOTICE 'STEP 4: Deleting special orders and installments...';
    
    DELETE FROM special_order_payments;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    total_deleted := total_deleted + deleted_count;
    RAISE NOTICE '   Deleted % special_order_payments', deleted_count;
    
    DELETE FROM customer_special_orders;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    total_deleted := total_deleted + deleted_count;
    RAISE NOTICE '   Deleted % customer_special_orders', deleted_count;
    
    DELETE FROM installment_payments;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    total_deleted := total_deleted + deleted_count;
    RAISE NOTICE '   Deleted % installment_payments', deleted_count;
    
    DELETE FROM customer_installment_plans;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    total_deleted := total_deleted + deleted_count;
    RAISE NOTICE '   Deleted % customer_installment_plans', deleted_count;

    -- ============================================================================
    -- STEP 5: Delete all inventory items and stock movements
    -- ============================================================================
    RAISE NOTICE '';
    RAISE NOTICE 'STEP 5: Deleting inventory and stock movements...';
    
    DELETE FROM inventory_items;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    total_deleted := total_deleted + deleted_count;
    RAISE NOTICE '   Deleted % inventory_items', deleted_count;
    
    DELETE FROM lats_stock_movements;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    total_deleted := total_deleted + deleted_count;
    RAISE NOTICE '   Deleted % lats_stock_movements', deleted_count;
    
    -- Delete stock_transfers if table exists
    BEGIN
        DELETE FROM stock_transfers;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        total_deleted := total_deleted + deleted_count;
        RAISE NOTICE '   Deleted % stock_transfers', deleted_count;
    EXCEPTION WHEN undefined_table THEN
        RAISE NOTICE '   stock_transfers table does not exist, skipping';
    END;

    -- ============================================================================
    -- STEP 6: Delete all products
    -- ============================================================================
    RAISE NOTICE '';
    RAISE NOTICE 'STEP 6: Deleting products...';
    
    -- Delete branch_transfers first (references variants)
    BEGIN
        DELETE FROM branch_transfers;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        total_deleted := total_deleted + deleted_count;
        RAISE NOTICE '   Deleted % branch_transfers', deleted_count;
    EXCEPTION WHEN undefined_table THEN
        RAISE NOTICE '   branch_transfers table does not exist, skipping';
    END;
    
    DELETE FROM product_images;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    total_deleted := total_deleted + deleted_count;
    RAISE NOTICE '   Deleted % product_images', deleted_count;
    
    DELETE FROM lats_product_variants;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    total_deleted := total_deleted + deleted_count;
    RAISE NOTICE '   Deleted % lats_product_variants', deleted_count;
    
    DELETE FROM lats_products;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    total_deleted := total_deleted + deleted_count;
    RAISE NOTICE '   Deleted % lats_products', deleted_count;

    -- ============================================================================
    -- STEP 7: Delete all customers
    -- ============================================================================
    RAISE NOTICE '';
    RAISE NOTICE 'STEP 7: Deleting customers...';
    
    DELETE FROM customer_notes;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    total_deleted := total_deleted + deleted_count;
    RAISE NOTICE '   Deleted % customer_notes', deleted_count;
    
    DELETE FROM customers;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    total_deleted := total_deleted + deleted_count;
    RAISE NOTICE '   Deleted % customers (legacy)', deleted_count;
    
    DELETE FROM lats_customers;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    total_deleted := total_deleted + deleted_count;
    RAISE NOTICE '   Deleted % lats_customers', deleted_count;

    -- ============================================================================
    -- STEP 8: Delete appointments and reminders
    -- ============================================================================
    RAISE NOTICE '';
    RAISE NOTICE 'STEP 8: Deleting appointments and reminders...';
    
    -- Delete appointments if table exists
    BEGIN
        DELETE FROM appointments;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        total_deleted := total_deleted + deleted_count;
        RAISE NOTICE '   Deleted % appointments', deleted_count;
    EXCEPTION WHEN undefined_table THEN
        RAISE NOTICE '   appointments table does not exist, skipping';
    END;
    
    -- Delete reminders if table exists
    BEGIN
        DELETE FROM reminders;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        total_deleted := total_deleted + deleted_count;
        RAISE NOTICE '   Deleted % reminders', deleted_count;
    EXCEPTION WHEN undefined_table THEN
        RAISE NOTICE '   reminders table does not exist, skipping';
    END;

    -- ============================================================================
    -- STEP 9: Delete trade-in data
    -- ============================================================================
    RAISE NOTICE '';
    RAISE NOTICE 'STEP 9: Deleting trade-in data...';
    
    -- Delete trade_in_contracts if table exists
    BEGIN
        DELETE FROM trade_in_contracts;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        total_deleted := total_deleted + deleted_count;
        RAISE NOTICE '   Deleted % trade_in_contracts', deleted_count;
    EXCEPTION WHEN undefined_table THEN
        RAISE NOTICE '   trade_in_contracts table does not exist, skipping';
    END;
    
    -- Delete trade_in_devices if table exists
    BEGIN
        DELETE FROM trade_in_devices;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        total_deleted := total_deleted + deleted_count;
        RAISE NOTICE '   Deleted % trade_in_devices', deleted_count;
    EXCEPTION WHEN undefined_table THEN
        RAISE NOTICE '   trade_in_devices table does not exist, skipping';
    END;

    -- ============================================================================
    -- STEP 10: Delete devices and repairs
    -- ============================================================================
    RAISE NOTICE '';
    RAISE NOTICE 'STEP 10: Deleting devices and repairs...';
    
    -- Delete device_repairs if table exists
    BEGIN
        DELETE FROM device_repairs;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        total_deleted := total_deleted + deleted_count;
        RAISE NOTICE '   Deleted % device_repairs', deleted_count;
    EXCEPTION WHEN undefined_table THEN
        RAISE NOTICE '   device_repairs table does not exist, skipping';
    END;
    
    -- Delete devices if table exists
    BEGIN
        DELETE FROM devices;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        total_deleted := total_deleted + deleted_count;
        RAISE NOTICE '   Deleted % devices', deleted_count;
    EXCEPTION WHEN undefined_table THEN
        RAISE NOTICE '   devices table does not exist, skipping';
    END;

    -- ============================================================================
    -- STEP 11: Clean supplier data (keep suppliers, reset stats)
    -- ============================================================================
    RAISE NOTICE '';
    RAISE NOTICE 'STEP 11: Cleaning supplier data (keeping suppliers)...';
    
    -- Delete supplier-related transaction data
    DELETE FROM lats_supplier_communications;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    total_deleted := total_deleted + deleted_count;
    RAISE NOTICE '   Deleted % supplier_communications', deleted_count;
    
    DELETE FROM lats_supplier_contracts;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    total_deleted := total_deleted + deleted_count;
    RAISE NOTICE '   Deleted % supplier_contracts', deleted_count;
    
    DELETE FROM lats_supplier_documents;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    total_deleted := total_deleted + deleted_count;
    RAISE NOTICE '   Deleted % supplier_documents', deleted_count;
    
    DELETE FROM lats_supplier_ratings;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    total_deleted := total_deleted + deleted_count;
    RAISE NOTICE '   Deleted % supplier_ratings', deleted_count;
    
    -- Reset supplier stats but keep supplier records
    UPDATE lats_suppliers SET
        updated_at = now();
    
    -- Try to update optional columns if they exist
    -- Reset total_orders if column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'lats_suppliers' AND column_name = 'total_orders') THEN
        EXECUTE 'UPDATE lats_suppliers SET total_orders = 0';
    END IF;
    
    -- Reset last_order_date if column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'lats_suppliers' AND column_name = 'last_order_date') THEN
        EXECUTE 'UPDATE lats_suppliers SET last_order_date = NULL';
    END IF;
    
    -- Reset notes if column exists (only if it's not a required field)
    IF EXISTS (SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'lats_suppliers' AND column_name = 'notes') THEN
        BEGIN
            EXECUTE 'UPDATE lats_suppliers SET notes = NULL WHERE notes IS NOT NULL';
        EXCEPTION WHEN OTHERS THEN
            -- Ignore if update fails
            NULL;
        END;
    END IF;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE '   Reset stats for suppliers';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE '   Reset stats for % suppliers', deleted_count;
    
    -- Keep supplier categories and tags (they're reference data)
    RAISE NOTICE '   Kept supplier categories and tags (reference data)';

    -- ============================================================================
    -- STEP 12: Reset sequences and counters
    -- ============================================================================
    RAISE NOTICE '';
    RAISE NOTICE 'STEP 12: Resetting sequences...';
    
    -- Reset sale number sequence if it exists
    IF EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'sale_number_seq') THEN
        ALTER SEQUENCE sale_number_seq RESTART WITH 1;
        RAISE NOTICE '   Reset sale_number_seq';
    END IF;
    
    -- Reset PO number sequence if it exists
    IF EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'po_number_seq') THEN
        ALTER SEQUENCE po_number_seq RESTART WITH 1;
        RAISE NOTICE '   Reset po_number_seq';
    END IF;

    -- ============================================================================
    -- SUMMARY
    -- ============================================================================
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'CLEANUP COMPLETE!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Total records deleted: %', total_deleted;
    RAISE NOTICE '';
    RAISE NOTICE '✅ DELETED:';
    RAISE NOTICE '   - All products, variants, and images';
    RAISE NOTICE '   - All customers and customer data';
    RAISE NOTICE '   - All sales and transactions';
    RAISE NOTICE '   - All purchase orders';
    RAISE NOTICE '   - All inventory items and stock movements';
    RAISE NOTICE '   - All special orders and installments';
    RAISE NOTICE '   - All appointments and reminders';
    RAISE NOTICE '   - All trade-in data';
    RAISE NOTICE '   - All devices and repairs';
    RAISE NOTICE '';
    RAISE NOTICE '✅ KEPT (but cleaned):';
    RAISE NOTICE '   - Suppliers (records kept, stats reset)';
    RAISE NOTICE '   - Supplier categories and tags';
    RAISE NOTICE '';
    -- ============================================================================
    -- STEP 13: Delete payment accounts and payment methods
    -- ============================================================================
    RAISE NOTICE '';
    RAISE NOTICE 'STEP 13: Deleting payment accounts and methods...';
    
    -- Delete account transactions first (foreign key constraint)
    DELETE FROM account_transactions;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    total_deleted := total_deleted + deleted_count;
    RAISE NOTICE '   Deleted % account_transactions', deleted_count;
    
    -- Delete finance accounts
    DELETE FROM finance_accounts;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    total_deleted := total_deleted + deleted_count;
    RAISE NOTICE '   Deleted % finance_accounts', deleted_count;
    
    -- Delete payment methods
    BEGIN
        DELETE FROM payment_methods;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        total_deleted := total_deleted + deleted_count;
        RAISE NOTICE '   Deleted % payment_methods', deleted_count;
    EXCEPTION WHEN undefined_table THEN
        RAISE NOTICE '   payment_methods table does not exist, skipping';
    END;

    -- ============================================================================
    -- SUMMARY
    -- ============================================================================
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'CLEANUP COMPLETE!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Total records deleted: %', total_deleted;
    RAISE NOTICE '';
    RAISE NOTICE '✅ DELETED:';
    RAISE NOTICE '   - All products, variants, and images';
    RAISE NOTICE '   - All customers and customer data';
    RAISE NOTICE '   - All sales and transactions';
    RAISE NOTICE '   - All purchase orders';
    RAISE NOTICE '   - All inventory items and stock movements';
    RAISE NOTICE '   - All special orders and installments';
    RAISE NOTICE '   - All appointments and reminders';
    RAISE NOTICE '   - All trade-in data';
    RAISE NOTICE '   - All devices and repairs';
    RAISE NOTICE '   - All payment accounts and payment methods';
    RAISE NOTICE '';
    RAISE NOTICE '✅ KEPT (but cleaned):';
    RAISE NOTICE '   - Suppliers (records kept, stats reset)';
    RAISE NOTICE '   - Supplier categories and tags';
    RAISE NOTICE '';
    RAISE NOTICE '✅ KEPT (unchanged):';
    RAISE NOTICE '   - Store locations (branches)';
    RAISE NOTICE '   - User accounts';
    RAISE NOTICE '   - Settings and configurations';
    RAISE NOTICE '========================================';

END $$;

-- Verify cleanup
SELECT 
    'Products' as table_name, COUNT(*) as remaining_count FROM lats_products
UNION ALL
SELECT 'Customers', COUNT(*) FROM lats_customers
UNION ALL
SELECT 'Sales', COUNT(*) FROM lats_sales
UNION ALL
SELECT 'Purchase Orders', COUNT(*) FROM lats_purchase_orders
UNION ALL
SELECT 'Suppliers', COUNT(*) FROM lats_suppliers
ORDER BY table_name;
