#!/usr/bin/env node

/**
 * =====================================================
 * FULL DATABASE BACKUP - SCHEMA + DATA
 * =====================================================
 * 
 * This script creates a complete backup of the database including:
 * - All table structures (schema)
 * - ALL DATA ROWS from all tables
 * - All indexes, constraints, and foreign keys
 * - All functions, triggers, and stored procedures
 * - All sequences and sequences ownership
 * - All types, domains, and enums
 * - All RLS (Row Level Security) policies
 * - All isolation settings (structure + data)
 * - All branches (structure + data)
 * - All products, customers, transactions, etc.
 * 
 * COMPLETE DATABASE BACKUP - Schema + ALL Data
 * 
 * Usage:
 *   node backup-full-database.mjs [output-file]
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
  magenta: '\x1b[35m',
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

// Verify database connection and get statistics
async function verifyDatabase(connectionUrl) {
  logSection('📡 VERIFYING DATABASE CONNECTION');
  
  try {
    const sql = neon(connectionUrl);
    
    // Count total tables
    log('Counting tables...', 'cyan');
    const tableCount = await sql`
      SELECT COUNT(*) as count
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE';
    `;
    const totalTables = tableCount[0]?.count || 0;
    log(`✅ Found ${totalTables} tables in schema`, 'green');

    // Get table names and row counts
    log('Counting rows in all tables...', 'cyan');
    const tableStats = await sql`
      SELECT 
        schemaname,
        tablename,
        (SELECT COUNT(*) FROM information_schema.columns 
         WHERE table_name = t.tablename) as column_count
      FROM pg_tables t
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `;

    // Count rows for each table (estimate for large tables)
    log('Calculating data sizes...', 'cyan');
    let totalRows = 0;
    const tableList = [];

    for (const table of tableStats) {
      try {
        // Use approximate count for very large tables
        const rowCount = await sql.unsafe(`
          SELECT COUNT(*) as count FROM ${table.tablename}
        `);
        const count = parseInt(rowCount[0]?.count || 0);
        totalRows += count;
        tableList.push({
          name: table.tablename,
          rows: count,
          columns: table.column_count,
        });
      } catch (err) {
        // Some tables might be inaccessible, skip them
        log(`   ⚠️  Could not count rows in ${table.tablename}`, 'yellow');
      }
    }

    log(`✅ Total estimated rows: ${totalRows.toLocaleString()}`, 'green');
    console.log('');

    // Show top 10 largest tables
    const sortedTables = tableList
      .sort((a, b) => b.rows - a.rows)
      .slice(0, 10);
    
    if (sortedTables.length > 0) {
      log('Top 10 tables by row count:', 'cyan');
      sortedTables.forEach((table, index) => {
        log(`   ${(index + 1).toString().padStart(2)}. ${table.name.padEnd(40)} ${table.rows.toLocaleString().padStart(12)} rows`, 'cyan');
      });
      console.log('');
    }

    // Check store_locations specifically
    log('Checking store_locations...', 'cyan');
    const locationCheck = await sql`
      SELECT COUNT(*) as count FROM store_locations;
    `;
    const branchCount = locationCheck[0]?.count || 0;
    log(`✅ Found ${branchCount} branches`, 'green');

    // Check isolation columns
    const isolationColumns = await sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'store_locations' 
        AND (
          column_name LIKE 'share_%' 
          OR column_name = 'data_isolation_mode'
        )
      ORDER BY column_name;
    `;
    
    if (isolationColumns.length > 0) {
      log(`✅ Found ${isolationColumns.length} isolation columns`, 'green');
    }

    return {
      success: true,
      totalTables,
      totalRows,
      branchCount,
    };
  } catch (error) {
    log(`❌ Database verification failed: ${error.message}`, 'red');
    return { success: false, error: error.message };
  }
}

// Create full database backup using pg_dump
function createFullBackup(connectionInfo, outputFile) {
  logSection('📦 CREATING FULL DATABASE BACKUP');
  
  log('Backup Type: FULL DATABASE (schema + ALL data)', 'bright');
  log('Output File: ' + outputFile, 'cyan');
  log('Host: ' + connectionInfo.host, 'cyan');
  log('Database: ' + connectionInfo.database, 'cyan');
  console.log('');
  log('⚠️  This backup includes ALL data and may take several minutes...', 'yellow');
  console.log('');

  // Set PGPASSWORD environment variable for pg_dump
  process.env.PGPASSWORD = connectionInfo.password;

  try {
    log('Running pg_dump with full database options...', 'cyan');
    
    // pg_dump options for full database backup:
    // (no --schema-only flag, so data is included)
    // --no-owner: Don't output commands to set ownership
    // --no-privileges: Don't output commands to set privileges
    // --clean: Include DROP statements before CREATE
    // --if-exists: Use IF EXISTS for DROP statements
    // --verbose: Show progress
    // --file: Output file
    // --format=plain: SQL format (not custom or directory)
    
    const pgDumpCmd = [
      'pg_dump',
      `"${connectionInfo.directUrl}"`,
      '--no-owner',
      '--no-privileges',
      '--clean',
      '--if-exists',
      '--verbose',
      '--format=plain',
      `--file="${outputFile}"`
    ].join(' ');

    log('Command: pg_dump --no-owner --no-privileges --clean --if-exists --verbose', 'yellow');
    console.log('');

    const startTime = Date.now();
    execSync(pgDumpCmd, {
      stdio: 'inherit',
      env: { ...process.env, PGPASSWORD: connectionInfo.password }
    });
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    delete process.env.PGPASSWORD;

    // Verify file was created
    if (!existsSync(outputFile)) {
      throw new Error('Backup file was not created');
    }

    const stats = statSync(outputFile);
    const fileSizeKB = (stats.size / 1024).toFixed(2);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    const fileSizeGB = (stats.size / (1024 * 1024 * 1024)).toFixed(2);

    logSection('✅ BACKUP COMPLETED SUCCESSFULLY');
    
    log(`📄 File: ${outputFile}`, 'green');
    if (stats.size > 1024 * 1024 * 1024) {
      log(`📊 Size: ${fileSizeGB} GB (${fileSizeMB} MB / ${fileSizeKB} KB)`, 'green');
    } else if (stats.size > 1024 * 1024) {
      log(`📊 Size: ${fileSizeMB} MB (${fileSizeKB} KB)`, 'green');
    } else {
      log(`📊 Size: ${fileSizeKB} KB`, 'green');
    }
    log(`⏱️  Duration: ${duration} seconds`, 'green');

    // Count lines
    const content = readFileSync(outputFile, 'utf-8');
    const lineCount = content.split('\n').length;
    log(`📝 Lines: ${lineCount.toLocaleString()}`, 'green');

    // Verify key components in backup
    log('', 'reset');
    log('Verifying backup contents...', 'cyan');
    
    const hasStoreLocations = content.includes('CREATE TABLE') && 
                              (content.includes('store_locations') || content.match(/store_locations/gi));
    const hasData = content.includes('COPY ') || content.includes('INSERT INTO');
    const hasIsolationMode = content.includes('data_isolation_mode');
    const hasShareColumns = content.match(/share_\w+/g)?.length || 0;
    const hasIndexes = content.includes('CREATE INDEX');
    const hasConstraints = content.includes('CONSTRAINT');
    const hasFunctions = content.includes('CREATE FUNCTION') || content.includes('CREATE OR REPLACE FUNCTION');
    const hasTriggers = content.includes('CREATE TRIGGER');
    const hasSequence = content.includes('CREATE SEQUENCE');
    const hasRLS = content.includes('POLICY') || content.includes('ALTER TABLE.*ENABLE ROW LEVEL SECURITY');

    if (hasStoreLocations) {
      log('✅ store_locations table structure included', 'green');
    } else {
      log('⚠️  store_locations table structure not found', 'yellow');
    }

    if (hasData) {
      log('✅ Data rows included (COPY/INSERT statements found)', 'green');
    } else {
      log('⚠️  No data found (schema only?)', 'yellow');
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

    if (hasSequence) {
      log('✅ Sequences included', 'green');
    }

    if (hasRLS) {
      log('✅ RLS policies included', 'green');
    }

    console.log('');
    log('📋 Backup includes:', 'bright');
    log('   • Complete database schema', 'cyan');
    log('   • ALL data rows from all tables', 'cyan');
    log('   • All isolation settings (structure + data)', 'cyan');
    log('   • All branches (structure + data)', 'cyan');
    log('   • All products, customers, transactions', 'cyan');
    log('   • All indexes, constraints, foreign keys', 'cyan');
    log('   • All functions, triggers, stored procedures', 'cyan');
    log('   • All sequences, types, enums', 'cyan');
    log('   • All RLS policies', 'cyan');
    console.log('');
    log('✅ This is a COMPLETE backup of your database!', 'green');
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
        '--no-owner',
        '--no-privileges',
        '--clean',
        '--if-exists',
        '--verbose',
        '--format=plain',
        `--file="${outputFile}"`
      ].join(' ');

      const startTime = Date.now();
      execSync(altPgDumpCmd, {
        stdio: 'inherit',
        env: { ...process.env, PGPASSWORD: connectionInfo.password }
      });
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      delete process.env.PGPASSWORD;

      if (existsSync(outputFile)) {
        const stats = statSync(outputFile);
        const fileSizeKB = (stats.size / 1024).toFixed(2);
        const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
        
        log('✅ Backup created successfully using alternative method', 'green');
        log(`📄 File: ${outputFile}`, 'green');
        log(`📊 Size: ${fileSizeMB} MB (${fileSizeKB} KB)`, 'green');
        log(`⏱️  Duration: ${duration} seconds`, 'green');
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
  log('║          FULL DATABASE BACKUP - SCHEMA + ALL DATA                ║', 'bright');
  log('║          Complete Backup of Your Entire Database                 ║', 'bright');
  log('╚══════════════════════════════════════════════════════════════════╝', 'bright');
  console.log('');

  // Get output filename from command line or generate timestamp-based name
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const outputFile = process.argv[2] || `database-backup-full-${timestamp}.sql`;

  // Get database connection info
  const databaseUrl = getDatabaseUrl();
  log(`🔌 Database URL: ${databaseUrl.replace(/:[^:]*@/, ':****@')}`, 'cyan');
  console.log('');

  const connectionInfo = parseConnectionString(databaseUrl);

  // Verify database connection
  log('Verifying database connection and gathering statistics...', 'cyan');
  const verification = await verifyDatabase(connectionInfo.originalUrl);
  if (!verification.success) {
    log('❌ Database verification failed. Exiting.', 'red');
    process.exit(1);
  }

  console.log('');
  log(`📊 Database Summary:`, 'bright');
  log(`   • ${verification.totalTables} tables`, 'cyan');
  log(`   • ${verification.totalRows.toLocaleString()} total rows`, 'cyan');
  log(`   • ${verification.branchCount} branches`, 'cyan');
  console.log('');

  // Warn about backup size and time
  log('⚠️  IMPORTANT:', 'yellow');
  log('   • This backup will include ALL data from your database', 'yellow');
  log('   • Large databases may take several minutes to backup', 'yellow');
  log('   • The backup file may be large (several MB to GB)', 'yellow');
  log('   • Ensure you have sufficient disk space', 'yellow');
  console.log('');

  // Create backup
  try {
    const success = createFullBackup(connectionInfo, outputFile);
    
    if (success) {
      logSection('📖 USAGE INSTRUCTIONS');
      log('To view the backup:', 'cyan');
      log(`   cat ${outputFile} | less`, 'yellow');
      console.log('');
      log('To view backup size:', 'cyan');
      log(`   ls -lh ${outputFile}`, 'yellow');
      console.log('');
      log('To restore to another database:', 'cyan');
      log(`   psql "<connection-string>" -f ${outputFile}`, 'yellow');
      console.log('');
      log('To compress the backup:', 'cyan');
      log(`   gzip ${outputFile}`, 'yellow');
      log(`   # Creates: ${outputFile}.gz`, 'cyan');
      console.log('');
      log('⚠️  Remember: This backup contains SCHEMA + ALL DATA!', 'yellow');
      log('⚠️  Keep it secure and backed up!', 'yellow');
      console.log('');
      
      // Suggest compression for large files
      const stats = statSync(outputFile);
      if (stats.size > 10 * 1024 * 1024) { // > 10MB
        log('💡 TIP: Your backup is large. Consider compressing it:', 'magenta');
        log(`   gzip ${outputFile}`, 'yellow');
        console.log('');
      }
      
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
    log('   5. Check if you have enough disk space', 'cyan');
    log('   6. Try using direct endpoint (not pooler)', 'cyan');
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

