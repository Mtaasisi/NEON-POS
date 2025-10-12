-- ============================================================================
-- FIX DEVICE CREATION ERROR - Add unlock_code column
-- ============================================================================

-- Add unlock_code column (the code expects this but the table has 'password' instead)
ALTER TABLE devices ADD COLUMN IF NOT EXISTS unlock_code TEXT;

-- Copy existing password data to unlock_code for compatibility
UPDATE devices 
SET unlock_code = password 
WHERE password IS NOT NULL AND unlock_code IS NULL;

-- Verify the column was added
SELECT column_name, data_type
FROM information_schema.columns 
WHERE table_name = 'devices' AND column_name = 'unlock_code';

