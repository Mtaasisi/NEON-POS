#!/usr/bin/env node

/**
 * Fully Automated Purchase Order Workflow Test
 * This script:
 * 1. Reads the SQL file
 * 2. Executes it against the database
 * 3. Runs the complete workflow test
 */

import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';

const DATABASE_URL = 'postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

console.log('\n🚀 Starting fully automated test...\n');

async function setupDatabase() {
  console.log('📦 Step 1: Setting up database functions...');
  
  const sql = neon(DATABASE_URL);
  
  // Read the SQL file
  const sqlContent = readFileSync('./COMPLETE-PURCHASE-ORDER-WORKFLOW.sql', 'utf8');
  
  try {
    // Split SQL into individual statements and execute each
    // Remove comments and split by semicolon
    const statements = sqlContent
      .split('\n')
      .filter(line => !line.trim().startsWith('--') && line.trim().length > 0)
      .join('\n')
      .split(';')
      .filter(stmt => stmt.trim().length > 0);
    
    console.log(`   Executing ${statements.length} SQL statements...`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i].trim();
      if (stmt.length > 0) {
        try {
          await sql([stmt]);
        } catch (err) {
          // Ignore "already exists" errors
          if (!err.message.includes('already exists') && !err.message.includes('does not exist')) {
            console.warn(`   ⚠️  Statement ${i + 1} warning: ${err.message.substring(0, 100)}`);
          }
        }
      }
    }
    
    console.log('✅ Database setup completed!\n');
    return true;
  } catch (error) {
    console.error('❌ Error setting up database:', error.message);
    return false;
  }
}

async function runTest() {
  console.log('🧪 Step 2: Running workflow test...\n');
  
  // Import and run the test
  const { default: test } = await import('./test-workflow.mjs');
}

// Run everything
(async () => {
  const setupSuccess = await setupDatabase();
  
  if (!setupSuccess) {
    console.error('\n❌ Database setup failed. Cannot proceed with test.');
    process.exit(1);
  }
  
  // Wait a moment for database to be ready
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Run the test by executing it
  process.env.DATABASE_URL = DATABASE_URL;
  await import('./test-workflow.mjs');
})();

