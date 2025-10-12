#!/usr/bin/env node
/**
 * Execute SQL file against Neon Database
 */

import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';

// Load environment variables
dotenv.config();

const databaseUrl = process.env.VITE_DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ VITE_DATABASE_URL is not set in .env file');
  process.exit(1);
}

const sql = neon(databaseUrl);

async function executeSQLFile(filename: string) {
  console.log(`🚀 Executing SQL file: ${filename}\n`);
  console.log('═'.repeat(60));

  try {
    // Read the SQL file
    const sqlContent = readFileSync(filename, 'utf-8');
    
    // Split by semicolons and filter out comments and empty lines
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => {
        // Remove empty statements and comment-only lines
        if (!stmt) return false;
        const lines = stmt.split('\n').filter(line => {
          const trimmed = line.trim();
          return trimmed && !trimmed.startsWith('--');
        });
        return lines.length > 0;
      });

    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip if it's just whitespace or comments
      if (!statement || statement.trim().length === 0) continue;
      
      try {
        // Get first meaningful line for display
        const displayText = statement
          .split('\n')
          .find(line => line.trim() && !line.trim().startsWith('--'))
          ?.trim()
          .substring(0, 60) || 'SQL statement';

        console.log(`⏳ Executing: ${displayText}${displayText.length >= 60 ? '...' : ''}`);
        
        const result = await sql(statement);
        
        successCount++;
        console.log(`✅ Success! ${Array.isArray(result) ? `(${result.length} rows affected)` : ''}`);
        
        // If it's a SELECT or RETURNING query, show results
        if (Array.isArray(result) && result.length > 0 && result.length <= 5) {
          console.log('   Result:', JSON.stringify(result, null, 2));
        }
        
        console.log('');
      } catch (error: any) {
        errorCount++;
        // Some errors are expected (like "already exists")
        if (error.message.includes('already exists')) {
          console.log(`⚠️  Skipped (already exists)\n`);
        } else {
          console.log(`❌ Error: ${error.message}\n`);
        }
      }
    }

    console.log('═'.repeat(60));
    console.log(`\n📊 Execution Summary:`);
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📝 Total: ${statements.length}`);

    // Now verify what was created
    console.log(`\n🔍 Verifying database state...\n`);
    
    // Check users table
    try {
      const users = await sql`
        SELECT id, email, full_name, role, is_active, created_at
        FROM users
        ORDER BY created_at DESC
      `;
      
      console.log(`✅ Users table created successfully!`);
      console.log(`   Total users: ${users.length}\n`);
      
      users.forEach((user: any) => {
        const status = user.is_active ? '🟢' : '🔴';
        console.log(`   ${status} ${user.full_name || 'N/A'}`);
        console.log(`      Email: ${user.email}`);
        console.log(`      Role: ${user.role}`);
        console.log(`      ID: ${user.id}`);
        console.log('');
      });
    } catch (err: any) {
      console.log(`⚠️  Could not verify users table: ${err.message}`);
    }

    // Check auth_users table
    try {
      const authUsers = await sql`
        SELECT id, email, name, role, is_active
        FROM auth_users
        ORDER BY created_at DESC
      `;
      
      console.log(`✅ Auth_users table created successfully!`);
      console.log(`   Total auth users: ${authUsers.length}\n`);
      
      authUsers.forEach((user: any) => {
        const status = user.is_active ? '🟢' : '🔴';
        console.log(`   ${status} ${user.name || user.email} (${user.role})`);
      });
    } catch (err: any) {
      console.log(`⚠️  Auth_users table status: ${err.message}`);
    }

    console.log('\n' + '═'.repeat(60));
    console.log('✅ SQL file execution completed!\n');

  } catch (error: any) {
    console.error('\n❌ Fatal error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Execute the SQL file
const sqlFile = process.argv[2] || 'create-user-simple.sql';
executeSQLFile(sqlFile).catch(console.error);

