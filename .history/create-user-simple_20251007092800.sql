-- SQL to create users in Neon database
-- Run this directly in your Neon SQL Editor

-- Step 1: Create the users table if it doesn't exist
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'user',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Create auth_users table if it doesn't exist (for compatibility)
CREATE TABLE IF NOT EXISTS auth_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
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

