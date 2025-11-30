#!/usr/bin/env node

/**
 * =====================================================
 * RESTORE FULL DATABASE BACKUP
 * =====================================================
 * 
 * This script restores a full database backup to your database.
 * 
 * ⚠️  WARNING: This will OVERWRITE your current database!
 * ⚠️  All existing data will be replaced with backup data!
 * 
 * Usage:
 *   node restore-full-database.mjs [backup-file.sql]
 * 
 * Environment Variables:
 *   DATABASE_URL or VITE_DATABASE_URL - Database connection string
 */

import { readFileSync, existsSync } from 'fs';
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

  // Convert pooler endpoint to direct endpoint for psql
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

// Find backup file
function findBackupFile(inputFile) {
  if (inputFile) {
    if (existsSync(inputFile)) {
      return inputFile;
    }
    // Try relative to project root
    const fullPath = join(__dirname, inputFile);
    if (existsSync(fullPath)) {
      return fullPath;
    }
    log(`❌ Backup file not found: ${inputFile}`, 'red');
    process.exit(1);
  }

  // Find most recent backup file
  const { execSync } = require('child_process');
  try {
    const files = execSync(
      `ls -t database-backup-full-*.sql 2>/dev/null | head -1`,
      { cwd: __dirname, encoding: 'utf-8' }
    ).trim();
    
    if (files && existsSync(files.trim())) {
      return files.trim();
    }
  } catch (error) {
    // No backup files found
  }

  log('❌ No backup file found', 'red');
  log('Please specify a backup file:', 'yellow');
  log('   node restore-full-database.mjs database-backup-full-YYYY-MM-DDTHH-MM-SS.sql', 'cyan');
  process.exit(1);
}

// Restore database
function restoreDatabase(connectionInfo, backupFile) {
  logSection('🔄 RESTORING DATABASE');
  
  log('⚠️  WARNING: This will OVERWRITE your current database!', 'red');
  log('⚠️  All existing data will be replaced with backup data!', 'red');
  console.log('');
  
  log('Backup File: ' + backupFile, 'cyan');
  log('Database: ' + connectionInfo.database, 'cyan');
  log('Host: ' + connectionInfo.host, 'cyan');
  console.log('');

  // Check file size
  const { statSync } = require('fs');
  const stats = statSync(backupFile);
  const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  log(`📊 Backup file size: ${fileSizeMB} MB`, 'cyan');
  console.log('');

  // Set PGPASSWORD environment variable for psql
  process.env.PGPASSWORD = connectionInfo.password;

  try {
    log('Starting restore... This may take several minutes...', 'cyan');
    console.log('');

    // Use psql to restore
    // Note: We need to use the direct endpoint (not pooler)
    const psqlCmd = `psql "${connectionInfo.directUrl}" -f "${backupFile}"`;
    
    log('Running: psql (restoring backup...)', 'yellow');
    console.log('');

    const startTime = Date.now();
    execSync(psqlCmd, {
      stdio: 'inherit',
      env: { ...process.env, PGPASSWORD: connectionInfo.password }
    });
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    delete process.env.PGPASSWORD;

    logSection('✅ RESTORE COMPLETED SUCCESSFULLY');
    
    log(`⏱️  Duration: ${duration} seconds`, 'green');
    console.log('');
    log('✅ Your database has been restored from the backup!', 'green');
    console.log('');

    return true;
  } catch (error) {
    delete process.env.PGPASSWORD;
    
    log('❌ Error restoring database', 'red');
    log(`Error: ${error.message}`, 'red');
    console.log('');
    
    // Try alternative method
    log('🔄 Trying alternative connection method...', 'yellow');
    
    try {
      const altPsqlCmd = [
        'psql',
        `--host="${connectionInfo.host}"`,
        `--port="${connectionInfo.port}"`,
        `--username="${connectionInfo.user}"`,
        `--dbname="${connectionInfo.database}"`,
        `--file="${backupFile}"`
      ].join(' ');

      const startTime = Date.now();
      execSync(altPsqlCmd, {
        stdio: 'inherit',
        env: { ...process.env, PGPASSWORD: connectionInfo.password }
      });
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      delete process.env.PGPASSWORD;

      log('✅ Restore completed successfully using alternative method', 'green');
      log(`⏱️  Duration: ${duration} seconds`, 'green');
      return true;
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
  log('║          RESTORE FULL DATABASE BACKUP                            ║', 'bright');
  log('║          ⚠️  WARNING: Will Overwrite Current Database!          ║', 'bright');
  log('╚══════════════════════════════════════════════════════════════════╝', 'bright');
  console.log('');

  // Get backup file from command line or find most recent
  const backupFile = findBackupFile(process.argv[2]);

  // Get database connection info
  const databaseUrl = getDatabaseUrl();
  log(`🔌 Database URL: ${databaseUrl.replace(/:[^:]*@/, ':****@')}`, 'cyan');
  console.log('');

  const connectionInfo = parseConnectionString(databaseUrl);

  // Final confirmation
  logSection('⚠️  FINAL CONFIRMATION');
  log('You are about to restore:', 'yellow');
  log(`   Backup: ${backupFile}`, 'cyan');
  log(`   Database: ${connectionInfo.database}`, 'cyan');
  log(`   Host: ${connectionInfo.host}`, 'cyan');
  console.log('');
  log('⚠️  This will DELETE all current data and replace it with backup data!', 'red');
  console.log('');
  log('Type "RESTORE" (all caps) to confirm:', 'yellow');
  
  // For automated scripts, you can set RESTORE_CONFIRM=true
  if (process.env.RESTORE_CONFIRM !== 'true') {
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => {
      readline.question('> ', (answer) => {
        readline.close();
        if (answer !== 'RESTORE') {
          log('❌ Restore cancelled. Type "RESTORE" to confirm.', 'yellow');
          process.exit(0);
        }

        // Proceed with restore
        try {
          const success = restoreDatabase(connectionInfo, backupFile);
          if (success) {
            process.exit(0);
          } else {
            process.exit(1);
          }
        } catch (error) {
          log('❌ Restore failed', 'red');
          process.exit(1);
        }
      });
    });
  } else {
    // Automated restore (for scripts)
    const success = restoreDatabase(connectionInfo, backupFile);
    process.exit(success ? 0 : 1);
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

