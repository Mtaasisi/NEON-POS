-- ================================================
-- FIX: Ensure Suppliers Table Exists with Active Suppliers
-- ================================================
-- Fixes: "⚠️ CRITICAL: No suppliers found!"
-- 
-- Creates lats_suppliers table if missing and adds default suppliers
-- ================================================
-- 
-- IMPORTANT: Run this in Supabase SQL Editor
-- URL: https://app.supabase.com/project/jxhzveborezjhsmzsgbc/sql/new
-- ================================================

BEGIN;

-- ================================================
-- Ensure lats_suppliers table exists
-- ================================================

CREATE TABLE IF NOT EXISTS public.lats_suppliers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    contact_person text,
    email text,
    phone text,
    address text,
    city text,
    country text,
    is_active boolean DEFAULT true,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    branch_id uuid,
    is_shared boolean DEFAULT true,
    is_trade_in_customer boolean DEFAULT false,
    company_name text,
    description text,
    whatsapp text,
    tax_id text,
    payment_terms text,
    rating numeric,
    preferred_currency text DEFAULT 'TZS'::text,
    exchange_rate numeric,
    wechat text,
    credit_limit numeric(15,2) DEFAULT 0,
    current_balance numeric(15,2) DEFAULT 0,
    payment_days integer DEFAULT 30,
    discount_percentage numeric(5,2) DEFAULT 0,
    website_url text,
    logo_url text,
    business_registration text,
    business_type text,
    year_established integer,
    employee_count text,
    linkedin_url text,
    facebook_url text,
    instagram_url text,
    minimum_order_quantity integer,
    lead_time_days integer,
    warehouse_location text,
    shipping_methods text[],
    delivery_zones text[],
    certifications text[],
    quality_standards text,
    return_policy text,
    warranty_terms text,
    total_orders integer DEFAULT 0,
    total_order_value numeric(15,2) DEFAULT 0,
    average_rating numeric(3,2) DEFAULT 0,
    on_time_delivery_rate numeric(5,2) DEFAULT 0,
    quality_score numeric(5,2) DEFAULT 0,
    response_time_hours numeric(10,2),
    business_hours text,
    language_preferences text[],
    time_zone text,
    last_contact_date date,
    next_follow_up_date date,
    is_favorite boolean DEFAULT false,
    internal_notes text,
    priority_level text DEFAULT 'standard'::text,
    wechat_qr_code text,
    alipay_qr_code text,
    bank_account_details text,
    CONSTRAINT lats_suppliers_pkey PRIMARY KEY (id),
    CONSTRAINT lats_suppliers_rating_check CHECK (((rating >= (0)::numeric) AND (rating <= (5)::numeric)))
);

-- Add primary key if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'lats_suppliers_pkey'
    AND conrelid = 'public.lats_suppliers'::regclass
  ) THEN
    ALTER TABLE public.lats_suppliers
    ADD CONSTRAINT lats_suppliers_pkey PRIMARY KEY (id);
  END IF;
END $$;

-- Create indexes if missing
CREATE INDEX IF NOT EXISTS idx_lats_suppliers_is_active ON public.lats_suppliers(is_active);
CREATE INDEX IF NOT EXISTS idx_lats_suppliers_is_trade_in_customer ON public.lats_suppliers(is_trade_in_customer);
CREATE INDEX IF NOT EXISTS idx_lats_suppliers_branch_id ON public.lats_suppliers(branch_id);
CREATE INDEX IF NOT EXISTS idx_lats_suppliers_name ON public.lats_suppliers(name);

-- ================================================
-- Check if any active suppliers exist
-- ================================================

DO $$
DECLARE
  active_supplier_count INTEGER;
