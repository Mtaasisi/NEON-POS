-- ===================================================================
-- EMPLOYEE-USER-BRANCH RELATIONSHIP SETUP
-- ===================================================================
-- This script establishes proper relationships between:
-- 1. Employees → Users (one-to-one)
-- 2. Employees → Branches (many-to-one: each employee belongs to one branch)
-- 3. Users → Branches (many-to-many: users can access multiple branches)
-- ===================================================================

-- ===================================================================
-- STEP 1: Add branch_id column to employees table
-- ===================================================================
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'employees' AND column_name = 'branch_id'
    ) THEN
        RAISE NOTICE '✅ Adding branch_id column to employees table...';
        ALTER TABLE employees 
        ADD COLUMN branch_id UUID;
        
        RAISE NOTICE '✅ branch_id column added successfully';
    ELSE
        RAISE NOTICE '⏭️  branch_id column already exists in employees table';
    END IF;
END $$;

-- ===================================================================
-- STEP 2: Add foreign key constraint for employees.branch_id
-- ===================================================================
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'employees_branch_id_fkey'
    ) THEN
        RAISE NOTICE '✅ Adding foreign key constraint: employees.branch_id -> store_locations.id';
        ALTER TABLE employees
        ADD CONSTRAINT employees_branch_id_fkey 
        FOREIGN KEY (branch_id) REFERENCES store_locations(id) ON DELETE SET NULL;
        
        RAISE NOTICE '✅ Foreign key constraint added successfully';
    ELSE
        RAISE NOTICE '⏭️  Foreign key constraint already exists';
    END IF;
END $$;

-- ===================================================================
-- STEP 3: Create user_branch_assignments table (many-to-many)
-- ===================================================================
CREATE TABLE IF NOT EXISTS user_branch_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES store_locations(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Prevent duplicate assignments
    UNIQUE(user_id, branch_id)
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_branch_assignments_user_id 
ON user_branch_assignments(user_id);

CREATE INDEX IF NOT EXISTS idx_user_branch_assignments_branch_id 
ON user_branch_assignments(branch_id);

-- ===================================================================
-- STEP 4: Add access_all_branches column to users table
-- ===================================================================
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'access_all_branches'
    ) THEN
        RAISE NOTICE '✅ Adding access_all_branches column to users table...';
        ALTER TABLE users 
        ADD COLUMN access_all_branches BOOLEAN DEFAULT false;
        
        RAISE NOTICE '✅ access_all_branches column added successfully';
    ELSE
        RAISE NOTICE '⏭️  access_all_branches column already exists in users table';
    END IF;
END $$;

-- ===================================================================
-- STEP 5: Set all admin users to have access to all branches
-- ===================================================================
UPDATE users 
SET access_all_branches = true 
WHERE role = 'admin';

RAISE NOTICE '✅ All admin users now have access to all branches';

-- ===================================================================
-- STEP 6: Create helper function to get user's accessible branches
-- ===================================================================
CREATE OR REPLACE FUNCTION get_user_accessible_branches(p_user_id UUID)
RETURNS TABLE (
    branch_id UUID,
    branch_name VARCHAR,
    branch_code VARCHAR,
    city VARCHAR,
    is_main BOOLEAN
) AS $$
BEGIN
    -- Check if user has access to all branches
    IF EXISTS (
        SELECT 1 FROM users 
        WHERE id = p_user_id AND access_all_branches = true
    ) THEN
        -- Return all branches
        RETURN QUERY
        SELECT 
            id,
            name,
            code,
            city,
            is_main
        FROM store_locations
        WHERE is_active = true
        ORDER BY is_main DESC, name ASC;
    ELSE
        -- Return only assigned branches
        RETURN QUERY
        SELECT 
            sl.id,
            sl.name,
            sl.code,
            sl.city,
            sl.is_main
        FROM store_locations sl
        INNER JOIN user_branch_assignments uba ON sl.id = uba.branch_id
        WHERE uba.user_id = p_user_id 
        AND sl.is_active = true
        ORDER BY sl.is_main DESC, sl.name ASC;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ===================================================================
-- STEP 7: Create helper function to check user branch access
-- ===================================================================
CREATE OR REPLACE FUNCTION user_has_branch_access(
    p_user_id UUID, 
    p_branch_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if user has access to all branches
    IF EXISTS (
        SELECT 1 FROM users 
        WHERE id = p_user_id AND access_all_branches = true
    ) THEN
        RETURN true;
    END IF;
    
    -- Check if user is assigned to this specific branch
    RETURN EXISTS (
        SELECT 1 FROM user_branch_assignments
        WHERE user_id = p_user_id AND branch_id = p_branch_id
    );
END;
$$ LANGUAGE plpgsql;

-- ===================================================================
-- VERIFICATION QUERIES
-- ===================================================================

-- Check employees without branch assignment
SELECT 
    id, 
    first_name || ' ' || last_name as name,
    email,
    department,
    CASE 
        WHEN branch_id IS NULL THEN '❌ No Branch Assigned'
        ELSE '✅ Branch Assigned'
    END as branch_status
FROM employees
WHERE status = 'active'
ORDER BY branch_id IS NULL DESC, first_name;

-- Check employees without user account
SELECT 
    id,
    first_name || ' ' || last_name as name,
    email,
    CASE 
        WHEN user_id IS NULL THEN '❌ No User Account'
        ELSE '✅ Has User Account'
    END as user_status
FROM employees
WHERE status = 'active'
ORDER BY user_id IS NULL DESC, first_name;

-- Check users and their branch access
SELECT 
    u.id,
    u.full_name,
    u.role,
    CASE 
        WHEN u.access_all_branches THEN 'All Branches'
        ELSE (
            SELECT COUNT(*)::TEXT || ' Branch(es)'
            FROM user_branch_assignments
            WHERE user_id = u.id
        )
    END as branch_access
FROM users u
WHERE u.is_active = true
ORDER BY u.role, u.full_name;

-- ===================================================================
-- SUCCESS MESSAGE
-- ===================================================================
DO $$ 
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '╔═══════════════════════════════════════════════════════════════╗';
    RAISE NOTICE '║  ✅ EMPLOYEE-USER-BRANCH RELATIONSHIPS SETUP COMPLETE!        ║';
    RAISE NOTICE '╚═══════════════════════════════════════════════════════════════╝';
    RAISE NOTICE '';
    RAISE NOTICE '📋 WHAT WAS SETUP:';
    RAISE NOTICE '  1. ✅ employees.branch_id → store_locations.id (FK)';
    RAISE NOTICE '  2. ✅ employees.user_id → users.id (FK)';
    RAISE NOTICE '  3. ✅ user_branch_assignments table created';
    RAISE NOTICE '  4. ✅ users.access_all_branches column added';
    RAISE NOTICE '  5. ✅ Helper functions created';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 NEXT STEPS:';
    RAISE NOTICE '  1. Assign branches to existing employees';
    RAISE NOTICE '  2. Link employees to user accounts';
    RAISE NOTICE '  3. Configure user branch access in User Management';
    RAISE NOTICE '';
END $$;

