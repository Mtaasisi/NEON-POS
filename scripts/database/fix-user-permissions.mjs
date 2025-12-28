#!/usr/bin/env node

/**
 * Fix User Permissions Script
 *
 * This script fixes users who have incorrect permissions.
 * Specifically, it removes 'all' permission from non-admin users
 * and assigns them their proper role-based permissions.
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

// Role-based default permissions (from permissionUtils.ts)
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

async function fetchUsersWithIncorrectPermissions() {
  try {
    let users;

    if (useNeon) {
      const result = await pool.query(`
        SELECT id, full_name, email, role, permissions
        FROM users
        WHERE role != 'admin' AND role != 'manager'
          AND permissions @> ARRAY['all']
        ORDER BY full_name ASC
      `);
      users = result.rows;
    } else {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email, role, permissions')
        .neq('role', 'admin')
        .neq('role', 'manager')
        .contains('permissions', ['all']);

      if (error) {
        console.error('❌ Error fetching users with incorrect permissions:', error.message);
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

async function updateUserPermissions(userId, newPermissions) {
  try {
    if (useNeon) {
      const result = await pool.query(
        'UPDATE users SET permissions = $1, updated_at = NOW() WHERE id = $2 RETURNING id',
        [newPermissions, userId]
      );
      return result.rows.length > 0;
    } else {
      const { error } = await supabase
        .from('users')
        .update({
          permissions: newPermissions,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      return !error;
    }
  } catch (error) {
    console.error('❌ Error updating user permissions:', error.message);
    return false;
  }
}

async function main() {
  console.log('🔧 User Permissions Fix Script');
  console.log('===============================\n');

  // Find users with incorrect permissions
  console.log('🔍 Finding users with incorrect permissions...');
  const usersToFix = await fetchUsersWithIncorrectPermissions();

  if (usersToFix.length === 0) {
    console.log('✅ No users found with incorrect permissions!');
    console.log('   All users have appropriate permissions.');
    return;
  }

  console.log(`📊 Found ${usersToFix.length} users with incorrect permissions:\n`);

  // Show what will be fixed
  for (const user of usersToFix) {
    const correctPermissions = ROLE_PERMISSIONS[user.role] || ROLE_PERMISSIONS.user;
    console.log(`👤 ${user.full_name} (${user.email})`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Current permissions: [${user.permissions.join(', ')}]`);
    console.log(`   Will be changed to: [${correctPermissions.join(', ')}]\n`);
  }

  // Ask for confirmation
  console.log('⚠️  This will update user permissions to match their roles.');
  console.log('   Admin and Manager users will keep their "all" permissions.');
  console.log('   Other roles will get their role-specific permissions.\n');

  // In a real script, you'd want user confirmation here
  // For now, we'll proceed automatically
  console.log('🔄 Fixing permissions...\n');

  let successCount = 0;
  let failCount = 0;

  for (const user of usersToFix) {
    const correctPermissions = ROLE_PERMISSIONS[user.role] || ROLE_PERMISSIONS.user;

    console.log(`🔧 Updating ${user.full_name} (${user.role})...`);

    const success = await updateUserPermissions(user.id, correctPermissions);

    if (success) {
      console.log(`   ✅ Updated permissions to: [${correctPermissions.join(', ')}]`);
      successCount++;
    } else {
      console.log(`   ❌ Failed to update permissions`);
      failCount++;
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 PERMISSION FIX SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Successfully updated: ${successCount} users`);
  console.log(`❌ Failed to update: ${failCount} users`);
  console.log(`📊 Total processed: ${usersToFix.length} users`);

  if (successCount > 0) {
    console.log('\n🎉 Permissions have been fixed!');
    console.log('   Run the permission check script again to verify:');
    console.log('   node scripts/database/check-users-permissions.mjs');
  }

  console.log('='.repeat(60));
}

main().catch(console.error).finally(() => {
  if (pool) {
    pool.end();
  }
});
