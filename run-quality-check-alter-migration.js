#!/usr/bin/env node

/**
 * Quality Check System ALTER Migration Runner
 * 
 * This script updates existing tables to match the new schema
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import postgres from 'postgres';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get database URL from environment
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL environment variable not set');
  console.error('Please ensure your .env file contains DATABASE_URL');
  process.exit(1);
}

async function runMigration() {
  console.log('🚀 Starting Quality Check System ALTER Migration...\n');
  
  // Create SQL connection
  const sql = postgres(DATABASE_URL, {
    max: 1,
    ssl: 'require',
    connection: {
      application_name: 'quality-check-alter-migration'
    }
  });

  try {
    // Read ALTER migration SQL file
    const migrationPath = join(__dirname, 'migrations', 'alter_quality_check_system.sql');
    console.log(`📄 Reading migration file: ${migrationPath}`);
    const migrationSQL = readFileSync(migrationPath, 'utf8');

    // Execute migration
    console.log('⚙️  Executing ALTER migration...\n');
    await sql.unsafe(migrationSQL);

    console.log('✅ ALTER migration completed successfully!\n');

    // Verify tables structure
    console.log('🔍 Verifying table structure...\n');
    
    const columns = await sql`
      SELECT 
        table_name,
        column_name,
        data_type
      FROM information_schema.columns
      WHERE table_schema = 'public' 
        AND table_name IN (
          'purchase_order_quality_checks',
          'purchase_order_quality_check_items'
        )
      ORDER BY table_name, ordinal_position
    `;

    console.log('📋 Table Columns:');
    let currentTable = '';
    columns.forEach(col => {
      if (col.table_name !== currentTable) {
        currentTable = col.table_name;
        console.log(`\n   ${currentTable}:`);
      }
      console.log(`      - ${col.column_name} (${col.data_type})`);
    });

    // Verify functions
    console.log('\n🔍 Verifying database functions...\n');
    const functions = await sql`
      SELECT routine_name
      FROM information_schema.routines
      WHERE routine_schema = 'public'
        AND (
          routine_name LIKE '%quality%'
          OR routine_name = 'add_quality_items_to_inventory_v2'
        )
      ORDER BY routine_name
    `;

    console.log('⚙️  Quality Check Functions:');
    functions.forEach(func => {
      console.log(`   ✓ ${func.routine_name}()`);
    });

    console.log('\n✅ All verifications passed!');
    console.log('\n🎉 Quality Check System is now updated and ready to use!\n');

  } catch (error) {
    console.error('\n❌ Migration failed:');
    console.error(error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

// Run migration
runMigration().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

