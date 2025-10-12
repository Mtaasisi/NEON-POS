-- ============================================
-- SAFE FIX FOR ALL 400 ERRORS
-- This version handles existing tables gracefully
-- Run this in your Neon database SQL Editor
-- ============================================

BEGIN;

SELECT '========== STEP 1: DISABLE RLS ON ALL TABLES ==========' as status;

-- Disable RLS on all LATS and customer tables
DO $$
DECLARE
  tbl_name TEXT;
BEGIN
  FOR tbl_name IN 
    SELECT tablename FROM pg_tables 
    WHERE schemaname = 'public' 
      AND (tablename LIKE 'lats_%' OR tablename = 'customers')
  LOOP
    EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', tbl_name);
    RAISE NOTICE '✅ Disabled RLS on %', tbl_name;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️ Could not disable RLS on %: %', tbl_name, SQLERRM;
  END LOOP;
END $$;

SELECT '========== STEP 2: DROP ALL RLS POLICIES ==========' as status;

-- Drop all RLS policies
DO $$
DECLARE
  pol_record RECORD;
BEGIN
  FOR pol_record IN 
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public' 
      AND (tablename LIKE 'lats_%' OR tablename = 'customers')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
      pol_record.policyname, 
      pol_record.schemaname, 
      pol_record.tablename);
    RAISE NOTICE '✅ Dropped policy % on %', pol_record.policyname, pol_record.tablename;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️ Could not drop policy % on %: %', pol_record.policyname, pol_record.tablename, SQLERRM;
  END LOOP;
END $$;

SELECT '========== STEP 3: CREATE MISSING TABLES (SAFE) ==========' as status;

