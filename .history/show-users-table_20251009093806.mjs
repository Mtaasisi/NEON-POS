#!/usr/bin/env node
import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-dry-brook-ad3duuog-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

const sql = neon(DATABASE_URL);

async function showUsersTable() {
  console.log('\n📋 USERS TABLE IN CURRENT DATABASE\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  try {
    // Get users table structure
    console.log('🔍 Table Structure:\n');
    const columns = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `;
    
    console.log('Columns in users table:');
    columns.forEach(col => {
      console.log(`  • ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? '- NOT NULL' : ''}`);
    });
    
    // Get all users
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Current Users Data:\n');
    
    const users = await sql`
      SELECT id, email, password, full_name, role, is_active, created_at, updated_at
      FROM users
      ORDER BY created_at DESC
    `;
    
    if (users.length === 0) {
      console.log('⚠️  No users found in the table!\n');
    } else {
      console.log(`Found ${users.length} user(s):\n`);
      
      users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.email}`);
        console.log(`   ID: ${user.id}`);
        console.log(`   Password: ${user.password}`);
        console.log(`   Full Name: ${user.full_name}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Active: ${user.is_active}`);
        console.log(`   Created: ${user.created_at}`);
        console.log('');
      });
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
}

showUsersTable();

