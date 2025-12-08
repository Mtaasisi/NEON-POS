-- ================================================
-- FIX: WhatsApp Storage Buckets Policies
-- ================================================
-- This SQL script sets up storage policies for WhatsApp media uploads
-- 
-- IMPORTANT: Run this AFTER creating the storage buckets in Supabase Dashboard
-- 
-- Buckets to create first (via Dashboard):
-- 1. whatsapp-media (public)
-- 2. receipts (public)
-- 3. public-files (public)
-- ================================================
-- 
-- Run this in Supabase SQL Editor:
-- URL: https://app.supabase.com/project/jxhzveborezjhsmzsgbc/sql/new
-- ================================================

BEGIN;

-- ================================================
-- STEP 1: Drop existing policies (if any)
-- ================================================

DROP POLICY IF EXISTS "Allow authenticated uploads whatsapp-media" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads receipts" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads public-files" ON storage.objects;

DROP POLICY IF EXISTS "Allow authenticated reads whatsapp-media" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated reads receipts" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated reads public-files" ON storage.objects;

DROP POLICY IF EXISTS "Allow public reads whatsapp-media" ON storage.objects;
DROP POLICY IF EXISTS "Allow public reads receipts" ON storage.objects;
DROP POLICY IF EXISTS "Allow public reads public-files" ON storage.objects;

-- ================================================
-- STEP 2: Create policies for whatsapp-media bucket
-- ================================================

-- Allow authenticated users to upload
CREATE POLICY "Allow authenticated uploads whatsapp-media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'whatsapp-media');

-- Allow authenticated users to read
CREATE POLICY "Allow authenticated reads whatsapp-media"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'whatsapp-media');

-- Allow public to read (since bucket is public)
CREATE POLICY "Allow public reads whatsapp-media"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'whatsapp-media');

-- Allow authenticated users to delete
CREATE POLICY "Allow authenticated deletes whatsapp-media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'whatsapp-media');

-- ================================================
-- STEP 3: Create policies for receipts bucket
-- ================================================

-- Allow authenticated users to upload
CREATE POLICY "Allow authenticated uploads receipts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'receipts');

-- Allow authenticated users to read
CREATE POLICY "Allow authenticated reads receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'receipts');

-- Allow public to read (since bucket is public)
CREATE POLICY "Allow public reads receipts"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'receipts');

-- Allow authenticated users to delete
CREATE POLICY "Allow authenticated deletes receipts"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'receipts');

-- ================================================
-- STEP 4: Create policies for public-files bucket
-- ================================================

-- Allow authenticated users to upload
CREATE POLICY "Allow authenticated uploads public-files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'public-files');

-- Allow authenticated users to read
CREATE POLICY "Allow authenticated reads public-files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'public-files');

-- Allow public to read (since bucket is public)
CREATE POLICY "Allow public reads public-files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'public-files');

-- Allow authenticated users to delete
CREATE POLICY "Allow authenticated deletes public-files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'public-files');

COMMIT;

-- ================================================
-- ✅ DONE! 
-- ================================================
-- Storage policies created for:
-- 1. ✅ whatsapp-media bucket
-- 2. ✅ receipts bucket
-- 3. ✅ public-files bucket
-- 
-- Next: Create the buckets in Supabase Dashboard if they don't exist yet
-- ================================================
