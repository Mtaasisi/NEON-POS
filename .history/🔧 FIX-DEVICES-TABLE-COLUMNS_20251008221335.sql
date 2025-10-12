-- ============================================================================
-- FIX DEVICES TABLE - ADD ALL MISSING COLUMNS
-- This adds all columns that the frontend code expects
-- ============================================================================

-- Add issue_description (for compatibility with the code)
ALTER TABLE devices ADD COLUMN IF NOT EXISTS issue_description TEXT;

-- Copy existing problem_description to issue_description if needed
UPDATE devices 
SET issue_description = problem_description 
WHERE problem_description IS NOT NULL AND issue_description IS NULL;

-- Add assigned_to (replaces/complements technician_id)
ALTER TABLE devices ADD COLUMN IF NOT EXISTS assigned_to UUID;

-- Copy existing technician_id to assigned_to if needed
UPDATE devices 
SET assigned_to = technician_id 
WHERE technician_id IS NOT NULL AND assigned_to IS NULL;

-- Add expected_return_date (replaces/complements estimated_completion_date)
ALTER TABLE devices ADD COLUMN IF NOT EXISTS expected_return_date TIMESTAMP WITH TIME ZONE;

-- Copy existing estimated_completion_date to expected_return_date if needed
UPDATE devices 
SET expected_return_date = estimated_completion_date 
WHERE estimated_completion_date IS NOT NULL AND expected_return_date IS NULL;

-- Add repair_cost
ALTER TABLE devices ADD COLUMN IF NOT EXISTS repair_cost NUMERIC DEFAULT 0;

-- Add repair_price
ALTER TABLE devices ADD COLUMN IF NOT EXISTS repair_price NUMERIC DEFAULT 0;

-- Add device_cost
ALTER TABLE devices ADD COLUMN IF NOT EXISTS device_cost NUMERIC DEFAULT 0;

-- Add estimated_hours
ALTER TABLE devices ADD COLUMN IF NOT EXISTS estimated_hours INTEGER;

-- Add diagnosis_required
ALTER TABLE devices ADD COLUMN IF NOT EXISTS diagnosis_required BOOLEAN DEFAULT false;

-- Add device_notes
ALTER TABLE devices ADD COLUMN IF NOT EXISTS device_notes TEXT;

-- Add unlock_code
ALTER TABLE devices ADD COLUMN IF NOT EXISTS unlock_code TEXT;

-- Add device_condition
ALTER TABLE devices ADD COLUMN IF NOT EXISTS device_condition TEXT;

-- ============================================================================
-- VERIFY THE FIX
-- ============================================================================
SELECT 
  'Devices table now has ' || COUNT(*) || ' columns' AS status
FROM information_schema.columns 
WHERE table_name = 'devices';

-- Show all columns to verify
SELECT 
  column_name, 
  data_type,
  is_nullable,
  SUBSTRING(column_default, 1, 40) as default_value
FROM information_schema.columns 
WHERE table_name = 'devices'
ORDER BY ordinal_position;

