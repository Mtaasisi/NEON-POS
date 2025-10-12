-- ============================================
-- 🚀 AUTOMATIC BUSINESS LOGO COMPLETE FIX
-- ============================================
-- This script automatically fixes EVERYTHING needed for business logo feature
-- It handles ALL scenarios and ensures everything works!
-- 
-- ✅ Safe to run multiple times
-- ✅ Works with both table naming conventions
-- ✅ Adds missing fields without breaking existing data
-- ✅ Provides comprehensive verification
-- ============================================

DO $$ 
DECLARE
  table_exists_general boolean;
  table_exists_lats boolean;
  current_table_name text;
BEGIN
  -- ============================================
  -- STEP 1: Detect which table naming convention you're using
  -- ============================================
  
  RAISE NOTICE '🔍 Step 1: Detecting table structure...';
  
  -- Check if general_settings exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'general_settings'
  ) INTO table_exists_general;
  
  -- Check if lats_pos_general_settings exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'lats_pos_general_settings'
  ) INTO table_exists_lats;
  
  IF table_exists_general THEN
    current_table_name := 'general_settings';
    RAISE NOTICE '✅ Found general_settings table';
  ELSIF table_exists_lats THEN
    current_table_name := 'lats_pos_general_settings';
    RAISE NOTICE '✅ Found lats_pos_general_settings table';
  ELSE
    RAISE NOTICE '⚠️  No settings table found, will create general_settings';
    current_table_name := 'general_settings';
  END IF;
  
  -- ============================================
  -- STEP 2: Create table if it doesn't exist
  -- ============================================
  
  IF NOT table_exists_general AND NOT table_exists_lats THEN
    RAISE NOTICE '🏗️  Step 2: Creating general_settings table...';
    
    CREATE TABLE general_settings (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID NOT NULL,
      business_id UUID,
      
      -- Business Information
      business_name TEXT DEFAULT 'My Store',
      business_address TEXT DEFAULT '',
      business_phone TEXT DEFAULT '',
      business_email TEXT DEFAULT '',
      business_website TEXT DEFAULT '',
      business_logo TEXT,
      tax_id TEXT DEFAULT '',
      
      -- Interface Settings
      theme TEXT DEFAULT 'light',
      language TEXT DEFAULT 'en',
      currency TEXT DEFAULT 'TZS',
      timezone TEXT DEFAULT 'Africa/Dar_es_Salaam',
      date_format TEXT DEFAULT 'DD/MM/YYYY',
      time_format TEXT DEFAULT '24',
      
      -- Display Settings
      show_product_images BOOLEAN DEFAULT true,
      show_stock_levels BOOLEAN DEFAULT true,
      show_prices BOOLEAN DEFAULT true,
      show_barcodes BOOLEAN DEFAULT true,
      products_per_page INTEGER DEFAULT 20,
      
      -- Behavior Settings
      auto_complete_search BOOLEAN DEFAULT true,
      confirm_delete BOOLEAN DEFAULT true,
      show_confirmations BOOLEAN DEFAULT true,
      
      -- Sound Settings
      enable_sound_effects BOOLEAN DEFAULT true,
      sound_volume NUMERIC(3,2) DEFAULT 0.8,
      enable_click_sounds BOOLEAN DEFAULT true,
      enable_cart_sounds BOOLEAN DEFAULT true,
      enable_payment_sounds BOOLEAN DEFAULT true,
      enable_delete_sounds BOOLEAN DEFAULT true,
      
      -- Performance Settings
      enable_animations BOOLEAN DEFAULT true,
      enable_caching BOOLEAN DEFAULT true,
      cache_duration INTEGER DEFAULT 300,
      enable_lazy_loading BOOLEAN DEFAULT true,
      max_search_results INTEGER DEFAULT 50,
      
      -- Tax Settings
      enable_tax BOOLEAN DEFAULT true,
      tax_rate NUMERIC(5,2) DEFAULT 18,
      
      -- Timestamps
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- Create index
    CREATE INDEX idx_general_settings_user_id ON general_settings(user_id);
    
    -- Disable RLS and grant permissions
    ALTER TABLE general_settings DISABLE ROW LEVEL SECURITY;
    GRANT ALL ON general_settings TO postgres, anon, authenticated, service_role;
    
    RAISE NOTICE '✅ Table created successfully';
  ELSE
    RAISE NOTICE '✅ Step 2: Table already exists, skipping creation';
  END IF;
  
  -- ============================================
  -- STEP 3: Add missing business fields to existing table
  -- ============================================
  
  RAISE NOTICE '🔧 Step 3: Adding/verifying business information fields...';
  
  -- Function to add column if it doesn't exist
  CREATE OR REPLACE FUNCTION add_column_if_not_exists(
    table_name_param text,
    column_name_param text,
    column_type_param text,
    column_default_param text DEFAULT NULL
  ) RETURNS void AS $func$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = table_name_param 
      AND column_name = column_name_param
    ) THEN
      IF column_default_param IS NOT NULL THEN
        EXECUTE format('ALTER TABLE %I ADD COLUMN %I %s DEFAULT %s', 
          table_name_param, column_name_param, column_type_param, column_default_param);
      ELSE
        EXECUTE format('ALTER TABLE %I ADD COLUMN %I %s', 
          table_name_param, column_name_param, column_type_param);
      END IF;
      RAISE NOTICE '  ✅ Added column: %', column_name_param;
    ELSE
      RAISE NOTICE '  ✓ Column exists: %', column_name_param;
    END IF;
  END;
  $func$ LANGUAGE plpgsql;
  
  -- Add all business fields to the detected table
  PERFORM add_column_if_not_exists(current_table_name, 'business_name', 'TEXT', $$'My Store'$$);
  PERFORM add_column_if_not_exists(current_table_name, 'business_address', 'TEXT', $$''$$);
  PERFORM add_column_if_not_exists(current_table_name, 'business_phone', 'TEXT', $$''$$);
  PERFORM add_column_if_not_exists(current_table_name, 'business_email', 'TEXT', $$''$$);
  PERFORM add_column_if_not_exists(current_table_name, 'business_website', 'TEXT', $$''$$);
  PERFORM add_column_if_not_exists(current_table_name, 'business_logo', 'TEXT', NULL);
  
  -- Add other interface fields if missing (for older tables)
  PERFORM add_column_if_not_exists(current_table_name, 'theme', 'TEXT', $$'light'$$);
  PERFORM add_column_if_not_exists(current_table_name, 'language', 'TEXT', $$'en'$$);
  PERFORM add_column_if_not_exists(current_table_name, 'currency', 'TEXT', $$'TZS'$$);
  PERFORM add_column_if_not_exists(current_table_name, 'timezone', 'TEXT', $$'Africa/Dar_es_Salaam'$$);
  PERFORM add_column_if_not_exists(current_table_name, 'date_format', 'TEXT', $$'DD/MM/YYYY'$$);
  PERFORM add_column_if_not_exists(current_table_name, 'time_format', 'TEXT', $$'24'$$);
  PERFORM add_column_if_not_exists(current_table_name, 'show_product_images', 'BOOLEAN', 'true');
  PERFORM add_column_if_not_exists(current_table_name, 'show_stock_levels', 'BOOLEAN', 'true');
  PERFORM add_column_if_not_exists(current_table_name, 'show_prices', 'BOOLEAN', 'true');
  PERFORM add_column_if_not_exists(current_table_name, 'show_barcodes', 'BOOLEAN', 'true');
  PERFORM add_column_if_not_exists(current_table_name, 'products_per_page', 'INTEGER', '20');
  PERFORM add_column_if_not_exists(current_table_name, 'auto_complete_search', 'BOOLEAN', 'true');
  PERFORM add_column_if_not_exists(current_table_name, 'confirm_delete', 'BOOLEAN', 'true');
  PERFORM add_column_if_not_exists(current_table_name, 'show_confirmations', 'BOOLEAN', 'true');
  PERFORM add_column_if_not_exists(current_table_name, 'enable_sound_effects', 'BOOLEAN', 'true');
  PERFORM add_column_if_not_exists(current_table_name, 'sound_volume', 'NUMERIC(3,2)', '0.8');
  PERFORM add_column_if_not_exists(current_table_name, 'enable_click_sounds', 'BOOLEAN', 'true');
  PERFORM add_column_if_not_exists(current_table_name, 'enable_cart_sounds', 'BOOLEAN', 'true');
  PERFORM add_column_if_not_exists(current_table_name, 'enable_payment_sounds', 'BOOLEAN', 'true');
  PERFORM add_column_if_not_exists(current_table_name, 'enable_delete_sounds', 'BOOLEAN', 'true');
  PERFORM add_column_if_not_exists(current_table_name, 'enable_animations', 'BOOLEAN', 'true');
  PERFORM add_column_if_not_exists(current_table_name, 'enable_caching', 'BOOLEAN', 'true');
  PERFORM add_column_if_not_exists(current_table_name, 'cache_duration', 'INTEGER', '300');
  PERFORM add_column_if_not_exists(current_table_name, 'enable_lazy_loading', 'BOOLEAN', 'true');
  PERFORM add_column_if_not_exists(current_table_name, 'max_search_results', 'INTEGER', '50');
  PERFORM add_column_if_not_exists(current_table_name, 'enable_tax', 'BOOLEAN', 'true');
  PERFORM add_column_if_not_exists(current_table_name, 'tax_rate', 'NUMERIC(5,2)', '18');
  
  -- Clean up helper function
  DROP FUNCTION add_column_if_not_exists;
  
  -- ============================================
  -- STEP 4: Update receipt_settings table for logo display
  -- ============================================
  
  RAISE NOTICE '🔧 Step 4: Updating receipt_settings...';
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'receipt_settings') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'receipt_settings' AND column_name = 'show_business_logo'
    ) THEN
      ALTER TABLE receipt_settings ADD COLUMN show_business_logo BOOLEAN DEFAULT true;
      RAISE NOTICE '  ✅ Added show_business_logo to receipt_settings';
    ELSE
      RAISE NOTICE '  ✓ show_business_logo already exists';
    END IF;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lats_pos_receipt_settings') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'lats_pos_receipt_settings' AND column_name = 'show_business_logo'
    ) THEN
      ALTER TABLE lats_pos_receipt_settings ADD COLUMN show_business_logo BOOLEAN DEFAULT true;
      RAISE NOTICE '  ✅ Added show_business_logo to lats_pos_receipt_settings';
    ELSE
      RAISE NOTICE '  ✓ show_business_logo already exists';
    END IF;
  END IF;
  
  -- ============================================
  -- STEP 5: Ensure permissions are correct
  -- ============================================
  
  RAISE NOTICE '🔐 Step 5: Setting permissions...';
  
  IF table_exists_general THEN
    ALTER TABLE general_settings DISABLE ROW LEVEL SECURITY;
    GRANT ALL ON general_settings TO postgres, anon, authenticated, service_role;
    RAISE NOTICE '  ✅ Permissions set for general_settings';
  END IF;
  
  IF table_exists_lats THEN
    ALTER TABLE lats_pos_general_settings DISABLE ROW LEVEL SECURITY;
    GRANT ALL ON lats_pos_general_settings TO postgres, anon, authenticated, service_role;
    RAISE NOTICE '  ✅ Permissions set for lats_pos_general_settings';
  END IF;
  
