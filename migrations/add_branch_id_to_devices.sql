-- ================================================
-- Add branch_id to devices table for multi-branch isolation
-- ================================================

-- Add branch_id column to devices table
ALTER TABLE devices 
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES lats_branches(id) DEFAULT '00000000-0000-0000-0000-000000000001';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_devices_branch_id ON devices(branch_id);

-- Add comments for documentation
COMMENT ON COLUMN devices.branch_id IS 'References the branch this device belongs to for multi-branch isolation';

-- Update existing devices to have default branch if null
UPDATE devices 
SET branch_id = '00000000-0000-0000-0000-000000000001' 
WHERE branch_id IS NULL;

-- ================================================
-- Add branch_id to repair_parts table (if it exists)
-- ================================================

-- Check if repair_parts table exists and add branch_id
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'repair_parts') THEN
        -- Add branch_id column to repair_parts
        ALTER TABLE repair_parts 
        ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES lats_branches(id);
        
        -- Create index for faster queries
        CREATE INDEX IF NOT EXISTS idx_repair_parts_branch_id ON repair_parts(branch_id);
        
        -- Update existing repair parts with branch from associated device
        UPDATE repair_parts rp
        SET branch_id = d.branch_id
        FROM devices d
        WHERE rp.device_id = d.id AND rp.branch_id IS NULL;
        
        RAISE NOTICE 'Branch isolation added to repair_parts table';
    END IF;
END $$;

-- ================================================
-- Add branch_id to customer_payments table
-- ================================================

ALTER TABLE customer_payments 
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES lats_branches(id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_customer_payments_branch_id ON customer_payments(branch_id);

-- Update existing payments with branch from associated device
UPDATE customer_payments cp
SET branch_id = d.branch_id
FROM devices d
WHERE cp.device_id = d.id AND cp.branch_id IS NULL;

-- For payments without device association, use default branch
UPDATE customer_payments 
SET branch_id = '00000000-0000-0000-0000-000000000001' 
WHERE branch_id IS NULL;

COMMENT ON COLUMN customer_payments.branch_id IS 'References the branch this payment belongs to for multi-branch isolation';

-- ================================================
-- Verification
-- ================================================

-- Display counts by branch
DO $$
DECLARE
    device_count INTEGER;
    payment_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO device_count FROM devices WHERE branch_id IS NOT NULL;
    SELECT COUNT(*) INTO payment_count FROM customer_payments WHERE branch_id IS NOT NULL;
    
    RAISE NOTICE 'Branch isolation complete:';
    RAISE NOTICE '  - Devices with branch_id: %', device_count;
    RAISE NOTICE '  - Payments with branch_id: %', payment_count;
END $$;

