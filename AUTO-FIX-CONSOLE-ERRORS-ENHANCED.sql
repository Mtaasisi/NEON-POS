-- ============================================================================
-- AUTOMATED CONSOLE ERROR FIXES
-- ============================================================================
-- Generated: 2025-10-09T08:45:59.891Z
-- Total Console Errors: 2097
-- Column Errors Fixed: 4
--
-- INSTRUCTIONS:
-- 1. Review the fixes below
-- 2. Adjust column types if needed
-- 3. Run in your Neon database
-- 4. Refresh the application
-- ============================================================================


-- ============================================================================
-- Table: whatsapp_instances_comprehensive
-- ============================================================================

-- Missing in 11 queries
ALTER TABLE whatsapp_instances_comprehensive ADD COLUMN IF NOT EXISTS user_id UUID;


-- ============================================================================
-- Table: devices
-- ============================================================================

-- Missing in 11 queries
ALTER TABLE devices ADD COLUMN IF NOT EXISTS issue_description TEXT;


-- ============================================================================
-- Table: user_daily_goals
-- ============================================================================

-- Missing in 13 queries
ALTER TABLE user_daily_goals ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false;


-- ============================================================================
-- Table: lats_product_variants
-- ============================================================================

-- Missing in 1 queries
ALTER TABLE lats_product_variants ADD COLUMN IF NOT EXISTS selling_price DECIMAL(10,2) DEFAULT 0;


-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify whatsapp_instances_comprehensive columns
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'whatsapp_instances_comprehensive'
ORDER BY ordinal_position;

-- Verify devices columns
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'devices'
ORDER BY ordinal_position;

-- Verify user_daily_goals columns
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'user_daily_goals'
ORDER BY ordinal_position;

-- Verify lats_product_variants columns
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'lats_product_variants'
ORDER BY ordinal_position;


-- ============================================================================
-- ADDITIONAL COMMON FIXES
-- ============================================================================

-- Fix for devices table (common errors found)
ALTER TABLE devices ADD COLUMN IF NOT EXISTS issue_description TEXT;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS device_condition TEXT;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS unlock_code TEXT;

-- Fix for whatsapp tables (user_id column)
ALTER TABLE whatsapp_instances_comprehensive ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS user_id UUID;

-- Fix for common is_active columns
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Fix for pricing columns
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS selling_price DECIMAL(10,2) DEFAULT 0;
ALTER TABLE lats_products ADD COLUMN IF NOT EXISTS selling_price DECIMAL(10,2) DEFAULT 0;

