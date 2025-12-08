-- ================================================
-- FIX: Missing Database Functions and Tables
-- ================================================
-- Fixes these errors:
-- 1. function can_delete_store_location(uuid) does not exist
-- 2. relation "migration_configurations" does not exist
-- ================================================
-- 
-- IMPORTANT: Run this in Supabase SQL Editor
-- URL: https://app.supabase.com/project/jxhzveborezjhsmzsgbc/sql/new
-- ================================================

BEGIN;

-- ================================================
-- FIX 1: Create can_delete_store_location function
-- ================================================

CREATE OR REPLACE FUNCTION can_delete_store_location(store_id UUID)
RETURNS TABLE(
    can_delete BOOLEAN,
    reason TEXT,
    product_count BIGINT,
    variant_count BIGINT,
    customer_count BIGINT,
    employee_count BIGINT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_product_count BIGINT;
    v_variant_count BIGINT;
    v_customer_count BIGINT;
    v_employee_count BIGINT;
BEGIN
    -- Count products
    SELECT COUNT(*) INTO v_product_count
    FROM lats_products
    WHERE branch_id = store_id;
    
    -- Count variants
    SELECT COUNT(*) INTO v_variant_count
    FROM lats_product_variants
    WHERE branch_id = store_id;
    
    -- Count customers (check lats_customers table)
    BEGIN
        SELECT COUNT(*) INTO v_customer_count
        FROM lats_customers
        WHERE branch_id = store_id;
    EXCEPTION
        WHEN undefined_table THEN
            BEGIN
                SELECT COUNT(*) INTO v_customer_count
                FROM customers
                WHERE branch_id = store_id;
            EXCEPTION
                WHEN undefined_table THEN
                    v_customer_count := 0;
            END;
    END;
    
    -- Count employees (if table exists)
    BEGIN
        SELECT COUNT(*) INTO v_employee_count
        FROM employees
        WHERE branch_id = store_id;
    EXCEPTION
        WHEN undefined_table THEN
            v_employee_count := 0;
    END;
    
    -- Check if store can be deleted
    IF v_product_count > 0 OR v_variant_count > 0 THEN
        RETURN QUERY SELECT 
            FALSE,
            'Store has ' || v_product_count || ' products and ' || v_variant_count || ' variants. Delete or transfer them first.',
            v_product_count,
            v_variant_count,
            v_customer_count,
            v_employee_count;
    ELSIF v_customer_count > 0 THEN
        RETURN QUERY SELECT 
            FALSE,
            'Store has ' || v_customer_count || ' customers. Transfer them first or they will be unassigned.',
            v_product_count,
            v_variant_count,
            v_customer_count,
            v_employee_count;
    ELSIF v_employee_count > 0 THEN
        RETURN QUERY SELECT 
            FALSE,
            'Store has ' || v_employee_count || ' employees. Transfer them first or they will be unassigned.',
            v_product_count,
            v_variant_count,
            v_customer_count,
            v_employee_count;
    ELSE
        RETURN QUERY SELECT 
            TRUE,
            'Store can be safely deleted.',
            v_product_count,
            v_variant_count,
            v_customer_count,
            v_employee_count;
    END IF;
END;
$$;

COMMENT ON FUNCTION can_delete_store_location(UUID) IS 
'Checks if a store location can be safely deleted and returns details about related records';

-- ================================================
-- FIX 2: Create migration_configurations table
-- ================================================

CREATE TABLE IF NOT EXISTS public.migration_configurations (
    id UUID DEFAULT gen_random_uuid(),
    user_id UUID,
    config_name VARCHAR(255) NOT NULL DEFAULT 'Default Configuration',
    use_direct_connection BOOLEAN NOT NULL DEFAULT true,
    source_connection_string TEXT,
    target_connection_string TEXT,
    source_branch_name VARCHAR(255),
    target_branch_name VARCHAR(255),
    neon_api_key TEXT,
    neon_project_id VARCHAR(255),
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add primary key if missing (check for any primary key, not just named one)
DO $$
BEGIN
  -- Check if table has any primary key constraint
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'public.migration_configurations'::regclass
    AND contype = 'p'  -- 'p' = primary key constraint
  ) THEN
    ALTER TABLE public.migration_configurations
    ADD CONSTRAINT migration_configurations_pkey PRIMARY KEY (id);
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_migration_configs_user_id ON public.migration_configurations(user_id);
CREATE INDEX IF NOT EXISTS idx_migration_configs_default ON public.migration_configurations(user_id, is_default) WHERE is_default = true;
CREATE INDEX IF NOT EXISTS idx_migration_configs_updated_at ON public.migration_configurations(updated_at);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_migration_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_migration_configs_updated_at ON public.migration_configurations;
CREATE TRIGGER trigger_migration_configs_updated_at
    BEFORE UPDATE ON public.migration_configurations
    FOR EACH ROW
    EXECUTE FUNCTION update_migration_configs_updated_at();

COMMENT ON TABLE public.migration_configurations IS 'Stores database migration connection configurations for each user';

COMMIT;

-- ================================================
-- ✅ DONE! 
-- ================================================
-- Created:
-- 1. ✅ can_delete_store_location function
-- 2. ✅ migration_configurations table
-- 
-- All database errors should now be fixed!
-- ================================================
