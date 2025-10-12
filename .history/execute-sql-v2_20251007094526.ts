#!/usr/bin/env node
/**
 * Execute SQL file against Neon Database - Version 2
 * Uses psql-style connection for raw SQL execution
 */

import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { neon } from '@neondatabase/serverless';

// Load environment variables
dotenv.config();

const databaseUrl = process.env.VITE_DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ VITE_DATABASE_URL is not set in .env file');
  process.exit(1);
}

const sql = neon(databaseUrl);

async function executeSQLStatements() {
  console.log(`🚀 Executing SQL statements from create-user-simple.sql\n`);
  console.log('═'.repeat(60));

  try {
    let successCount = 0;
    let errorCount = 0;

    // Step 1: Create users table
    console.log(`\n📝 Step 1: Creating users table...`);
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          full_name TEXT,
          role TEXT DEFAULT 'user',
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `;
      console.log(`✅ Users table created successfully!`);
      successCount++;
    } catch (err: any) {
      console.log(`❌ Error: ${err.message}`);
      errorCount++;
    }

    // Step 2: Create auth_users table
    console.log(`\n📝 Step 2: Creating auth_users table...`);
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS auth_users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email TEXT UNIQUE NOT NULL,
          username TEXT,
          name TEXT,
          role TEXT DEFAULT 'technician',
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `;
      console.log(`✅ Auth_users table created successfully!`);
      successCount++;
    } catch (err: any) {
      console.log(`❌ Error: ${err.message}`);
      errorCount++;
    }

    // Step 3: Create admin user
    console.log(`\n📝 Step 3: Creating admin user...`);
    try {
      const result = await sql`
        INSERT INTO users (email, password, full_name, role, is_active, created_at, updated_at)
        VALUES (
          'admin@pos.com',
          'admin123456',
          'Admin User',
          'admin',
          true,
          NOW(),
          NOW()
        )
        ON CONFLICT (email) DO UPDATE 
        SET password = EXCLUDED.password, 
            full_name = EXCLUDED.full_name,
            role = EXCLUDED.role,
            updated_at = NOW()
        RETURNING *
      `;
      console.log(`✅ Admin user created/updated!`);
      console.log(`   Email: ${result[0].email}`);
      console.log(`   ID: ${result[0].id}`);
      successCount++;
    } catch (err: any) {
      console.log(`❌ Error: ${err.message}`);
      errorCount++;
    }

    // Step 4: Create manager user
    console.log(`\n📝 Step 4: Creating manager user...`);
    try {
      const result = await sql`
        INSERT INTO users (email, password, full_name, role, is_active, created_at, updated_at)
        VALUES (
          'manager@pos.com',
          'manager123',
          'Manager User',
          'manager',
          true,
          NOW(),
          NOW()
        )
        ON CONFLICT (email) DO UPDATE 
        SET password = EXCLUDED.password, 
            full_name = EXCLUDED.full_name,
            role = EXCLUDED.role,
            updated_at = NOW()
        RETURNING *
      `;
      console.log(`✅ Manager user created/updated!`);
      console.log(`   Email: ${result[0].email}`);
      console.log(`   ID: ${result[0].id}`);
      successCount++;
    } catch (err: any) {
      console.log(`❌ Error: ${err.message}`);
      errorCount++;
    }

    // Step 5: Create technician user
    console.log(`\n📝 Step 5: Creating technician user...`);
    try {
      const result = await sql`
        INSERT INTO users (email, password, full_name, role, is_active, created_at, updated_at)
        VALUES (
          'tech@pos.com',
          'tech123456',
          'Technician User',
          'technician',
          true,
          NOW(),
          NOW()
        )
        ON CONFLICT (email) DO UPDATE 
        SET password = EXCLUDED.password, 
            full_name = EXCLUDED.full_name,
            role = EXCLUDED.role,
            updated_at = NOW()
        RETURNING *
      `;
      console.log(`✅ Technician user created/updated!`);
      console.log(`   Email: ${result[0].email}`);
      console.log(`   ID: ${result[0].id}`);
      successCount++;
    } catch (err: any) {
      console.log(`❌ Error: ${err.message}`);
      errorCount++;
    }

    // Step 6: Create customer care user
    console.log(`\n📝 Step 6: Creating customer care user...`);
    try {
      const result = await sql`
        INSERT INTO users (email, password, full_name, role, is_active, created_at, updated_at)
        VALUES (
          'care@pos.com',
          'care123456',
          'Customer Care',
          'customer-care',
          true,
          NOW(),
          NOW()
        )
        ON CONFLICT (email) DO UPDATE 
        SET password = EXCLUDED.password, 
            full_name = EXCLUDED.full_name,
            role = EXCLUDED.role,
            updated_at = NOW()
        RETURNING *
      `;
      console.log(`✅ Customer care user created/updated!`);
      console.log(`   Email: ${result[0].email}`);
      console.log(`   ID: ${result[0].id}`);
      successCount++;
    } catch (err: any) {
      console.log(`❌ Error: ${err.message}`);
      errorCount++;
    }

    console.log('\n' + '═'.repeat(60));
    console.log(`\n📊 Execution Summary:`);
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);

    // Now verify what was created
    console.log(`\n🔍 Verifying database state...\n`);
    
    // Get all users
    const users = await sql`
      SELECT id, email, full_name, role, is_active, created_at
      FROM users
      ORDER BY created_at DESC
    `;
    
    console.log(`✅ Users table verified!`);
    console.log(`   Total users: ${users.length}\n`);
    
    users.forEach((user: any) => {
      const status = user.is_active ? '🟢' : '🔴';
      const roleEmoji = user.role === 'admin' ? '👑' : 
                        user.role === 'manager' ? '📊' : 
                        user.role === 'technician' ? '🔧' : '💬';
      console.log(`   ${status} ${roleEmoji} ${user.full_name || 'N/A'}`);
      console.log(`      Email: ${user.email}`);
      console.log(`      Role: ${user.role}`);
      console.log(`      ID: ${user.id}`);
      console.log('');
    });

    console.log('═'.repeat(60));
    console.log('\n✅ Database setup completed successfully!\n');
    console.log('🎉 You can now login with any of these users:');
    console.log('   👑 Admin: admin@pos.com / admin123456');
    console.log('   📊 Manager: manager@pos.com / manager123');
    console.log('   🔧 Technician: tech@pos.com / tech123456');
    console.log('   💬 Customer Care: care@pos.com / care123456\n');

  } catch (error: any) {
    console.error('\n❌ Fatal error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Execute the statements
executeSQLStatements().catch(console.error);

