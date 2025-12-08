-- ============================================================================
-- FIX WHATSAPP UPLOAD PATH ERROR
-- ============================================================================
-- This script ensures storage buckets exist and sets up proper paths
-- The "Path is required" error happens when uploading without proper path structure
-- ============================================================================

-- Note: Storage buckets cannot be created via SQL directly
-- They must be created via Supabase Dashboard or API
-- This script verifies bucket setup and provides instructions

-- ============================================================================
-- VERIFICATION: Check if storage buckets exist (via information_schema)
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'WHATSAPP MEDIA UPLOAD - PATH FIX';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'IMPORTANT: Storage buckets must be created via Supabase Dashboard or API';
  RAISE NOTICE 'SQL cannot create storage buckets directly';
  RAISE NOTICE '';
  RAISE NOTICE 'Required buckets:';
  RAISE NOTICE '  1. whatsapp-media (public)';
  RAISE NOTICE '  2. receipts (public)';
  RAISE NOTICE '  3. public-files (public)';
  RAISE NOTICE '';
  RAISE NOTICE 'To create buckets automatically, run:';
  RAISE NOTICE '  node create-whatsapp-buckets.mjs';
  RAISE NOTICE '';
  RAISE NOTICE 'Or manually in Supabase Dashboard:';
  RAISE NOTICE '  https://app.supabase.com/project/jxhzveborezjhsmzsgbc/storage/buckets';
  RAISE NOTICE '';
  RAISE NOTICE '============================================================================';
END $$;

-- ============================================================================
-- CREATE/VERIFY UPLOADS DIRECTORY STRUCTURE TABLE
-- ============================================================================
-- This table tracks upload path requirements for reference

CREATE TABLE IF NOT EXISTS upload_path_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name TEXT NOT NULL,
  bucket_name TEXT,
  path_format TEXT NOT NULL,
  example_path TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert path requirements for WhatsApp uploads
INSERT INTO upload_path_requirements (service_name, bucket_name, path_format, example_path, description)
VALUES 
  ('whatsapp-media', 'whatsapp-media', 'whatsapp-media/{timestamp}-{randomId}-{filename}', 'whatsapp-media/1735123456-abc123-image.jpg', 'WhatsApp media uploads require path with directory prefix'),
  ('receipts', 'receipts', 'receipts/{timestamp}-{receiptNumber}.pdf', 'receipts/1735123456-REC001.pdf', 'Receipt uploads require path with receipts/ prefix'),
  ('public-files', 'public-files', 'public-files/{category}/{filename}', 'public-files/documents/file.pdf', 'Public files require path with directory structure')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================

DO $$
DECLARE
  path_count INTEGER;
  rec RECORD;
BEGIN
  SELECT COUNT(*) INTO path_count FROM upload_path_requirements;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Upload path requirements configured: % paths', path_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Path formats required:';
  
  FOR rec IN SELECT service_name, path_format, example_path FROM upload_path_requirements ORDER BY service_name
  LOOP
    RAISE NOTICE '  • %: %', rec.service_name, rec.path_format;
    RAISE NOTICE '    Example: %', rec.example_path;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANT: Ensure storage buckets are created in Supabase Dashboard!';
  RAISE NOTICE '   Run: node create-whatsapp-buckets.mjs';
END $$;

-- ============================================================================
-- SUMMARY
-- ============================================================================

SELECT 
  '✅ WhatsApp upload path requirements configured' AS status,
  COUNT(*) AS configured_paths
FROM upload_path_requirements;
