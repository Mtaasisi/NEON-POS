#!/usr/bin/env node

/**
 * =====================================================
 * MIGRATE SCHEMA TO SUPABASE DATABASE
 * =====================================================
 * 
 * This script migrates your database schema to Supabase PostgreSQL
 * 
 * Usage:
 *   node migrate-to-supabase.mjs [source-database-url]
 * 
 * Environment Variables:
 *   SOURCE_DATABASE_URL - Source database to migrate from
 *   SUPABASE_DATABASE_URL - Supabase destination (with password)
 * 
 * Example:
 *   export SOURCE_DATABASE_URL="postgresql://mtaasisi@localhost:5432/neondb"
 *   export SUPABASE_DATABASE_URL="postgresql://postgres:yourpassword@db.jxhzveborezjhsmzsgbc.supabase.co:5432/postgres"
 *   node migrate-to-supabase.mjs
 */

import { readFileSync, existsSync, writeFileSync } from 'fs';
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

// Get database URLs
function getDatabaseUrls() {
  // Source database (from command line or env)
  const sourceUrl = process.argv[2] || 
    process.env.SOURCE_DATABASE_URL || 
    process.env.DATABASE_URL || 
    process.env.VITE_DATABASE_URL;

  // Supabase destination
  const supabaseUrl = process.env.SUPABASE_DATABASE_URL;

  if (!sourceUrl) {
    log('❌ Error: Source database URL not found', 'red');
    log('Please provide source database URL:', 'yellow');
    log('  1. As command line argument: node migrate-to-supabase.mjs "postgresql://..."', 'yellow');
    log('  2. As environment variable: export SOURCE_DATABASE_URL="postgresql://..."', 'yellow');
    log('  3. Or set DATABASE_URL or VITE_DATABASE_URL', 'yellow');
    process.exit(1);
  }

  if (!supabaseUrl) {
    log('❌ Error: Supabase database URL not found', 'red');
    log('Please set SUPABASE_DATABASE_URL environment variable:', 'yellow');
    log('  export SUPABASE_DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.jxhzveborezjhsmzsgbc.supabase.co:5432/postgres"', 'yellow');
    log('', 'yellow');
    log('⚠️  Replace [YOUR_PASSWORD] with your actual Supabase database password', 'yellow');
    log('   You can find it in Supabase Dashboard → Settings → Database', 'yellow');
    process.exit(1);
  }

  // Check if password placeholder is still there
  if (supabaseUrl.includes('[YOUR_PASSWORD]')) {
    log('❌ Error: Please replace [YOUR_PASSWORD] with your actual password', 'red');
    log('', 'yellow');
    log('Get your password from:', 'yellow');
    log('  Supabase Dashboard → Settings → Database → Database Password', 'yellow');
    log('', 'yellow');
    log('Then set:', 'yellow');
    log('  export SUPABASE_DATABASE_URL="postgresql://postgres:ACTUAL_PASSWORD@db.jxhzveborezjhsmzsgbc.supabase.co:5432/postgres"', 'yellow');
    process.exit(1);
  }

  // URL encode password if it contains special characters
  if (supabaseUrl.includes('@SMASIKA1010')) {
    const encodedPassword = encodeURIComponent('@SMASIKA1010');
    supabaseUrl = supabaseUrl.replace('@SMASIKA1010', encodedPassword);
  }

  return { sourceUrl, supabaseUrl };
}

// Parse connection string and convert pooler to direct endpoint
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

// Test database connection
async function testConnection(url, name) {
  try {
    log(`Testing ${name} connection...`, 'blue');
    
    // Use pg client for Supabase (more reliable than Neon client)
    if (url.includes('supabase.co')) {
      const pg = await import('pg');
      const { Client } = pg.default;
      const client = new Client({
        connectionString: url,
        ssl: { rejectUnauthorized: false }
      });
      await client.connect();
      await client.query('SELECT 1');
      await client.end();
    } else {
      // Use Neon client for Neon databases
      const sql = neon(url);
      await sql`SELECT 1 as test`;
    }
    
    log(`✅ ${name} connection successful`, 'green');
    return true;
  } catch (error) {
    log(`❌ ${name} connection failed: ${error.message}`, 'red');
    return false;
  }
}

// Backup source schema
async function backupSourceSchema(sourceUrl) {
  logSection('Step 1: Backup Source Schema');
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const backupFile = `schema-backup-${timestamp}.sql`;
  
  log(`Creating schema backup: ${backupFile}`, 'blue');
  
  try {
    // Use pg_dump for schema-only backup
    const sourceConn = parseConnectionString(sourceUrl);
    
    // Build pg_dump command
    const pgDumpCmd = [
      'pg_dump',
      `--host=${sourceConn.host}`,
      `--port=${sourceConn.port}`,
      `--username=${sourceConn.user}`,
      `--dbname=${sourceConn.database}`,
      '--schema-only',
      '--no-owner',
      '--no-acl',
      '--format=plain',
      '--file=' + backupFile
    ].join(' ');

    // Set password via PGPASSWORD environment variable
    process.env.PGPASSWORD = sourceConn.password;
    
    log('Running pg_dump...', 'blue');
    execSync(pgDumpCmd, { stdio: 'inherit' });
    
    log(`✅ Schema backup created: ${backupFile}`, 'green');
    return backupFile;
  } catch (error) {
    log(`⚠️  pg_dump failed, trying alternative method...`, 'yellow');
    
    // Alternative: Use backup-schema-only.mjs script
    try {
      process.env.DATABASE_URL = sourceUrl;
      const { execSync } = await import('child_process');
      execSync(`node backup-schema-only.mjs ${backupFile}`, { stdio: 'inherit' });
      log(`✅ Schema backup created: ${backupFile}`, 'green');
      return backupFile;
    } catch (altError) {
      log(`❌ Backup failed: ${altError.message}`, 'red');
      throw altError;
    }
  }
}

