#!/usr/bin/env node

/**
 * Script to restore data from backup files
 */

import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get connection string from command line or use default
const DB_URL = process.argv[2] || 'postgresql://neondb_owner:npg_vABqUKk73tEW@ep-young-firefly-adlvuhdv-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

// Backup files to try (in order of preference)
const backupFiles = [
  'neondb_data_backup_inserts.sql',
  'neondb_data_backup.sql',
  'data_backup.sql'
];

console.log('📥 Restoring data from backup files...');
console.log(`📡 Database: ${DB_URL.replace(/:[^:]*@/, ':****@')}`);
console.log('');

// Find the first available backup file
let backupFile = null;
for (const file of backupFiles) {
  if (existsSync(file)) {
    backupFile = file;
    break;
  }
}

if (!backupFile) {
  console.error('❌ Error: No backup files found');
  console.error('Looking for:', backupFiles.join(', '));
  process.exit(1);
}

console.log(`📄 Using backup file: ${backupFile}`);

// Parse connection string
const urlMatch = DB_URL.match(/^postgresql:\/\/([^:]+):([^@]+)@([^\/]+)\/([^?]+)/);
if (!urlMatch) {
  console.error('❌ Error: Invalid database URL format');
  process.exit(1);
}

const [, dbUser, dbPass, dbHost, dbName] = urlMatch;

// Convert pooler endpoint to direct endpoint
let directHost = dbHost;
if (dbHost.includes('-pooler')) {
  directHost = dbHost.replace('-pooler', '');
  console.log(`🔄 Converting pooler endpoint to direct: ${directHost}`);
}

// Build direct connection string
const directUrl = DB_URL.replace(dbHost, directHost);

console.log('🔄 Restoring data...');
console.log(`   Host: ${directHost}`);
console.log(`   Database: ${dbName}`);
console.log('');

try {
  // Set PGPASSWORD environment variable
  process.env.PGPASSWORD = dbPass;

  // Check file size
  const fs = await import('fs');
  const stats = fs.statSync(backupFile);
  const fileSize = (stats.size / 1024).toFixed(2) + ' KB';
  console.log(`📊 Backup file size: ${fileSize}`);
  console.log('');

  // Run psql to restore the data
  // Not using --single-transaction to allow partial restores if some inserts fail
  const psqlCmd = `psql "${directUrl}" --file="${backupFile}"`;
  
  console.log('⏳ Executing restore (this may take a few minutes)...');
  console.log('ℹ️  Note: Some errors are expected - restore will continue');
  console.log('');
  
  execSync(psqlCmd, {
    stdio: 'inherit',
    env: { ...process.env, PGPASSWORD: dbPass }
  });

  // Unset password
  delete process.env.PGPASSWORD;

  console.log('');
  console.log('✅ Data restored successfully!');
  console.log('');
  console.log('💡 Next steps:');
  console.log('   1. Verify the data was restored correctly');
  console.log('   2. Check your application to ensure everything works');
  console.log('   3. Consider creating a new backup after verification');
  
} catch (error) {
  delete process.env.PGPASSWORD;
  console.error('');
  console.error('❌ Error restoring data:', error.message);
  console.error('');
  console.error('💡 Troubleshooting:');
  console.error('   1. Check your database connection string');
  console.error('   2. Ensure you have proper permissions on the database');
  console.error('   3. Verify the backup file is not corrupted');
  console.error('   4. Some errors may be expected if data already exists');
  process.exit(1);
}

