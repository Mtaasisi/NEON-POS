-- ============================================================================
-- FIX APPOINTMENTS TABLE SCHEMA
-- ============================================================================
-- This script fixes the appointments table to match what the frontend expects

-- Add missing columns to appointments table
DO $$ 
BEGIN
    -- Add service_type column (alias for appointment_type)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'appointments' AND column_name = 'service_type'
    ) THEN
        ALTER TABLE appointments ADD COLUMN service_type TEXT;
        -- Copy data from appointment_type if it exists
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'appointments' AND column_name = 'appointment_type'
        ) THEN
            UPDATE appointments SET service_type = appointment_type WHERE service_type IS NULL;
        END IF;
        RAISE NOTICE '✅ Added service_type column';
    END IF;

    -- Add appointment_time column (for time component)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'appointments' AND column_name = 'appointment_time'
    ) THEN
        ALTER TABLE appointments ADD COLUMN appointment_time TEXT DEFAULT '00:00:00';
        RAISE NOTICE '✅ Added appointment_time column';
    END IF;

    -- Add customer_name column (denormalized for performance)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'appointments' AND column_name = 'customer_name'
    ) THEN
        ALTER TABLE appointments ADD COLUMN customer_name TEXT;
        RAISE NOTICE '✅ Added customer_name column';
    END IF;

    -- Add customer_phone column (denormalized for performance)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'appointments' AND column_name = 'customer_phone'
    ) THEN
        ALTER TABLE appointments ADD COLUMN customer_phone TEXT;
        RAISE NOTICE '✅ Added customer_phone column';
    END IF;

    -- Add technician_name column (denormalized for performance)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'appointments' AND column_name = 'technician_name'
    ) THEN
        ALTER TABLE appointments ADD COLUMN technician_name TEXT;
        RAISE NOTICE '✅ Added technician_name column';
    END IF;

    -- Update scheduled_date column if it exists (some schemas have this)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'appointments' AND column_name = 'scheduled_date'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'appointments' AND column_name = 'appointment_date'
    ) THEN
        ALTER TABLE appointments RENAME COLUMN scheduled_date TO appointment_date;
        RAISE NOTICE '✅ Renamed scheduled_date to appointment_date';
    END IF;
END $$;

-- Populate customer_name and customer_phone from customers table for existing appointments
UPDATE appointments a
SET 
    customer_name = c.name,
    customer_phone = c.phone
FROM customers c
WHERE a.customer_id = c.id
AND (a.customer_name IS NULL OR a.customer_phone IS NULL);

-- ============================================================================
-- UPDATE RLS POLICIES FOR APPOINTMENTS
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON appointments;
DROP POLICY IF EXISTS "Enable read access for all users" ON appointments;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON appointments;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON appointments;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON appointments;

-- Enable RLS
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Create simple policy for authenticated users (full access)
CREATE POLICY "Allow all operations for authenticated users"
ON appointments
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Create policy for anon users (read-only)
CREATE POLICY "Allow read for anon users"
ON appointments
FOR SELECT
TO anon
USING (true);

-- ============================================================================
-- FIX CUSTOMERS TABLE RLS POLICIES
-- ============================================================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON customers;
DROP POLICY IF EXISTS "Enable read access for all users" ON customers;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON customers;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON customers;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON customers;

-- Enable RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Create simple policy for authenticated users (full access)
CREATE POLICY "Allow all operations for authenticated users"
ON customers
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Create policy for anon users (read-only)
CREATE POLICY "Allow read for anon users"
ON customers
FOR SELECT
TO anon
USING (true);

RAISE NOTICE '✅ Appointments and customers tables fixed successfully!';

