-- ============================================================================
-- FIX CUSTOMERS TABLE - ADD MISSING COLUMNS
-- ============================================================================
-- This script adds all missing columns that the frontend code expects

DO $$ 
BEGIN
    RAISE NOTICE 'Starting customers table fix...';
    
    -- Add whatsapp column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'whatsapp'
    ) THEN
        ALTER TABLE customers ADD COLUMN whatsapp TEXT;
        RAISE NOTICE '✅ Added whatsapp column';
    ELSE
        RAISE NOTICE 'ℹ️  whatsapp column already exists';
    END IF;
    
    -- Add whatsapp_opt_out column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'whatsapp_opt_out'
    ) THEN
        ALTER TABLE customers ADD COLUMN whatsapp_opt_out BOOLEAN DEFAULT false;
        RAISE NOTICE '✅ Added whatsapp_opt_out column';
    ELSE
        RAISE NOTICE 'ℹ️  whatsapp_opt_out column already exists';
    END IF;
    
    -- Add created_by column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'created_by'
    ) THEN
        ALTER TABLE customers ADD COLUMN created_by UUID;
        RAISE NOTICE '✅ Added created_by column';
    ELSE
        RAISE NOTICE 'ℹ️  created_by column already exists';
    END IF;
    
    -- Add last_purchase_date column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'last_purchase_date'
    ) THEN
        ALTER TABLE customers ADD COLUMN last_purchase_date TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE '✅ Added last_purchase_date column';
    ELSE
        RAISE NOTICE 'ℹ️  last_purchase_date column already exists';
    END IF;
    
    -- Add total_purchases column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'total_purchases'
    ) THEN
        ALTER TABLE customers ADD COLUMN total_purchases INTEGER DEFAULT 0;
        RAISE NOTICE '✅ Added total_purchases column';
    ELSE
        RAISE NOTICE 'ℹ️  total_purchases column already exists';
    END IF;
    
    -- Add birthday column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'birthday'
    ) THEN
        ALTER TABLE customers ADD COLUMN birthday DATE;
        RAISE NOTICE '✅ Added birthday column';
    ELSE
        RAISE NOTICE 'ℹ️  birthday column already exists';
    END IF;
    
    -- Add referred_by column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'referred_by'
    ) THEN
        ALTER TABLE customers ADD COLUMN referred_by UUID;
        RAISE NOTICE '✅ Added referred_by column';
    ELSE
        RAISE NOTICE 'ℹ️  referred_by column already exists';
    END IF;
    
    -- Add referrals column (as JSONB array)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'referrals'
    ) THEN
        ALTER TABLE customers ADD COLUMN referrals JSONB DEFAULT '[]'::jsonb;
        RAISE NOTICE '✅ Added referrals column';
    ELSE
        RAISE NOTICE 'ℹ️  referrals column already exists';
    END IF;
    
    -- Call analytics columns
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'total_calls'
    ) THEN
        ALTER TABLE customers ADD COLUMN total_calls INTEGER DEFAULT 0;
        RAISE NOTICE '✅ Added total_calls column';
    ELSE
        RAISE NOTICE 'ℹ️  total_calls column already exists';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'total_call_duration_minutes'
    ) THEN
        ALTER TABLE customers ADD COLUMN total_call_duration_minutes NUMERIC DEFAULT 0;
        RAISE NOTICE '✅ Added total_call_duration_minutes column';
    ELSE
        RAISE NOTICE 'ℹ️  total_call_duration_minutes column already exists';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'incoming_calls'
    ) THEN
        ALTER TABLE customers ADD COLUMN incoming_calls INTEGER DEFAULT 0;
        RAISE NOTICE '✅ Added incoming_calls column';
    ELSE
        RAISE NOTICE 'ℹ️  incoming_calls column already exists';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'outgoing_calls'
    ) THEN
        ALTER TABLE customers ADD COLUMN outgoing_calls INTEGER DEFAULT 0;
        RAISE NOTICE '✅ Added outgoing_calls column';
    ELSE
        RAISE NOTICE 'ℹ️  outgoing_calls column already exists';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'missed_calls'
    ) THEN
        ALTER TABLE customers ADD COLUMN missed_calls INTEGER DEFAULT 0;
        RAISE NOTICE '✅ Added missed_calls column';
    ELSE
        RAISE NOTICE 'ℹ️  missed_calls column already exists';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'avg_call_duration_minutes'
    ) THEN
        ALTER TABLE customers ADD COLUMN avg_call_duration_minutes NUMERIC DEFAULT 0;
        RAISE NOTICE '✅ Added avg_call_duration_minutes column';
    ELSE
        RAISE NOTICE 'ℹ️  avg_call_duration_minutes column already exists';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'first_call_date'
    ) THEN
        ALTER TABLE customers ADD COLUMN first_call_date TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE '✅ Added first_call_date column';
    ELSE
        RAISE NOTICE 'ℹ️  first_call_date column already exists';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'last_call_date'
    ) THEN
        ALTER TABLE customers ADD COLUMN last_call_date TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE '✅ Added last_call_date column';
    ELSE
        RAISE NOTICE 'ℹ️  last_call_date column already exists';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'call_loyalty_level'
    ) THEN
        ALTER TABLE customers ADD COLUMN call_loyalty_level TEXT DEFAULT 'Basic';
        RAISE NOTICE '✅ Added call_loyalty_level column';
    ELSE
        RAISE NOTICE 'ℹ️  call_loyalty_level column already exists';
    END IF;
    
    RAISE NOTICE '🎉 Customers table fix completed!';
END $$;

