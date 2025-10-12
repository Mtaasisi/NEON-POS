-- Quick fix for admin@pos.com role
-- Run this in your Neon SQL Editor

-- First, check if the user exists
SELECT id, email, name, role, is_active, created_at 
FROM auth_users 
WHERE email = 'admin@pos.com';

-- If the user exists but has wrong role, update it
UPDATE auth_users 
SET role = 'admin', 
    name = 'Admin User',
    is_active = true,
    updated_at = NOW()
WHERE email = 'admin@pos.com'
RETURNING *;

-- If the user doesn't exist, create it
INSERT INTO auth_users (email, password, username, name, role, is_active, created_at, updated_at)
VALUES (
  'admin@pos.com',
  'admin123456',
  'admin',
  'Admin User',
  'admin',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE 
SET role = 'admin',
    name = 'Admin User',
    is_active = true,
    updated_at = NOW()
RETURNING *;

-- Verify the admin user is correct
SELECT id, email, name, role, is_active, created_at 
FROM auth_users 
WHERE email = 'admin@pos.com';

-- Show all users to verify
SELECT id, email, name, role, is_active FROM auth_users ORDER BY created_at DESC;
