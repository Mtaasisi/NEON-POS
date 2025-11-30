#!/usr/bin/env node

/**
 * Script to restore database schema from a SQL dump file
 */

import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get connection string from command line argument or use provided one
const DB_URL = process.argv[2] || 'postgresql://neondb_owner:npg_vABqUKk73tEW@ep-young-firefly-adlvuhdv-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

// Get schema file from command line or use latest
let schemaFile = process.argv[3];
if (!schemaFile) {
  // Find latest schema file
  const { execSync } = await import('child_process');
  try {
    schemaFile = execSync('ls -t database-schema-*.sql 2>/dev/null | head -1', { 
      encoding: 'utf-8',
      cwd: __dirname 
    }).trim();
  } catch (error) {
    console.error('❌ Error: No schema file found');
    console.error('Please specify a schema file: node restore-schema.mjs <connection-string> <schema-file.sql>');
    process.exit(1);
  }
}

if (!existsSync(schemaFile)) {
  console.error(`❌ Error: Schema file not found: ${schemaFile}`);
  process.exit(1);
}

console.log('📤 Restoring database schema...');
console.log(`📡 Database: ${DB_URL.replace(/:[^:]*@/, ':****@')}`);
console.log(`📄 Schema file: ${schemaFile}`);
console.log('');

// Parse connection string
const urlMatch = DB_URL.match(/^postgresql:\/\/([^:]+):([^@]+)@([^\/]+)\/([^?]+)/);
if (!urlMatch) {
  console.error('❌ Error: Invalid database URL format');
  process.exit(1);
}

const [, dbUser, dbPass, dbHost, dbName] = urlMatch;

// Convert pooler endpoint to direct endpoint for psql
let directHost = dbHost;
if (dbHost.includes('-pooler')) {
  directHost = dbHost.replace('-pooler', '');
  console.log(`🔄 Converting pooler endpoint to direct: ${directHost}`);
}

// Extract port if specified, otherwise use default 5432
let dbPort = '5432';
const portMatch = dbHost.match(/:(\d+)$/);
if (portMatch) {
  dbPort = portMatch[1];
  directHost = directHost.replace(`:${dbPort}`, '');
}

// Build direct connection string
const directUrl = DB_URL.replace(dbHost, directHost);

console.log('⚠️  WARNING: This will DROP and recreate all database objects!');
console.log('   Make sure you have a backup before proceeding.');
console.log('');
console.log('🔄 Restoring schema...');
console.log(`   Host: ${directHost}`);
console.log(`   Port: ${dbPort}`);
console.log(`   Database: ${dbName}`);
console.log('');

try {
  // Set PGPASSWORD environment variable
  process.env.PGPASSWORD = dbPass;

  // Read the schema file to check its size
  const fs = await import('fs');
  const stats = fs.statSync(schemaFile);
  const fileSize = (stats.size / 1024 / 1024).toFixed(2) + ' MB';
  console.log(`📊 Schema file size: ${fileSize}`);
  console.log('');

  // Run psql to restore the schema
  // Note: psql continues on errors by default (unless ON_ERROR_STOP is set)
  // Some errors are expected if objects already exist (DROP IF EXISTS handles this)
  const psqlCmd = `psql "${directUrl}" --file="${schemaFile}"`;
  
  console.log('⏳ Executing restore (this may take a few minutes)...');
  console.log('ℹ️  Note: Some errors are expected if objects already exist');
  console.log('ℹ️  The restore will continue even if some commands fail');
  console.log('');
  
  execSync(psqlCmd, {
    stdio: 'inherit',
    env: { ...process.env, PGPASSWORD: dbPass, ON_ERROR_STOP: '0' }
  });

  // Unset password
  delete process.env.PGPASSWORD;

  console.log('');
  console.log('✅ Schema restored successfully!');
  console.log('');
  console.log('💡 Next steps:');
  console.log('   1. Verify the schema was restored correctly');
  console.log('   2. Check that all tables, functions, and policies are in place');
  console.log('   3. Test your application to ensure everything works');
  
} catch (error) {
  delete process.env.PGPASSWORD;
  console.error('');
  console.error('❌ Error restoring schema:', error.message);
  console.error('');
  console.error('💡 Troubleshooting:');
  console.error('   1. Check your database connection string');
  console.error('   2. Ensure you have proper permissions on the database');
  console.error('   3. Verify the schema file is not corrupted');
  console.error('   4. Check if there are any conflicting objects in the database');
  process.exit(1);
}

