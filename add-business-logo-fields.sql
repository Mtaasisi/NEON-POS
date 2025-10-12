-- ============================================
-- Add Business Logo and Information Fields
-- ============================================
-- This script adds business information fields to general_settings table
-- Run this to ensure all business fields are available

-- Check if columns exist and add them if they don't
DO $$ 
BEGIN
    -- Add business_name if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'general_settings' AND column_name = 'business_name'
    ) THEN
        ALTER TABLE general_settings ADD COLUMN business_name TEXT DEFAULT 'My Store';
    END IF;

    -- Add business_address if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'general_settings' AND column_name = 'business_address'
    ) THEN
        ALTER TABLE general_settings ADD COLUMN business_address TEXT DEFAULT '';
    END IF;

    -- Add business_phone if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'general_settings' AND column_name = 'business_phone'
    ) THEN
        ALTER TABLE general_settings ADD COLUMN business_phone TEXT DEFAULT '';
    END IF;

    -- Add business_email if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'general_settings' AND column_name = 'business_email'
    ) THEN
        ALTER TABLE general_settings ADD COLUMN business_email TEXT DEFAULT '';
    END IF;

    -- Add business_logo if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'general_settings' AND column_name = 'business_logo'
    ) THEN
        ALTER TABLE general_settings ADD COLUMN business_logo TEXT;
    END IF;

    -- Add business_website if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'general_settings' AND column_name = 'business_website'
    ) THEN
        ALTER TABLE general_settings ADD COLUMN business_website TEXT DEFAULT '';
    END IF;
END $$;

-- Success message
SELECT 'Business information fields added/verified successfully!' as status;

-- Display current general_settings structure
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'general_settings'
ORDER BY ordinal_position;