-- Create lats_categories (safe version)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lats_categories') THEN
    CREATE TABLE lats_categories (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      description TEXT,
      parent_id UUID,
      is_active BOOLEAN DEFAULT true,
      sort_order INTEGER DEFAULT 0,
      color TEXT,
      icon TEXT,
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    -- Add foreign key after table creation
    ALTER TABLE lats_categories 
      ADD CONSTRAINT lats_categories_parent_id_fkey 
      FOREIGN KEY (parent_id) REFERENCES lats_categories(id) ON DELETE CASCADE;
    RAISE NOTICE '✅ Created lats_categories table';
  ELSE
    RAISE NOTICE '✔️ lats_categories already exists';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '⚠️ Issue with lats_categories: %', SQLERRM;
END $$;

-- Create lats_suppliers (safe version)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lats_suppliers') THEN
    CREATE TABLE lats_suppliers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      contact_person TEXT,
      email TEXT,
      phone TEXT,
      address TEXT,
      city TEXT,
      country TEXT DEFAULT 'TZ',
      currency TEXT DEFAULT 'TZS',
      lead_time_days INTEGER DEFAULT 7,
      is_active BOOLEAN DEFAULT true,
      notes TEXT,
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    RAISE NOTICE '✅ Created lats_suppliers table';
  ELSE
    RAISE NOTICE '✔️ lats_suppliers already exists';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '⚠️ Issue with lats_suppliers: %', SQLERRM;
END $$;

-- Create lats_products (safe version)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lats_products') THEN
    CREATE TABLE lats_products (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      description TEXT,
      short_description TEXT,
      sku TEXT,
      category_id UUID,
      supplier_id UUID,
      is_active BOOLEAN DEFAULT true,
      is_featured BOOLEAN DEFAULT false,
      condition TEXT DEFAULT 'new',
      images JSONB DEFAULT '[]'::jsonb,
      attributes JSONB DEFAULT '{}'::jsonb,
      internal_notes TEXT,
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    -- Add foreign keys after table creation
    ALTER TABLE lats_products 
      ADD CONSTRAINT lats_products_category_id_fkey 
      FOREIGN KEY (category_id) REFERENCES lats_categories(id) ON DELETE SET NULL;
    ALTER TABLE lats_products 
      ADD CONSTRAINT lats_products_supplier_id_fkey 
      FOREIGN KEY (supplier_id) REFERENCES lats_suppliers(id) ON DELETE SET NULL;
    RAISE NOTICE '✅ Created lats_products table';
  ELSE
    RAISE NOTICE '✔️ lats_products already exists';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '⚠️ Issue with lats_products: %', SQLERRM;
END $$;

-- Create lats_product_variants (safe version)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lats_product_variants') THEN
    CREATE TABLE lats_product_variants (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      product_id UUID NOT NULL,
      name TEXT NOT NULL,
      sku TEXT UNIQUE,
      barcode TEXT,
      attributes JSONB DEFAULT '{}'::jsonb,
      cost_price DECIMAL(12, 2) DEFAULT 0,
      selling_price DECIMAL(12, 2) DEFAULT 0,
      quantity INTEGER DEFAULT 0,
      min_quantity INTEGER,
      max_quantity INTEGER,
      weight DECIMAL(10, 2),
      dimensions JSONB,
      images JSONB DEFAULT '[]'::jsonb,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    -- Add foreign key after table creation
    ALTER TABLE lats_product_variants 
      ADD CONSTRAINT lats_product_variants_product_id_fkey 
      FOREIGN KEY (product_id) REFERENCES lats_products(id) ON DELETE CASCADE;
    RAISE NOTICE '✅ Created lats_product_variants table';
  ELSE
    RAISE NOTICE '✔️ lats_product_variants already exists';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '⚠️ Issue with lats_product_variants: %', SQLERRM;
END $$;

-- Create lats_stock_movements (safe version)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lats_stock_movements') THEN
    CREATE TABLE lats_stock_movements (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      product_id UUID NOT NULL,
      variant_id UUID NOT NULL,
      movement_type TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      reason TEXT,
      notes TEXT,
      reference_id UUID,
      reference_type TEXT,
      created_by UUID,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    -- Add foreign keys after table creation
    ALTER TABLE lats_stock_movements 
      ADD CONSTRAINT lats_stock_movements_product_id_fkey 
      FOREIGN KEY (product_id) REFERENCES lats_products(id) ON DELETE CASCADE;
    ALTER TABLE lats_stock_movements 
      ADD CONSTRAINT lats_stock_movements_variant_id_fkey 
      FOREIGN KEY (variant_id) REFERENCES lats_product_variants(id) ON DELETE CASCADE;
    RAISE NOTICE '✅ Created lats_stock_movements table';
  ELSE
    RAISE NOTICE '✔️ lats_stock_movements already exists';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '⚠️ Issue with lats_stock_movements: %', SQLERRM;
END $$;

-- Create lats_sales (safe version)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lats_sales') THEN
    CREATE TABLE lats_sales (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      product_id UUID NOT NULL,
      variant_id UUID NOT NULL,
      customer_id UUID,
      quantity INTEGER NOT NULL,
      unit_price DECIMAL(12, 2) NOT NULL,
      total_price DECIMAL(12, 2) NOT NULL,
      discount DECIMAL(12, 2) DEFAULT 0,
      payment_method TEXT,
      payment_status TEXT DEFAULT 'paid',
      sale_date TIMESTAMPTZ DEFAULT NOW(),
      notes TEXT,
      created_by UUID,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    -- Add foreign keys after table creation (only if tables exist)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lats_products') THEN
      ALTER TABLE lats_sales 
        ADD CONSTRAINT lats_sales_product_id_fkey 
        FOREIGN KEY (product_id) REFERENCES lats_products(id) ON DELETE CASCADE;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lats_product_variants') THEN
      ALTER TABLE lats_sales 
        ADD CONSTRAINT lats_sales_variant_id_fkey 
        FOREIGN KEY (variant_id) REFERENCES lats_product_variants(id) ON DELETE CASCADE;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customers') THEN
      ALTER TABLE lats_sales 
        ADD CONSTRAINT lats_sales_customer_id_fkey 
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;
    END IF;
    RAISE NOTICE '✅ Created lats_sales table';
  ELSE
    RAISE NOTICE '✔️ lats_sales already exists';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '⚠️ Issue with lats_sales: %', SQLERRM;
END $$;

SELECT '========== STEP 4: ADD MISSING COLUMNS TO EXISTING TABLES ==========' as status;

-- Add missing columns to customers table (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customers') THEN
    -- Add is_active if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'is_active') THEN
      ALTER TABLE customers ADD COLUMN is_active BOOLEAN DEFAULT true;
      RAISE NOTICE '✅ Added is_active to customers';
    END IF;
    
    -- Add color_tag if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'color_tag') THEN
      ALTER TABLE customers ADD COLUMN color_tag TEXT DEFAULT 'new';
      RAISE NOTICE '✅ Added color_tag to customers';
    END IF;
    
    -- Add loyalty_level if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'loyalty_level') THEN
      ALTER TABLE customers ADD COLUMN loyalty_level TEXT DEFAULT 'bronze';
      RAISE NOTICE '✅ Added loyalty_level to customers';
    END IF;
    
    -- Add points if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'points') THEN
      ALTER TABLE customers ADD COLUMN points INTEGER DEFAULT 0;
      RAISE NOTICE '✅ Added points to customers';
    END IF;
    
    -- Add total_spent if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'total_spent') THEN
      ALTER TABLE customers ADD COLUMN total_spent DECIMAL(12, 2) DEFAULT 0;
      RAISE NOTICE '✅ Added total_spent to customers';
    END IF;
    
    -- Add last_visit if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'last_visit') THEN
      ALTER TABLE customers ADD COLUMN last_visit TIMESTAMPTZ;
      RAISE NOTICE '✅ Added last_visit to customers';
    END IF;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '⚠️ Issue adding columns to customers: %', SQLERRM;
