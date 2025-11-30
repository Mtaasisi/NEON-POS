#!/usr/bin/env node

/**
 * Create Admin User Script
 * Creates a proper admin user with Supabase authentication
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

async function createAdminUser() {
  console.log('🔧 Creating Admin User...');
  console.log('================================');

  try {
    // First, let's try to sign up the admin user
    const adminEmail = 'admin@pos.com';
    const adminPassword = 'admin123';

    console.log(`📧 Email: ${adminEmail}`);
    console.log(`🔑 Password: ${adminPassword}`);

    const { data, error } = await supabase.auth.signUp({
      email: adminEmail,
      password: adminPassword,
    });

    if (error) {
      if (error.message.includes('already registered')) {
        console.log('✅ Admin user already exists in Supabase Auth');
        console.log('🔄 Attempting to sign in...');

        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: adminEmail,
          password: adminPassword,
        });

        if (signInError) {
          console.error('❌ Sign in failed:', signInError.message);
          return false;
        }

        console.log('✅ Admin user signed in successfully');
        console.log('🔄 Updating user role in database...');

        // Update the user role in the custom users table
        const { Pool } = await import('@neondatabase/serverless');
        const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

        if (!DATABASE_URL) {
          console.error('❌ DATABASE_URL not found');
          return false;
        }

        const pool = new Pool({ connectionString: DATABASE_URL });

        await pool.query(`
          INSERT INTO users (email, password, full_name, username, role, is_active, permissions, max_devices_allowed, branch_id, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, true, ARRAY['all'], 1000, '00000000-0000-0000-0000-000000000001', NOW(), NOW())
          ON CONFLICT (email) DO UPDATE SET
            role = 'admin',
            is_active = true,
            permissions = ARRAY['all']
        `, [adminEmail, adminPassword, 'Admin User', 'admin', 'admin']);

        console.log('✅ User role updated to admin');
        await pool.end();

        return true;
      } else {
        console.error('❌ Error creating admin user:', error.message);
        return false;
      }
    }

    console.log('✅ Admin user created successfully');
    console.log('🔄 Setting up user profile...');

    // Wait a moment for the user to be created
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Update the user role in the custom users table
    const { Pool } = await import('@neondatabase/serverless');
    const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

    if (!DATABASE_URL) {
      console.error('❌ DATABASE_URL not found');
      return false;
    }

    const pool = new Pool({ connectionString: DATABASE_URL });

    await pool.query(`
      INSERT INTO users (email, password, full_name, username, role, is_active, permissions, max_devices_allowed, branch_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, true, ARRAY['all'], 1000, '00000000-0000-0000-0000-000000000001', NOW(), NOW())
      ON CONFLICT (email) DO UPDATE SET
        role = 'admin',
        is_active = true,
        permissions = ARRAY['all']
    `, [adminEmail, adminPassword, 'Admin User', 'admin', 'admin']);

    console.log('✅ User profile created with admin role');
    await pool.end();

    return true;

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 ADMIN USER CREATION SCRIPT');
  console.log('==============================\n');

  const success = await createAdminUser();

  if (success) {
    console.log('\n🎉 SUCCESS!');
    console.log('==============================');
    console.log('✅ Admin user created/configured');
    console.log('📧 Email: admin@pos.com');
    console.log('🔑 Password: admin123');
    console.log('🎯 Role: admin');
    console.log('\n💡 You can now login with these credentials!');
  } else {
    console.log('\n❌ FAILED!');
    console.log('==============================');
    console.log('Could not create/configure admin user');
  }
}

main().catch(console.error);
