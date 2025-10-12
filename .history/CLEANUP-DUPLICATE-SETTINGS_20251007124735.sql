-- ============================================
-- CLEANUP DUPLICATE SETTINGS RECORDS
-- Run this to remove duplicate settings records
-- ============================================

-- This script will:
-- 1. Find all duplicate settings records (where you have multiple records per user)
-- 2. Keep only the MOST RECENT record for each user
-- 3. Delete all older duplicates

-- ============================================
-- Step 1: Check for duplicates
-- ============================================

SELECT '========== CHECKING FOR DUPLICATE SETTINGS ==========' as status;

-- Check general_settings
SELECT 
  'general_settings' as table_name,
  user_id,
  COUNT(*) as duplicate_count
FROM general_settings
GROUP BY user_id
HAVING COUNT(*) > 1;

-- Check all settings tables for duplicates
DO $$
DECLARE
  table_record RECORD;
  duplicate_count INTEGER;
BEGIN
  FOR table_record IN 
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name LIKE '%_settings'
  LOOP
    EXECUTE format('
      SELECT COUNT(*) 
      FROM (
        SELECT user_id, COUNT(*) as cnt
        FROM %I
        GROUP BY user_id
        HAVING COUNT(*) > 1
      ) duplicates
    ', table_record.table_name) INTO duplicate_count;
    
    IF duplicate_count > 0 THEN
      RAISE NOTICE '⚠️ Table % has % users with duplicate records', table_record.table_name, duplicate_count;
    ELSE
      RAISE NOTICE '✅ Table % has no duplicates', table_record.table_name;
    END IF;
  END LOOP;
END $$;

-- ============================================
-- Step 2: Clean up duplicates (SAFE - keeps most recent)
-- ============================================

SELECT '========== CLEANING UP DUPLICATES ==========' as status;

-- Function to clean up duplicates for any settings table
CREATE OR REPLACE FUNCTION cleanup_settings_duplicates(table_name text)
RETURNS void AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete all records except the most recent one per user
  EXECUTE format('
    DELETE FROM %I
    WHERE id IN (
      SELECT id
      FROM (
        SELECT id,
               ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST) as rn
        FROM %I
      ) ranked
      WHERE rn > 1
    )
  ', table_name, table_name);
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  IF deleted_count > 0 THEN
    RAISE NOTICE '✅ Deleted % duplicate records from %', deleted_count, table_name;
  ELSE
    RAISE NOTICE '✅ No duplicates found in %', table_name;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Clean up all settings tables
DO $$
DECLARE
  table_record RECORD;
BEGIN
  FOR table_record IN 
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name LIKE '%_settings'
    ORDER BY table_name
  LOOP
    RAISE NOTICE '🧹 Cleaning up %...', table_record.table_name;
    PERFORM cleanup_settings_duplicates(table_record.table_name);
  END LOOP;
END $$;

-- ============================================
-- Step 3: Verify cleanup
-- ============================================

SELECT '========== VERIFICATION ==========' as status;

-- Check that no duplicates remain
DO $$
DECLARE
  table_record RECORD;
  duplicate_count INTEGER;
  total_records INTEGER;
BEGIN
  FOR table_record IN 
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name LIKE '%_settings'
  LOOP
    -- Check for duplicates
    EXECUTE format('
      SELECT COUNT(*) 
      FROM (
        SELECT user_id, COUNT(*) as cnt
        FROM %I
        GROUP BY user_id
        HAVING COUNT(*) > 1
      ) duplicates
    ', table_record.table_name) INTO duplicate_count;
    
    -- Get total record count
    EXECUTE format('SELECT COUNT(*) FROM %I', table_record.table_name) INTO total_records;
    
    IF duplicate_count > 0 THEN
      RAISE NOTICE '❌ Table % still has duplicates!', table_record.table_name;
    ELSE
      RAISE NOTICE '✅ Table % is clean (% total records)', table_record.table_name, total_records;
    END IF;
  END LOOP;
END $$;

-- ============================================
-- Step 4: Create unique constraint to prevent future duplicates
-- ============================================

SELECT '========== CREATING UNIQUE CONSTRAINTS ==========' as status;

-- Add unique constraints to prevent duplicate settings per user
DO $$
DECLARE
  table_record RECORD;
BEGIN
  FOR table_record IN 
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name LIKE '%_settings'
  LOOP
    -- Check if constraint already exists
    IF NOT EXISTS (
      SELECT 1 
      FROM pg_constraint 
      WHERE conname = table_record.table_name || '_user_id_unique'
    ) THEN
      BEGIN
        EXECUTE format('
          ALTER TABLE %I 
          ADD CONSTRAINT %I UNIQUE (user_id)
        ', table_record.table_name, table_record.table_name || '_user_id_unique');
        
        RAISE NOTICE '✅ Added unique constraint to %', table_record.table_name;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '⚠️ Could not add constraint to % (may already exist or have issues)', table_record.table_name;
      END;
    ELSE
      RAISE NOTICE '✅ Unique constraint already exists on %', table_record.table_name;
    END IF;
  END LOOP;
END $$;

-- Drop the cleanup function (no longer needed)
DROP FUNCTION IF EXISTS cleanup_settings_duplicates(text);

SELECT '🎉 CLEANUP COMPLETE!' as summary;
SELECT 'Run your app again and the duplicate settings warning should be gone!' as next_step;