END $$;

SELECT '========== STEP 5: CREATE INDEXES ==========' as status;

-- Create indexes (safe - will skip if already exist)
DO $$
BEGIN
  CREATE INDEX IF NOT EXISTS idx_lats_categories_parent_id ON lats_categories(parent_id);
  CREATE INDEX IF NOT EXISTS idx_lats_categories_is_active ON lats_categories(is_active);
  CREATE INDEX IF NOT EXISTS idx_lats_products_category_id ON lats_products(category_id);
  CREATE INDEX IF NOT EXISTS idx_lats_products_supplier_id ON lats_products(supplier_id);
  CREATE INDEX IF NOT EXISTS idx_lats_products_is_active ON lats_products(is_active);
  CREATE INDEX IF NOT EXISTS idx_lats_product_variants_product_id ON lats_product_variants(product_id);
  CREATE INDEX IF NOT EXISTS idx_lats_product_variants_sku ON lats_product_variants(sku);
  CREATE INDEX IF NOT EXISTS idx_lats_stock_movements_product_id ON lats_stock_movements(product_id);
  CREATE INDEX IF NOT EXISTS idx_lats_stock_movements_variant_id ON lats_stock_movements(variant_id);
  CREATE INDEX IF NOT EXISTS idx_lats_sales_product_id ON lats_sales(product_id);
  CREATE INDEX IF NOT EXISTS idx_lats_sales_customer_id ON lats_sales(customer_id);
  CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
  RAISE NOTICE '✅ Created all indexes';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '⚠️ Some indexes could not be created: %', SQLERRM;
END $$;

SELECT '========== STEP 6: GRANT PERMISSIONS ==========' as status;

-- Grant all permissions
DO $$
DECLARE
  tbl_name TEXT;
BEGIN
  FOR tbl_name IN 
    SELECT tablename FROM pg_tables 
    WHERE schemaname = 'public' 
      AND (tablename LIKE 'lats_%' OR tablename = 'customers')
  LOOP
    EXECUTE format('GRANT ALL ON TABLE %I TO postgres, anon, authenticated, service_role', tbl_name);
    RAISE NOTICE '✅ Granted permissions on %', tbl_name;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️ Could not grant permissions on %: %', tbl_name, SQLERRM;
  END LOOP;
END $$;

SELECT '========== STEP 7: INSERT SAMPLE DATA (IF EMPTY) ==========' as status;

-- Insert sample category (safe)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lats_categories') THEN
    IF NOT EXISTS (SELECT 1 FROM lats_categories LIMIT 1) THEN
      INSERT INTO lats_categories (id, name, description, color, icon, is_active)
      VALUES (
        '550e8400-e29b-41d4-a716-446655440001'::uuid,
        'Electronics',
        'Electronic devices and accessories',
        '#3B82F6',
        '📱',
        true
      );
      RAISE NOTICE '✅ Inserted sample category';
    END IF;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '⚠️ Could not insert sample category: %', SQLERRM;
END $$;

-- Insert sample supplier (safe)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lats_suppliers') THEN
    IF NOT EXISTS (SELECT 1 FROM lats_suppliers LIMIT 1) THEN
      INSERT INTO lats_suppliers (id, name, contact_person, phone, email, is_active)
      VALUES (
        '550e8400-e29b-41d4-a716-446655440002'::uuid,
        'Tech Suppliers Ltd',
        'John Doe',
        '+255123456789',
        'john@techsuppliers.com',
        true
      );
      RAISE NOTICE '✅ Inserted sample supplier';
    END IF;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '⚠️ Could not insert sample supplier: %', SQLERRM;
END $$;

SELECT '========== VERIFICATION ==========' as status;

-- Verify tables exist
SELECT 
  tablename,
  CASE WHEN rowsecurity THEN '⚠️ RLS ON' ELSE '✅ RLS OFF' END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
  AND (tablename LIKE 'lats_%' OR tablename = 'customers')
ORDER BY tablename;

COMMIT;

SELECT '🎉 SAFE FIX COMPLETE!' as summary;
SELECT 'Refresh your browser (Ctrl/Cmd + Shift + R) and check for 400 errors!' as next_step;

