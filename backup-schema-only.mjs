#!/usr/bin/env node

/**
 * =====================================================
 * FULL SCHEMA BACKUP - NO DATA
 * =====================================================
 * 
 * This script creates a complete schema-only backup of the database including:
 * - All table structures (including store_locations with all isolation columns)
 * - All indexes, constraints, and foreign keys
 * - All functions, triggers, and stored procedures
 * - All sequences and sequences ownership
 * - All types, domains, and enums
 * - All RLS (Row Level Security) policies
 * - All isolation settings structure (columns, defaults, constraints)
 * - All branches structure (table structure, not data)
 * 
 * NO DATA ROWS ARE INCLUDED - Schema only
 * 
 * Usage:
 *   node backup-schema-only.mjs [output-file]
 * 
 * Environment Variables:
 *   DATABASE_URL or VITE_DATABASE_URL - Database connection string
 */

import { readFileSync, existsSync, writeFileSync, statSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { neon } from '@neondatabase/serverless';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('');
  log('='.repeat(70), 'cyan');
  log(title, 'bright');
  log('='.repeat(70), 'cyan');
  console.log('');
}

// Load database URL from environment
function getDatabaseUrl() {
  let databaseUrl = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;

  if (!databaseUrl) {
    // Try to load from .env file in project root
    const envPaths = [
      join(__dirname, '.env'),
      join(__dirname, '..', '.env'),
    ];

    for (const envPath of envPaths) {
      if (existsSync(envPath)) {
        const envContent = readFileSync(envPath, 'utf-8');
        const match = envContent.match(/^(?:DATABASE_URL|VITE_DATABASE_URL)=(.+)$/m);
        if (match) {
          databaseUrl = match[1].trim();
          log(`✅ Found database URL in ${envPath}`, 'green');
          break;
        }
      }
    }
  }

  if (!databaseUrl) {
    log('❌ Error: DATABASE_URL not found', 'red');
    log('Please set DATABASE_URL or VITE_DATABASE_URL in your .env file', 'red');
    process.exit(1);
  }

  return databaseUrl;
}

// Parse connection string and convert pooler to direct endpoint
function parseConnectionString(url) {
  const urlMatch = url.match(/^postgresql:\/\/([^:]+):([^@]+)@([^\/]+)\/([^?]+)(.*)$/);
  if (!urlMatch) {
    throw new Error('Invalid database URL format');
  }

  const [, dbUser, dbPass, dbHost, dbName, params] = urlMatch;

  // Convert pooler endpoint to direct endpoint for pg_dump
  // Neon pooler: ep-xxx-pooler.c-2.us-east-1.aws.neon.tech
  // Direct: ep-xxx.c-2.us-east-1.aws.neon.tech
  let directHost = dbHost;
  if (dbHost.includes('-pooler')) {
    directHost = dbHost.replace('-pooler', '');
    log(`🔄 Converting pooler endpoint to direct: ${directHost}`, 'yellow');
  }

  // Extract port if specified
  let dbPort = '5432';
  const portMatch = dbHost.match(/:(\d+)$/);
  if (portMatch) {
    dbPort = portMatch[1];
    directHost = directHost.replace(`:${dbPort}`, '');
  }

  // Build direct connection URL
  const directUrl = url.replace(dbHost, directHost);

  return {
    user: dbUser,
    password: dbPass,
    host: directHost,
    port: dbPort,
    database: dbName,
    originalUrl: url,
    directUrl: directUrl,
    params: params || '',
  };
}

