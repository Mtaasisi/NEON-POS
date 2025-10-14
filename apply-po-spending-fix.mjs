#!/usr/bin/env node

/**
 * Automatic Fix Applier for PO Payment Spending Tracking
 * 
 * This script automatically applies the database fix to track PO payments as expenses.
 * It reads your database connection from .env file and executes the SQL fix.
 */

import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ANSI color codes for pretty terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function loadEnvFile() {
  try {
    const envPath = join(__dirname, '.env');
    const envContent = await readFile(envPath, 'utf-8');
    
    // Parse .env file
    const envVars = {};
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          envVars[key.trim()] = valueParts.join('=').trim();
        }
      }
    });
    
    return envVars;
  } catch (error) {
    return {};
  }
}

async function getDatabaseUrl() {
  // Try to load from .env file
  const envVars = await loadEnvFile();
  
  // Check various possible environment variable names
  const dbUrl = envVars.VITE_DATABASE_URL || 
                envVars.DATABASE_URL || 
                process.env.VITE_DATABASE_URL || 
                process.env.DATABASE_URL;
  
  if (dbUrl) {
    return dbUrl;
  }
  
  // If no database URL found, ask user for manual input
  log('\n⚠️  No database URL found in environment variables.', 'yellow');
  log('\nPlease provide your Neon Database URL:', 'cyan');
  log('Format: postgresql://user:password@host/database?sslmode=require', 'cyan');
  log('\nYou can find this in your Neon dashboard under "Connection Details"\n', 'cyan');
  
  return null;
}

async function executeSQL(dbUrl, sqlContent) {
  try {
    // Dynamic import of @neondatabase/serverless
    const { neon } = await import('@neondatabase/serverless');
    
    const sql = neon(dbUrl);
    
    log('\n🔄 Executing SQL fix...', 'cyan');
    
    // Execute the SQL script
    const result = await sql(sqlContent);
    
    return { success: true, result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function main() {
  log('\n' + '='.repeat(60), 'bright');
  log('   PO PAYMENT SPENDING TRACKING - AUTOMATIC FIX', 'bright');
  log('='.repeat(60) + '\n', 'bright');
  
  // Step 1: Get database URL
  log('📡 Step 1: Checking database connection...', 'blue');
  const dbUrl = await getDatabaseUrl();
  
  if (!dbUrl) {
    log('\n❌ Cannot proceed without database URL.', 'red');
    log('\nPlease add VITE_DATABASE_URL to your .env file:', 'yellow');
    log('VITE_DATABASE_URL=postgresql://user:password@host/database?sslmode=require', 'cyan');
    log('\nOr run this script with the DATABASE_URL environment variable:', 'yellow');
    log('DATABASE_URL=your_url node apply-po-spending-fix.mjs', 'cyan');
    process.exit(1);
  }
  
  log('✅ Database connection string found', 'green');
  log(`   Database: ${dbUrl.substring(0, 30)}...`, 'cyan');
  
  // Step 2: Load SQL fix
  log('\n📄 Step 2: Loading SQL fix script...', 'blue');
  let sqlContent;
  try {
    const sqlPath = join(__dirname, 'FIX-PO-PAYMENT-SPENDING-TRACKING.sql');
    sqlContent = await readFile(sqlPath, 'utf-8');
    log('✅ SQL script loaded successfully', 'green');
  } catch (error) {
    log(`\n❌ Failed to load SQL script: ${error.message}`, 'red');
    process.exit(1);
  }
  
  // Step 3: Execute the fix
  log('\n🚀 Step 3: Applying the fix to your database...', 'blue');
  const result = await executeSQL(dbUrl, sqlContent);
  
  if (!result.success) {
    log(`\n❌ Failed to apply fix: ${result.error}`, 'red');
    log('\nPlease try running the SQL manually in your Neon dashboard:', 'yellow');
    log('File: FIX-PO-PAYMENT-SPENDING-TRACKING.sql', 'cyan');
    process.exit(1);
  }
  
  // Success!
  log('\n' + '='.repeat(60), 'green');
  log('   ✅ FIX APPLIED SUCCESSFULLY!', 'green');
  log('='.repeat(60), 'green');
  
  log('\n📊 What was fixed:', 'bright');
  log('  ✅ Created trigger to auto-track PO payments as expenses', 'green');
  log('  ✅ Backfilled existing PO payments', 'green');
  log('  ✅ Created account transaction records', 'green');
  log('  ✅ Added "Purchase Orders" expense category', 'green');
  
  log('\n🎯 Next steps:', 'bright');
  log('  1. Refresh your browser', 'cyan');
  log('  2. Check spending reports - PO payments should now appear', 'cyan');
  log('  3. Future PO payments will automatically be tracked', 'cyan');
  
  log('\n💡 Tip: Check the "Purchase Orders" category in your expense reports\n', 'yellow');
}

// Run the script
main().catch(error => {
  log(`\n❌ Unexpected error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});

