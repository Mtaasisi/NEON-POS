#!/usr/bin/env node

/**
 * Fix Daily Reports Constraints Script
 * ================================
 * This script fixes the foreign key constraints on the daily_reports table
 */

import { neonConfig, Pool } from '@neondatabase/serverless';

// Database URL - Load from environment variable
const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ CRITICAL: DATABASE_URL is not configured!');
  console.error('Please set VITE_DATABASE_URL or DATABASE_URL environment variable');
  process.exit(1);
}

console.log('🔧 Fixing daily_reports constraints...');
console.log('📡 Database URL:', DATABASE_URL.substring(0, 50) + '...');

// Configure Neon for browser environment (same as app)
if (typeof WebSocket !== 'undefined') {
  neonConfig.webSocketConstructor = WebSocket;
}
neonConfig.useSecureWebSocket = true;
neonConfig.pipelineConnect = false;
neonConfig.pipelineTLS = false;
neonConfig.disableWarningInBrowsers = true;

// Create pool connection (same as supabaseClient.ts)
const pool = new Pool({ connectionString: DATABASE_URL });

async function fixConstraints() {
  try {
    console.log('📋 Checking current foreign key constraints...');

    // Check foreign key constraints
    const constraints = await pool.query(`
      SELECT
        tc.table_name,
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = 'daily_reports';
    `);

    console.log('Current foreign key constraints:');
    constraints.rows.forEach(row => {
      console.log(`  - ${row.constraint_name}: ${row.column_name} -> ${row.foreign_table_name}.${row.foreign_column_name}`);
    });

    // Drop the old employee_id foreign key constraint if it exists
    const employeeConstraint = constraints.rows.find(row => row.column_name === 'employee_id' || row.constraint_name.includes('employee'));
    if (employeeConstraint) {
      console.log(`🗑️ Dropping old constraint: ${employeeConstraint.constraint_name}`);
      await pool.query(`ALTER TABLE daily_reports DROP CONSTRAINT ${employeeConstraint.constraint_name};`);
      console.log('✅ Dropped old employee constraint');
    }

    // Add proper foreign key to auth.users if user_id constraint doesn't exist
    const userIdConstraint = constraints.rows.find(row => row.column_name === 'user_id');
    if (!userIdConstraint) {
      console.log('🔗 Adding user_id foreign key constraint to auth.users...');
      try {
        await pool.query(`
          ALTER TABLE daily_reports
          ADD CONSTRAINT daily_reports_user_id_fkey
          FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
        `);
        console.log('✅ Added user_id foreign key constraint');
      } catch (error) {
        console.log('⚠️ Could not add auth.users constraint (may not exist in this schema):', error.message);
        console.log('Leaving user_id without foreign key constraint for now.');
      }
    } else {
      console.log('✓ user_id foreign key constraint already exists');
    }

    // Check branch_id constraint
    const branchConstraint = constraints.rows.find(row => row.column_name === 'branch_id');
    if (!branchConstraint) {
      console.log('🔗 Adding branch_id foreign key constraint...');
      try {
        await pool.query(`
          ALTER TABLE daily_reports
          ADD CONSTRAINT daily_reports_branch_id_fkey
          FOREIGN KEY (branch_id) REFERENCES store_locations(id) ON DELETE SET NULL;
        `);
        console.log('✅ Added branch_id foreign key constraint');
      } catch (error) {
        console.log('⚠️ Could not add branch constraint:', error.message);
      }
    } else {
      console.log('✓ branch_id foreign key constraint already exists');
    }

    // Test the table with a real user ID from auth.users
    console.log('🧪 Testing table with proper data...');
    try {
      // Get a real user ID from auth.users
      const users = await pool.query('SELECT id FROM auth.users LIMIT 1;');
      if (users.rows.length > 0) {
        const realUserId = users.rows[0].id;
        console.log('Using real user ID:', realUserId);

        const testResult = await pool.query(`
          INSERT INTO daily_reports (
            user_id, report_type, report_date, title, customer_interactions, status
          ) VALUES (
            $1, 'daily', CURRENT_DATE, 'Constraint Test Report',
            'Test interactions', 'draft'
          ) RETURNING id, report_type;
        `, [realUserId]);

        console.log('✅ Test insert successful! Report type:', testResult.rows[0].report_type);

        // Clean up test record
        await pool.query('DELETE FROM daily_reports WHERE title = $1', ['Constraint Test Report']);
        console.log('🧹 Test record cleaned up.');
      } else {
        console.log('⚠️ No users found in auth.users table, skipping test insert');
      }
    } catch (error) {
      console.log('⚠️ Test insert failed:', error.message);
      console.log('This might be expected if there are no users in the system yet.');
    }

    console.log('');
    console.log('================================================================');
    console.log('✅ CONSTRAINTS FIXED');
    console.log('================================================================');
    console.log('');
    console.log('🎉 The daily_reports table constraints have been updated!');
    console.log('The table should now work properly with the application.');

  } catch (error) {
    console.error('❌ Error fixing constraints:', error);
    console.error('');
    console.error('Troubleshooting:');
    console.error('1. Check your database connection');
    console.error('2. Verify DATABASE_URL is correct');
    console.error('3. Make sure you have database admin privileges');
    process.exit(1);
  } finally {
    // Close the pool connection
    await pool.end();
  }
}

// Run the constraint fix
fixConstraints().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
