-- ================================================
-- FIX: Ensure Business Information Settings Table Exists
-- ================================================
-- Fixes: Business Information not saving or fetching
-- 
-- Ensures lats_pos_general_settings table exists with all columns
-- and creates a default record if none exists
-- ================================================
-- 
-- IMPORTANT: Run this in Supabase SQL Editor
-- URL: https://app.supabase.com/project/jxhzveborezjhsmzsgbc/sql/new
-- ================================================

BEGIN;

-- ================================================
-- Ensure lats_pos_general_settings table exists
-- ================================================

CREATE TABLE IF NOT EXISTS public.lats_pos_general_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    branch_id uuid,
    business_id text,
    theme text DEFAULT 'light',
    language text DEFAULT 'en',
    currency text DEFAULT 'USD',
    timezone text DEFAULT 'UTC',
    date_format text DEFAULT 'MM/DD/YYYY',
    time_format text DEFAULT '12',
    show_product_images boolean DEFAULT true,
    show_stock_levels boolean DEFAULT true,
    show_prices boolean DEFAULT true,
    show_barcodes boolean DEFAULT true,
    products_per_page integer DEFAULT 20,
    auto_complete_search boolean DEFAULT true,
    confirm_delete boolean DEFAULT true,
    show_confirmations boolean DEFAULT true,
    enable_sound_effects boolean DEFAULT true,
    sound_volume numeric(3,2) DEFAULT 0.5,
    enable_click_sounds boolean DEFAULT true,
    enable_cart_sounds boolean DEFAULT true,
    enable_payment_sounds boolean DEFAULT true,
    enable_delete_sounds boolean DEFAULT true,
    enable_animations boolean DEFAULT true,
    enable_caching boolean DEFAULT true,
    cache_duration integer DEFAULT 300000,
    enable_lazy_loading boolean DEFAULT true,
    max_search_results integer DEFAULT 50,
    enable_tax boolean DEFAULT false,
    tax_rate numeric(5,2) DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    day_closing_passcode character varying(255) DEFAULT '1234',
    business_name text DEFAULT 'My Store',
    business_address text DEFAULT '',
    business_phone text DEFAULT '',
    business_email text DEFAULT '',
    business_website text DEFAULT '',
    business_logo text,
    app_logo text,
    logo_size text DEFAULT 'medium',
    logo_position text DEFAULT 'left',
    company_name text,
    primary_color text DEFAULT '#3B82F6',
    secondary_color text DEFAULT '#1E40AF',
    accent_color text DEFAULT '#10B981',
    tagline text DEFAULT '',
    tax_id text DEFAULT '',
    registration_number text,
    CONSTRAINT lats_pos_general_settings_pkey PRIMARY KEY (id)
);

-- Add primary key if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'lats_pos_general_settings_pkey'
    AND conrelid = 'public.lats_pos_general_settings'::regclass
  ) THEN
    ALTER TABLE public.lats_pos_general_settings
    ADD CONSTRAINT lats_pos_general_settings_pkey PRIMARY KEY (id);
  END IF;
END $$;

-- Add missing columns if they don't exist
DO $$
BEGIN
  -- Add business_phone column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'lats_pos_general_settings' 
    AND column_name = 'business_phone'
  ) THEN
    ALTER TABLE public.lats_pos_general_settings
    ADD COLUMN business_phone text DEFAULT '';
  END IF;
  
  -- Add business_email column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'lats_pos_general_settings' 
    AND column_name = 'business_email'
  ) THEN
    ALTER TABLE public.lats_pos_general_settings
    ADD COLUMN business_email text DEFAULT '';
  END IF;
  
  -- Add business_website column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'lats_pos_general_settings' 
    AND column_name = 'business_website'
  ) THEN
    ALTER TABLE public.lats_pos_general_settings
    ADD COLUMN business_website text DEFAULT '';
  END IF;
  
  -- Add business_address column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'lats_pos_general_settings' 
    AND column_name = 'business_address'
  ) THEN
    ALTER TABLE public.lats_pos_general_settings
    ADD COLUMN business_address text DEFAULT '';
  END IF;
  
  -- Add business_name column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'lats_pos_general_settings' 
    AND column_name = 'business_name'
  ) THEN
    ALTER TABLE public.lats_pos_general_settings
    ADD COLUMN business_name text DEFAULT 'My Store';
  END IF;
  
  -- Add business_logo column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'lats_pos_general_settings' 
    AND column_name = 'business_logo'
  ) THEN
    ALTER TABLE public.lats_pos_general_settings
    ADD COLUMN business_logo text;
  END IF;
  
  -- Add branch_id column if missing (optional, for branch isolation)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'lats_pos_general_settings' 
    AND column_name = 'branch_id'
  ) THEN
    ALTER TABLE public.lats_pos_general_settings
    ADD COLUMN branch_id uuid;
  END IF;
END $$;

-- ================================================
-- Create default settings record if none exists
-- ================================================

DO $$
DECLARE
  settings_count INTEGER;
BEGIN
  -- Count existing records
  SELECT COUNT(*) INTO settings_count
  FROM public.lats_pos_general_settings;
  
  -- If no records exist, create a default one
  IF settings_count = 0 THEN
    INSERT INTO public.lats_pos_general_settings (
      business_name,
      business_phone,
      business_email,
      business_website,
      business_address,
      business_logo,
      theme,
      currency,
      timezone,
      created_at,
      updated_at
    ) VALUES (
      'My Store',
      '',
      '',
      '',
      '',
      NULL,
      'light',
      'USD',
      'UTC',
      NOW(),
      NOW()
    );
    
    RAISE NOTICE '✅ Created default business information settings record';
  ELSE
    RAISE NOTICE '✅ Found % existing settings record(s)', settings_count;
  END IF;
END $$;

COMMIT;

-- ================================================
-- Verification queries
-- ================================================

-- Show all settings records
SELECT 
  id,
  business_name,
  business_phone,
  business_email,
  business_website,
  business_address,
  user_id,
  created_at,
  updated_at
FROM public.lats_pos_general_settings
ORDER BY created_at DESC;

-- Count settings records
SELECT COUNT(*) as total_settings_records
FROM public.lats_pos_general_settings;

-- ================================================
-- ✅ DONE! 
-- ================================================
-- The lats_pos_general_settings table is now ready:
-- 1. ✅ Table exists with all required columns
-- 2. ✅ Default record created if none existed
-- 3. ✅ Business information should now save and fetch correctly
-- ================================================
