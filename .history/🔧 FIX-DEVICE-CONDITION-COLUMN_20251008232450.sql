-- ============================================================================
-- FIX DEVICE CREATION - Add missing device_condition column
-- ============================================================================

-- Add the device_condition column that the code expects
ALTER TABLE devices ADD COLUMN IF NOT EXISTS device_condition TEXT;

-- Verify the column was added
SELECT column_name, data_type
FROM information_schema.columns 
WHERE table_name = 'devices' AND column_name = 'device_condition';

