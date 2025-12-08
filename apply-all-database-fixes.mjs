#!/usr/bin/env node

/**
 * Apply All Database Fixes Automatically
 * 
 * This script runs all SQL fix files against your Supabase database
 * to automatically fix all database schema issues.
 */

import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get database URL from environment or use the provided connection string
const DATABASE_URL = process.env.DATABASE_URL || 
  'postgresql://postgres.jxhzveborezjhsmzsgbc:%40SMASIKA1010@aws-0-eu-north-1.pooler.supabase.com:5432/postgres';

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
  'FIX_PRODUCT_IMAGES_TABLE.sql'
];

async function runSQLFile(filePath) {
  try {
    console.log(`\n📄 Reading: ${filePath}...`);
    const sqlContent = readFileSync(filePath, 'utf-8');
    
    // Remove comments and empty lines for cleaner execution
    // Split by semicolons to execute statements separately
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`   Executing ${statements.length} SQL statements...`);
    
    // Execute the SQL
    await sql.unsafe(sqlContent);
    
    console.log(`   ✅ Successfully executed: ${filePath}`);
    return { success: true, file: filePath };
  } catch (error) {
    console.error(`   ❌ Error executing ${filePath}:`, error.message);
    return { success: false, file: filePath, error: error.message };
  }
}

async function applyAllFixes() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🚀 AUTOMATIC DATABASE FIXES APPLIER');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`\n📊 Database: ${DATABASE_URL.substring(0, 50)}...`);
  console.log(`📁 Working directory: ${__dirname}\n`);
  
  const results = [];
  
  for (const fixFile of FIX_FILES) {
    const filePath = join(__dirname, fixFile);
    
    try {
      // Check if file exists
      const fs = await import('fs/promises');
      await fs.access(filePath);
      
      const result = await runSQLFile(filePath);
      results.push(result);
      
      // Small delay between files to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log(`   ⚠️  File not found: ${fixFile} (skipping)`);
        results.push({ success: false, file: fixFile, error: 'File not found' });
      } else {
        console.error(`   ❌ Error accessing ${fixFile}:`, error.message);
        results.push({ success: false, file: fixFile, error: error.message });
      }
    }
  }
  
  // Print summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 EXECUTION SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`✅ Successfully applied: ${successful} fixes`);
  console.log(`❌ Failed: ${failed} fixes\n`);
  
  if (successful > 0) {
    console.log('✅ Successfully applied fixes:');
    results.filter(r => r.success).forEach(r => {
      console.log(`   • ${r.file}`);
    });
    console.log('');
  }
  
  if (failed > 0) {
    console.log('❌ Failed fixes:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`   • ${r.file}: ${r.error}`);
    });
    console.log('');
  }
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 All fixes have been applied!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  if (failed === 0) {
    console.log('✨ Your database is now fully fixed and ready to use!');
  } else {
    console.log('⚠️  Some fixes failed. Please review the errors above.');
    console.log('💡 You can run individual SQL files manually in Supabase SQL Editor if needed.');
  }
}

// Run the fixes
applyAllFixes().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
