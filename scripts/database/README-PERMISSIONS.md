# User Permissions Verification Scripts

This directory contains scripts for checking and managing user permissions in the Dukani Pro application.

## Scripts Overview

### 1. `check-users-permissions.mjs`
**Purpose**: Comprehensive verification of all users and their permissions.

**What it checks**:
- All users have appropriate role-based permissions
- Permission functions work correctly
- Route access is properly controlled
- No permission inconsistencies exist

**Usage**:
```bash
node scripts/database/check-users-permissions.mjs
```

**Output**: Detailed report showing:
- ✅ Successes (users with correct permissions)
- ⚠️ Warnings (non-critical issues)
- ❌ Issues (critical problems requiring fixes)

### 2. `fix-user-permissions.mjs`
**Purpose**: Automatically fix users with incorrect permissions.

**What it fixes**:
- Removes 'all' permission from non-admin users
- Assigns correct role-based permissions
- Preserves admin/manager 'all' permissions

**Usage**:
```bash
node scripts/database/fix-user-permissions.mjs
```

**Output**: Shows which users were fixed and the new permissions assigned.

### 3. `test-user-permissions.mjs`
**Purpose**: Interactive testing of specific user permissions and route access.

**Usage**:
```bash
# List all users
node scripts/database/test-user-permissions.mjs list

# Test all permissions for a specific user
node scripts/database/test-user-permissions.mjs test user@email.com

# Check if user has specific permission
node scripts/database/test-user-permissions.mjs check user@email.com view_devices

# Check if user can access specific route
node scripts/database/test-user-permissions.mjs route user@email.com /lats/pos
```

## Role-Based Permissions

| Role | Permissions |
|------|-------------|
| **admin** | `all` (full system access) |
| **manager** | `all` (full system access) |
| **customer-care** | Device management, customer support, POS access |
| **technician** | Device repair, inventory viewing, spare parts |
| **sales** | Customer management, POS transactions, reports |
| **store-keeper** | Inventory management, stock adjustments, purchase orders |
| **user** | Basic device and customer viewing |

## Critical Routes & Required Permissions

| Route | Required Permissions |
|-------|---------------------|
| `/lats/pos` | `access_pos` |
| `/lats/inventory/products` | `view_inventory` |
| `/lats/reports` | `view_reports` |
| `/settings` | `view_settings` |
| `/admin` | `manage_users` |
| `/users` | `manage_users` |

## Maintenance Workflow

### Daily/Weekly Checks
1. Run `check-users-permissions.mjs` to verify all permissions are correct
2. Review any warnings or issues reported
3. If issues found, run `fix-user-permissions.mjs` to auto-correct

### User Permission Testing
1. Use `test-user-permissions.mjs` to verify specific user access
2. Test route access before granting new permissions
3. Verify permission changes work as expected

### After User Role Changes
1. Run `check-users-permissions.mjs` to verify the role change was applied correctly
2. Use `test-user-permissions.mjs` to confirm the user has expected access

## Troubleshooting

### Common Issues

**Issue**: Users have 'all' permissions but shouldn't
**Solution**: Run `fix-user-permissions.mjs`

**Issue**: Permission functions return incorrect results
**Solution**: Check user.permissions array in database vs role-based permissions

**Issue**: Route access not working as expected
**Solution**: Use `test-user-permissions.mjs route` to debug specific routes

### Database Schema

Users table structure:
- `id`: UUID (primary key)
- `email`: TEXT (unique)
- `full_name`: TEXT
- `role`: TEXT (admin, manager, technician, customer-care, sales, store-keeper, user)
- `permissions`: ARRAY (custom permissions, falls back to role-based if empty)
- `is_active`: BOOLEAN (default: true)

## Security Notes

- Admin and Manager roles have `all` permissions for full system access
- Role-based permissions are enforced at the application level
- Database-level security is handled by RLS (Row Level Security) policies
- Permission checks are performed before every sensitive operation

## Best Practices

1. **Regular Audits**: Run permission checks regularly to catch issues early
2. **Role Consistency**: Ensure all users in the same role have consistent permissions
3. **Minimal Permissions**: Grant only necessary permissions for each role
4. **Test Changes**: Always test permission changes before deploying to production
5. **Documentation**: Keep role definitions and permissions documented and up-to-date
