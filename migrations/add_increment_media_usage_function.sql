-- ============================================
-- Fix: Add missing increment_media_usage function
-- ============================================
-- This function increments the usage count for media library items
-- Called when media is selected from the library for bulk messages

CREATE OR REPLACE FUNCTION increment_media_usage(media_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE whatsapp_media_library
  SET 
    usage_count = usage_count + 1,
    last_used_at = NOW(),
    updated_at = NOW()
  WHERE id = media_id;
END;
$$ LANGUAGE plpgsql;

-- Test the function
DO $$
DECLARE
  test_media_id UUID;
BEGIN
  -- Get the first media item
  SELECT id INTO test_media_id 
  FROM whatsapp_media_library 
  LIMIT 1;
  
  IF test_media_id IS NOT NULL THEN
    RAISE NOTICE 'Testing increment_media_usage function with media_id: %', test_media_id;
    PERFORM increment_media_usage(test_media_id);
    RAISE NOTICE '✅ Function test successful!';
  ELSE
    RAISE NOTICE 'No media items in library yet - function created but not tested';
  END IF;
END;
$$;

SELECT '✅ increment_media_usage function created successfully!' as status;

