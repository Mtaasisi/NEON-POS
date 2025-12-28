-- Create user_branch_assignments table for branch management functionality
-- This table manages user assignments to different store locations/branches

CREATE TABLE IF NOT EXISTS user_branch_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES store_locations(id) ON DELETE CASCADE,

    -- Assignment properties
    is_primary BOOLEAN DEFAULT false,
    can_manage BOOLEAN DEFAULT false,
    can_view_reports BOOLEAN DEFAULT false,
    can_manage_inventory BOOLEAN DEFAULT false,
    can_manage_staff BOOLEAN DEFAULT false,

    -- Audit fields
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_by UUID REFERENCES users(id),

    -- Constraints
    UNIQUE(user_id, branch_id) -- Prevent duplicate assignments
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_branch_assignments_user_id ON user_branch_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_branch_assignments_branch_id ON user_branch_assignments(branch_id);
CREATE INDEX IF NOT EXISTS idx_user_branch_assignments_primary ON user_branch_assignments(user_id, is_primary) WHERE is_primary = true;

-- Function to enforce single primary branch per user
CREATE OR REPLACE FUNCTION check_single_primary_branch()
RETURNS TRIGGER AS $$
BEGIN
    -- If setting is_primary to true, ensure no other branches are primary for this user
    IF NEW.is_primary = true THEN
        UPDATE user_branch_assignments
        SET is_primary = false
        WHERE user_id = NEW.user_id AND id != NEW.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to enforce single primary branch per user
CREATE TRIGGER enforce_single_primary_branch
    BEFORE INSERT OR UPDATE ON user_branch_assignments
    FOR EACH ROW EXECUTE FUNCTION check_single_primary_branch();

-- Grant necessary permissions for the database owner
GRANT ALL ON user_branch_assignments TO neondb_owner;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_branch_assignments TO neondb_owner;
