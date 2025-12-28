#!/usr/bin/env node

/**
 * Create User Branch Assignments Table Migration
 *
 * This script creates the user_branch_assignments table needed for branch management functionality.
 * Run this script to set up branch assignment functionality in your database.
 */

import pkg from 'pg';
const { Pool } = pkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database connection string provided by user
const DATABASE_URL = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

// Create database connection pool
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function createUserBranchAssignmentsTable() {
  console.log('🚀 Creating user_branch_assignments table...');

  const client = await pool.connect();

  try {
    // Read the SQL file
    const sqlFilePath = path.join(__dirname, 'create-user-branch-assignments-table.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

    console.log('📄 SQL Content loaded from file');

    // Execute the entire SQL content
    console.log('⚡ Executing SQL migration...');

    await client.query(sqlContent);

    console.log('🔍 Checking if table was created...');

    // Check if the table exists
    const checkResult = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'user_branch_assignments'
      );
    `);

    if (checkResult.rows[0].exists) {
      console.log('✅ user_branch_assignments table created successfully!');
      console.log('🎉 Branch management functionality is now ready to use.');
      return true;
    } else {
      console.log('❌ Table creation failed. Please check the SQL syntax.');
      return false;
    }

  } catch (error) {
    console.error('❌ Error creating table:', error.message);

    // If it's a permission error or other database issue, provide helpful guidance
    if (error.message.includes('permission denied') || error.message.includes('insufficient privilege')) {
      console.log('');
      console.log('💡 This appears to be a permission issue. Please run the SQL manually in your database:');
      console.log('   1. Connect to your Neon database using psql or a database client');
      console.log('   2. Copy and paste the SQL from create-user-branch-assignments-table.sql');
    } else {
      console.log('');
      console.log('💡 Please run the SQL manually in your database:');
    }

    // Display the SQL content for manual execution
    const sqlFilePath = path.join(__dirname, 'create-user-branch-assignments-table.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    console.log('');
    console.log('📋 SQL to execute manually:');
    console.log('='.repeat(50));
    console.log(sqlContent);
    console.log('='.repeat(50));

    return false;
  } finally {
    client.release();
  }
}

async function main() {
  console.log('🏗️  Dukani Pro - User Branch Assignments Table Creation');
  console.log('==================================================\n');

  const success = await createUserBranchAssignmentsTable();

  if (success) {
    console.log('\n✅ Migration completed successfully!');
    console.log('You can now use branch assignment features in your application.');
  } else {
    console.log('\n❌ Migration completed with warnings.');
    console.log('Please check the output above and run any manual SQL commands if needed.');
  }

  process.exit(success ? 0 : 1);
}

// Run the script
main().catch(error => {
  console.error('💥 Script failed:', error);
  process.exit(1);
});
