-- ================================================
-- FIX EMPLOYEES SCHEMA MISMATCH
-- ================================================
-- This migration ensures the employees table has the correct columns
-- to match what the application code expects

-- Add full_name column if it doesn't exist (migrate from 'name')
DO $$
BEGIN
  -- Check if 'name' column exists but 'full_name' doesn't
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employees' 
    AND column_name = 'name'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employees' 
    AND column_name = 'full_name'
  ) THEN
    -- Rename 'name' to 'full_name'
    ALTER TABLE employees RENAME COLUMN name TO full_name;
    RAISE NOTICE '✅ Renamed employees.name to employees.full_name';
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employees' 
    AND column_name = 'full_name'
  ) THEN
    -- Add full_name column if neither exists
    ALTER TABLE employees ADD COLUMN full_name TEXT;
    RAISE NOTICE '✅ Added employees.full_name column';
  ELSE
    RAISE NOTICE 'ℹ️ employees.full_name already exists';
  END IF;
END $$;

-- Ensure position column exists (some databases might have 'role' instead)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employees' 
    AND column_name = 'position'
  ) THEN
    -- Check if 'role' exists instead
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'employees' 
      AND column_name = 'role'
    ) THEN
      -- Rename 'role' to 'position'
      ALTER TABLE employees RENAME COLUMN role TO position;
      RAISE NOTICE '✅ Renamed employees.role to employees.position';
    ELSE
      -- Add position column if neither exists
      ALTER TABLE employees ADD COLUMN position TEXT;
      RAISE NOTICE '✅ Added employees.position column';
    END IF;
  ELSE
    RAISE NOTICE 'ℹ️ employees.position already exists';
  END IF;
END $$;

-- Ensure is_active column exists (some databases might have 'status' instead)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employees' 
    AND column_name = 'is_active'
  ) THEN
    -- Check if 'status' exists instead
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'employees' 
      AND column_name = 'status'
    ) THEN
      -- Add is_active and migrate data from status
      ALTER TABLE employees ADD COLUMN is_active BOOLEAN DEFAULT true;
      UPDATE employees SET is_active = (status = 'active');
      RAISE NOTICE '✅ Added employees.is_active and migrated from status';
    ELSE
      -- Add is_active column
      ALTER TABLE employees ADD COLUMN is_active BOOLEAN DEFAULT true;
      RAISE NOTICE '✅ Added employees.is_active column';
    END IF;
  ELSE
    RAISE NOTICE 'ℹ️ employees.is_active already exists';
  END IF;
END $$;

-- Add comments to document the columns
COMMENT ON COLUMN employees.full_name IS 'Employee full name (renamed from name for consistency with users table)';
COMMENT ON COLUMN employees.position IS 'Employee position/job title';
COMMENT ON COLUMN employees.is_active IS 'Whether the employee is active (true) or inactive (false)';

-- Verification query
DO $$
DECLARE
  col_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO col_count
  FROM information_schema.columns
  WHERE table_name = 'employees'
  AND column_name IN ('full_name', 'position', 'is_active');
  
  IF col_count = 3 THEN
    RAISE NOTICE '✅ All required columns exist in employees table';
  ELSE
    RAISE WARNING '⚠️ Some columns may be missing. Found % of 3 required columns', col_count;
  END IF;
END $$;

