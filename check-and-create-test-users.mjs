#!/usr/bin/env node

/**
 * Check and Create Test Users for Admin Testing
 * This script checks what users exist and creates test users for each role
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const envPath = join(__dirname, '.env');
let supabaseUrl = process.env.VITE_SUPABASE_URL;
let supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  try {
    const envContent = readFileSync(envPath, 'utf8');
    const envLines = envContent.split('\n');
    for (const line of envLines) {
      if (line.startsWith('VITE_SUPABASE_URL=')) {
        supabaseUrl = line.split('=')[1].replace(/['"]/g, '');
      }
      if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) {
        supabaseKey = line.split('=')[1].replace(/['"]/g, '');
      }
    }
  } catch (error) {
    console.error('❌ Could not load environment variables');
  }
}

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase configuration not found');
  console.error('Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUsers() {
  console.log('🔍 Checking existing users...');
  console.log('================================');

  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, full_name, name, email, role')
      .order('role', { ascending: false });

    if (error) {
      console.error('❌ Error fetching users:', error.message);
      return [];
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
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', userData.email)
        .single();

      if (existingUser) {
        console.log(`   ⚠️  User ${userData.email} already exists, skipping...`);
        continue;
      }

      // Create auth user
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

      // Insert user record
      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: authData.user?.id,
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

main().catch(console.error);