// Restore schema to Supabase
async function restoreToSupabase(backupFile, supabaseUrl) {
  logSection('Step 2: Restore Schema to Supabase');
  
  log(`Restoring schema from ${backupFile} to Supabase...`, 'blue');
  
  try {
    const supabaseConn = parseConnectionString(supabaseUrl);
    
    // Build psql command
    const psqlCmd = [
      'psql',
      `--host=${supabaseConn.host}`,
      `--port=${supabaseConn.port}`,
      `--username=${supabaseConn.user}`,
      `--dbname=${supabaseConn.database}`,
      '--file=' + backupFile
    ].join(' ');

    // Set password via PGPASSWORD environment variable
    process.env.PGPASSWORD = supabaseConn.password;
    
    log('Running psql to restore schema...', 'blue');
    log('⚠️  This may take a few minutes depending on schema size', 'yellow');
    execSync(psqlCmd, { stdio: 'inherit' });
    
    log('✅ Schema restored to Supabase successfully!', 'green');
    return true;
  } catch (error) {
    log(`❌ Restore failed: ${error.message}`, 'red');
    log('', 'yellow');
    log('Trying alternative method using restore-schema-to-database.mjs...', 'yellow');
    
    try {
      process.env.TARGET_DATABASE_URL = supabaseUrl;
      const { execSync } = await import('child_process');
      execSync(`node restore-schema-to-database.mjs ${backupFile}`, { stdio: 'inherit' });
      log('✅ Schema restored to Supabase successfully!', 'green');
      return true;
    } catch (altError) {
      log(`❌ Alternative restore also failed: ${altError.message}`, 'red');
      throw altError;
    }
  }
}

// Verify migration
async function verifyMigration(supabaseUrl) {
  logSection('Step 3: Verify Migration');
  
  try {
    const sql = neon(supabaseUrl);
    
    // Check if key tables exist
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;
    
    log(`✅ Found ${tables.length} tables in Supabase`, 'green');
    
    // Check for some key tables
    const keyTables = ['users', 'lats_products', 'lats_customers', 'lats_sales'];
    const foundTables = tables.map(t => t.table_name);
    
    log('\nKey tables check:', 'blue');
    for (const keyTable of keyTables) {
      if (foundTables.includes(keyTable)) {
        log(`  ✅ ${keyTable}`, 'green');
      } else {
        log(`  ⚠️  ${keyTable} (not found)`, 'yellow');
      }
    }
    
    // Check functions
    const functions = await sql`
      SELECT count(*) as count
      FROM pg_proc
      WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    `;
    
    log(`\n✅ Found ${functions[0].count} functions`, 'green');
    
    return true;
  } catch (error) {
    log(`❌ Verification failed: ${error.message}`, 'red');
    return false;
  }
}

// Main migration function
async function migrate() {
  logSection('🚀 Database Schema Migration to Supabase');
  
  // Get database URLs
  const { sourceUrl, supabaseUrl } = getDatabaseUrls();
  
  log('Source Database:', 'blue');
  log(`  ${sourceUrl.replace(/:[^:@]+@/, ':****@')}`, 'cyan');
  log('', 'reset');
  log('Destination (Supabase):', 'blue');
  log(`  ${supabaseUrl.replace(/:[^:@]+@/, ':****@')}`, 'cyan');
  log('', 'reset');
  
  // Test connections
  logSection('Testing Connections');
  const sourceOk = await testConnection(sourceUrl, 'Source');
  const supabaseOk = await testConnection(supabaseUrl, 'Supabase');
  
  if (!sourceOk || !supabaseOk) {
    log('❌ Connection test failed. Please check your database URLs.', 'red');
    process.exit(1);
  }
  
  // Confirm before proceeding
  log('', 'reset');
  log('⚠️  WARNING: This will migrate the schema to Supabase', 'yellow');
  log('   Make sure you have backed up your Supabase database if needed!', 'yellow');
  log('', 'reset');
  
  // Backup source schema
  const backupFile = await backupSourceSchema(sourceUrl);
  
  // Restore to Supabase
  await restoreToSupabase(backupFile, supabaseUrl);
  
  // Verify
  await verifyMigration(supabaseUrl);
  
  logSection('✅ Migration Complete!');
  log('Your database schema has been migrated to Supabase.', 'green');
  log('', 'reset');
  log('Next steps:', 'blue');
  log('  1. Verify your tables in Supabase Dashboard', 'cyan');
  log('  2. Test your application with the new database', 'cyan');
  log('  3. Update your .env file with the Supabase connection string', 'cyan');
  log('', 'reset');
}

// Run migration
migrate().catch(error => {
  log(`\n❌ Migration failed: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});

