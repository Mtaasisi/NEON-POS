# Branch Assignment System Setup

## Overview

The Dukani Pro application now supports branch assignment functionality, allowing users to be assigned to specific store locations with different permission levels.

## Database Setup

### Automatic Setup (Recommended)

Run the migration script to create the required table:

```bash
cd /path/to/your/project
node scripts/database/create-user-branch-assignments.mjs
```

### Manual Setup

If the automatic script fails, execute this SQL manually in your Neon database:

```sql
-- Create user_branch_assignments table for branch management functionality
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

-- Grant necessary permissions
GRANT ALL ON user_branch_assignments TO neondb_owner;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_branch_assignments TO neondb_owner;
```

## Features

### Branch Assignment Properties

Each user-branch assignment can have the following properties:

- **is_primary**: Boolean indicating if this is the user's primary branch
- **can_manage**: User can manage this branch's operations
- **can_view_reports**: User can view reports for this branch
- **can_manage_inventory**: User can manage inventory for this branch
- **can_manage_staff**: User can manage staff assignments for this branch

### Constraints

- Each user can only be assigned to each branch once (enforced by UNIQUE constraint)
- Only one branch can be marked as primary per user (enforced by trigger)

## API Functions

The system provides several API functions in `src/lib/userBranchApi.ts`:

- `getUserBranchAssignments(userId)` - Get all branch assignments for a user
- `assignUserToBranch(userId, assignment, assignedBy?)` - Assign user to a branch
- `updateUserBranchAssignment(assignmentId, updates)` - Update assignment permissions
- `removeUserFromBranch(assignmentId)` - Remove user from branch
- `bulkAssignUserToBranches(userId, assignments, assignedBy?)` - Bulk assignment
- `setPrimaryBranch(userId, branchId)` - Set primary branch
- `userHasAccessToAllBranches(userId)` - Check if user has all-branch access
- `getBranchUsers(branchId)` - Get all users assigned to a branch

## Error Handling

The API functions now gracefully handle the case where the `user_branch_assignments` table doesn't exist:

- If the table is missing, functions return empty arrays instead of throwing errors
- Console logs indicate when the table is missing (for debugging)
- Application continues to function normally without branch assignments

## User Management Integration

The UserManagementPage now loads branch assignments for each user:

- Displays assigned branches in the user list
- Handles missing table gracefully with fallback to "all branches" access
- Branch assignment UI can be added later for full branch management

## Testing

To test the branch assignment functionality:

1. Ensure the table exists in your database
2. Check that UserManagementPage loads without errors
3. Verify that user permissions work correctly
4. Test that the application handles missing table gracefully

## Troubleshooting

### "relation 'user_branch_assignments' does not exist" Error

This error occurs when the table hasn't been created. Run the migration script or execute the SQL manually.

### Permission Issues

Ensure the database user has proper permissions to create tables and execute DDL statements.

### Trigger Issues

If the trigger fails, check that the function was created correctly and that you have permission to create triggers.

## Future Enhancements

- Add UI for managing branch assignments in the admin panel
- Implement branch-specific data filtering
- Add branch selection in the user interface
- Create branch management dashboard