END $$;

-- ============================================
-- VERIFICATION - Check everything is working
-- ============================================

SELECT '
╔════════════════════════════════════════════════════════════╗
║  🎉 BUSINESS LOGO FEATURE - INSTALLATION COMPLETE! 🎉     ║
╚════════════════════════════════════════════════════════════╝
' as status;

-- Show which table is being used
SELECT 
  '📋 Active Settings Table: ' || 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'general_settings') 
    THEN 'general_settings'
    ELSE 'lats_pos_general_settings'
  END as info;

-- Verify all business fields exist
SELECT '✅ Business Fields Verification:' as check;

SELECT 
  '  ' || 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name IN ('general_settings', 'lats_pos_general_settings') 
      AND column_name = 'business_name'
    ) THEN '✅' ELSE '❌' 
  END || ' business_name' as field_check
UNION ALL
SELECT '  ' || 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name IN ('general_settings', 'lats_pos_general_settings') 
      AND column_name = 'business_address'
    ) THEN '✅' ELSE '❌' 
  END || ' business_address'
UNION ALL
SELECT '  ' || 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name IN ('general_settings', 'lats_pos_general_settings') 
      AND column_name = 'business_phone'
    ) THEN '✅' ELSE '❌' 
  END || ' business_phone'
UNION ALL
SELECT '  ' || 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name IN ('general_settings', 'lats_pos_general_settings') 
      AND column_name = 'business_email'
    ) THEN '✅' ELSE '❌' 
  END || ' business_email'
UNION ALL
SELECT '  ' || 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name IN ('general_settings', 'lats_pos_general_settings') 
      AND column_name = 'business_website'
    ) THEN '✅' ELSE '❌' 
  END || ' business_website'
UNION ALL
SELECT '  ' || 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name IN ('general_settings', 'lats_pos_general_settings') 
      AND column_name = 'business_logo'
    ) THEN '✅' ELSE '❌' 
  END || ' business_logo';

-- Show next steps
SELECT '
╔════════════════════════════════════════════════════════════╗
║                     📝 NEXT STEPS                          ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║  1. Refresh your application in the browser                ║
║  2. Go to: Settings → POS Settings → General Settings     ║
║  3. Look for "Business Information" section at the top    ║
║  4. Upload your logo and fill in business details         ║
║  5. Click "Save Settings" button                          ║
║  6. Your logo will appear on all receipts & invoices!     ║
║                                                            ║
║  📖 See BUSINESS-LOGO-SETUP-GUIDE.md for more details     ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
' as next_steps;

