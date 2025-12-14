#!/usr/bin/env node

/**
 * Check and Create Test Users for Admin Testing
 * This script checks what users exist and creates test users for each role
 * Supports both Supabase and Neon database
 */

import { createClient } from '@supabase/supabase-js';
import { Pool } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { randomUUID } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const envPath = join(__dirname, '.env');
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

async function checkUsers() {
  console.log('🔍 Checking existing users...');
  console.log('================================');

  try {
    let users;
    
    if (useNeon) {
      const result = await pool.query(`
        SELECT id, full_name, email, role 
        FROM users 
        ORDER BY role DESC
      `);
      users = result.rows;
    } else {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, name, email, role')
        .order('role', { ascending: false });

      if (error) {
        console.error('❌ Error fetching users:', error.message);
        return [];
      }
      users = data || [];
    }

    console.log(`📊 Found ${users.length} users:`);
    users.forEach(user => {
      console.log(`   • ${user.full_name || user.name || 'Unknown'} (${user.role}) - ${user.email}`);
    });

    return users;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return [];
  }
}

async function createTestUsers() {
  console.log('\n🔧 Creating test users for each role...');
  console.log('=========================================');

  const testUsers = [
    { email: 'technician@test.com', password: 'test123456', full_name: 'John Technician', role: 'technician' },
    { email: 'customer.care@test.com', password: 'test123456', full_name: 'Sarah Customer Care', role: 'customer-care' },
    { email: 'sales@test.com', password: 'test123456', full_name: 'Mike Sales', role: 'sales' },
    { email: 'manager@test.com', password: 'test123456', full_name: 'Lisa Manager', role: 'manager' },
    { email: 'user@test.com', password: 'test123456', full_name: 'Alex User', role: 'user' }
  ];

  for (const userData of testUsers) {
    try {
      console.log(`   Creating ${userData.full_name} (${userData.role})...`);

      // Check if user already exists
      let existingUser;
      if (useNeon) {
        const result = await pool.query(
          'SELECT id FROM users WHERE email = $1',
          [userData.email]
        );
        existingUser = result.rows[0];
      } else {
        const { data } = await supabase
          .from('users')
          .select('id')
          .eq('email', userData.email)
          .single();
        existingUser = data;
      }

      if (existingUser) {
        console.log(`   ⚠️  User ${userData.email} already exists, skipping...`);
        continue;
      }

      let userId;
      
      if (useNeon) {
        // For Neon, create user directly in database
        // Generate a UUID for the user ID
        userId = randomUUID();
        
        // Insert user record directly (password is required by schema)
        const result = await pool.query(
          `INSERT INTO users (id, full_name, email, role, password, is_active, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
           RETURNING id`,
          [userId, userData.full_name, userData.email, userData.role, userData.password, true]
        );
        
        if (result.rows[0]) {
          console.log(`   ✅ Created ${userData.full_name} (${userData.role})`);
        } else {
          console.log(`   ❌ Failed to create user record`);
        }
      } else {
        // For Supabase, create auth user first
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: userData.email,
          password: userData.password,
          options: {
            data: {
              full_name: userData.full_name,
              role: userData.role
            }
          }
        });

        if (authError) {
          console.log(`   ❌ Failed to create auth user: ${authError.message}`);
          continue;
        }

        userId = authData.user?.id;

        // Insert user record
        const { error: userError } = await supabase
          .from('users')
          .insert({
            id: userId,
            full_name: userData.full_name,
            email: userData.email,
            role: userData.role,
            is_active: true
          });

        if (userError) {
          console.log(`   ❌ Failed to create user record: ${userError.message}`);
        } else {
          console.log(`   ✅ Created ${userData.full_name} (${userData.role})`);
        }
      }

    } catch (error) {
      console.log(`   ❌ Error creating ${userData.email}: ${error.message}`);
    }
  }
}

async function main() {
  console.log('🚀 Admin User Testing Setup');
  console.log('===========================\n');

  // Check existing users
  const existingUsers = await checkUsers();

  // Count users by role
  const roleCount = existingUsers.reduce((acc, user) => {
    acc[user.role] = (acc[user.role] || 0) + 1;
    return acc;
  }, {});

  console.log('\n📈 Users by role:');
  Object.entries(roleCount).forEach(([role, count]) => {
    console.log(`   • ${role}: ${count}`);
  });

  // Check if we need test users
  const hasTechnician = roleCount.technician > 0;
  const hasCustomerCare = roleCount['customer-care'] > 0;
  const hasSales = roleCount.sales > 0;
  const hasManager = roleCount.manager > 0;
  const hasUser = roleCount.user > 0;

  if (hasTechnician && hasCustomerCare && hasSales && hasManager && hasUser) {
    console.log('\n✅ All test user roles exist! You can now test user impersonation.');
    console.log('\n📋 Instructions:');
    console.log('1. Login as admin');
    console.log('2. Click the purple user icon in TopBar (next to branch selector)');
    console.log('3. Select any user to test their perspective');
    console.log('4. Try creating daily reports to see role-specific templates');
    console.log('5. Click "Stop Testing" to return to admin account');
  } else {
    console.log('\n⚠️  Missing some test user roles. Creating test users...');
    await createTestUsers();

    console.log('\n🔄 Checking users again...');
    await checkUsers();

    console.log('\n✅ Test users created! You can now test user impersonation.');
    console.log('\n🔑 Test User Credentials:');
    console.log('   Email: [role]@test.com');
    console.log('   Password: test123456');
    console.log('   Example: technician@test.com / test123456');
  }
}

main().catch(console.error).finally(() => {
  if (pool) {
    pool.end();
  }
});
