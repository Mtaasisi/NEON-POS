-- Add branch_id column to employees and attendance_records tables
-- This enables branch-level data isolation for employee management

-- Add branch_id column to employees table
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES store_locations(id);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_employees_branch_id ON employees(branch_id);

-- Add branch_id column to attendance_records table (if it exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'attendance_records') THEN
    ALTER TABLE attendance_records 
    ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES store_locations(id);
    
    CREATE INDEX IF NOT EXISTS idx_attendance_records_branch_id ON attendance_records(branch_id);
    
    RAISE NOTICE '✅ Added branch_id to attendance_records';
  ELSE
    RAISE NOTICE 'ℹ️ attendance_records table does not exist, skipping';
  END IF;
END $$;

-- Set default branch_id to Main Store for existing records
UPDATE employees 
SET branch_id = (SELECT id FROM store_locations WHERE is_main = true LIMIT 1)
WHERE branch_id IS NULL;

-- Update attendance records if table exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'attendance_records') THEN
    EXECUTE 'UPDATE attendance_records 
    SET branch_id = (SELECT id FROM store_locations WHERE is_main = true LIMIT 1)
    WHERE branch_id IS NULL';
    
    RAISE NOTICE '✅ Updated attendance_records with default branch';
  END IF;
END $$;

-- Add comments to document the columns
COMMENT ON COLUMN employees.branch_id IS 'The store/branch this employee belongs to. Used for multi-branch data isolation.';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Branch isolation columns added successfully!';
  RAISE NOTICE '   - employees.branch_id';
  RAISE NOTICE '   - attendance_records.branch_id (if table exists)';
  RAISE NOTICE '✅ Existing records assigned to Main Store';
END $$;

