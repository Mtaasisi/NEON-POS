#!/usr/bin/env node
/**
 * Database Checker Script for Neon Database
 * This script tests the connection and provides a comprehensive database overview
 */

import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const databaseUrl = process.env.VITE_DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ VITE_DATABASE_URL is not set in .env file');
  process.exit(1);
}

const sql = neon(databaseUrl);

async function checkDatabase() {
  console.log('🔍 Checking Neon Database Connection...\n');
  console.log('═'.repeat(60));

  try {
    // Test 1: Basic Connection Test
    console.log('\n📡 Test 1: Testing Database Connection...');
    const testQuery = await sql`SELECT NOW() as current_time, version() as pg_version`;
    console.log('✅ Connection successful!');
    console.log(`   Time: ${testQuery[0].current_time}`);
    console.log(`   PostgreSQL: ${testQuery[0].pg_version.split(' ')[0]} ${testQuery[0].pg_version.split(' ')[1]}`);

    // Test 2: List All Tables
    console.log('\n📋 Test 2: Listing All Tables...');
    const tables = await sql`
      SELECT table_name, table_type
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;
    
    console.log(`✅ Found ${tables.length} tables:\n`);
    tables.forEach((table: any, index: number) => {
      console.log(`   ${index + 1}. ${table.table_name} (${table.table_type})`);
    });

    // Test 3: Check Users Table
    console.log('\n👥 Test 3: Checking Users Table...');
    try {
      const usersCount = await sql`SELECT COUNT(*) as count FROM users`;
      console.log(`✅ Users table exists`);
      console.log(`   Total users: ${usersCount[0].count}`);

      // Get all users
      const users = await sql`
        SELECT id, email, full_name, role, is_active, created_at
        FROM users
        ORDER BY created_at DESC
      `;
      
      if (users.length > 0) {
        console.log(`\n   📝 User List:`);
        users.forEach((user: any) => {
          const status = user.is_active ? '🟢' : '🔴';
          console.log(`   ${status} ${user.full_name || 'N/A'} (${user.email})`);
          console.log(`      Role: ${user.role} | ID: ${user.id}`);
        });
      }

      // Check for specific user mentioned in the SQL file
      const specificUserId = '3da0df92-6f63-4ee2-b33d-3aa56e90d31d';
      const specificUser = await sql`
        SELECT * FROM users WHERE id = ${specificUserId}
      `;
      
      if (specificUser.length > 0) {
        console.log(`\n   🎯 Specific User (${specificUserId}):`);
        console.log(`      Email: ${specificUser[0].email}`);
        console.log(`      Name: ${specificUser[0].full_name}`);
        console.log(`      Role: ${specificUser[0].role}`);
        console.log(`      Active: ${specificUser[0].is_active ? 'Yes' : 'No'}`);
      } else {
        console.log(`\n   ⚠️  User ${specificUserId} not found`);
      }
    } catch (err: any) {
      console.log(`⚠️  Users table may not exist: ${err.message}`);
    }

    // Test 4: Check Auth Users Table
    console.log('\n🔐 Test 4: Checking Auth Users Table...');
    try {
      const authUsersCount = await sql`SELECT COUNT(*) as count FROM auth_users`;
      console.log(`✅ Auth_users table exists`);
      console.log(`   Total auth users: ${authUsersCount[0].count}`);

      const authUsers = await sql`
        SELECT id, email, name, role, is_active
        FROM auth_users
        ORDER BY created_at DESC
        LIMIT 10
      `;
      
      if (authUsers.length > 0) {
        console.log(`\n   📝 Recent Auth Users:`);
        authUsers.forEach((user: any) => {
          const status = user.is_active ? '🟢' : '🔴';
          console.log(`   ${status} ${user.name || user.email} (${user.role})`);
        });
      }
    } catch (err: any) {
      console.log(`⚠️  Auth_users table may not exist: ${err.message}`);
    }

    // Test 5: Check Key POS Tables
    console.log('\n🏪 Test 5: Checking Key POS Tables...');
    const keyTables = [
      'customers',
      'devices',
      'lats_products',
      'lats_categories',
      'lats_sales',
      'customer_payments',
      'lats_suppliers'
    ];

    for (const tableName of keyTables) {
      try {
        const result = await sql`
          SELECT COUNT(*) as count 
          FROM ${sql(tableName)}
        `;
        console.log(`   ✅ ${tableName}: ${result[0].count} records`);
      } catch (err: any) {
        console.log(`   ⚠️  ${tableName}: Table not found or error`);
      }
    }

    // Test 6: Database Size and Statistics
    console.log('\n📊 Test 6: Database Statistics...');
    try {
      const dbStats = await sql`
        SELECT 
          pg_size_pretty(pg_database_size(current_database())) as db_size,
          (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public') as total_tables,
          (SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public') as total_columns
      `;
      
      console.log(`   Database Size: ${dbStats[0].db_size}`);
      console.log(`   Total Tables: ${dbStats[0].total_tables}`);
      console.log(`   Total Columns: ${dbStats[0].total_columns}`);
    } catch (err: any) {
      console.log(`   ⚠️  Could not fetch database statistics: ${err.message}`);
    }

    console.log('\n' + '═'.repeat(60));
    console.log('✅ Database check completed successfully!\n');

  } catch (error: any) {
    console.error('\n❌ Error checking database:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run the check
checkDatabase().catch(console.error);

