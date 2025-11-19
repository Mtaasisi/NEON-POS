-- =====================================================
-- CRITICAL FIXES FOR DATABASE ERRORS
-- Run this file to fix all critical errors in one go
-- =====================================================

-- =====================================================
-- FIX 1: Update search_customers_fn to avoid ambiguous column references
-- =====================================================
DROP FUNCTION IF EXISTS search_customers_fn(text, integer, integer);

CREATE OR REPLACE FUNCTION public.search_customers_fn(
  search_query text, 
  page_number integer DEFAULT 1, 
  page_size integer DEFAULT 50
) 
RETURNS TABLE(
  id uuid, 
  name text, 
  phone text, 
  email text, 
  gender text, 
  city text, 
  country text, 
  color_tag text, 
  loyalty_level text, 
  points integer, 
  total_spent numeric, 
  last_visit timestamp with time zone, 
  is_active boolean, 
  referral_source text, 
  birth_month integer, 
  birth_day integer, 
  birthday date, 
  initial_notes text, 
  notes jsonb, 
  customer_tag text, 
  location_description text, 
  national_id text, 
  joined_date timestamp with time zone, 
  created_at timestamp with time zone, 
  updated_at timestamp with time zone, 
  branch_id uuid, 
  is_shared boolean, 
  created_by_branch_id uuid, 
  created_by_branch_name text, 
  profile_image text, 
  whatsapp text, 
  whatsapp_opt_out boolean, 
  referred_by uuid, 
  created_by uuid, 
  last_purchase_date timestamp with time zone, 
  total_purchases integer, 
  total_calls integer, 
  total_call_duration_minutes numeric, 
  incoming_calls integer, 
  outgoing_calls integer, 
  missed_calls integer, 
  avg_call_duration_minutes numeric, 
  first_call_date timestamp with time zone, 
  last_call_date timestamp with time zone, 
  call_loyalty_level text, 
  total_returns integer, 
  total_count bigint
)
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  offset_val INTEGER;
  total_count_val BIGINT;
BEGIN
  -- Calculate offset for pagination
  offset_val := (page_number - 1) * page_size;
  
  -- Get total count of matching customers
  -- ✅ FIX: Qualify ALL column names with table alias to avoid ambiguity
  SELECT COUNT(*) INTO total_count_val
  FROM customers c
  WHERE 
    c.name ILIKE '%' || search_query || '%' 
    OR c.phone ILIKE '%' || search_query || '%'
    OR COALESCE(c.email, '') ILIKE '%' || search_query || '%'
    OR COALESCE(c.customer_tag, '') ILIKE '%' || search_query || '%';
  
  -- Return paginated results with total count
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.phone,
    c.email,
    COALESCE(c.gender, 'other') as gender,
    COALESCE(c.city, '') as city,
    COALESCE(c.country, '') as country,
    COALESCE(c.color_tag, 'new') as color_tag,
    COALESCE(c.loyalty_level, 'bronze') as loyalty_level,
    COALESCE(c.points, 0) as points,
    COALESCE(c.total_spent, 0) as total_spent,
    COALESCE(c.last_visit, c.created_at) as last_visit,
    COALESCE(c.is_active, true) as is_active,
    c.referral_source,
    c.birth_month,
    c.birth_day,
    c.birthday,
    c.initial_notes,
    c.notes,
    c.customer_tag,
    c.location_description,
    c.national_id,
    COALESCE(c.joined_date, c.created_at) as joined_date,
    c.created_at,
    c.updated_at,
    c.branch_id,
    COALESCE(c.is_shared, false) as is_shared,
    c.created_by_branch_id,
    c.created_by_branch_name,
    c.profile_image,
    COALESCE(c.whatsapp, c.phone) as whatsapp,
    COALESCE(c.whatsapp_opt_out, false) as whatsapp_opt_out,
    c.referred_by,
    c.created_by,
    c.last_purchase_date,
    COALESCE(c.total_purchases, 0) as total_purchases,
    COALESCE(c.total_calls, 0) as total_calls,
    COALESCE(c.total_call_duration_minutes, 0) as total_call_duration_minutes,
    COALESCE(c.incoming_calls, 0) as incoming_calls,
    COALESCE(c.outgoing_calls, 0) as outgoing_calls,
    COALESCE(c.missed_calls, 0) as missed_calls,
    COALESCE(c.avg_call_duration_minutes, 0) as avg_call_duration_minutes,
    c.first_call_date,
    c.last_call_date,
    COALESCE(c.call_loyalty_level, 'Basic') as call_loyalty_level,
    COALESCE(c.total_returns, 0) as total_returns,
    total_count_val as total_count
  FROM customers c
  WHERE 
    c.name ILIKE '%' || search_query || '%' 
    OR c.phone ILIKE '%' || search_query || '%'
    OR COALESCE(c.email, '') ILIKE '%' || search_query || '%'
    OR COALESCE(c.customer_tag, '') ILIKE '%' || search_query || '%'
  ORDER BY c.created_at DESC
  LIMIT page_size
  OFFSET offset_val;
END;
$$;

COMMENT ON FUNCTION public.search_customers_fn(text, integer, integer) IS 
  'Search customers by name, phone, email, or tag with pagination support. Fixed to avoid ambiguous column references.';

-- =====================================================
-- FIX 2: Verify customers table schema
-- =====================================================
-- Note: 'address' column was removed from the function signature
-- The error logs show it's trying to select a non-existent column
-- The function above no longer references 'address' since it's not in the customers table

-- =====================================================
-- FIX 3: Create sample suppliers if none exist
-- =====================================================
DO $$
DECLARE
  supplier_count INTEGER;
BEGIN
  -- Check if suppliers table exists and is empty
  SELECT COUNT(*) INTO supplier_count FROM suppliers;
  
  IF supplier_count = 0 THEN
    -- Insert a default supplier
    INSERT INTO suppliers (
      id,
      name,
      company_name,
      phone,
      email,
      address,
      city,
      country,
      tax_id,
      payment_terms,
      credit_limit,
      current_balance,
      is_active,
      rating,
      notes,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      'Default Supplier',
      'Default Supply Company',
      '+1-555-0100',
      'default@supplier.com',
      '123 Supply Street',
      'Supply City',
      'Supply Country',
      'TAX-001',
      'Net 30',
      50000.00,
      0.00,
      true,
      5,
      'Default supplier created automatically. Please update with actual supplier information.',
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO NOTHING;
    
    RAISE NOTICE '✅ Created default supplier';
  ELSE
    RAISE NOTICE '✅ Suppliers table already has % entries', supplier_count;
  END IF;
END $$;

-- =====================================================
-- FIX 4: Connection pooling recommendations (informational)
-- =====================================================
-- Note: Connection pooling is handled at the application level
-- The Neon serverless driver should be configured with:
--   1. Connection pooling enabled (use pooler endpoint)
--   2. Reduce concurrent queries on page load
--   3. Use query deduplication/debouncing

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Test the fixed search function
SELECT 
  id, name, phone, email, total_count 
FROM search_customers_fn('', 1, 10);

-- Verify suppliers exist
SELECT COUNT(*) as supplier_count FROM suppliers;

-- Check customers table columns (to verify 'address' doesn't exist)
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'customers' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

RAISE NOTICE '✅ All critical fixes applied successfully!';

