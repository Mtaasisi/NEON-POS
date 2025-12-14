-- Comprehensive fix for installment_payments table
-- Ensures all required columns exist

-- Add all missing columns
DO $$ 
BEGIN
    -- Add payment_method if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'installment_payments' AND column_name = 'payment_method'
    ) THEN
        ALTER TABLE installment_payments ADD COLUMN payment_method TEXT NOT NULL DEFAULT 'cash';
        RAISE NOTICE 'Added payment_method column';
    END IF;

    -- Add payment_date if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'installment_payments' AND column_name = 'payment_date'
    ) THEN
        ALTER TABLE installment_payments ADD COLUMN payment_date TIMESTAMPTZ DEFAULT now();
        RAISE NOTICE 'Added payment_date column';
    END IF;

    -- Add status if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'installment_payments' AND column_name = 'status'
    ) THEN
        ALTER TABLE installment_payments ADD COLUMN status TEXT DEFAULT 'paid' CHECK (status IN ('paid', 'pending', 'late', 'waived'));
        RAISE NOTICE 'Added status column';
    END IF;

    -- Add days_late if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'installment_payments' AND column_name = 'days_late'
    ) THEN
        ALTER TABLE installment_payments ADD COLUMN days_late INTEGER DEFAULT 0;
        RAISE NOTICE 'Added days_late column';
    END IF;

    -- Add late_fee if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'installment_payments' AND column_name = 'late_fee'
    ) THEN
        ALTER TABLE installment_payments ADD COLUMN late_fee NUMERIC DEFAULT 0;
        RAISE NOTICE 'Added late_fee column';
    END IF;

    -- Add notification_sent if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'installment_payments' AND column_name = 'notification_sent'
    ) THEN
        ALTER TABLE installment_payments ADD COLUMN notification_sent BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added notification_sent column';
    END IF;

    -- Add notification_sent_at if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'installment_payments' AND column_name = 'notification_sent_at'
    ) THEN
        ALTER TABLE installment_payments ADD COLUMN notification_sent_at TIMESTAMPTZ;
        RAISE NOTICE 'Added notification_sent_at column';
    END IF;

    -- Add notes if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'installment_payments' AND column_name = 'notes'
    ) THEN
        ALTER TABLE installment_payments ADD COLUMN notes TEXT;
        RAISE NOTICE 'Added notes column';
    END IF;

    -- Add created_by if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'installment_payments' AND column_name = 'created_by'
    ) THEN
        ALTER TABLE installment_payments ADD COLUMN created_by UUID;
        RAISE NOTICE 'Added created_by column';
    END IF;

    RAISE NOTICE 'All columns checked and added if missing!';
END $$;

-- Show all current columns
SELECT 
    column_name, 
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'installment_payments'
ORDER BY ordinal_position;

