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

-- Step 3: Create an admin user
INSERT INTO users (email, password, full_name, role, is_active, created_at, updated_at)
VALUES (
  'admin@pos.com',
  'admin123456',
  'Admin User',
  'admin',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE 
SET password = EXCLUDED.password, 
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    updated_at = NOW()
RETURNING *;

-- Step 4: Create a manager user
INSERT INTO users (email, password, full_name, role, is_active, created_at, updated_at)
VALUES (
  'manager@pos.com',
  'manager123',
  'Manager User',
  'manager',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE 
SET password = EXCLUDED.password, 
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    updated_at = NOW()
RETURNING *;

-- Step 5: Create a technician user
INSERT INTO users (email, password, full_name, role, is_active, created_at, updated_at)
VALUES (
  'tech@pos.com',
  'tech123456',
  'Technician User',
  'technician',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE 
SET password = EXCLUDED.password, 
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    updated_at = NOW()
RETURNING *;

-- Step 6: Create a customer care user
INSERT INTO users (email, password, full_name, role, is_active, created_at, updated_at)
VALUES (
  'care@pos.com',
  'care123456',
  'Customer Care',
  'customer-care',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE 
SET password = EXCLUDED.password, 
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    updated_at = NOW()
RETURNING *;

-- Step 7: View all users
SELECT id, email, full_name, role, is_active, created_at FROM users ORDER BY created_at DESC;

-- ============================================================
-- MANAGE SPECIFIC USER: 3da0df92-6f63-4ee2-b33d-3aa56e90d31d
-- ============================================================

-- View this specific user
SELECT * FROM users WHERE id = '3da0df92-6f63-4ee2-b33d-3aa56e90d31d';

-- Update this user's role to admin
UPDATE users 
SET role = 'admin', updated_at = NOW()
WHERE id = '3da0df92-6f63-4ee2-b33d-3aa56e90d31d'
RETURNING *;

-- Update this user's password
UPDATE users 
SET password = 'newpassword123', updated_at = NOW()
WHERE id = '3da0df92-6f63-4ee2-b33d-3aa56e90d31d'
RETURNING *;

-- Update this user's full name
UPDATE users 
SET full_name = 'Admin User', updated_at = NOW()
WHERE id = '3da0df92-6f63-4ee2-b33d-3aa56e90d31d'
RETURNING *;

-- Activate/Deactivate this user
UPDATE users 
SET is_active = true, updated_at = NOW()
WHERE id = '3da0df92-6f63-4ee2-b33d-3aa56e90d31d'
RETURNING *;

-- Delete this user (if needed)
-- DELETE FROM users WHERE id = '3da0df92-6f63-4ee2-b33d-3aa56e90d31d';

-- Check if user exists in auth_users table too
SELECT * FROM auth_users WHERE id = '3da0df92-6f63-4ee2-b33d-3aa56e90d31d';

-- Create matching auth_users record if needed
INSERT INTO auth_users (id, email, username, name, role, is_active, created_at, updated_at)
SELECT id, email, email, full_name, role, is_active, created_at, updated_at
FROM users 
WHERE id = '3da0df92-6f63-4ee2-b33d-3aa56e90d31d'
ON CONFLICT (id) DO UPDATE 
SET email = EXCLUDED.email,
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    is_active = EXCLUDED.is_active,
    updated_at = NOW()
RETURNING *;

-- ============================================
-- USER DAILY GOALS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_daily_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

CREATE POLICY "Admins can insert all goals"
    ON user_daily_goals FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

CREATE POLICY "Admins can update all goals"
    ON user_daily_goals FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

CREATE POLICY "Admins can delete all goals"
    ON user_daily_goals FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- ============================================
-- MAKE admin@pos.com AN ADMIN
-- ============================================

-- Update admin@pos.com to admin role
UPDATE users 
SET role = 'admin', 
    full_name = 'Admin User',
    is_active = true,
    updated_at = NOW()
WHERE email = 'admin@pos.com'
RETURNING *;

-- Also update in auth_users table if exists
UPDATE auth_users 
SET role = 'admin', 
    is_active = true,
    updated_at = NOW()
WHERE email = 'admin@pos.com'
RETURNING *;

-- Verify the admin user
SELECT id, email, full_name, role, is_active, created_at 
FROM users 
WHERE email = 'admin@pos.com';

