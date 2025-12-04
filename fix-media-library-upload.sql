-- ============================================
-- Quick Fix: Add missing increment_media_usage function
-- ============================================
-- Run this in your database SQL editor (Neon, Supabase, etc.)
-- This fixes the "function increment_media_usage(uuid) does not exist" error

-- Create the function
CREATE OR REPLACE FUNCTION increment_media_usage(media_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE whatsapp_media_library
  SET 
    usage_count = COALESCE(usage_count, 0) + 1,
    last_used_at = NOW(),
    updated_at = NOW()
  WHERE id = media_id;
END;
$$ LANGUAGE plpgsql;

-- Verify function was created
SELECT 
  'increment_media_usage' as function_name,
  'Created successfully!' as status;

-- Show current media library items
SELECT 
  id,
  name,
  file_type,
  folder,
  usage_count,
  last_used_at,
  created_at
FROM whatsapp_media_library
ORDER BY created_at DESC;

