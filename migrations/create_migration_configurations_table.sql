-- ============================================
-- CREATE MIGRATION CONFIGURATIONS TABLE
-- For storing database migration connection configurations
-- Date: 2025-01-20
-- ============================================

-- Create migration_configurations table
CREATE TABLE IF NOT EXISTS migration_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_migration_configs_user_id ON migration_configurations(user_id);
CREATE INDEX IF NOT EXISTS idx_migration_configs_default ON migration_configurations(user_id, is_default) WHERE is_default = true;
CREATE INDEX IF NOT EXISTS idx_migration_configs_updated_at ON migration_configurations(updated_at);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_migration_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_migration_configs_updated_at ON migration_configurations;
CREATE TRIGGER trigger_migration_configs_updated_at
    BEFORE UPDATE ON migration_configurations
    FOR EACH ROW
    EXECUTE FUNCTION update_migration_configs_updated_at();

-- Enable RLS (Row Level Security) - Optional, can be disabled if not using Supabase Auth
ALTER TABLE migration_configurations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own migration configs" ON migration_configurations;
DROP POLICY IF EXISTS "Users can insert their own migration configs" ON migration_configurations;
DROP POLICY IF EXISTS "Users can update their own migration configs" ON migration_configurations;
DROP POLICY IF EXISTS "Users can delete their own migration configs" ON migration_configurations;
DROP POLICY IF EXISTS "authenticated_select_configs" ON migration_configurations;
DROP POLICY IF EXISTS "authenticated_insert_configs" ON migration_configurations;
DROP POLICY IF EXISTS "authenticated_update_configs" ON migration_configurations;
DROP POLICY IF EXISTS "authenticated_delete_configs" ON migration_configurations;

-- Create RLS policies - Simplified for Neon (allow all authenticated users)
-- These policies work with both Supabase Auth and direct Neon connections
CREATE POLICY "authenticated_select_configs" ON migration_configurations
    FOR SELECT 
    TO authenticated
    USING (true);

CREATE POLICY "authenticated_insert_configs" ON migration_configurations
    FOR INSERT 
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "authenticated_update_configs" ON migration_configurations
    FOR UPDATE 
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "authenticated_delete_configs" ON migration_configurations
    FOR DELETE 
    TO authenticated
    USING (true);

-- Grant necessary permissions
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON migration_configurations TO authenticated;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
        GRANT ALL ON migration_configurations TO service_role;
    END IF;
END $$;

-- Add comment
COMMENT ON TABLE migration_configurations IS 'Stores database migration connection configurations for each user';

