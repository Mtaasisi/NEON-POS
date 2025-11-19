-- ================================================
-- Add branch_id to users/technicians table for multi-branch isolation
-- ================================================

-- Add branch_id column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES lats_branches(id) DEFAULT '00000000-0000-0000-0000-000000000001';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_users_branch_id ON users(branch_id);

-- Add comments for documentation
COMMENT ON COLUMN users.branch_id IS 'References the branch this user/technician belongs to for multi-branch isolation';

-- Update existing users to have default branch if null
UPDATE users 
SET branch_id = '00000000-0000-0000-0000-000000000001' 
WHERE branch_id IS NULL;

-- ================================================
-- Add branch_id to auth_users table (if used)
-- ================================================

-- Check if auth_users table exists and add branch_id
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'auth_users') THEN
        -- Add branch_id column to auth_users
        ALTER TABLE auth_users 
        ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES lats_branches(id) DEFAULT '00000000-0000-0000-0000-000000000001';
        
        -- Create index for faster queries
        CREATE INDEX IF NOT EXISTS idx_auth_users_branch_id ON auth_users(branch_id);
        
        -- Update existing auth_users to have default branch if null
        UPDATE auth_users 
        SET branch_id = '00000000-0000-0000-0000-000000000001' 
        WHERE branch_id IS NULL;
        
        COMMENT ON COLUMN auth_users.branch_id IS 'References the branch this auth user belongs to for multi-branch isolation';
        
        RAISE NOTICE 'Branch isolation added to auth_users table';
    END IF;
END $$;

-- ================================================
-- Add branch_id to employees table (if exists)
-- ================================================

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'employees') THEN
        -- Add branch_id column to employees
        ALTER TABLE employees 
        ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES lats_branches(id) DEFAULT '00000000-0000-0000-0000-000000000001';
        
        -- Create index for faster queries
        CREATE INDEX IF NOT EXISTS idx_employees_branch_id ON employees(branch_id);
        
        -- Update existing employees to have default branch if null
        UPDATE employees 
        SET branch_id = '00000000-0000-0000-0000-000000000001' 
        WHERE branch_id IS NULL;
        
        COMMENT ON COLUMN employees.branch_id IS 'References the branch this employee belongs to for multi-branch isolation';
        
        RAISE NOTICE 'Branch isolation added to employees table';
    END IF;
END $$;

-- ================================================
-- Verification
-- ================================================

-- Display counts by branch
DO $$
DECLARE
    user_count INTEGER;
    auth_user_count INTEGER;
    employee_count INTEGER;
    has_auth_users BOOLEAN;
    has_employees BOOLEAN;
BEGIN
    SELECT COUNT(*) INTO user_count FROM users WHERE branch_id IS NOT NULL;
    
    -- Check if auth_users table exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables WHERE table_name = 'auth_users'
    ) INTO has_auth_users;
    
    IF has_auth_users THEN
        SELECT COUNT(*) INTO auth_user_count FROM auth_users WHERE branch_id IS NOT NULL;
    ELSE
        auth_user_count := 0;
    END IF;
    
    -- Check if employees table exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables WHERE table_name = 'employees'
    ) INTO has_employees;
    
    IF has_employees THEN
        SELECT COUNT(*) INTO employee_count FROM employees WHERE branch_id IS NOT NULL;
    ELSE
        employee_count := 0;
    END IF;
    
    RAISE NOTICE 'Technician/User branch isolation complete:';
    RAISE NOTICE '  - Users with branch_id: %', user_count;
    IF has_auth_users THEN
        RAISE NOTICE '  - Auth users with branch_id: %', auth_user_count;
    END IF;
    IF has_employees THEN
        RAISE NOTICE '  - Employees with branch_id: %', employee_count;
    END IF;
END $$;

-- ================================================
-- Show branch distribution for technicians
-- ================================================

-- Show technicians by branch
SELECT 
    b.name as branch_name,
    COUNT(u.id) as technician_count,
    STRING_AGG(u.full_name, ', ') as technicians
FROM lats_branches b
LEFT JOIN users u ON u.branch_id = b.id AND u.role IN ('technician', 'tech', 'admin', 'manager')
GROUP BY b.id, b.name
ORDER BY b.name;

