#!/usr/bin/env node

/**
 * QUICK SCHEMA MIGRATION TOOL
 * 
 * Simple and fast way to sync schema from dev to prod
 * Uses your existing database URLs from environment
 */

import { neon } from '@neondatabase/serverless';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('\n🚀 Quick Schema Migration Tool\n');
console.log('=' .repeat(60));

// Step 1: Get database URLs
console.log('\n📌 Step 1: Get Database URLs');
console.log('-'.repeat(60));

const devUrl = process.env.DEV_DATABASE_URL || process.env.VITE_DATABASE_URL;
const prodUrl = process.env.PROD_DATABASE_URL || process.env.DATABASE_URL;

if (!devUrl || !prodUrl) {
  console.error('\n❌ ERROR: Database URLs not found!\n');
  console.log('Please set these environment variables:');
  console.log('  - DEV_DATABASE_URL (your development branch URL)');
  console.log('  - PROD_DATABASE_URL (your production branch URL)\n');
  console.log('Or create a .env file with:');
  console.log('  DEV_DATABASE_URL=postgresql://...');
  console.log('  PROD_DATABASE_URL=postgresql://...\n');
  process.exit(1);
}

console.log('✅ Development database URL found');
console.log('✅ Production database URL found\n');

// Step 2: Connect to databases
console.log('📌 Step 2: Connect to Databases');
console.log('-'.repeat(60));

const devSql = neon(devUrl);
const prodSql = neon(prodUrl);

console.log('✅ Connected to development');
console.log('✅ Connected to production\n');

// Step 3: Get schema information
console.log('📌 Step 3: Analyze Schemas');
console.log('-'.repeat(60));

async function getTableColumns(sql, tableName) {
  try {
    const result = await sql`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = ${tableName}
      ORDER BY ordinal_position;
    `;
    return result.rows || result;
  } catch (error) {
    console.error(`Error getting columns for ${tableName}:`, error.message);
    return [];
  }
}

async function getAllTables(sql) {
  try {
    const result = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;
    return (result.rows || result).map(row => row.table_name);
  } catch (error) {
    console.error('Error getting tables:', error.message);
    return [];
  }
}

// Main migration logic
async function migrate() {
  try {
    // Get all tables from both databases
    console.log('Getting tables from development...');
    const devTables = await getAllTables(devSql);
    
    console.log('Getting tables from production...');
    const prodTables = await getAllTables(prodSql);
    
    console.log(`\n✅ Found ${devTables.length} tables in development`);
    console.log(`✅ Found ${prodTables.length} tables in production\n`);

    // Find differences
    const newTables = devTables.filter(t => !prodTables.includes(t));
    const commonTables = devTables.filter(t => prodTables.includes(t));
    
    console.log('📊 Analysis Results:');
    console.log('-'.repeat(60));
    console.log(`  • Tables in both: ${commonTables.length}`);
    console.log(`  • New tables in dev: ${newTables.length}`);
    
    if (newTables.length > 0) {
      console.log('\n  New tables:');
      newTables.forEach(t => console.log(`    - ${t}`));
    }

    // Check for new columns in common tables
    console.log('\n📌 Step 4: Check for New Columns');
    console.log('-'.repeat(60));
    
    let migrationSQL = `-- Schema Migration Script
-- Generated: ${new Date().toISOString()}
-- This script adds new columns from development to production
-- Existing data will be preserved

BEGIN;

`;

    let hasChanges = false;

    for (const table of commonTables) {
      const devColumns = await getTableColumns(devSql, table);
      const prodColumns = await getTableColumns(prodSql, table);
      
      const devColNames = devColumns.map(c => c.column_name);
      const prodColNames = prodColumns.map(c => c.column_name);
      
      const newColumns = devColumns.filter(c => !prodColNames.includes(c.column_name));
      
      if (newColumns.length > 0) {
        hasChanges = true;
        console.log(`\n  Table: ${table}`);
        console.log(`    New columns: ${newColumns.length}`);
        
        newColumns.forEach(col => {
          console.log(`    - ${col.column_name} (${col.data_type})`);
          
          const nullable = col.is_nullable === 'YES' ? '' : 'NOT NULL';
          const defaultVal = col.column_default ? `DEFAULT ${col.column_default}` : '';
          const maxLen = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
          
          migrationSQL += `-- Add ${col.column_name} to ${table}
ALTER TABLE ${table}
ADD COLUMN IF NOT EXISTS ${col.column_name} ${col.data_type}${maxLen} ${defaultVal} ${nullable};

`;
        });
      }
    }

    if (newTables.length > 0) {
      hasChanges = true;
      migrationSQL += `\n-- ⚠️  WARNING: New tables detected!
-- The following tables exist in development but not in production:
${newTables.map(t => `-- • ${t}`).join('\n')}
--
-- MANUAL ACTION REQUIRED:
-- Please review and add CREATE TABLE statements manually.
-- Use pg_dump to export table definitions from development.

`;
    }

    migrationSQL += `\nCOMMIT;

-- Migration complete!
`;

    // Save migration script
    writeFileSync('schema_migration.sql', migrationSQL);
    console.log('\n✅ Migration SQL saved to: schema_migration.sql\n');

    if (!hasChanges) {
      console.log('✨ No schema differences found!');
      console.log('Production and development schemas are in sync.\n');
      return;
    }

    // Show the migration SQL
    console.log('\n📌 Step 5: Generated Migration SQL');
    console.log('='.repeat(60));
    console.log(migrationSQL);
    console.log('='.repeat(60));

    // Ask for confirmation
    console.log('\n⚠️  IMPORTANT: Review the SQL above carefully!\n');
    console.log('To apply this migration to production:');
    console.log('  1. Review schema_migration.sql file');
    console.log('  2. Test on a copy/branch first');
    console.log('  3. Run: psql "$PROD_DATABASE_URL" -f schema_migration.sql\n');
    console.log('Or use the automated tool:');
    console.log('  node migrate-schema-safely.mjs\n');

  } catch (error) {
    console.error('\n❌ Error during migration:');
    console.error(error);
  }
}

// Run the migration
migrate().catch(console.error);

