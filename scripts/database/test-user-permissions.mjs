#!/usr/bin/env node

/**
 * Test User Permissions Script
 *
 * This script allows testing specific user permissions and route access
 * for debugging and verification purposes.
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
  process.exit(1);
}

// Permission testing functions (simulating permissionUtils.ts)
function hasPermission(user, requiredPermission) {
  if (!user) return false;

  const userPermissions = getUserPermissions(user);

  if (userPermissions.includes('all')) {
    return true;
  }

  if (userPermissions.includes(requiredPermission)) {
    return true;
  }

  return false;
}

function getUserPermissions(user) {
  if (!user) return [];

  if (user.permissions && Array.isArray(user.permissions) && user.permissions.length > 0) {
    return user.permissions;
  }

  // Role-based permissions fallback
  const ROLE_PERMISSIONS = {
    admin: ['all'],
    manager: ['all'],
    'customer-care': [
      'view_devices', 'add_device', 'edit_device', 'assign_devices',
      'view_customers', 'create_customers', 'edit_customers',
      'access_pos', 'process_sales', 'apply_discounts',
      'view_reports'
    ],
    technician: [
      'view_devices', 'update_device_status',
      'view_customers',
      'view_inventory', 'view_stock_history',
      'view_spare_parts'
    ],
    sales: [
      'view_customers', 'create_customers', 'edit_customers',
      'access_pos', 'process_sales', 'apply_discounts',
      'view_reports'
    ],
    'store-keeper': [
      'view_inventory',
      'view_stock_history',
      'adjust_stock',
      'view_purchase_orders',
      'edit_purchase_orders',
      'view_reports'
    ],
    user: [
      'view_devices', 'view_customers'
    ]
  };

  const role = user.role;
  return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.user;
}

function canAccessRoute(user, path) {
  if (!user) return false;

  if (hasPermission(user, 'all')) {
    return true;
  }

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

  const routePerms = ROUTE_PERMISSIONS[path];
  if (!routePerms) return true; // No specific permissions required

  return routePerms.some(perm => hasPermission(user, perm));
}

async function findUserByEmail(email) {
  try {
    let user;

    if (useNeon) {
      const result = await pool.query(
        'SELECT id, full_name, email, username, role, is_active, permissions FROM users WHERE email = $1',
        [email]
      );
      user = result.rows[0];
    } else {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email, username, role, is_active, permissions')
        .eq('email', email)
        .single();

      if (error) {
        console.error('❌ Error fetching user:', error.message);
        return null;
      }
      user = data;
    }

    return user;
  } catch (error) {
    console.error('❌ Error fetching user:', error.message);
    return null;
  }
}

async function listAllUsers() {
  try {
    let users;

    if (useNeon) {
      const result = await pool.query(
        'SELECT id, full_name, email, role FROM users ORDER BY role DESC, full_name ASC'
      );
      users = result.rows;
    } else {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email, role')
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

function testUserPermissions(user) {
  console.log(`\n👤 Testing permissions for: ${user.full_name} (${user.email})`);
  console.log(`   Role: ${user.role}`);
  console.log(`   Active: ${user.is_active ? '✅' : '❌'}`);
  console.log(`   Permissions: [${getUserPermissions(user).join(', ')}]`);

  // Test critical permissions
  const testPermissions = [
    'all', 'manage_users', 'view_devices', 'create_customers',
    'access_pos', 'view_inventory', 'view_reports'
  ];

  console.log('\n🔐 Permission Tests:');
  for (const perm of testPermissions) {
    const hasPerm = hasPermission(user, perm);
    console.log(`   ${perm}: ${hasPerm ? '✅' : '❌'}`);
  }

  // Test route access
  const testRoutes = [
    '/lats/pos', '/lats/inventory/products', '/lats/reports',
    '/settings', '/admin', '/users'
  ];

  console.log('\n🚪 Route Access Tests:');
  for (const route of testRoutes) {
    const canAccess = canAccessRoute(user, route);
    console.log(`   ${route}: ${canAccess ? '✅' : '❌'}`);
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('🔍 User Permission Testing Tool');
    console.log('===============================\n');
    console.log('Usage:');
    console.log('  node test-user-permissions.mjs list                    # List all users');
    console.log('  node test-user-permissions.mjs test <email>           # Test specific user permissions');
    console.log('  node test-user-permissions.mjs check <email> <perm>   # Check specific permission');
    console.log('  node test-user-permissions.mjs route <email> <path>   # Check route access');
    console.log('\nExamples:');
    console.log('  node test-user-permissions.mjs list');
    console.log('  node test-user-permissions.mjs test admin@pos.com');
    console.log('  node test-user-permissions.mjs check tech@pos.com view_devices');
    console.log('  node test-user-permissions.mjs route care@pos.com /lats/pos');
    return;
  }

  const command = args[0];

  switch (command) {
    case 'list':
      console.log('👥 All Users:');
      const users = await listAllUsers();
      users.forEach(user => {
        console.log(`   • ${user.full_name} (${user.email}) - ${user.role}`);
      });
      break;

    case 'test':
      if (args.length < 2) {
        console.error('❌ Please provide an email address');
        return;
      }
      const email = args[1];
      const user = await findUserByEmail(email);
      if (!user) {
        console.error(`❌ User not found: ${email}`);
        return;
      }
      testUserPermissions(user);
      break;

    case 'check':
      if (args.length < 3) {
        console.error('❌ Please provide email and permission');
        return;
      }
      const checkUser = await findUserByEmail(args[1]);
      if (!checkUser) {
        console.error(`❌ User not found: ${args[1]}`);
        return;
      }
      const hasPerm = hasPermission(checkUser, args[2]);
      console.log(`🔐 ${args[1]} has permission '${args[2]}': ${hasPerm ? '✅ YES' : '❌ NO'}`);
      break;

    case 'route':
      if (args.length < 3) {
        console.error('❌ Please provide email and route path');
        return;
      }
      const routeUser = await findUserByEmail(args[1]);
      if (!routeUser) {
        console.error(`❌ User not found: ${args[1]}`);
        return;
      }
      const canAccess = canAccessRoute(routeUser, args[2]);
      console.log(`🚪 ${args[1]} can access '${args[2]}': ${canAccess ? '✅ YES' : '❌ NO'}`);
      break;

    default:
      console.error(`❌ Unknown command: ${command}`);
  }
}

main().catch(console.error).finally(() => {
  if (pool) {
    pool.end();
  }
});
