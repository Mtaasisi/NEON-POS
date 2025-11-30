#!/usr/bin/env node

/**
 * Direct Login Test Script
 * This script tests the login functionality directly against the database
 * to diagnose login issues
 */

import { Pool } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';

// Load environment variables
dotenv.config();

const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL not found in environment variables');
  console.error('Please set VITE_DATABASE_URL in your .env file');
  process.exit(1);
}

console.log('🔗 Connecting to database...');
console.log('URL:', DATABASE_URL.substring(0, 50) + '...\n');

const pool = new Pool({ connectionString: DATABASE_URL });

async function testLogin(email, password) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🧪 Testing Login: ${email} / ${password}`);
  console.log('='.repeat(60));
  
  try {
    // Step 1: Check if user exists
    console.log('\n1️⃣ Checking if user exists...');
    const userCheckQuery = `
      SELECT id, email, password, full_name, role, is_active
      FROM users
      WHERE email = $1
    `;
    const userCheckResult = await pool.query(userCheckQuery, [email]);
    
    if (userCheckResult.rows.length === 0) {
      console.log('   ❌ User does not exist in database');
      return false;
    }
    
    const user = userCheckResult.rows[0];
    console.log('   ✅ User found:', {
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      is_active: user.is_active,
      stored_password: user.password,
      password_length: user.password.length
    });
    
    // Step 2: Check if password matches
    console.log('\n2️⃣ Checking password match...');
    console.log(`   Stored password: "${user.password}"`);
    console.log(`   Provided password: "${password}"`);
    console.log(`   Match: ${user.password === password}`);
    
    if (user.password !== password) {
      console.log('   ❌ Password does not match');
      return false;
    }
    console.log('   ✅ Password matches');
    
    // Step 3: Check if user is active
    console.log('\n3️⃣ Checking if user is active...');
    if (!user.is_active) {
      console.log('   ❌ User is not active');
      return false;
    }
    console.log('   ✅ User is active');
    
    // Step 4: Test the actual login query
    console.log('\n4️⃣ Testing actual login query...');
    const loginQuery = `
      SELECT id, email, full_name, role, is_active, created_at, updated_at 
      FROM users 
      WHERE email = $1
      AND password = $2
      AND is_active = true
      LIMIT 1
    `;
    const loginResult = await pool.query(loginQuery, [email, password]);
    
    if (loginResult.rows.length === 0) {
      console.log('   ❌ Login query returned no results');
      return false;
    }
    
    console.log('   ✅ Login query successful');
    console.log('   User data:', loginResult.rows[0]);
    
    console.log('\n✅ LOGIN SUCCESSFUL!');
    return true;
    
  } catch (error) {
    console.error('\n❌ ERROR during login test:', error.message);
    console.error('Full error:', error);
    return false;
  }
}

async function createTestUsers() {
  console.log('\n' + '='.repeat(60));
  console.log('🔧 Creating/Updating Test Users');
  console.log('='.repeat(60));
  
  const testUsers = [
    { email: 'care@care.com', password: '123456', full_name: 'Admin User', role: 'admin' },
    { email: 'admin@pos.com', password: 'admin123', full_name: 'Admin User', role: 'admin' },
    { email: 'tech@pos.com', password: 'tech123', full_name: 'Tech User', role: 'technician' },
    { email: 'manager@pos.com', password: 'manager123', full_name: 'Manager User', role: 'manager' }
  ];
  
  for (const user of testUsers) {
    try {
      console.log(`\n📝 Creating/updating ${user.email}...`);
      
      // Delete existing user first
      await pool.query('DELETE FROM users WHERE email = $1', [user.email]);
      
      // Insert new user
      const insertQuery = `
        INSERT INTO users (
          email, password, full_name, username, role, is_active,
          permissions, max_devices_allowed, branch_id,
          created_at, updated_at, require_approval, 
          failed_login_attempts, two_factor_enabled
        ) VALUES (
          $1, $2, $3, $4, $5, true,
          ARRAY['all'], 1000, '00000000-0000-0000-0000-000000000001',
          NOW(), NOW(), false, 0, false
        )
        RETURNING id, email, full_name, role
      `;
      
      const result = await pool.query(insertQuery, [
        user.email,
        user.password,
        user.full_name,
        user.email.split('@')[0],
        user.role
      ]);
      
      console.log(`   ✅ Created: ${result.rows[0].email} (${result.rows[0].role})`);
      console.log(`      Password: ${user.password}`);
      
    } catch (error) {
      console.error(`   ❌ Error creating ${user.email}:`, error.message);
    }
  }
}

async function listAllUsers() {
  console.log('\n' + '='.repeat(60));
  console.log('👥 All Users in Database');
  console.log('='.repeat(60));
  
  try {
    const result = await pool.query(`
      SELECT email, password, full_name, role, is_active, created_at
      FROM users
      ORDER BY created_at DESC
    `);
    
    if (result.rows.length === 0) {
      console.log('\n⚠️  No users found in database');
      return;
    }
    
    console.log(`\nFound ${result.rows.length} user(s):\n`);
    result.rows.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email}`);
      console.log(`   Password: ${user.password}`);
      console.log(`   Name: ${user.full_name}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Active: ${user.is_active}`);
      console.log(`   Created: ${user.created_at}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error listing users:', error.message);
  }
}

async function main() {
  console.log('\n🚀 DIRECT LOGIN TEST SCRIPT');
  console.log('This script will diagnose and fix login issues\n');
  
  try {
    // Test connection
    console.log('1️⃣ Testing database connection...');
    const result = await pool.query('SELECT NOW()');
    console.log('   ✅ Database connection successful');
    console.log('   Server time:', result.rows[0].now);
    
    // List all users
    await listAllUsers();
    
    // Create test users
    await createTestUsers();
    
    // List users again after creation
    await listAllUsers();
    
    // Test login with care@care.com
    await testLogin('care@care.com', '123456');
    
    // Test login with wrong password
    console.log('\n\n🧪 Testing with WRONG password (should fail):');
    await testLogin('care@care.com', 'wrongpassword');
    
    // Test all users
    console.log('\n\n' + '='.repeat(60));
    console.log('🧪 Testing All Test Users');
    console.log('='.repeat(60));
    
    await testLogin('care@care.com', '123456');
    await testLogin('admin@pos.com', 'admin123');
    await testLogin('tech@pos.com', 'tech123');
    await testLogin('manager@pos.com', 'manager123');
    
    console.log('\n\n' + '='.repeat(60));
    console.log('✅ DIAGNOSTIC COMPLETE');
    console.log('='.repeat(60));
    console.log('\nTest Credentials:');
    console.log('  Email: care@care.com     | Password: 123456');
    console.log('  Email: admin@pos.com     | Password: admin123');
    console.log('  Email: tech@pos.com      | Password: tech123');
    console.log('  Email: manager@pos.com   | Password: manager123');
    console.log('');
    
  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await pool.end();
    console.log('\n👋 Database connection closed');
  }
}

main().catch(console.error);

