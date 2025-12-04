-- Fix array column defaults to prevent "cannot determine type of empty array" errors
-- Run this migration if you've already created the whatsapp_advanced_features tables

-- Update whatsapp_media_library tags column
ALTER TABLE whatsapp_media_library 
  ALTER COLUMN tags SET DEFAULT '{}'::TEXT[];

-- Update existing NULL values to empty arrays
UPDATE whatsapp_media_library 
  SET tags = '{}'::TEXT[] 
  WHERE tags IS NULL;

-- Update whatsapp_reply_templates keywords column
ALTER TABLE whatsapp_reply_templates 
  ALTER COLUMN keywords SET DEFAULT '{}'::TEXT[];

-- Update existing NULL values to empty arrays
UPDATE whatsapp_reply_templates 
  SET keywords = '{}'::TEXT[] 
  WHERE keywords IS NULL;

-- Verify the changes
SELECT 
  table_name, 
  column_name, 
  column_default,
  is_nullable
FROM information_schema.columns 
WHERE table_name IN ('whatsapp_media_library', 'whatsapp_reply_templates')
  AND column_name IN ('tags', 'keywords')
ORDER BY table_name, column_name;

