-- SQL to create users in Neon database
-- Run this directly in your Neon SQL Editor

-- Create auth_users table (the main user table)
CREATE TABLE IF NOT EXISTS auth_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password TEXT,
  username TEXT,
  name TEXT,
  role TEXT DEFAULT 'technician',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create default users
-- Admin user
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
SET password = EXCLUDED.password, 
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    updated_at = NOW()
RETURNING *;

-- Manager user
INSERT INTO auth_users (email, password, username, name, role, is_active, created_at, updated_at)
VALUES (
  'manager@pos.com',
  'manager123',
  'manager',
  'Manager User',
  'manager',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE 
SET password = EXCLUDED.password, 
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    updated_at = NOW()
RETURNING *;

-- Technician user
INSERT INTO auth_users (email, password, username, name, role, is_active, created_at, updated_at)
VALUES (
  'tech@pos.com',
  'tech123456',
  'tech',
  'Technician User',
  'technician',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE 
SET password = EXCLUDED.password, 
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    updated_at = NOW()
RETURNING *;

-- Customer care user
INSERT INTO auth_users (email, password, username, name, role, is_active, created_at, updated_at)
VALUES (
  'care@pos.com',
  'care123456',
  'care',
  'Customer Care',
  'customer-care',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE 
SET password = EXCLUDED.password, 
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    updated_at = NOW()
RETURNING *;

-- View all users
SELECT id, email, name, role, is_active, created_at FROM auth_users ORDER BY created_at DESC;

-- ============================================================
-- MANAGE SPECIFIC USER BY ID
-- ============================================================

-- View a specific user by ID (replace with actual ID)
-- SELECT * FROM auth_users WHERE id = 'your-user-id-here';

-- Update user role to admin by ID
-- UPDATE auth_users 
-- SET role = 'admin', updated_at = NOW()
-- WHERE id = 'your-user-id-here'
-- RETURNING *;

-- Update user password by ID
-- UPDATE auth_users 
-- SET password = 'newpassword123', updated_at = NOW()
-- WHERE id = 'your-user-id-here'
-- RETURNING *;

-- Update user name by ID
-- UPDATE auth_users 
-- SET name = 'Admin User', updated_at = NOW()
-- WHERE id = 'your-user-id-here'
-- RETURNING *;

-- Activate/Deactivate user by ID
-- UPDATE auth_users 
-- SET is_active = true, updated_at = NOW()
-- WHERE id = 'your-user-id-here'
-- RETURNING *;

-- Delete user by ID (use with caution)
-- DELETE FROM auth_users WHERE id = 'your-user-id-here';

-- ============================================
-- USER DAILY GOALS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_daily_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    goal_type VARCHAR(50) NOT NULL CHECK (goal_type IN ('new_customers', 'devices_repaired', 'revenue', 'calls_made', 'appointments_scheduled')),
    goal_value INTEGER NOT NULL DEFAULT 5,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, goal_type)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_daily_goals_user_id ON user_daily_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_user_daily_goals_active ON user_daily_goals(user_id, is_active);

-- Enable RLS for user_daily_goals
ALTER TABLE user_daily_goals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_daily_goals
CREATE POLICY "Users can view their own goals"
    ON user_daily_goals FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own goals"
    ON user_daily_goals FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals"
    ON user_daily_goals FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own goals"
    ON user_daily_goals FOR DELETE
    USING (auth.uid() = user_id);

-- Admins can manage all goals
CREATE POLICY "Admins can view all goals"
    ON user_daily_goals FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM auth_users 
            WHERE auth_users.id = auth.uid() 
            AND auth_users.role = 'admin'
        )
    );

CREATE POLICY "Admins can insert all goals"
    ON user_daily_goals FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM auth_users 
            WHERE auth_users.id = auth.uid() 
            AND auth_users.role = 'admin'
        )
    );

CREATE POLICY "Admins can update all goals"
    ON user_daily_goals FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM auth_users 
            WHERE auth_users.id = auth.uid() 
            AND auth_users.role = 'admin'
        )
    );

CREATE POLICY "Admins can delete all goals"
    ON user_daily_goals FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM auth_users 
            WHERE auth_users.id = auth.uid() 
            AND auth_users.role = 'admin'
        )
    );

-- ============================================
-- MAKE admin@pos.com AN ADMIN
-- ============================================

-- Update admin@pos.com to admin role
UPDATE auth_users 
SET role = 'admin', 
    name = 'Admin User',
    is_active = true,
    updated_at = NOW()
WHERE email = 'admin@pos.com'
RETURNING *;

-- Verify the admin user
SELECT id, email, name, role, is_active, created_at 
FROM auth_users 
WHERE email = 'admin@pos.com';

