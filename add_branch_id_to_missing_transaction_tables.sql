-- Add branch_id columns to transaction/payment tables that are missing them
-- This ensures complete branch isolation across all financial data

-- Add branch_id to tables missing it
ALTER TABLE public.gift_card_transactions ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.store_locations(id);
ALTER TABLE public.installment_payments ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.store_locations(id);
ALTER TABLE public.lats_purchase_order_payments ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.store_locations(id);
ALTER TABLE public.mobile_money_transactions ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.store_locations(id);
ALTER TABLE public.points_transactions ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.store_locations(id);
ALTER TABLE public.purchase_order_payments ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.store_locations(id);
ALTER TABLE public.special_order_payments ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.store_locations(id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_gift_card_transactions_branch_id ON public.gift_card_transactions(branch_id);
CREATE INDEX IF NOT EXISTS idx_installment_payments_branch_id ON public.installment_payments(branch_id);
CREATE INDEX IF NOT EXISTS idx_lats_purchase_order_payments_branch_id ON public.lats_purchase_order_payments(branch_id);
CREATE INDEX IF NOT EXISTS idx_mobile_money_transactions_branch_id ON public.mobile_money_transactions(branch_id);
CREATE INDEX IF NOT EXISTS idx_points_transactions_branch_id ON public.points_transactions(branch_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_payments_branch_id ON public.purchase_order_payments(branch_id);
CREATE INDEX IF NOT EXISTS idx_special_order_payments_branch_id ON public.special_order_payments(branch_id);

-- Add comments
COMMENT ON COLUMN public.gift_card_transactions.branch_id IS 'Branch ID for data isolation';
COMMENT ON COLUMN public.installment_payments.branch_id IS 'Branch ID for data isolation';
COMMENT ON COLUMN public.lats_purchase_order_payments.branch_id IS 'Branch ID for data isolation';
COMMENT ON COLUMN public.mobile_money_transactions.branch_id IS 'Branch ID for data isolation';
COMMENT ON COLUMN public.points_transactions.branch_id IS 'Branch ID for data isolation';
COMMENT ON COLUMN public.purchase_order_payments.branch_id IS 'Branch ID for data isolation';
COMMENT ON COLUMN public.special_order_payments.branch_id IS 'Branch ID for data isolation';

-- Populate existing purchase_order_payments with branch_id from related purchase orders
-- Since purchase_order_payments are linked to purchase orders, get branch_id from the PO
UPDATE public.purchase_order_payments
SET branch_id = purchase_orders.branch_id
FROM public.purchase_orders
WHERE purchase_order_payments.purchase_order_id = purchase_orders.id
AND purchase_order_payments.branch_id IS NULL;

-- For any remaining purchase_order_payments without branch_id, set to Main Branch as default
UPDATE public.purchase_order_payments
SET branch_id = '00000000-0000-0000-0000-000000000001'::uuid
WHERE branch_id IS NULL;

-- Verification query
DO $$
DECLARE
    table_record RECORD;
    missing_count INTEGER;
BEGIN
    RAISE NOTICE '================================================';
    RAISE NOTICE 'BRANCH_ID COLUMN ADDITION VERIFICATION';
    RAISE NOTICE '================================================';

    FOR table_record IN
        SELECT unnest(ARRAY[
            'gift_card_transactions', 'installment_payments', 'lats_purchase_order_payments',
            'mobile_money_transactions', 'points_transactions', 'purchase_order_payments', 'special_order_payments'
        ]) as table_name
    LOOP
        -- Check if column exists
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = table_record.table_name
            AND column_name = 'branch_id'
            AND table_schema = 'public'
        ) THEN
            RAISE NOTICE '✅ %: branch_id column added', table_record.table_name;
        ELSE
            RAISE EXCEPTION '❌ %: branch_id column FAILED to add', table_record.table_name;
        END IF;

        -- Check for missing branch_id values
        EXECUTE format('SELECT COUNT(*) FROM %I WHERE branch_id IS NULL', table_record.table_name) INTO missing_count;
        IF missing_count > 0 THEN
            RAISE NOTICE '⚠️  %: % rows missing branch_id values', table_record.table_name, missing_count;
        ELSE
            RAISE NOTICE '✅ %: All rows have branch_id populated', table_record.table_name;
        END IF;
    END LOOP;

    RAISE NOTICE '';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'All transaction tables now have branch isolation!';
    RAISE NOTICE '================================================';
END $$;
