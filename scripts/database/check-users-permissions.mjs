#!/usr/bin/env node

/**
 * Comprehensive User and Permissions Verification Script
 *
 * This script checks all users and their permissions to ensure:
 * 1. All users have proper role-based permissions
 * 2. Permission functions work correctly
 * 3. Route access is properly controlled
 * 4. No permission inconsistencies exist
 * 5. All critical features are accessible to appropriate users
 */

import { createClient } from '@supabase/supabase-js';
import { Pool } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const envPath = join(__dirname, '../../.env');
let supabaseUrl = process.env.VITE_SUPABASE_URL;
let supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
let databaseUrl = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

if (!supabaseUrl || !supabaseKey || !databaseUrl) {
  try {
    const envContent = readFileSync(envPath, 'utf8');
    const envLines = envContent.split('\n');
    for (const line of envLines) {
      if (line.startsWith('VITE_SUPABASE_URL=')) {
        supabaseUrl = line.split('=')[1].replace(/['"]/g, '').trim();
      }
      if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) {
        supabaseKey = line.split('=')[1].replace(/['"]/g, '').trim();
      }
      if (line.startsWith('VITE_DATABASE_URL=') || line.startsWith('DATABASE_URL=')) {
        const value = line.split('=').slice(1).join('=').replace(/['"]/g, '').trim();
        if (!databaseUrl) databaseUrl = value;
      }
    }
  } catch (error) {
    console.error('❌ Could not load environment variables');
  }
}

// Initialize database connection
let supabase;
let pool;
let useNeon = false;

if (supabaseUrl && supabaseKey) {
  console.log('🔗 Using Supabase connection');
  supabase = createClient(supabaseUrl, supabaseKey);
} else if (databaseUrl) {
  console.log('🔗 Using Neon database connection');
  useNeon = true;
  pool = new Pool({ connectionString: databaseUrl });
} else {
  console.error('❌ Database configuration not found');
  console.error('Please set either:');
  console.error('  - VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (for Supabase)');
  console.error('  - VITE_DATABASE_URL or DATABASE_URL (for Neon)');
  process.exit(1);
}

// Role-based permissions (from permissionUtils.ts)
const ROLE_PERMISSIONS = {
  admin: ['all'],
  manager: ['all'],
  'customer-care': [
    'view_dashboard', 'view_devices', 'add_devices', 'edit_devices', 'spare_parts',
    'view_customers', 'add_customers', 'edit_customers', 'view_customer_history',
    'access_pos', 'process_sales', 'apply_discounts',
    'view_reports', 'financial_reports'
  ],
  technician: [
    'view_dashboard', 'view_devices', 'add_devices', 'edit_devices', 'spare_parts',
    'view_customers', 'view_customer_history',
    'view_inventory', 'view_stock_history',
    'view_reports'
  ],
  sales: [
    'view_dashboard', 'view_customers', 'add_customers', 'edit_customers', 'view_customer_history',
    'access_pos', 'process_sales', 'apply_discounts', 'manage_pricing',
    'view_reports', 'financial_reports', 'view_payments',
    'loyalty_program'
  ],
  'store-keeper': [
    'view_dashboard', 'view_inventory', 'add_products', 'edit_products', 'adjust_stock', 'view_stock_history',
    'view_purchase_orders', 'edit_purchase_orders',
    'view_reports',
    'employee_management'
  ],
  user: [
    'view_dashboard', 'view_devices', 'view_customers', 'view_customer_history'
  ]
};

// Route permissions (from permissionUtils.ts)
const ROUTE_PERMISSIONS = {
  '/lats/pos': ['access_pos'],
  '/lats/inventory/management': ['view_inventory', 'edit_settings'],
  '/lats/inventory/new': ['add_products'],
  '/lats/inventory/products': ['view_inventory'],
  '/lats/inventory/products/:id/edit': ['edit_products'],
  '/lats/inventory/purchase-orders': ['view_purchase_orders'],
  '/lats/inventory/purchase-orders/new': ['create_purchase_orders'],
  '/lats/inventory/stock-transfer': ['view_inventory', 'adjust_stock'],
  '/lats/add-product': ['add_products'],
  '/lats/spare-parts': ['view_spare_parts'],
  '/lats/reports': ['view_reports'],
  '/lats/sales-reports': ['view_reports'],
  '/settings': ['view_settings'],
  '/admin': ['manage_users'],
  '/users': ['manage_users']
};

// Critical permission checks
const CRITICAL_PERMISSIONS = {
  admin: ['all', 'manage_users', 'view_settings', 'edit_settings'],
  manager: ['all', 'manage_users', 'view_settings', 'edit_settings', 'view_reports'],
  'customer-care': ['view_devices', 'view_customers', 'create_customers', 'access_pos'],
  technician: ['view_devices', 'update_device_status', 'view_customers'],
  sales: ['view_customers', 'create_customers', 'access_pos', 'process_sales'],
  'store-keeper': ['view_inventory', 'adjust_stock', 'view_purchase_orders'],
  user: ['view_devices', 'view_customers']
};

class PermissionChecker {
  constructor() {
    this.issues = [];
    this.warnings = [];
    this.successes = [];
  }

  logIssue(message) {
    console.log(`❌ ${message}`);
    this.issues.push(message);
  }

  logWarning(message) {
    console.log(`⚠️  ${message}`);
    this.warnings.push(message);
  }

  logSuccess(message) {
    console.log(`✅ ${message}`);
    this.successes.push(message);
  }

  // Check if user has permission (simulating permissionUtils.ts logic)
  hasPermission(user, requiredPermission) {
    if (!user) return false;

    // Get user's permissions - either from their profile or from their role
    const userPermissions = this.getUserPermissions(user);

    // Check if user has 'all' permission (admin)
    if (userPermissions.includes('all')) {
      return true;
    }

    // Check if user has the specific permission
    if (userPermissions.includes(requiredPermission)) {
      return true;
    }

    return false;
  }

  // Get user permissions (simulating permissionUtils.ts logic)
  getUserPermissions(user) {
    if (!user) return [];

    // First, check if user has permissions array in their profile
    if (user.permissions && Array.isArray(user.permissions) && user.permissions.length > 0) {
      return user.permissions;
    }

    // Fallback to role-based permissions
    const role = user.role;
    return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.user;
  }

  // Check if user can access route
  canAccessRoute(user, path) {
    if (!user) return false;

    // Admin always has access
    if (this.hasPermission(user, 'all')) {
      return true;
    }

    // Find matching route permission
    for (const [routePath, requiredPermissions] of Object.entries(ROUTE_PERMISSIONS)) {
      // Check for exact match or pattern match
      const routePattern = routePath.replace(/:\w+/g, '[^/]+');
      const regex = new RegExp(`^${routePattern}$`);

      if (regex.test(path)) {
        // User needs at least one of the required permissions
        return requiredPermissions.some(permission => this.hasPermission(user, permission));
      }
    }

    // If no specific permission is defined for this route, allow access
    return true;
  }

  // Check user permissions
  checkUserPermissions(user) {
    console.log(`\n🔍 Checking user: ${user.full_name || user.name} (${user.email}) - Role: ${user.role}`);

    // Check if user has permissions array
    const hasCustomPermissions = user.permissions && Array.isArray(user.permissions) && user.permissions.length > 0;

    if (hasCustomPermissions) {
      console.log(`   Custom permissions found: [${user.permissions.join(', ')}]`);
    } else {
      console.log(`   Using role-based permissions for role: ${user.role}`);
    }

    const userPermissions = this.getUserPermissions(user);

    // Check critical permissions for the user's role
    const expectedPermissions = CRITICAL_PERMISSIONS[user.role] || [];

    if (expectedPermissions.length === 0) {
      this.logWarning(`No critical permissions defined for role: ${user.role}`);
      return;
    }

    console.log(`   Expected critical permissions: [${expectedPermissions.join(', ')}]`);
    console.log(`   Actual permissions: [${userPermissions.join(', ')}]`);

    // Check if user has all expected permissions
    const missingPermissions = expectedPermissions.filter(perm => !this.hasPermission(user, perm));

    if (missingPermissions.length > 0) {
      this.logIssue(`User ${user.email} (${user.role}) is missing critical permissions: [${missingPermissions.join(', ')}]`);
    } else {
      this.logSuccess(`User ${user.email} has all expected permissions`);
    }

    // Check for admin permission consistency
    if (user.role === 'admin' && !this.hasPermission(user, 'all')) {
      this.logIssue(`Admin user ${user.email} does not have 'all' permission`);
    }

    // Check for unexpected permissions (admins should have all, others shouldn't have admin perms)
    if (user.role !== 'admin' && user.role !== 'manager' && this.hasPermission(user, 'all')) {
      this.logIssue(`Non-admin user ${user.email} (${user.role}) has 'all' permission`);
    }
  }

  // Check route access for user
  checkRouteAccess(user) {
    console.log(`\n🚪 Checking route access for: ${user.full_name || user.name} (${user.role})`);

    const criticalRoutes = [
      '/lats/pos',
      '/lats/inventory/products',
      '/lats/reports',
      '/settings',
      '/admin',
      '/users'
    ];

    for (const route of criticalRoutes) {
      const hasAccess = this.canAccessRoute(user, route);
      const routePerms = ROUTE_PERMISSIONS[route] || [];

      if (routePerms.length > 0) {
        const hasRequiredPerms = routePerms.some(perm => this.hasPermission(user, perm));

        if (hasAccess && !hasRequiredPerms) {
          this.logIssue(`User ${user.email} can access ${route} but lacks required permissions [${routePerms.join(', ')}]`);
        } else if (!hasAccess && hasRequiredPerms) {
          this.logIssue(`User ${user.email} has permissions [${routePerms.join(', ')}] but cannot access ${route}`);
        } else if (hasAccess && hasRequiredPerms) {
          console.log(`   ✅ ${route}: Access granted (has required permissions)`);
        } else {
          console.log(`   ✅ ${route}: Access denied (lacks required permissions)`);
        }
      } else {
        console.log(`   ✅ ${route}: Access granted (no specific permissions required)`);
      }
    }
  }

  // Check permission consistency across all users
  checkPermissionConsistency(users) {
    console.log(`\n🔄 Checking permission consistency across ${users.length} users...`);

    const roleStats = {};

    // Group users by role and check consistency
    for (const user of users) {
      const role = user.role;
      if (!roleStats[role]) {
        roleStats[role] = {
          count: 0,
          permissionSets: new Set(),
          users: []
        };
      }

      roleStats[role].count++;
      const permKey = JSON.stringify(this.getUserPermissions(user).sort());
      roleStats[role].permissionSets.add(permKey);
      roleStats[role].users.push(user.email);
    }

    // Check for inconsistencies within roles
    for (const [role, stats] of Object.entries(roleStats)) {
      if (stats.permissionSets.size > 1) {
        this.logWarning(`Role '${role}' has ${stats.permissionSets.size} different permission sets across ${stats.count} users`);
        console.log(`   Users with role '${role}': ${stats.users.join(', ')}`);

        // Show the different permission sets
        let setIndex = 1;
        for (const permSet of stats.permissionSets) {
          const perms = JSON.parse(permSet);
          console.log(`   Set ${setIndex++}: [${perms.join(', ')}]`);
        }
      } else {
        console.log(`   ✅ Role '${role}' has consistent permissions across ${stats.count} users`);
      }
    }
  }

  // Generate summary report
  generateReport(users) {
    console.log('\n' + '='.repeat(80));
    console.log('📊 PERMISSION VERIFICATION REPORT');
    console.log('='.repeat(80));

    console.log(`\n👥 Total Users Checked: ${users.length}`);

    const roleCount = {};
    users.forEach(user => {
      roleCount[user.role] = (roleCount[user.role] || 0) + 1;
    });

    console.log('\n📈 Users by Role:');
    Object.entries(roleCount).forEach(([role, count]) => {
      console.log(`   • ${role}: ${count} users`);
    });

    console.log(`\n✅ Successes: ${this.successes.length}`);
    console.log(`⚠️  Warnings: ${this.warnings.length}`);
    console.log(`❌ Issues: ${this.issues.length}`);

    if (this.issues.length > 0) {
      console.log('\n🚨 CRITICAL ISSUES FOUND:');
      this.issues.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue}`);
      });
    }

    if (this.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS:');
      this.warnings.forEach((warning, index) => {
        console.log(`   ${index + 1}. ${warning}`);
      });
    }

    console.log('\n' + '='.repeat(80));

    if (this.issues.length === 0) {
      console.log('🎉 ALL PERMISSIONS ARE WORKING CORRECTLY!');
      console.log('   No critical issues found. All users have appropriate permissions.');
    } else {
      console.log('🚨 PERMISSION ISSUES DETECTED!');
      console.log('   Please review and fix the issues listed above.');
    }

    console.log('='.repeat(80));
  }
}

async function fetchAllUsers() {
  try {
    let users;

    if (useNeon) {
      const result = await pool.query(`
        SELECT id, full_name, email, username, role, is_active,
               permissions, created_at, updated_at,
               failed_login_attempts, two_factor_enabled, last_login,
               phone, department, branch_id
        FROM users
        ORDER BY role DESC, full_name ASC
      `);
      users = result.rows;
    } else {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email, username, role, is_active, permissions, created_at, updated_at, phone, department')
        .order('role', { ascending: false })
        .order('full_name', { ascending: true });

      if (error) {
        console.error('❌ Error fetching users:', error.message);
        return [];
      }
      users = data || [];
    }

    return users;
  } catch (error) {
    console.error('❌ Error fetching users:', error.message);
    return [];
  }
}

async function main() {
  console.log('🚀 User and Permissions Verification');
  console.log('=====================================\n');

  // Fetch all users
  console.log('📥 Fetching all users from database...');
  const users = await fetchAllUsers();

  if (users.length === 0) {
    console.log('❌ No users found in database!');
    console.log('   Run the check-and-create-test-users.mjs script first.');
    return;
  }

  // Initialize permission checker
  const checker = new PermissionChecker();

  // Check each user's permissions
  console.log('\n🔍 Checking individual user permissions...');
  for (const user of users) {
    checker.checkUserPermissions(user);
  }

  // Check route access for each user
  console.log('\n🚪 Checking route access permissions...');
  for (const user of users) {
    checker.checkRouteAccess(user);
  }

  // Check permission consistency across roles
  checker.checkPermissionConsistency(users);

  // Generate final report
  checker.generateReport(users);

  console.log('\n✨ Permission verification completed!');
}

main().catch(console.error).finally(() => {
  if (pool) {
    pool.end();
  }
});
