-- ============================================
-- CREATE USERS TABLE AND ADMIN USER
-- This creates the users table and adds your admin user
-- ============================================

SELECT '🔧 Creating users table...' as status;

-- Drop table if it exists (to start fresh)
DROP TABLE IF EXISTS users CASCADE;

-- Create users table with proper structure
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'user',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Disable RLS for this table
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

SELECT '✅ Users table created!' as status;

-- ============================================
-- Insert admin user and other users
-- ============================================

SELECT '👤 Creating users...' as status;

INSERT INTO users (id, email, password, full_name, role, is_active) VALUES
  ('287ec561-d5f2-4113-840e-e9335b9d3f69', 'care@care.com', '123456', 'Admin User', 'admin', true),
  ('a780f924-8343-46ec-a127-d7477165b0a8', 'manager@pos.com', 'manager123', 'Manager User', 'manager', true),
  ('762f6db8-e738-480f-a9d3-9699c440e2d9', 'tech@pos.com', 'tech123456', 'Technician User', 'technician', true),
  ('4813e4c7-771e-43e9-a8fd-e69db13a3322', 'care@pos.com', 'care123456', 'Customer Care', 'customer-care', true);

SELECT '✅ Users created!' as status;

-- ============================================
-- Verify the users table
-- ============================================

SELECT '📋 All users in database:' as info;

SELECT 
  email,
  password,
  full_name,
  role,
  is_active,
  '✅ Ready' as status
FROM users
ORDER BY 
  CASE role
    WHEN 'admin' THEN 1
    WHEN 'manager' THEN 2
    WHEN 'technician' THEN 3
    WHEN 'customer-care' THEN 4
    ELSE 5
  END;

-- ============================================
-- Done!
-- ============================================

SELECT '🎉 USERS TABLE CREATED SUCCESSFULLY!' as result;
SELECT '' as blank;
SELECT '🔐 ADMIN LOGIN CREDENTIALS:' as title;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator;
SELECT '📧 Email:    care@care.com' as credential_1;
SELECT '🔑 Password: 123456' as credential_2;
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separator2;
SELECT '' as blank2;
SELECT '💡 Refresh your app and log in with these credentials!' as next_step;
SELECT '✅ The users table is now created and ready!' as final_message;

