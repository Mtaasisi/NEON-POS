#!/usr/bin/env node

/**
 * Script to apply the RLS fix migration to the Neon database
 * This fixes the "No data returned from insert" error by setting up proper RLS policies
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pg;

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config();

// Get database URL from environment
const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL or VITE_DATABASE_URL not found in environment variables');
  console.error('Please set the database URL in your .env file');
  process.exit(1);
}

console.log('✅ Database URL found');
console.log('📡 Connecting to database...\n');

// Create database pool
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: false, // Neon uses WebSocket, not SSL
});

async function applyMigration() {
  let client;
  
  try {
    // Connect to database
    client = await pool.connect();
    console.log('✅ Connected to database\n');
    
    // Read migration file
    const migrationPath = join(__dirname, 'migrations', 'fix_daily_closure_rls_comprehensive.sql');
    console.log('📄 Reading migration file:', migrationPath);
    
    const migrationSQL = readFileSync(migrationPath, 'utf-8');
    console.log('✅ Migration file loaded\n');
    
    console.log('🔧 Applying migration...');
    console.log('━'.repeat(60));
    
    // Execute migration
    const result = await client.query(migrationSQL);
    
    console.log('━'.repeat(60));
    console.log('✅ Migration applied successfully!\n');
    
    // Run verification query
    console.log('🔍 Verifying RLS policies...\n');
    
    const verifyQuery = `
      SELECT 
        tablename,
        policyname,
        cmd,
        CASE WHEN qual = 'true' THEN 'Allow All' ELSE 'Restricted' END as access_level
      FROM pg_policies 
      WHERE schemaname = 'public' 
        AND tablename IN ('daily_opening_sessions', 'daily_sales_closures')
      ORDER BY tablename, cmd, policyname;
    `;
    
    const policies = await client.query(verifyQuery);
    
    if (policies.rows.length === 0) {
      console.log('⚠️  Warning: No RLS policies found. This might indicate an issue.');
    } else {
      console.log('✅ RLS Policies configured:');
      console.log('━'.repeat(60));
      
      let currentTable = '';
      policies.rows.forEach(policy => {
        if (policy.tablename !== currentTable) {
          currentTable = policy.tablename;
          console.log(`\n📋 Table: ${policy.tablename}`);
        }
        console.log(`   ${policy.cmd.padEnd(8)} | ${policy.policyname.padEnd(35)} | ${policy.access_level}`);
      });
      
      console.log('\n' + '━'.repeat(60));
    }
    
    console.log('\n✅ Migration completed successfully!');
    console.log('\n💡 Next steps:');
    console.log('   1. Refresh your application in the browser');
    console.log('   2. The "No data returned from insert" error should be resolved');
    console.log('   3. Daily closure and session tracking should work properly\n');
    
  } catch (error) {
    console.error('\n❌ Migration failed!');
    console.error('Error details:', error.message);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  } finally {
    // Close connection
    if (client) {
      client.release();
    }
    await pool.end();
    console.log('👋 Database connection closed');
  }
}

// Run migration
applyMigration().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});

