-- ============================================
-- SIMPLE BUSINESS LOGO SETUP (Neon Compatible)
-- ============================================
-- This version is optimized for Neon Database
-- Safe to run multiple times
-- ============================================

-- Check which table exists and add fields
DO $$ 
BEGIN
  -- Try to add columns to general_settings
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'general_settings') THEN
    
    RAISE NOTICE 'Found general_settings table';
    
    -- Add business_name
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'general_settings' AND column_name = 'business_name') THEN
      ALTER TABLE general_settings ADD COLUMN business_name TEXT DEFAULT 'My Store';
      RAISE NOTICE 'Added business_name';
    END IF;
    
    -- Add business_address
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'general_settings' AND column_name = 'business_address') THEN
      ALTER TABLE general_settings ADD COLUMN business_address TEXT DEFAULT '';
      RAISE NOTICE 'Added business_address';
    END IF;
    
    -- Add business_phone
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'general_settings' AND column_name = 'business_phone') THEN
      ALTER TABLE general_settings ADD COLUMN business_phone TEXT DEFAULT '';
      RAISE NOTICE 'Added business_phone';
    END IF;
    
    -- Add business_email
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'general_settings' AND column_name = 'business_email') THEN
      ALTER TABLE general_settings ADD COLUMN business_email TEXT DEFAULT '';
      RAISE NOTICE 'Added business_email';
    END IF;
    
    -- Add business_website
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'general_settings' AND column_name = 'business_website') THEN
      ALTER TABLE general_settings ADD COLUMN business_website TEXT DEFAULT '';
      RAISE NOTICE 'Added business_website';
    END IF;
    
    -- Add business_logo
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'general_settings' AND column_name = 'business_logo') THEN
      ALTER TABLE general_settings ADD COLUMN business_logo TEXT;
      RAISE NOTICE 'Added business_logo';
    END IF;
    
    RAISE NOTICE 'SUCCESS: general_settings updated!';
    
  -- Try lats_pos_general_settings
  ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lats_pos_general_settings') THEN
    
    RAISE NOTICE 'Found lats_pos_general_settings table';
    
    -- Add business_name
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_pos_general_settings' AND column_name = 'business_name') THEN
      ALTER TABLE lats_pos_general_settings ADD COLUMN business_name TEXT DEFAULT 'My Store';
      RAISE NOTICE 'Added business_name';
    END IF;
    
    -- Add business_address
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_pos_general_settings' AND column_name = 'business_address') THEN
      ALTER TABLE lats_pos_general_settings ADD COLUMN business_address TEXT DEFAULT '';
      RAISE NOTICE 'Added business_address';
    END IF;
    
    -- Add business_phone
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_pos_general_settings' AND column_name = 'business_phone') THEN
      ALTER TABLE lats_pos_general_settings ADD COLUMN business_phone TEXT DEFAULT '';
      RAISE NOTICE 'Added business_phone';
    END IF;
    
    -- Add business_email
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_pos_general_settings' AND column_name = 'business_email') THEN
      ALTER TABLE lats_pos_general_settings ADD COLUMN business_email TEXT DEFAULT '';
      RAISE NOTICE 'Added business_email';
    END IF;
    
    -- Add business_website
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_pos_general_settings' AND column_name = 'business_website') THEN
      ALTER TABLE lats_pos_general_settings ADD COLUMN business_website TEXT DEFAULT '';
      RAISE NOTICE 'Added business_website';
    END IF;
    
    -- Add business_logo
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_pos_general_settings' AND column_name = 'business_logo') THEN
      ALTER TABLE lats_pos_general_settings ADD COLUMN business_logo TEXT;
      RAISE NOTICE 'Added business_logo';
    END IF;
    
    RAISE NOTICE 'SUCCESS: lats_pos_general_settings updated!';
    
  ELSE
    RAISE NOTICE 'ERROR: No settings table found. Create one first!';
  END IF;
  
END $$;

-- Verify the columns were added
SELECT 'Verification Check:' as status;

-- Check general_settings
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'general_settings' AND column_name = 'business_name') 
    THEN '✅ business_name exists'
    ELSE '❌ business_name missing'
  END as check
UNION ALL
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'general_settings' AND column_name = 'business_logo') 
    THEN '✅ business_logo exists'
    ELSE '❌ business_logo missing'
  END
UNION ALL
-- Check lats_pos_general_settings
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_pos_general_settings' AND column_name = 'business_name') 
    THEN '✅ business_name exists (lats table)'
    ELSE 'ℹ️  lats_pos_general_settings not used'
  END
UNION ALL
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_pos_general_settings' AND column_name = 'business_logo') 
    THEN '✅ business_logo exists (lats table)'
    ELSE 'ℹ️  lats_pos_general_settings not used'
  END;

SELECT '🎉 Business Logo Setup Complete!' as result;
SELECT 'Next: Refresh app → Settings → POS Settings → General Settings → Upload Logo' as next_step;

