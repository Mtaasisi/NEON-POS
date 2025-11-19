-- ================================================
-- VERIFY AND CREATE TEST USERS FOR LOGIN
-- ================================================
-- This script checks existing users and creates test users if needed
-- Run this to fix login issues
-- ================================================

-- First, let's see what users exist
SELECT 
    email,
    password,
    full_name,
    role,
    is_active,
    created_at
FROM users
ORDER BY email;

-- Check if test users exist
DO $$
DECLARE
    test_user_count INTEGER;
BEGIN
    -- Count existing test users
    SELECT COUNT(*) INTO test_user_count
    FROM users
    WHERE email IN ('care@care.com', 'admin@pos.com', 'tech@pos.com', 'manager@pos.com');
    
    RAISE NOTICE 'Found % test users', test_user_count;
    
    -- If no users exist or test users are missing, create them
    IF test_user_count < 4 THEN
        RAISE NOTICE 'Creating missing test users...';
        
        -- Insert or update care@care.com (admin)
        INSERT INTO users (
            id,
            email,
            password,
            full_name,
            username,
            role,
            is_active,
            permissions,
            max_devices_allowed,
            branch_id,
            created_at,
            updated_at
        ) VALUES (
            '287ec561-d5f2-4113-840e-e9335b9d3f69',
            'care@care.com',
            '123456',
            'Admin User',
            'care',
            'admin',
            true,
            ARRAY['all'],
            1000,
            '00000000-0000-0000-0000-000000000001',
            NOW(),
            NOW()
        )
        ON CONFLICT (email) DO UPDATE SET
            password = EXCLUDED.password,
            is_active = true,
            updated_at = NOW();
        
        -- Insert or update admin@pos.com (admin)
        INSERT INTO users (
            email,
            password,
            full_name,
            username,
            role,
            is_active,
            permissions,
            max_devices_allowed,
            branch_id,
            created_at,
            updated_at
        ) VALUES (
            'admin@pos.com',
            'admin123',
            'Admin User',
            'admin',
            'admin',
            true,
            ARRAY['all'],
            1000,
            '00000000-0000-0000-0000-000000000001',
            NOW(),
            NOW()
        )
        ON CONFLICT (email) DO UPDATE SET
            password = EXCLUDED.password,
            is_active = true,
            updated_at = NOW();
        
        -- Insert or update tech@pos.com (technician)
        INSERT INTO users (
            email,
            password,
            full_name,
            username,
            role,
            is_active,
            permissions,
            max_devices_allowed,
            branch_id,
            created_at,
            updated_at
        ) VALUES (
            'tech@pos.com',
            'tech123',
            'Technician User',
            'tech',
            'technician',
            true,
            ARRAY['all'],
            1000,
            '00000000-0000-0000-0000-000000000001',
            NOW(),
            NOW()
        )
        ON CONFLICT (email) DO UPDATE SET
            password = EXCLUDED.password,
            is_active = true,
            updated_at = NOW();
        
        -- Insert or update manager@pos.com (manager)
        INSERT INTO users (
            email,
            password,
            full_name,
            username,
            role,
            is_active,
            permissions,
            max_devices_allowed,
            branch_id,
            created_at,
            updated_at
        ) VALUES (
            'manager@pos.com',
            'manager123',
            'Manager User',
            'manager',
            'manager',
            true,
            ARRAY['all'],
            1000,
            '00000000-0000-0000-0000-000000000001',
            NOW(),
            NOW()
        )
        ON CONFLICT (email) DO UPDATE SET
            password = EXCLUDED.password,
            is_active = true,
            updated_at = NOW();
        
        RAISE NOTICE 'Test users created/updated successfully!';
    END IF;
END $$;

-- Verify the users were created
SELECT 
    email,
    password,
    full_name,
    role,
    is_active
FROM users
WHERE email IN ('care@care.com', 'admin@pos.com', 'tech@pos.com', 'manager@pos.com')
ORDER BY email;

-- Show test credentials
SELECT 
    '=== TEST CREDENTIALS ===' as info
UNION ALL
SELECT 'Email: care@care.com | Password: 123456 | Role: admin'
UNION ALL
SELECT 'Email: admin@pos.com | Password: admin123 | Role: admin'
UNION ALL
SELECT 'Email: tech@pos.com | Password: tech123 | Role: technician'
UNION ALL
SELECT 'Email: manager@pos.com | Password: manager123 | Role: manager';