BEGIN
  -- Count active suppliers (not trade-in customers)
  SELECT COUNT(*) INTO active_supplier_count
  FROM public.lats_suppliers
  WHERE is_active = true 
    AND (is_trade_in_customer = false OR is_trade_in_customer IS NULL);
  
  -- If no active suppliers, create default ones
  IF active_supplier_count = 0 THEN
    RAISE NOTICE 'No active suppliers found. Creating default suppliers...';
    
    -- Insert default supplier (only if it doesn't already exist by name)
    INSERT INTO public.lats_suppliers (
      name,
      contact_person,
      email,
      phone,
      address,
      city,
      country,
      tax_id,
      payment_terms,
      rating,
      is_active,
      is_trade_in_customer,
      company_name,
      description,
      notes,
      created_at,
      updated_at
    ) 
    SELECT 
      'Default Supplier',
      'Supplier Contact',
      'supplier@example.com',
      '+255-22-000-0000',
      '123 Supplier Street',
      'Dar es Salaam',
      'Tanzania',
      'TIN-001',
      'Net 30',
      5,
      true,
      false,
      'Default Supply Company',
      'Default supplier created automatically. Please update with actual supplier information.',
      'This is a default supplier. Please update with real supplier details or add new suppliers.',
      NOW(),
      NOW()
    WHERE NOT EXISTS (
      SELECT 1 FROM public.lats_suppliers WHERE name = 'Default Supplier'
    );
    
    RAISE NOTICE '✅ Created default supplier';
    
    -- Optionally create additional sample suppliers (only if they don't exist)
    INSERT INTO public.lats_suppliers (
      name,
      contact_person,
      email,
      phone,
      address,
      city,
      country,
      tax_id,
      payment_terms,
      rating,
      is_active,
      is_trade_in_customer,
      company_name,
      description,
      created_at,
      updated_at
    ) 
    SELECT 
      'Tech Solutions Ltd',
      'John Smith',
      'john@techsolutions.com',
      '+255-22-123-4567',
      '123 Technology Street',
      'Dar es Salaam',
      'Tanzania',
      'TIN-002',
      'Net 30',
      5,
      true,
      false,
      'Tech Solutions Ltd',
      'Leading technology supplier for mobile devices and accessories',
      NOW(),
      NOW()
    WHERE NOT EXISTS (
      SELECT 1 FROM public.lats_suppliers WHERE name = 'Tech Solutions Ltd'
    );
    
    INSERT INTO public.lats_suppliers (
      name,
      contact_person,
      email,
      phone,
      address,
      city,
      country,
      tax_id,
      payment_terms,
      rating,
      is_active,
      is_trade_in_customer,
      company_name,
      description,
      created_at,
      updated_at
    ) 
    SELECT 
      'Mobile World Distributors',
      'Sarah Johnson',
      'sarah@mobileworld.co.tz',
      '+255-22-234-5678',
      '456 Business Avenue',
      'Dar es Salaam',
      'Tanzania',
      'TIN-003',
      'Net 15',
      4,
      true,
      false,
      'Mobile World Distributors',
      'Wholesale distributor of mobile phones and tablets',
      NOW(),
      NOW()
    WHERE NOT EXISTS (
      SELECT 1 FROM public.lats_suppliers WHERE name = 'Mobile World Distributors'
    );
    
    RAISE NOTICE '✅ Created sample suppliers';
  ELSE
    RAISE NOTICE '✅ Found % active suppliers', active_supplier_count;
  END IF;
END $$;

COMMIT;

-- ================================================
-- Verification queries
-- ================================================

-- Show active suppliers count
SELECT 
  COUNT(*) as total_suppliers,
  COUNT(*) FILTER (WHERE is_trade_in_customer = true) as trade_in_customers,
  COUNT(*) FILTER (WHERE is_trade_in_customer = false OR is_trade_in_customer IS NULL) as real_suppliers,
  COUNT(*) FILTER (WHERE is_active = true AND (is_trade_in_customer = false OR is_trade_in_customer IS NULL)) as active_real_suppliers
FROM public.lats_suppliers;

-- Show the active suppliers
SELECT 
  id,
  name,
  contact_person,
  email,
  phone,
  city,
  country,
  is_active,
  is_trade_in_customer,
  company_name
FROM public.lats_suppliers 
WHERE is_active = true 
  AND (is_trade_in_customer = false OR is_trade_in_customer IS NULL)
ORDER BY name;

-- ================================================
-- ✅ DONE! 
-- ================================================
-- The suppliers table is now ready with at least one active supplier.
-- Your application should now load suppliers correctly!
-- ================================================
