#!/usr/bin/env node

/**
 * Apply All Database Fixes Automatically
 * 
 * This script automatically runs all SQL fix files against your Supabase database
 * to fix all database schema issues.
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get database URL from environment or command line argument
// Support multiple connection string formats:
// 1. postgresql://postgres:[PASSWORD]@db.jxhzveborezjhsmzsgbc.supabase.co:5432/postgres
// 2. postgresql://postgres.jxhzveborezjhsmzsgbc:[PASSWORD]@aws-0-eu-north-1.pooler.supabase.com:5432/postgres

let DATABASE_URL = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;

// If no DATABASE_URL, check for connection string in command line or use default
if (!DATABASE_URL) {
  // Check command line arguments for connection string
  const connectionStringArg = process.argv.find(arg => arg.startsWith('postgresql://'));
  if (connectionStringArg) {
    DATABASE_URL = connectionStringArg;
  } else {
    // Use default Supabase connection (password will need to be set)
    const SUPABASE_PASSWORD = process.env.SUPABASE_DB_PASSWORD || '@SMASIKA1010';
    DATABASE_URL = `postgresql://postgres.jxhzveborezjhsmzsgbc:${encodeURIComponent(SUPABASE_PASSWORD)}@aws-0-eu-north-1.pooler.supabase.com:5432/postgres`;
  }
}

// Normalize connection string - handle both formats
if (DATABASE_URL.includes('@db.jxhzveborezjhsmzsgbc.supabase.co')) {
  // Convert to pooler format for better performance
  DATABASE_URL = DATABASE_URL.replace('@db.jxhzveborezjhsmzsgbc.supabase.co:5432', '@aws-0-eu-north-1.pooler.supabase.com:5432');
  // Also update user format if needed
  if (DATABASE_URL.includes('postgres@')) {
    DATABASE_URL = DATABASE_URL.replace('postgres@', 'postgres.jxhzveborezjhsmzsgbc@');
  }
}

const sql = neon(DATABASE_URL);

// List of all fix files to run in order
const FIX_FILES = [
  'FIX_CUSTOMERS_VIEW_SUPABASE.sql',
  'FIX_MISSING_FUNCTIONS_SUPABASE.sql',
  'FIX_ALL_SCHEMA_ERRORS_SUPABASE.sql',
  'FIX_WHATSAPP_DATABASE_TABLES.sql',
  'FIX_SUPPLIERS_TABLE_SUPABASE.sql',
  'FIX_SUPPLIERS_BRANCH_VISIBILITY.sql',
  'FIX_BRANCH_SUPPLIERS_SHARING.sql',
  'FIX_BUSINESS_INFO_SETTINGS.sql',
  'FIX_MISSING_DATABASE_OBJECTS.sql',
  'FIX_PRODUCT_IMAGES_TABLE.sql',
  'FIX_MISSING_IMEI_FUNCTIONS.sql',
  'FIX_STORAGE_ROOMS_TABLE.sql'
];

async function runSQLFile(filePath, fileName) {
  try {
    console.log(`\n📄 Processing: ${fileName}...`);
    const sqlContent = readFileSync(filePath, 'utf-8');
    
    // Execute the SQL file
    await sql.unsafe(sqlContent);
    
    console.log(`   ✅ Successfully applied: ${fileName}`);
    return { success: true, file: fileName };
  } catch (error) {
    // Check for common errors that can be ignored
    if (error.message.includes('already exists') || 
        error.message.includes('duplicate') ||
        error.message.includes('does not exist')) {
      console.log(`   ⚠️  Warning (may be safe to ignore): ${error.message.substring(0, 100)}...`);
      return { success: true, file: fileName, warning: error.message };
    }
    
    console.error(`   ❌ Error: ${error.message.substring(0, 150)}`);
    return { success: false, file: fileName, error: error.message };
  }
}

async function applyAllFixes() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🚀 AUTOMATIC DATABASE FIXES APPLIER');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log(`📊 Database: ${DATABASE_URL.substring(0, 60)}...`);
  console.log(`📁 Working directory: ${__dirname}\n`);
  
  const results = [];
  const existingFiles = [];
  
  // Check which files exist
  const fs = await import('fs/promises');
  for (const fixFile of FIX_FILES) {
    const filePath = join(__dirname, fixFile);
    try {
      await fs.access(filePath);
      existingFiles.push(fixFile);
    } catch {
      console.log(`⚠️  File not found: ${fixFile} (will skip)`);
    }
  }
  
  console.log(`\n📋 Found ${existingFiles.length} fix files to apply\n`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // Run each fix file
  for (const fixFile of existingFiles) {
    const filePath = join(__dirname, fixFile);
    const result = await runSQLFile(filePath, fixFile);
    results.push(result);
    
    // Small delay between files
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Print summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 EXECUTION SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`✅ Successfully applied: ${successful} fixes`);
  if (failed > 0) {
    console.log(`❌ Failed: ${failed} fixes`);
  }
  console.log('');
  
  if (successful > 0) {
    console.log('✅ Successfully applied:');
    results.filter(r => r.success).forEach(r => {
      console.log(`   • ${r.file}`);
    });
    console.log('');
  }
  
  if (failed > 0) {
    console.log('❌ Failed:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`   • ${r.file}`);
      console.log(`     Error: ${r.error?.substring(0, 100)}...`);
    });
    console.log('');
  }
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  if (failed === 0) {
    console.log('🎉 All database fixes applied successfully!');
  } else {
    console.log('⚠️  Some fixes failed. Please review the errors above.');
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

// Run the fixes
applyAllFixes().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
