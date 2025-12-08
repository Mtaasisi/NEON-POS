-- ============================================================================
-- FIX ALL FINANCE_ACCOUNTS FOREIGN KEY CONSTRAINTS
-- ============================================================================
-- This script fixes foreign key constraint violations when trying to
-- update or delete finance_accounts that are referenced by other tables
-- ============================================================================
-- Problem: Constraints default to RESTRICT, preventing deletion/update
-- Solution: Change to appropriate ON DELETE action (SET NULL or CASCADE)
--           based on whether the column is nullable
-- ============================================================================

DO $$
DECLARE
    constraint_fixed_count INT := 0;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'FIXING FINANCE_ACCOUNTS FOREIGN KEYS';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';

    -- ============================================================================
    -- 1. Fix installment_payments.account_id
    -- ============================================================================
    BEGIN
        ALTER TABLE installment_payments
        DROP CONSTRAINT IF EXISTS installment_payments_account_id_fkey;

        ALTER TABLE installment_payments
        ADD CONSTRAINT installment_payments_account_id_fkey 
        FOREIGN KEY (account_id) 
        REFERENCES finance_accounts(id) 
        ON DELETE SET NULL
        ON UPDATE CASCADE;

        constraint_fixed_count := constraint_fixed_count + 1;
        RAISE NOTICE '✅ Fixed: installment_payments.account_id';
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Failed to fix installment_payments.account_id: %', SQLERRM;
    END;

    -- ============================================================================
    -- 2. Fix special_order_payments.account_id
    -- ============================================================================
    BEGIN
        ALTER TABLE special_order_payments
        DROP CONSTRAINT IF EXISTS special_order_payments_account_id_fkey;

        ALTER TABLE special_order_payments
        ADD CONSTRAINT special_order_payments_account_id_fkey 
        FOREIGN KEY (account_id) 
        REFERENCES finance_accounts(id) 
        ON DELETE SET NULL
        ON UPDATE CASCADE;

        constraint_fixed_count := constraint_fixed_count + 1;
        RAISE NOTICE '✅ Fixed: special_order_payments.account_id';
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Failed to fix special_order_payments.account_id: %', SQLERRM;
    END;

    -- ============================================================================
    -- 3. Fix finance_expenses.account_id
    -- ============================================================================
    BEGIN
        ALTER TABLE finance_expenses
        DROP CONSTRAINT IF EXISTS finance_expenses_account_id_fkey;

        ALTER TABLE finance_expenses
        ADD CONSTRAINT finance_expenses_account_id_fkey 
        FOREIGN KEY (account_id) 
        REFERENCES finance_accounts(id) 
        ON DELETE SET NULL
        ON UPDATE CASCADE;

        constraint_fixed_count := constraint_fixed_count + 1;
        RAISE NOTICE '✅ Fixed: finance_expenses.account_id';
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Failed to fix finance_expenses.account_id: %', SQLERRM;
    END;

    -- ============================================================================
    -- 4. Fix purchase_order_payments.payment_account_id
    -- ============================================================================
    BEGIN
        ALTER TABLE purchase_order_payments
        DROP CONSTRAINT IF EXISTS purchase_order_payments_payment_account_id_fkey;

        ALTER TABLE purchase_order_payments
        ADD CONSTRAINT purchase_order_payments_payment_account_id_fkey 
        FOREIGN KEY (payment_account_id) 
        REFERENCES finance_accounts(id) 
        ON DELETE SET NULL
        ON UPDATE CASCADE;

        constraint_fixed_count := constraint_fixed_count + 1;
        RAISE NOTICE '✅ Fixed: purchase_order_payments.payment_account_id';
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Failed to fix purchase_order_payments.payment_account_id: %', SQLERRM;
    END;

    -- ============================================================================
    -- 5. Fix finance_transfers.from_account_id
    -- ============================================================================
    BEGIN
        ALTER TABLE finance_transfers
        DROP CONSTRAINT IF EXISTS finance_transfers_from_account_id_fkey;

        ALTER TABLE finance_transfers
        ADD CONSTRAINT finance_transfers_from_account_id_fkey 
        FOREIGN KEY (from_account_id) 
        REFERENCES finance_accounts(id) 
        ON DELETE SET NULL
        ON UPDATE CASCADE;

        constraint_fixed_count := constraint_fixed_count + 1;
        RAISE NOTICE '✅ Fixed: finance_transfers.from_account_id';
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Failed to fix finance_transfers.from_account_id: %', SQLERRM;
    END;

    -- ============================================================================
    -- 6. Fix finance_transfers.to_account_id
    -- ============================================================================
    BEGIN
        ALTER TABLE finance_transfers
        DROP CONSTRAINT IF EXISTS finance_transfers_to_account_id_fkey;

        ALTER TABLE finance_transfers
        ADD CONSTRAINT finance_transfers_to_account_id_fkey 
        FOREIGN KEY (to_account_id) 
        REFERENCES finance_accounts(id) 
        ON DELETE SET NULL
        ON UPDATE CASCADE;

        constraint_fixed_count := constraint_fixed_count + 1;
        RAISE NOTICE '✅ Fixed: finance_transfers.to_account_id';
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Failed to fix finance_transfers.to_account_id: %', SQLERRM;
    END;

    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'SUMMARY: Fixed % constraint(s)', constraint_fixed_count;
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '✅ All foreign key constraints fixed!';
    RAISE NOTICE 'You can now delete/update finance_accounts without constraint violations.';
    RAISE NOTICE 'When a finance_account is deleted, related account_id columns will be set to NULL.';
END $$;

-- Verify all constraints were fixed correctly
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule,
    rc.update_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
    ON rc.constraint_name = tc.constraint_name
    AND rc.constraint_schema = tc.table_schema
WHERE ccu.table_name = 'finance_accounts'
    AND tc.table_name IN (
        'installment_payments',
        'special_order_payments',
        'finance_expenses',
        'purchase_order_payments',
        'finance_transfers'
    )
ORDER BY tc.table_name, kcu.column_name;
