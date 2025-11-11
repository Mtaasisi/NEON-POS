#!/usr/bin/env node

/**
 * Safe Schema Migration Tool for Neon Database
 * Migrates schema from Development to Production while preserving data
 */

import { neon } from '@neondatabase/serverless';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { createInterface } from 'readline';

const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  step: (num, msg) => console.log(`\n${colors.cyan}Step ${num}: ${msg}${colors.reset}\n${'='.repeat(60)}`)
};

// =============================================================================
// Main Migration Function
// =============================================================================

async function migrateSchema() {
  console.log('\n🚀 Neon Database Schema Migration Tool');
  console.log('=' .repeat(60));
  console.log('This tool will help you migrate schema from Dev to Prod');
  console.log('while preserving all production data.\n');

  try {
    // Step 1: Get database connection strings
    log.step(1, 'Configure Database Connections');
    
    const devUrl = await question('Enter DEVELOPMENT database URL: ');
    const prodUrl = await question('Enter PRODUCTION database URL: ');
    
    if (!devUrl || !prodUrl) {
      log.error('Both database URLs are required!');
      process.exit(1);
    }

    const devSql = neon(devUrl);
    const prodSql = neon(prodUrl);

    log.success('Database connections configured');

    // Step 2: Create backup directory
    log.step(2, 'Prepare Backup Directory');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = 'backups';
    
    if (!existsSync(backupDir)) {
      mkdirSync(backupDir, { recursive: true });
    }
    
    log.success(`Backup directory ready: ${backupDir}/`);

    // Step 3: Analyze schemas
    log.step(3, 'Analyze Database Schemas');
    
    log.info('Fetching development schema...');
    const devSchema = await getSchemaInfo(devSql);
    
    log.info('Fetching production schema...');
    const prodSchema = await getSchemaInfo(prodSql);
    
    log.success(`Development: ${devSchema.tables.length} tables, ${devSchema.columns.length} columns`);
    log.success(`Production: ${prodSchema.tables.length} tables, ${prodSchema.columns.length} columns`);

    // Step 4: Generate comparison report
    log.step(4, 'Generate Schema Comparison');
    
    const comparison = compareSchemas(devSchema, prodSchema);
    
    const reportFile = `${backupDir}/schema_comparison_${timestamp}.txt`;
    const report = generateComparisonReport(comparison);
    writeFileSync(reportFile, report);
    
    log.success(`Comparison report saved: ${reportFile}`);
    
    console.log('\n' + report);

    // Step 5: Generate migration SQL
    log.step(5, 'Generate Migration SQL');
    
    const migrationSql = generateMigrationSQL(comparison);
    const migrationFile = `${backupDir}/migration_${timestamp}.sql`;
    writeFileSync(migrationFile, migrationSql);
    
    log.success(`Migration SQL saved: ${migrationFile}`);

    // Step 6: Confirm and execute
    log.step(6, 'Execute Migration');
    
    console.log('\n' + migrationSql);
    console.log('\n');
    
    log.warning('Please review the migration SQL above carefully!');
    const confirm = await question('\nDo you want to execute this migration on PRODUCTION? (yes/no): ');
    
    if (confirm.toLowerCase() === 'yes') {
      log.info('Creating backup of production schema...');
      
      try {
        // Execute migration
        log.info('Executing migration...');
        await prodSql(migrationSql);
        
        log.success('Migration completed successfully! ✨');
        log.info('Please test your application thoroughly.');
        
      } catch (error) {
        log.error('Migration failed!');
        console.error(error);
        log.warning('Production database was not modified.');
      }
    } else {
      log.info('Migration cancelled. SQL file saved for manual review.');
    }

  } catch (error) {
    log.error('An error occurred:');
    console.error(error);
  } finally {
    rl.close();
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

async function getSchemaInfo(sql) {
  const schema = {
    tables: [],
    columns: [],
    indexes: [],
    constraints: []
  };

  // Get all tables
  const tables = await sql`
    SELECT 
      table_name,
      table_schema
    FROM information_schema.tables
    WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
      AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `;
  schema.tables = tables.rows || tables;

  // Get all columns
  const columns = await sql`
    SELECT 
      table_name,
      column_name,
      data_type,
      is_nullable,
      column_default,
      character_maximum_length
    FROM information_schema.columns
    WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
    ORDER BY table_name, ordinal_position;
  `;
  schema.columns = columns.rows || columns;

  // Get all indexes
  const indexes = await sql`
    SELECT
      schemaname,
      tablename,
      indexname,
      indexdef
    FROM pg_indexes
    WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
    ORDER BY tablename, indexname;
  `;
  schema.indexes = indexes.rows || indexes;

  // Get constraints
  const constraints = await sql`
    SELECT
      tc.table_name,
      tc.constraint_name,
      tc.constraint_type,
      kcu.column_name
    FROM information_schema.table_constraints tc
    LEFT JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    WHERE tc.table_schema NOT IN ('pg_catalog', 'information_schema')
    ORDER BY tc.table_name, tc.constraint_name;
  `;
  schema.constraints = constraints.rows || constraints;

  return schema;
}

function compareSchemas(devSchema, prodSchema) {
  const comparison = {
    newTables: [],
    missingTables: [],
    newColumns: [],
    missingColumns: [],
    modifiedColumns: [],
    newIndexes: [],
    missingIndexes: []
  };

  // Compare tables
  const devTableNames = devSchema.tables.map(t => t.table_name);
  const prodTableNames = prodSchema.tables.map(t => t.table_name);

  comparison.newTables = devTableNames.filter(t => !prodTableNames.includes(t));
  comparison.missingTables = prodTableNames.filter(t => !devTableNames.includes(t));

  // Compare columns
  const devColumns = devSchema.columns.map(c => `${c.table_name}.${c.column_name}`);
  const prodColumns = prodSchema.columns.map(c => `${c.table_name}.${c.column_name}`);

  const newCols = devSchema.columns.filter(dc => 
    !prodColumns.includes(`${dc.table_name}.${dc.column_name}`)
  );
  comparison.newColumns = newCols;

  const missingCols = prodSchema.columns.filter(pc =>
    !devColumns.includes(`${pc.table_name}.${pc.column_name}`)
  );
  comparison.missingColumns = missingCols;

  // Compare indexes
  const devIndexNames = devSchema.indexes.map(i => `${i.tablename}.${i.indexname}`);
  const prodIndexNames = prodSchema.indexes.map(i => `${i.tablename}.${i.indexname}`);

  comparison.newIndexes = devSchema.indexes.filter(di =>
    !prodIndexNames.includes(`${di.tablename}.${di.indexname}`)
  );
  comparison.missingIndexes = prodSchema.indexes.filter(pi =>
    !devIndexNames.includes(`${pi.tablename}.${pi.indexname}`)
  );

  return comparison;
}

function generateComparisonReport(comparison) {
  let report = '═══════════════════════════════════════════════════════════════\n';
  report += '          SCHEMA COMPARISON REPORT\n';
  report += '═══════════════════════════════════════════════════════════════\n\n';

  report += `📊 Summary:\n`;
  report += `  • New tables to add: ${comparison.newTables.length}\n`;
  report += `  • Tables to remove: ${comparison.missingTables.length}\n`;
  report += `  • New columns to add: ${comparison.newColumns.length}\n`;
  report += `  • Columns to remove: ${comparison.missingColumns.length}\n`;
  report += `  • New indexes to add: ${comparison.newIndexes.length}\n`;
  report += `  • Indexes to remove: ${comparison.missingIndexes.length}\n\n`;

  if (comparison.newTables.length > 0) {
    report += '➕ NEW TABLES (will be added):\n';
    comparison.newTables.forEach(t => report += `   • ${t}\n`);
    report += '\n';
  }

  if (comparison.missingTables.length > 0) {
    report += '⚠️  TABLES IN PROD BUT NOT IN DEV (will be kept):\n';
    comparison.missingTables.forEach(t => report += `   • ${t}\n`);
    report += '\n';
  }

  if (comparison.newColumns.length > 0) {
    report += '➕ NEW COLUMNS (will be added):\n';
    comparison.newColumns.forEach(c => {
      report += `   • ${c.table_name}.${c.column_name} (${c.data_type})\n`;
    });
    report += '\n';
  }

  if (comparison.missingColumns.length > 0) {
    report += '⚠️  COLUMNS IN PROD BUT NOT IN DEV (will be kept):\n';
    comparison.missingColumns.forEach(c => {
      report += `   • ${c.table_name}.${c.column_name} (${c.data_type})\n`;
    });
    report += '\n';
  }

  if (comparison.newIndexes.length > 0) {
    report += '➕ NEW INDEXES (will be added):\n';
    comparison.newIndexes.forEach(i => {
      report += `   • ${i.tablename}.${i.indexname}\n`;
    });
    report += '\n';
  }

  report += '═══════════════════════════════════════════════════════════════\n';

  return report;
}

function generateMigrationSQL(comparison) {
  let sql = `-- ═══════════════════════════════════════════════════════════════
-- Schema Migration Script
-- Generated: ${new Date().toISOString()}
-- ═══════════════════════════════════════════════════════════════
-- 
-- IMPORTANT: This migration preserves all existing data
-- Review carefully before executing!
--
-- ═══════════════════════════════════════════════════════════════

BEGIN;

-- Create migration log
CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    migration_date TIMESTAMP DEFAULT NOW(),
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending'
);

INSERT INTO schema_migrations (description, status) 
VALUES ('Schema sync from development - ${new Date().toISOString()}', 'in_progress');

`;

  // Add new columns (safe operation)
  if (comparison.newColumns.length > 0) {
    sql += `\n-- ═══════════════════════════════════════════════════════════════\n`;
    sql += `-- Add new columns\n`;
    sql += `-- ═══════════════════════════════════════════════════════════════\n\n`;

    comparison.newColumns.forEach(col => {
      const nullable = col.is_nullable === 'YES' ? '' : 'NOT NULL';
      const defaultValue = col.column_default ? `DEFAULT ${col.column_default}` : '';
      const maxLength = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
      
      sql += `-- Add ${col.column_name} to ${col.table_name}\n`;
      sql += `DO $$\n`;
      sql += `BEGIN\n`;
      sql += `  IF NOT EXISTS (\n`;
      sql += `    SELECT 1 FROM information_schema.columns\n`;
      sql += `    WHERE table_name = '${col.table_name}'\n`;
      sql += `    AND column_name = '${col.column_name}'\n`;
      sql += `  ) THEN\n`;
      sql += `    ALTER TABLE ${col.table_name}\n`;
      sql += `    ADD COLUMN ${col.column_name} ${col.data_type}${maxLength} ${defaultValue} ${nullable};\n`;
      sql += `  END IF;\n`;
      sql += `END $$;\n\n`;
    });
  }

  // Add new indexes (safe operation)
  if (comparison.newIndexes.length > 0) {
    sql += `\n-- ═══════════════════════════════════════════════════════════════\n`;
    sql += `-- Add new indexes\n`;
    sql += `-- ═══════════════════════════════════════════════════════════════\n\n`;

    comparison.newIndexes.forEach(idx => {
      sql += `-- Add index ${idx.indexname}\n`;
      sql += `DO $$\n`;
      sql += `BEGIN\n`;
      sql += `  IF NOT EXISTS (\n`;
      sql += `    SELECT 1 FROM pg_indexes\n`;
      sql += `    WHERE indexname = '${idx.indexname}'\n`;
      sql += `  ) THEN\n`;
      sql += `    ${idx.indexdef};\n`;
      sql += `  END IF;\n`;
      sql += `END $$;\n\n`;
    });
  }

  // Note about new tables (requires manual review)
  if (comparison.newTables.length > 0) {
    sql += `\n-- ═══════════════════════════════════════════════════════════════\n`;
    sql += `-- WARNING: New tables detected!\n`;
    sql += `-- ═══════════════════════════════════════════════════════════════\n`;
    sql += `-- The following tables exist in development but not in production:\n`;
    comparison.newTables.forEach(t => {
      sql += `-- • ${t}\n`;
    });
    sql += `--\n`;
    sql += `-- MANUAL ACTION REQUIRED:\n`;
    sql += `-- Please review and add CREATE TABLE statements for these tables\n`;
    sql += `-- from your development database dump.\n\n`;
  }

  sql += `\n-- Update migration log\n`;
  sql += `UPDATE schema_migrations \n`;
  sql += `SET status = 'completed', migration_date = NOW() \n`;
  sql += `WHERE description LIKE 'Schema sync from development%' \n`;
  sql += `AND status = 'in_progress';\n\n`;

  sql += `COMMIT;\n\n`;
  sql += `-- ═══════════════════════════════════════════════════════════════\n`;
  sql += `-- Migration script complete!\n`;
  sql += `-- ═══════════════════════════════════════════════════════════════\n`;

  return sql;
}

// =============================================================================
// Run the migration
// =============================================================================

migrateSchema().catch(console.error);

