-- ============================================
-- SETUP USER BRANCH ASSIGNMENTS
-- This script ensures the user_branch_assignments table exists
-- and is properly configured with sample data
-- Date: October 13, 2025
-- ============================================

SELECT '🔧 Setting up user branch assignments system...' as status;

-- ============================================
-- 1. CREATE USER BRANCH ASSIGNMENTS TABLE
-- ============================================

-- Create the table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_branch_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES store_locations(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false,
  can_manage BOOLEAN DEFAULT false,
  can_view_reports BOOLEAN DEFAULT false,
  can_manage_inventory BOOLEAN DEFAULT false,
  can_manage_staff BOOLEAN DEFAULT false,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_by UUID REFERENCES users(id),
  UNIQUE(user_id, branch_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_branch_assignments_user ON user_branch_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_branch_assignments_branch ON user_branch_assignments(branch_id);
CREATE INDEX IF NOT EXISTS idx_user_branch_assignments_primary ON user_branch_assignments(is_primary);

-- Disable Row Level Security to allow full access
ALTER TABLE user_branch_assignments DISABLE ROW LEVEL SECURITY;

-- Grant full permissions
GRANT ALL ON user_branch_assignments TO authenticated;
GRANT ALL ON user_branch_assignments TO anon;
GRANT ALL ON user_branch_assignments TO postgres;

SELECT '✅ User branch assignments table created!' as status;

-- ============================================
-- 2. VERIFY STORE LOCATIONS TABLE
-- ============================================

-- Ensure store_locations table exists with required columns
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'store_locations') THEN
    RAISE NOTICE '⚠️  WARNING: store_locations table does not exist!';
    RAISE NOTICE '   Please run the store locations setup script first.';
  ELSE
    RAISE NOTICE '✅ store_locations table exists';
  END IF;
END $$;

-- ============================================
-- 3. CREATE SAMPLE BRANCHES (IF NONE EXIST)
-- ============================================

DO $$
DECLARE
  branch_count INTEGER;
  main_branch_id UUID;
  downtown_branch_id UUID;
  uptown_branch_id UUID;
BEGIN
  -- Check if we have any branches
  SELECT COUNT(*) INTO branch_count FROM store_locations;
  
  IF branch_count = 0 THEN
    RAISE NOTICE '📍 Creating sample branches...';
    
    -- Main Branch
    INSERT INTO store_locations (
      name, code, address, city, state, country, phone, email, 
      manager_name, is_main, is_active, opening_time, closing_time
    ) VALUES (
      'Main Store', 'MAIN', '123 Main Street', 'Dar es Salaam', 'Dar es Salaam', 'Tanzania',
      '+255 123 456 789', 'main@store.com', 'John Manager', true, true, '08:00', '18:00'
    ) RETURNING id INTO main_branch_id;
    
    -- Downtown Branch
    INSERT INTO store_locations (
      name, code, address, city, state, country, phone, email,
      manager_name, is_main, is_active, opening_time, closing_time
    ) VALUES (
      'Downtown Branch', 'DT', '456 Downtown Ave', 'Dar es Salaam', 'Dar es Salaam', 'Tanzania',
      '+255 234 567 890', 'downtown@store.com', 'Jane Manager', false, true, '09:00', '19:00'
    ) RETURNING id INTO downtown_branch_id;
    
    -- Uptown Branch
    INSERT INTO store_locations (
      name, code, address, city, state, country, phone, email,
      manager_name, is_main, is_active, opening_time, closing_time
    ) VALUES (
      'Uptown Branch', 'UT', '789 Uptown Blvd', 'Dar es Salaam', 'Dar es Salaam', 'Tanzania',
      '+255 345 678 901', 'uptown@store.com', 'Bob Manager', false, true, '08:30', '18:30'
    ) RETURNING id INTO uptown_branch_id;
    
    RAISE NOTICE '✅ Sample branches created!';
    RAISE NOTICE '   - Main Store (ID: %)', main_branch_id;
    RAISE NOTICE '   - Downtown Branch (ID: %)', downtown_branch_id;
    RAISE NOTICE '   - Uptown Branch (ID: %)', uptown_branch_id;
  ELSE
    RAISE NOTICE '✅ % existing branches found', branch_count;
  END IF;
END $$;

-- ============================================
-- 4. VERIFY USERS TABLE
-- ============================================

DO $$
DECLARE
  user_count INTEGER;
BEGIN
  -- Check if we have any users
  SELECT COUNT(*) INTO user_count FROM users;
  
  IF user_count = 0 THEN
    RAISE NOTICE '⚠️  WARNING: No users found in the database!';
    RAISE NOTICE '   Please create users first before assigning branches.';
  ELSE
    RAISE NOTICE '✅ % users found in database', user_count;
  END IF;
END $$;

-- ============================================
-- 5. CREATE SAMPLE BRANCH ASSIGNMENTS
-- ============================================

-- Clear existing assignments for testing
TRUNCATE user_branch_assignments;

DO $$
DECLARE
  care_user_id UUID;
  manager_user_id UUID;
  tech_user_id UUID;
  main_branch_id UUID;
  downtown_branch_id UUID;
  uptown_branch_id UUID;
BEGIN
  -- Get user IDs
  SELECT id INTO care_user_id FROM users WHERE email = 'care@care.com' LIMIT 1;
  SELECT id INTO manager_user_id FROM users WHERE email = 'manager@pos.com' LIMIT 1;
  SELECT id INTO tech_user_id FROM users WHERE email = 'tech@pos.com' LIMIT 1;
  
  -- Get branch IDs
  SELECT id INTO main_branch_id FROM store_locations WHERE is_main = true LIMIT 1;
  SELECT id INTO downtown_branch_id FROM store_locations WHERE code = 'DT' LIMIT 1;
  SELECT id INTO uptown_branch_id FROM store_locations WHERE code = 'UT' LIMIT 1;
  
  IF care_user_id IS NOT NULL AND main_branch_id IS NOT NULL THEN
    -- Assign care@care.com to Main Branch (primary) and Downtown
    INSERT INTO user_branch_assignments (
      user_id, branch_id, is_primary, can_manage, can_view_reports, 
      can_manage_inventory, can_manage_staff
    ) VALUES
      (care_user_id, main_branch_id, true, true, true, true, true),
      (care_user_id, downtown_branch_id, false, false, true, false, false)
    ON CONFLICT (user_id, branch_id) DO NOTHING;
    
    RAISE NOTICE '✅ Assigned care@care.com to branches';
  END IF;
  
  IF manager_user_id IS NOT NULL AND downtown_branch_id IS NOT NULL THEN
    -- Assign manager to Downtown (primary)
    INSERT INTO user_branch_assignments (
      user_id, branch_id, is_primary, can_manage, can_view_reports,
      can_manage_inventory, can_manage_staff
    ) VALUES
      (manager_user_id, downtown_branch_id, true, true, true, true, true)
    ON CONFLICT (user_id, branch_id) DO NOTHING;
    
    RAISE NOTICE '✅ Assigned manager@pos.com to Downtown branch';
  END IF;
  
  IF tech_user_id IS NOT NULL AND uptown_branch_id IS NOT NULL THEN
    -- Assign technician to Uptown (primary)
    INSERT INTO user_branch_assignments (
      user_id, branch_id, is_primary, can_manage, can_view_reports,
      can_manage_inventory, can_manage_staff
    ) VALUES
      (tech_user_id, uptown_branch_id, true, false, false, true, false)
    ON CONFLICT (user_id, branch_id) DO NOTHING;
    
    RAISE NOTICE '✅ Assigned tech@pos.com to Uptown branch';
  END IF;
END $$;

-- ============================================
-- 6. VERIFICATION QUERIES
-- ============================================

SELECT '📊 VERIFICATION RESULTS' as info;

-- Show all branches
SELECT 
  '🏪 Branches' as category,
  COUNT(*) as count
FROM store_locations;

SELECT
  id,
  name,
  code,
  city,
  is_main,
  is_active,
  '✅' as status
FROM store_locations
ORDER BY is_main DESC, name;

-- Show all users and their branch assignments
SELECT 
  '👥 User Branch Assignments' as category,
  COUNT(*) as count
FROM user_branch_assignments;

SELECT
  u.email as user_email,
  u.role as user_role,
  sl.name as branch_name,
  sl.code as branch_code,
  uba.is_primary,
  uba.can_manage,
  uba.can_view_reports,
  '✅' as status
FROM user_branch_assignments uba
JOIN users u ON uba.user_id = u.id
JOIN store_locations sl ON uba.branch_id = sl.id
ORDER BY u.email, uba.is_primary DESC;

-- ============================================
-- 7. SUMMARY
-- ============================================

SELECT '🎉 USER BRANCH ASSIGNMENT SYSTEM READY!' as status;

DO $$
DECLARE
  branch_count INTEGER;
  user_count INTEGER;
  assignment_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO branch_count FROM store_locations;
  SELECT COUNT(*) INTO user_count FROM users;
  SELECT COUNT(*) INTO assignment_count FROM user_branch_assignments;
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════';
  RAISE NOTICE '           SETUP COMPLETE SUMMARY           ';
  RAISE NOTICE '═══════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Branches: % configured', branch_count;
  RAISE NOTICE '✅ Users: % in system', user_count;
  RAISE NOTICE '✅ Branch Assignments: % configured', assignment_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '1. Login to the application';
  RAISE NOTICE '2. Navigate to Users page (/users)';
  RAISE NOTICE '3. Click "Add User" or "Edit" on existing user';
  RAISE NOTICE '4. You will see "Branch Access" section';
  RAISE NOTICE '5. Assign users to branches or give access to all';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════';
END $$;

