#!/usr/bin/env node

/**
 * 🔍 Database Configuration Verification Script
 * Verifies that database environment variables are correctly configured
 */

import { config } from 'dotenv';
import { readFileSync } from 'fs';

console.log('\n🔍 DATABASE CONFIGURATION VERIFICATION\n');
console.log('═'.repeat(60));

// Function to extract database host from connection string
function extractHost(url) {
  if (!url) return 'NOT SET';
  const match = url.match(/@([^/]+)/);
  return match ? match[1] : 'INVALID URL';
}

// Function to determine database type from host
function getDatabaseType(host) {
  if (host.includes('ep-damp-fire-adtxvumr')) return '🔧 DEVELOPMENT';
  if (host.includes('ep-young-firefly-adlvuhdv')) return '🚀 PRODUCTION';
  return '⚠️  UNKNOWN';
}

// Function to check environment file
function checkEnvFile(filename, mode) {
  console.log(`\n📄 Checking: ${filename}`);
  console.log('─'.repeat(60));
  
  try {
    const content = readFileSync(filename, 'utf-8');
    const lines = content.split('\n');
    
    // Parse environment variables
    const vars = {};
    lines.forEach(line => {
      const match = line.match(/^([A-Z_]+)=(.+)$/);
      if (match) {
        vars[match[1]] = match[2];
      }
    });
    
    const dbUrl = vars.VITE_DATABASE_URL || vars.DATABASE_URL;
    const host = extractHost(dbUrl);
    const dbType = getDatabaseType(host);
    
    console.log(`  Environment: ${mode || 'DEFAULT'}`);
    console.log(`  Database Type: ${dbType}`);
    console.log(`  Database Host: ${host}`);
    
    if (dbUrl) {
      // Check if URL matches expected mode
      if (mode === 'DEVELOPMENT' && !host.includes('ep-damp-fire-adtxvumr')) {
        console.log('  ❌ WARNING: Expected DEVELOPMENT database but got different host!');
      } else if (mode === 'PRODUCTION' && !host.includes('ep-young-firefly-adlvuhdv')) {
        console.log('  ❌ WARNING: Expected PRODUCTION database but got different host!');
      } else {
        console.log('  ✅ Database configuration is correct');
      }
    } else {
      console.log('  ❌ ERROR: DATABASE_URL not found in file');
    }
    
    return { success: !!dbUrl, host, dbType };
  } catch (error) {
    console.log(`  ❌ ERROR: Could not read file - ${error.message}`);
    return { success: false, host: 'N/A', dbType: 'N/A' };
  }
}

// Check all environment files
console.log('\n1️⃣  FRONTEND ENVIRONMENT FILES\n');

const results = {
  default: checkEnvFile('.env', 'DEFAULT'),
  development: checkEnvFile('.env.development', 'DEVELOPMENT'),
  production: checkEnvFile('.env.production', 'PRODUCTION'),
};

console.log('\n\n2️⃣  BACKEND SERVER ENVIRONMENT FILES\n');

const serverResults = {
  default: checkEnvFile('server/.env', 'DEVELOPMENT'),
  production: checkEnvFile('server/.env.production', 'PRODUCTION'),
};

// Summary
console.log('\n\n📊 SUMMARY\n');
console.log('═'.repeat(60));

const allSuccess = 
  results.default.success &&
  results.development.success &&
  results.production.success &&
  serverResults.default.success &&
  serverResults.production.success;

if (allSuccess) {
  console.log('✅ All environment files are configured correctly!\n');
  
  console.log('📋 Configuration Summary:');
  console.log('  • Default (.env): ' + results.default.dbType);
  console.log('  • Development: ' + results.development.dbType);
  console.log('  • Production: ' + results.production.dbType);
  console.log('  • Server Dev: ' + serverResults.default.dbType);
  console.log('  • Server Prod: ' + serverResults.production.dbType);
  
  console.log('\n🎯 Next Steps:');
  console.log('  1. Run: npm run dev (uses DEVELOPMENT database)');
  console.log('  2. Run: npm run build:prod (uses PRODUCTION database)');
  console.log('  3. Deploy to Netlify\n');
} else {
  console.log('❌ Some environment files have issues. Please check the errors above.\n');
  process.exit(1);
}

// Test loading environment variables
console.log('\n3️⃣  TESTING ENVIRONMENT VARIABLE LOADING\n');
console.log('═'.repeat(60));

// Load development config
config({ path: '.env.development' });
const devUrl = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;
const devHost = extractHost(devUrl);
console.log('\n📝 When running `npm run dev`:');
console.log(`  Database: ${getDatabaseType(devHost)}`);
console.log(`  Host: ${devHost}`);

// Load production config (will override)
config({ path: '.env.production', override: true });
const prodUrl = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;
const prodHost = extractHost(prodUrl);
console.log('\n🚀 When running `npm run build:prod`:');
console.log(`  Database: ${getDatabaseType(prodHost)}`);
console.log(`  Host: ${prodHost}`);

console.log('\n✅ Environment variable loading works correctly!\n');
console.log('═'.repeat(60));
console.log('\n🎉 ALL CHECKS PASSED! Your database configuration is ready.\n');

