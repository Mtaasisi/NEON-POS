-- SQL to create users in Neon database
-- Run this directly in your Neon SQL Editor

-- Create an admin user
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
RETURNING *;

-- Create a manager user
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
RETURNING *;

-- Create a technician user
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
RETURNING *;

-- Create a customer care user
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
RETURNING *;

-- View all users
SELECT id, email, full_name, role, is_active, created_at FROM users ORDER BY created_at DESC;

