#!/usr/bin/env node

/**
 * Create User Script
 * Creates a user in the database
 */

import dotenv from 'dotenv';
import postgres from 'postgres';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

const DATABASE_URL = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in .env file');
  process.exit(1);
}

// User details
const email = 'care@care.com';
const password = '123456';
const fullName = 'Care User';
const role = 'admin'; // Updated to admin

async function createUser() {
  console.log('🔧 Creating User...');
  console.log('================================');
  console.log(`📧 Email: ${email}`);
  console.log(`🔑 Password: ${password}`);
  console.log(`👤 Full Name: ${fullName}`);
  console.log(`🎯 Role: ${role}`);
  console.log('');

  try {
    const sql = postgres(DATABASE_URL, {
      max: 1,
      connect_timeout: 10,
      ssl: 'require',
    });

    // Ensure default branch exists
    const defaultBranchId = '00000000-0000-0000-0000-000000000001';
    await sql`
      INSERT INTO lats_branches (id, name, location, is_active)
      VALUES (${defaultBranchId}, 'Main Branch', 'Main Location', true)
      ON CONFLICT (id) DO NOTHING
    `;

    // Check if user already exists
    const existingUser = await sql`
      SELECT id, email, full_name, role, is_active 
      FROM users 
      WHERE email = ${email}
    `;

    if (existingUser.length > 0) {
      console.log('⚠️  User already exists!');
      console.log('🔄 Updating user...');
      
      // Update existing user
      const result = await sql`
        UPDATE users 
        SET 
          password = ${password},
          full_name = ${fullName},
          role = ${role},
          branch_id = ${defaultBranchId},
          is_active = true,
          updated_at = NOW()
        WHERE email = ${email}
        RETURNING id, email, full_name, role, is_active
      `;

      console.log('✅ User updated successfully!');
      console.log('📋 User Details:');
      console.log(`   ID: ${result[0].id}`);
      console.log(`   Email: ${result[0].email}`);
      console.log(`   Full Name: ${result[0].full_name}`);
      console.log(`   Role: ${result[0].role}`);
      console.log(`   Active: ${result[0].is_active}`);
      
      await sql.end();
      return true;
    }

    // Create new user
    console.log('🆕 Creating new user...');
    
    const result = await sql`
      INSERT INTO users (
        email, 
        password, 
        full_name, 
        role,
        branch_id,
        is_active, 
        created_at, 
        updated_at
      )
      VALUES (
        ${email},
        ${password},
        ${fullName},
        ${role},
        ${defaultBranchId},
        true,
        NOW(),
        NOW()
      )
      RETURNING id, email, full_name, role, is_active, created_at
    `;

    console.log('✅ User created successfully!');
    console.log('📋 User Details:');
    console.log(`   ID: ${result[0].id}`);
    console.log(`   Email: ${result[0].email}`);
    console.log(`   Full Name: ${result[0].full_name}`);
    console.log(`   Role: ${result[0].role}`);
    console.log(`   Active: ${result[0].is_active}`);
    console.log(`   Created: ${result[0].created_at}`);
    
    await sql.end();
    return true;

  } catch (error) {
    console.error('❌ Error creating user:', error.message);
    console.error('   Details:', error);
    
    // Check if it's a table structure issue
    if (error.message.includes('column') || error.message.includes('does not exist')) {
      console.error('\n💡 Tip: The users table might have a different structure.');
      console.error('   Try checking the table schema first.');
    }
    
    return false;
  }
}

async function main() {
  console.log('🚀 USER CREATION SCRIPT');
  console.log('========================\n');

  const success = await createUser();

  if (success) {
    console.log('\n🎉 SUCCESS!');
    console.log('========================');
    console.log(`✅ User ${email} is ready to use!`);
    console.log(`🔑 Password: ${password}`);
    console.log('\n💡 You can now login with these credentials!');
  } else {
    console.log('\n❌ FAILED!');
    console.log('========================');
    console.log('Could not create user. Please check the error above.');
  }
}

main().catch(console.error);

