#!/usr/bin/env node

/**
 * Script to download full database schema
 * Uses the existing database connection from the project
 */

import { readFileSync, existsSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
let DATABASE_URL = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;

if (!DATABASE_URL) {
  // Try to load from .env file
  const envPath = join(__dirname, '.env');
  if (existsSync(envPath)) {
    const envContent = readFileSync(envPath, 'utf-8');
    const match = envContent.match(/^(?:DATABASE_URL|VITE_DATABASE_URL)=(.+)$/m);
    if (match) {
      DATABASE_URL = match[1].trim();
    }
  }
}

if (!DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL not found');
  console.error('Please set DATABASE_URL or VITE_DATABASE_URL in your .env file');
  process.exit(1);
}

// Generate timestamp for filename
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
const schemaFile = `database-schema-${timestamp}.sql`;

console.log('📥 Downloading full database schema...');
console.log(`📡 Database: ${DATABASE_URL.replace(/:[^:]*@/, ':****@')}`);
console.log(`📄 Output file: ${schemaFile}`);
console.log('');

// Parse connection string
// Format: postgresql://user:password@host/database?params
const urlMatch = DATABASE_URL.match(/^postgresql:\/\/([^:]+):([^@]+)@([^\/]+)\/([^?]+)/);
if (!urlMatch) {
  console.error('❌ Error: Invalid database URL format');
  process.exit(1);
}

const [, dbUser, dbPass, dbHost, dbName] = urlMatch;

// Convert pooler endpoint to direct endpoint for pg_dump
// Neon pooler: ep-xxx-pooler.c-2.us-east-1.aws.neon.tech
// Direct: ep-xxx.c-2.us-east-1.aws.neon.tech
let directHost = dbHost;
if (dbHost.includes('-pooler')) {
  directHost = dbHost.replace('-pooler', '');
  console.log(`🔄 Converting pooler endpoint to direct: ${directHost}`);
}

// Build connection string for pg_dump
const directUrl = DATABASE_URL.replace(dbHost, directHost);

// Extract port if specified, otherwise use default 5432
let dbPort = '5432';
const portMatch = dbHost.match(/:(\d+)$/);
if (portMatch) {
  dbPort = portMatch[1];
  directHost = directHost.replace(`:${dbPort}`, '');
}

console.log('🔄 Running pg_dump...');
console.log(`   Host: ${directHost}`);
console.log(`   Port: ${dbPort}`);
console.log(`   Database: ${dbName}`);
console.log('');

try {
  // Set PGPASSWORD environment variable
  process.env.PGPASSWORD = dbPass;

  // Run pg_dump
  const pgDumpCmd = `pg_dump "${directUrl}" --schema-only --no-owner --no-privileges --clean --if-exists --verbose --file="${schemaFile}"`;
  
  execSync(pgDumpCmd, {
    stdio: 'inherit',
    env: { ...process.env, PGPASSWORD: dbPass }
  });

  // Unset password
  delete process.env.PGPASSWORD;

  // Check if file was created
  if (existsSync(schemaFile)) {
    const fs = await import('fs');
    const stats = fs.statSync(schemaFile);
    const fileSize = (stats.size / 1024).toFixed(2) + ' KB';
    
    // Count lines
    const content = fs.readFileSync(schemaFile, 'utf-8');
    const lineCount = content.split('\n').length;

    console.log('');
    console.log('✅ Schema downloaded successfully!');
    console.log(`📄 File: ${schemaFile}`);
    console.log(`📊 Size: ${fileSize}`);
    console.log(`📝 Lines: ${lineCount}`);
    console.log('');
    console.log('💡 To view the schema:');
    console.log(`   cat ${schemaFile} | less`);
    console.log('');
    console.log('💡 To apply the schema to another database:');
    console.log(`   psql <connection-string> -f ${schemaFile}`);
  } else {
    console.error('❌ Error: Schema file was not created');
    process.exit(1);
  }
} catch (error) {
  delete process.env.PGPASSWORD;
  console.error('❌ Error running pg_dump:', error.message);
  
  // Try alternative: use connection parameters instead of URL
  console.log('');
  console.log('🔄 Trying alternative connection method...');
  
  try {
    const pgDumpCmd = `pg_dump --host="${directHost}" --port="${dbPort}" --username="${dbUser}" --dbname="${dbName}" --schema-only --no-owner --no-privileges --clean --if-exists --verbose --file="${schemaFile}"`;
    
    execSync(pgDumpCmd, {
      stdio: 'inherit',
      env: { ...process.env, PGPASSWORD: dbPass }
    });

    delete process.env.PGPASSWORD;

    if (existsSync(schemaFile)) {
      const fs = await import('fs');
      const stats = fs.statSync(schemaFile);
      const fileSize = (stats.size / 1024).toFixed(2) + ' KB';
      const content = fs.readFileSync(schemaFile, 'utf-8');
      const lineCount = content.split('\n').length;

      console.log('');
      console.log('✅ Schema downloaded successfully!');
      console.log(`📄 File: ${schemaFile}`);
      console.log(`📊 Size: ${fileSize}`);
      console.log(`📝 Lines: ${lineCount}`);
    } else {
      console.error('❌ Error: Schema file was not created');
      process.exit(1);
    }
  } catch (altError) {
    delete process.env.PGPASSWORD;
    console.error('❌ Error with alternative method:', altError.message);
    console.error('');
    console.error('💡 Troubleshooting:');
    console.error('   1. Make sure pg_dump is installed: brew install postgresql');
    console.error('   2. Check your database connection string');
    console.error('   3. Verify network connectivity to Neon database');
    process.exit(1);
  }
}

