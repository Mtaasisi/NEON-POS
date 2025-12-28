-- =====================================================
-- Create customers table
-- =====================================================
-- This migration creates the customers table that is
-- referenced by the application but missing from the database.
-- =====================================================

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  first_name text NOT NULL,
  last_name text,
  email text,
  phone text,
  phone2 text,
  address text,
  city text,
  country text DEFAULT 'Tanzania'::text,
  date_of_birth date,
  gender text,
  loyalty_points integer DEFAULT 0,
  total_purchases numeric(15,2) DEFAULT 0.00,
  last_purchase_date date,
  is_active boolean DEFAULT true,
  notes text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  branch_id uuid,

  -- Primary key
  CONSTRAINT customers_pkey PRIMARY KEY (id),

  -- Check constraints
  CONSTRAINT customers_gender_check CHECK (gender = ANY (ARRAY['male'::text, 'female'::text, 'other'::text]))
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_customers_branch ON customers(branch_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_active ON customers(is_active);
CREATE INDEX IF NOT EXISTS idx_customers_loyalty_points ON customers(loyalty_points DESC);

-- Add table comment
COMMENT ON TABLE customers IS
'Customer information with loyalty program data and branch isolation support';

-- Add column comments
COMMENT ON COLUMN customers.first_name IS 'Customer first name';
COMMENT ON COLUMN customers.last_name IS 'Customer last name';
COMMENT ON COLUMN customers.loyalty_points IS 'Accumulated loyalty points for rewards';
COMMENT ON COLUMN customers.total_purchases IS 'Total amount spent by customer';
COMMENT ON COLUMN customers.branch_id IS 'Branch that manages this customer (for isolation)';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ =====================================================';
    RAISE NOTICE '✅ customers Table Created!';
    RAISE NOTICE '✅ =====================================================';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Table includes:';
    RAISE NOTICE '  ✅ Basic customer information (name, contact, address)';
    RAISE NOTICE '  ✅ Loyalty program fields (points, total purchases)';
    RAISE NOTICE '  ✅ Branch isolation support';
    RAISE NOTICE '  ✅ All necessary indexes for performance';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 This resolves the "relation customers does not exist" error';
    RAISE NOTICE '';
END $$;