// Verify database connection and check schema
async function verifyDatabase(connectionUrl) {
  logSection('📡 VERIFYING DATABASE CONNECTION');
  
  try {
    const sql = neon(connectionUrl);
    
    // Check if store_locations table exists
    log('Checking store_locations table...', 'cyan');
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'store_locations'
      ) as exists;
    `;
    
    if (!tableCheck[0]?.exists) {
      log('⚠️  Warning: store_locations table not found', 'yellow');
    } else {
      log('✅ store_locations table exists', 'green');
    }

    // Check isolation columns
    log('Checking isolation columns...', 'cyan');
    const isolationColumns = await sql`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'store_locations' 
        AND (
          column_name LIKE 'share_%' 
          OR column_name = 'data_isolation_mode'
          OR column_name LIKE '%isolation%'
        )
      ORDER BY column_name;
    `;
    
    if (isolationColumns.length === 0) {
      log('⚠️  Warning: No isolation columns found in store_locations', 'yellow');
    } else {
      log(`✅ Found ${isolationColumns.length} isolation columns`, 'green');
      log('   Columns:', 'cyan');
      isolationColumns.forEach(col => {
        log(`   - ${col.column_name} (${col.data_type})`, 'cyan');
      });
    }

    // Count branches (structure check)
    log('Checking branches structure...', 'cyan');
    const branchCount = await sql`
      SELECT COUNT(*) as count FROM store_locations;
    `;
    log(`✅ Found ${branchCount[0]?.count || 0} branches (data count, not included in schema backup)`, 'green');

    // Count total tables
    const tableCount = await sql`
      SELECT COUNT(*) as count
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE';
    `;
    log(`✅ Found ${tableCount[0]?.count || 0} tables in schema`, 'green');

    return true;
  } catch (error) {
    log(`❌ Database verification failed: ${error.message}`, 'red');
    return false;
  }
}

// Create schema backup using pg_dump
function createSchemaBackup(connectionInfo, outputFile) {
  logSection('📦 CREATING SCHEMA-ONLY BACKUP');
  
  log('Backup Type: SCHEMA ONLY (no data)', 'bright');
  log('Output File: ' + outputFile, 'cyan');
  log('Host: ' + connectionInfo.host, 'cyan');
  log('Database: ' + connectionInfo.database, 'cyan');
  console.log('');

  // Set PGPASSWORD environment variable for pg_dump
  process.env.PGPASSWORD = connectionInfo.password;

  try {
    log('Running pg_dump with schema-only options...', 'cyan');
    
    // pg_dump options for schema-only backup:
    // --schema-only: Only dump schema, not data
    // --no-owner: Don't output commands to set ownership
    // --no-privileges: Don't output commands to set privileges
    // --clean: Include DROP statements before CREATE
    // --if-exists: Use IF EXISTS for DROP statements
    // --verbose: Show progress
    // --file: Output file
    
    const pgDumpCmd = [
      'pg_dump',
      `"${connectionInfo.directUrl}"`,
      '--schema-only',
      '--no-owner',
      '--no-privileges',
      '--clean',
      '--if-exists',
      '--verbose',
      `--file="${outputFile}"`
    ].join(' ');

    log('Command: pg_dump --schema-only --no-owner --no-privileges --clean --if-exists --verbose', 'yellow');
    console.log('');

    execSync(pgDumpCmd, {
      stdio: 'inherit',
      env: { ...process.env, PGPASSWORD: connectionInfo.password }
    });

    delete process.env.PGPASSWORD;

    // Verify file was created
    if (!existsSync(outputFile)) {
      throw new Error('Backup file was not created');
    }

    const stats = statSync(outputFile);
    const fileSizeKB = (stats.size / 1024).toFixed(2);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

    logSection('✅ BACKUP COMPLETED SUCCESSFULLY');
    
    log(`📄 File: ${outputFile}`, 'green');
    log(`📊 Size: ${fileSizeKB} KB (${fileSizeMB} MB)`, 'green');

    // Count lines
    const content = readFileSync(outputFile, 'utf-8');
    const lineCount = content.split('\n').length;
    log(`📝 Lines: ${lineCount.toLocaleString()}`, 'green');

    // Verify key components in backup
    log('', 'reset');
    log('Verifying backup contents...', 'cyan');
    
    const hasStoreLocations = content.includes('CREATE TABLE') && 
                              (content.includes('store_locations') || content.match(/store_locations/gi));
    const hasIsolationMode = content.includes('data_isolation_mode');
    const hasShareColumns = content.match(/share_\w+/g)?.length || 0;
    const hasIndexes = content.includes('CREATE INDEX');
    const hasConstraints = content.includes('CONSTRAINT');
    const hasFunctions = content.includes('CREATE FUNCTION') || content.includes('CREATE OR REPLACE FUNCTION');
    const hasTriggers = content.includes('CREATE TRIGGER');

    if (hasStoreLocations) {
      log('✅ store_locations table structure included', 'green');
    } else {
      log('⚠️  store_locations table structure not found', 'yellow');
    }

    if (hasIsolationMode) {
      log('✅ data_isolation_mode column included', 'green');
    }

    if (hasShareColumns > 0) {
      log(`✅ ${hasShareColumns} share_* isolation columns included`, 'green');
    }

    if (hasIndexes) {
      log('✅ Indexes included', 'green');
    }

    if (hasConstraints) {
      log('✅ Constraints included', 'green');
    }

    if (hasFunctions) {
      log('✅ Functions included', 'green');
    }

    if (hasTriggers) {
      log('✅ Triggers included', 'green');
    }

    console.log('');
    log('📋 Backup includes:', 'bright');
    log('   • All table structures', 'cyan');
    log('   • All isolation settings columns (store_locations)', 'cyan');
    log('   • All branches structure (no data)', 'cyan');
    log('   • All indexes, constraints, foreign keys', 'cyan');
    log('   • All functions, triggers, stored procedures', 'cyan');
    log('   • All sequences, types, enums', 'cyan');
    log('   • All RLS policies', 'cyan');
    console.log('');
    log('❌ Data rows are NOT included (schema only)', 'yellow');
    console.log('');

    return true;
  } catch (error) {
    delete process.env.PGPASSWORD;
    
    log('❌ Error creating backup with pg_dump URL format', 'red');
    log(`Error: ${error.message}`, 'red');
    console.log('');
    
    // Try alternative method using connection parameters
    log('🔄 Trying alternative connection method...', 'yellow');
    
    try {
      const altPgDumpCmd = [
        'pg_dump',
        `--host="${connectionInfo.host}"`,
        `--port="${connectionInfo.port}"`,
        `--username="${connectionInfo.user}"`,
        `--dbname="${connectionInfo.database}"`,
        '--schema-only',
        '--no-owner',
        '--no-privileges',
        '--clean',
        '--if-exists',
        '--verbose',
        `--file="${outputFile}"`
      ].join(' ');

      execSync(altPgDumpCmd, {
        stdio: 'inherit',
        env: { ...process.env, PGPASSWORD: connectionInfo.password }
      });

      delete process.env.PGPASSWORD;

      if (existsSync(outputFile)) {
        const stats = statSync(outputFile);
        const fileSizeKB = (stats.size / 1024).toFixed(2);
        
        log('✅ Backup created successfully using alternative method', 'green');
        log(`📄 File: ${outputFile}`, 'green');
        log(`📊 Size: ${fileSizeKB} KB`, 'green');
        return true;
      }
    } catch (altError) {
      delete process.env.PGPASSWORD;
      log('❌ Alternative method also failed', 'red');
      throw altError;
    }
  }
}

// Main function
async function main() {
  log('', 'reset');
  log('╔══════════════════════════════════════════════════════════════════╗', 'bright');
  log('║          FULL SCHEMA BACKUP - NO DATA                            ║', 'bright');
  log('║          Includes All Isolation Settings & Branches              ║', 'bright');
  log('╚══════════════════════════════════════════════════════════════════╝', 'bright');
  console.log('');

  // Get output filename from command line or generate timestamp-based name
  const outputFile = process.argv[2] || 
    `schema-backup-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)}.sql`;

  // Get database connection info
  const databaseUrl = getDatabaseUrl();
  log(`🔌 Database URL: ${databaseUrl.replace(/:[^:]*@/, ':****@')}`, 'cyan');
  console.log('');

  const connectionInfo = parseConnectionString(databaseUrl);

  // Verify database connection
  const verified = await verifyDatabase(connectionInfo.originalUrl);
  if (!verified) {
    log('❌ Database verification failed. Exiting.', 'red');
    process.exit(1);
  }

  // Create backup
  try {
    const success = createSchemaBackup(connectionInfo, outputFile);
    
    if (success) {
      logSection('📖 USAGE INSTRUCTIONS');
      log('To view the backup:', 'cyan');
      log(`   cat ${outputFile} | less`, 'yellow');
      console.log('');
      log('To restore schema to another database:', 'cyan');
      log(`   psql "<connection-string>" -f ${outputFile}`, 'yellow');
      console.log('');
      log('⚠️  Remember: This backup contains SCHEMA ONLY, no data!', 'yellow');
      console.log('');
      process.exit(0);
    } else {
      throw new Error('Backup creation failed');
    }
  } catch (error) {
    log('', 'reset');
    log('❌ BACKUP FAILED', 'red');
    log(`Error: ${error.message}`, 'red');
    console.log('');
    log('💡 Troubleshooting:', 'yellow');
    log('   1. Make sure pg_dump is installed:', 'cyan');
    log('      macOS: brew install postgresql', 'yellow');
    log('      Linux: sudo apt-get install postgresql-client', 'yellow');
    log('   2. Check your database connection string', 'cyan');
    log('   3. Verify network connectivity to Neon database', 'cyan');
    log('   4. Ensure database credentials are correct', 'cyan');
    console.log('');
    process.exit(1);
  }
}

// Run main function
main().catch(error => {
  log('', 'reset');
  log('❌ Fatal error:', 'red');
  log(error.message, 'red');
  console.error(error);
  process.exit(1);
});



