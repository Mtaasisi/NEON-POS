#!/usr/bin/env node

/**
 * =====================================================
 * RESTORE SCHEMA TO TARGET DATABASE
 * =====================================================
 * 
 * This script restores a schema-only backup to a target database.
 * 
 * Usage:
 *   node restore-schema-to-database.mjs [backup-file] [target-database-url]
 * 
 * Or provide target database URL as environment variable:
 *   TARGET_DATABASE_URL="postgresql://..." node restore-schema-to-database.mjs [backup-file]
 */

import { readFileSync, existsSync, writeFileSync, statSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

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

// Parse connection string
function parseConnectionString(url) {
  const urlMatch = url.match(/^postgresql:\/\/([^:]+):([^@]+)@([^\/]+)\/([^?]+)(.*)$/);
  if (!urlMatch) {
    throw new Error('Invalid database URL format');
  }

  const [, dbUser, dbPass, dbHost, dbName, params] = urlMatch;

  // Convert pooler endpoint to direct endpoint
  let directHost = dbHost;
  if (dbHost.includes('-pooler')) {
    directHost = dbHost.replace('-pooler', '');
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

// Find latest backup file
function findLatestBackup() {
  const { readdirSync } = require('fs');
  const files = readdirSync(__dirname)
    .filter(f => f.startsWith('schema-backup-') && f.endsWith('.sql'))
    .map(f => ({
      name: f,
      path: join(__dirname, f),
      time: statSync(join(__dirname, f)).mtime.getTime()
    }))
    .sort((a, b) => b.time - a.time);

  return files.length > 0 ? files[0].path : null;
}

// Verify backup file
function verifyBackupFile(backupFile) {
  logSection('📋 VERIFYING BACKUP FILE');

  if (!existsSync(backupFile)) {
    log(`❌ Backup file not found: ${backupFile}`, 'red');
    return false;
  }

  const stats = statSync(backupFile);
  const fileSizeKB = (stats.size / 1024).toFixed(2);
  const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

  log(`📄 File: ${backupFile}`, 'green');
  log(`📊 Size: ${fileSizeKB} KB (${fileSizeMB} MB)`, 'green');

  // Read and verify contents
  const content = readFileSync(backupFile, 'utf-8');
  const lineCount = content.split('\n').length;
  log(`📝 Lines: ${lineCount.toLocaleString()}`, 'green');
  console.log('');

  // Check key components
  log('Checking backup contents...', 'cyan');
  
  const hasStoreLocations = content.includes('store_locations') || content.match(/store_locations/gi);
  const hasIsolationMode = content.includes('data_isolation_mode');
  const hasCreateTable = content.includes('CREATE TABLE');
  const hasDropTable = content.includes('DROP TABLE');

  if (hasCreateTable) {
    log('✅ Contains CREATE TABLE statements', 'green');
  }
  
  if (hasDropTable) {
    log('✅ Contains DROP TABLE statements (safe restore)', 'green');
  }

  if (hasStoreLocations) {
    log('✅ Contains store_locations table', 'green');
  } else {
    log('⚠️  Warning: store_locations table not found', 'yellow');
  }

  if (hasIsolationMode) {
    log('✅ Contains isolation settings (data_isolation_mode)', 'green');
  }

  return true;
}

// Restore schema to target database
function restoreSchema(backupFile, targetConnectionInfo) {
  logSection('🔄 RESTORING SCHEMA TO TARGET DATABASE');

  log('Target Database:', 'bright');
  log(`   Host: ${targetConnectionInfo.host}`, 'cyan');
  log(`   Port: ${targetConnectionInfo.port}`, 'cyan');
  log(`   Database: ${targetConnectionInfo.database}`, 'cyan');
  log(`   User: ${targetConnectionInfo.user}`, 'cyan');
  console.log('');
  log('⚠️  WARNING: This will DROP and recreate all tables!', 'yellow');
  log('⚠️  Make sure you have a backup of the target database!', 'yellow');
  console.log('');

  // Set PGPASSWORD environment variable
  process.env.PGPASSWORD = targetConnectionInfo.password;

  try {
    log('Restoring schema...', 'cyan');
    log('This may take a few minutes...', 'cyan');
    console.log('');

    // Use direct URL for restore (works better than connection params)
    const restoreCmd = `psql "${targetConnectionInfo.directUrl}" -f "${backupFile}"`;

    log('Running restore command...', 'yellow');
    log(`Command: psql -f "${backupFile}"`, 'cyan');
    console.log('');

    execSync(restoreCmd, {
      stdio: 'inherit',
      env: { ...process.env, PGPASSWORD: targetConnectionInfo.password }
    });

    delete process.env.PGPASSWORD;

    logSection('✅ SCHEMA RESTORED SUCCESSFULLY');

    log('Schema has been restored to:', 'green');
    log(`   ${targetConnectionInfo.originalUrl.replace(/:[^:]*@/, ':****@')}`, 'cyan');
    console.log('');

    return true;
  } catch (error) {
    delete process.env.PGPASSWORD;
    
    log('❌ Restore failed', 'red');
    log(`Error: ${error.message}`, 'red');
    console.log('');
    
    // Try alternative method using connection parameters
    log('🔄 Trying alternative connection method...', 'yellow');
    
    try {
      const altRestoreCmd = `psql --host="${targetConnectionInfo.host}" --port="${targetConnectionInfo.port}" --username="${targetConnectionInfo.user}" --dbname="${targetConnectionInfo.database}" -f "${backupFile}"`;

      execSync(altRestoreCmd, {
        stdio: 'inherit',
        env: { ...process.env, PGPASSWORD: targetConnectionInfo.password }
      });

      delete process.env.PGPASSWORD;

      log('✅ Schema restored successfully using alternative method', 'green');
      return true;
    } catch (altError) {
      delete process.env.PGPASSWORD;
      log('❌ Alternative method also failed', 'red');
      throw altError;
    }
  }
}

// Verify target database after restore
async function verifyRestore(targetConnectionInfo) {
  logSection('🔍 VERIFYING RESTORED SCHEMA');

  try {
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(targetConnectionInfo.originalUrl);

    // Check if store_locations table exists
    log('Checking store_locations table...', 'cyan');
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'store_locations'
      ) as exists;
    `;
    
    if (tableCheck[0]?.exists) {
      log('✅ store_locations table exists', 'green');
    } else {
      log('❌ store_locations table not found', 'red');
      return false;
    }

    // Check isolation columns
    log('Checking isolation columns...', 'cyan');
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
    } else {
      log('⚠️  Warning: No isolation columns found', 'yellow');
    }

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
    log(`⚠️  Verification warning: ${error.message}`, 'yellow');
    log('Schema may have been restored, but verification failed', 'yellow');
    return false;
  }
}

// Main function
async function main() {
  log('', 'reset');
  log('╔══════════════════════════════════════════════════════════════════╗', 'bright');
  log('║          RESTORE SCHEMA TO TARGET DATABASE                       ║', 'bright');
  log('╚══════════════════════════════════════════════════════════════════╝', 'bright');
  console.log('');

  // Get backup file from command line or find latest
  let backupFile = process.argv[2];
  
  if (!backupFile) {
    log('No backup file specified. Looking for latest backup...', 'cyan');
    backupFile = findLatestBackup();
    
    if (!backupFile) {
      log('❌ No backup file found!', 'red');
      log('', 'reset');
      log('Please either:', 'yellow');
      log('  1. Create a backup first: npm run backup:schema', 'cyan');
      log('  2. Specify backup file: node restore-schema-to-database.mjs backup-file.sql', 'cyan');
      process.exit(1);
    } else {
      log(`✅ Found latest backup: ${backupFile}`, 'green');
    }
  }

  // Get target database URL
  let targetDatabaseUrl = process.argv[3] || process.env.TARGET_DATABASE_URL;

  if (!targetDatabaseUrl) {
    log('❌ Target database URL not provided!', 'red');
    log('', 'reset');
    log('Please provide target database URL:', 'yellow');
    log('  Option 1: As command line argument', 'cyan');
    log('    node restore-schema-to-database.mjs backup.sql "postgresql://..."', 'yellow');
    log('', 'reset');
    log('  Option 2: As environment variable', 'cyan');
    log('    TARGET_DATABASE_URL="postgresql://..." node restore-schema-to-database.mjs backup.sql', 'yellow');
    process.exit(1);
  }

  // Mask password in logs
  const maskedUrl = targetDatabaseUrl.replace(/:[^:]*@/, ':****@');
  log(`🎯 Target Database: ${maskedUrl}`, 'cyan');
  console.log('');

  // Parse target connection
  let targetConnectionInfo;
  try {
    targetConnectionInfo = parseConnectionString(targetDatabaseUrl);
  } catch (error) {
    log(`❌ Invalid target database URL: ${error.message}`, 'red');
    process.exit(1);
  }

  // Verify backup file
  if (!verifyBackupFile(backupFile)) {
    process.exit(1);
  }

  // Confirm before proceeding
  console.log('');
  log('⚠️  IMPORTANT WARNING:', 'yellow');
  log('This will:', 'yellow');
  log('  • DROP all existing tables in the target database', 'red');
  log('  • Recreate all tables from the backup', 'yellow');
  log('  • Remove all existing data in the target database', 'red');
  console.log('');
  log('Make sure you have a backup of the target database!', 'yellow');
  console.log('');

  // Restore schema
  try {
    const success = restoreSchema(backupFile, targetConnectionInfo);
    
    if (success) {
      // Verify restore
      await verifyRestore(targetConnectionInfo);
      
      logSection('🎉 RESTORE COMPLETE');
      log('Schema has been successfully restored!', 'green');
      log('', 'reset');
      log('Next steps:', 'bright');
      log('  1. Verify the schema in your target database', 'cyan');
      log('  2. Add any necessary data (branches, settings, etc.)', 'cyan');
      log('  3. Test your application with the restored schema', 'cyan');
      console.log('');
      process.exit(0);
    } else {
      throw new Error('Restore failed');
    }
  } catch (error) {
    log('', 'reset');
    log('❌ RESTORE FAILED', 'red');
    log(`Error: ${error.message}`, 'red');
    console.log('');
    log('💡 Troubleshooting:', 'yellow');
    log('   1. Check that psql is installed', 'cyan');
    log('   2. Verify target database URL is correct', 'cyan');
    log('   3. Ensure you have network access to target database', 'cyan');
    log('   4. Check database credentials are correct', 'cyan');
    log('   5. Verify target database exists', 'cyan');
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










