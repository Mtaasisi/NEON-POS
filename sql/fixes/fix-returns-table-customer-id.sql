-- Fix returns table - ensure customer_id column exists
-- This fixes the "column customer_id does not exist" error

-- First, check if the returns table exists
DO $$ 
BEGIN
    -- Check if returns table exists
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'returns'
    ) THEN
        RAISE NOTICE 'returns table exists';
        
        -- Check if customer_id column exists
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'returns' 
            AND column_name = 'customer_id'
        ) THEN
            RAISE NOTICE 'Adding customer_id column to returns table';
            
            -- Add the customer_id column
            ALTER TABLE public.returns 
            ADD COLUMN customer_id UUID;
            
            -- Add foreign key constraint if customers table exists
            IF EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name IN ('customers', 'lats_customers')
            ) THEN
                -- Try to add FK to lats_customers first, fallback to customers
                BEGIN
                    ALTER TABLE public.returns 
                    ADD CONSTRAINT returns_customer_id_fkey 
                    FOREIGN KEY (customer_id) REFERENCES lats_customers(id) ON DELETE CASCADE;
                    RAISE NOTICE 'Added FK constraint to lats_customers';
                EXCEPTION WHEN undefined_table THEN
                    -- If lats_customers doesn't exist, try customers
                    ALTER TABLE public.returns 
                    ADD CONSTRAINT returns_customer_id_fkey 
                    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;
                    RAISE NOTICE 'Added FK constraint to customers';
                END;
            END IF;
            
            RAISE NOTICE '✅ customer_id column added successfully';
        ELSE
            RAISE NOTICE 'customer_id column already exists';
        END IF;
    ELSE
        RAISE NOTICE '❌ returns table does not exist - creating it now';
        
        -- Create the returns table with all required columns
        CREATE TABLE public.returns (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            device_id UUID,
            manual_device_brand VARCHAR(255),
            manual_device_model VARCHAR(255),
            manual_device_serial VARCHAR(255),
            customer_id UUID NOT NULL,
            reason TEXT NOT NULL,
            intake_checklist JSONB,
            status VARCHAR(50) DEFAULT 'under-return-review',
            attachments JSONB,
            resolution TEXT,
            staff_signature TEXT,
            customer_signature TEXT,
            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ DEFAULT now(),
            purchase_date DATE,
            return_type VARCHAR(50),
            branch VARCHAR(255),
            staff_name VARCHAR(255),
            contact_confirmed BOOLEAN DEFAULT false,
            accessories JSONB,
            condition_description TEXT,
            customer_reported_issue TEXT,
            staff_observed_issue TEXT,
            customer_satisfaction INTEGER,
            preferred_contact VARCHAR(50),
            return_auth_number VARCHAR(100),
            return_method VARCHAR(50),
            return_shipping_fee NUMERIC(10,2),
            expected_pickup_date DATE,
            geo_location JSONB,
            policy_acknowledged BOOLEAN DEFAULT false,
            device_locked VARCHAR(50),
            privacy_wiped BOOLEAN DEFAULT false,
            internal_notes TEXT,
            escalation_required BOOLEAN DEFAULT false,
            additional_docs JSONB,
            refund_amount NUMERIC(10,2),
            exchange_device_id UUID,
            restocking_fee NUMERIC(10,2),
            refund_method VARCHAR(50),
            user_ip VARCHAR(50),
            user_location VARCHAR(255)
        );
        
        -- Add FK constraints
        IF EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'lats_customers'
        ) THEN
            ALTER TABLE public.returns 
            ADD CONSTRAINT returns_customer_id_fkey 
            FOREIGN KEY (customer_id) REFERENCES lats_customers(id) ON DELETE CASCADE;
        ELSIF EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'customers'
        ) THEN
            ALTER TABLE public.returns 
            ADD CONSTRAINT returns_customer_id_fkey 
            FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;
        END IF;
        
        -- Add indexes
        CREATE INDEX IF NOT EXISTS idx_returns_customer_id ON public.returns(customer_id);
        CREATE INDEX IF NOT EXISTS idx_returns_status ON public.returns(status);
        CREATE INDEX IF NOT EXISTS idx_returns_created_at ON public.returns(created_at DESC);
        
        RAISE NOTICE '✅ returns table created successfully';
    END IF;
END $$;

-- Verify the column exists
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'returns'
AND column_name = 'customer_id';

