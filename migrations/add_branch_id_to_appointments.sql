-- ============================================
-- ADD BRANCH_ID TO APPOINTMENTS TABLE
-- Date: October 20, 2025
-- ============================================

-- Add branch_id column to appointments table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'appointments' 
        AND column_name = 'branch_id'
    ) THEN
        -- Add the column
        ALTER TABLE appointments 
        ADD COLUMN branch_id UUID REFERENCES store_locations(id) ON DELETE SET NULL;
        
        -- Add index for performance
        CREATE INDEX IF NOT EXISTS idx_appointments_branch_id ON appointments(branch_id);
        
        RAISE NOTICE 'Successfully added branch_id column to appointments table';
    ELSE
        RAISE NOTICE 'branch_id column already exists in appointments table';
    END IF;
END $$;

-- Optional: Set a default branch_id for existing appointments (update with your actual default branch ID)
-- UPDATE appointments SET branch_id = 'your-default-branch-id' WHERE branch_id IS NULL;

COMMIT;

