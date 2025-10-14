-- ============================================
-- ADD SETTINGS COLUMN TO WHATSAPP INSTANCES
-- ============================================
-- This adds a JSONB column to store Green API settings

-- Add settings column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'whatsapp_instances' 
        AND column_name = 'settings'
    ) THEN
        ALTER TABLE whatsapp_instances 
        ADD COLUMN settings JSONB DEFAULT '{}'::jsonb;
        
        RAISE NOTICE '✅ Added settings column to whatsapp_instances';
    ELSE
        RAISE NOTICE '⚠️  Settings column already exists in whatsapp_instances';
    END IF;
END $$;

-- Verify the column was added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'whatsapp_instances'
AND column_name = 'settings';

-- Show success message
SELECT '✅ WhatsApp instances table is ready with settings column!' as result;

