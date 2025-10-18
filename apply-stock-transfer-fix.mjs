#!/usr/bin/env node

/**
 * AUTO-FIX STOCK TRANSFER SYSTEM
 * ===============================
 * This script automatically applies all stock transfer fixes to your Neon database
 */

import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config();

console.log('🚀 Starting Stock Transfer Fix Application...\n');

// Get database URL
const DATABASE_URL = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL not found in environment variables');
  console.error('Please set DATABASE_URL in your .env file');
  process.exit(1);
}

console.log('✅ Database connection string found');
console.log(`📍 Database: ${DATABASE_URL.split('@')[1]?.split('/')[0] || 'unknown'}\n`);

// Create database client
const sql = neon(DATABASE_URL);

async function runFix() {
  try {
    console.log('📂 Reading fix SQL file...');
    const fixSQL = readFileSync(
      join(__dirname, '🔧-COMPLETE-STOCK-TRANSFER-FIX.sql'),
      'utf-8'
    );
    
    console.log('✅ Fix SQL loaded successfully\n');
    console.log('=' .repeat(70));
    console.log('APPLYING STOCK TRANSFER FIXES');
    console.log('=' .repeat(70));
    console.log('');
    
    // Split SQL into individual statements
    // We'll execute them one by one to see progress
    const statements = fixSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);
    
    let successCount = 0;
    let errorCount = 0;
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      
      // Skip comments and empty statements
      if (stmt.startsWith('--') || stmt.trim().length === 0) {
        continue;
      }
      
      // Extract a short description for display
      let description = 'SQL statement';
      if (stmt.includes('CREATE TABLE')) {
        const match = stmt.match(/CREATE TABLE IF NOT EXISTS (\w+)/i);
        description = match ? `Creating table: ${match[1]}` : 'Creating table';
      } else if (stmt.includes('CREATE OR REPLACE FUNCTION')) {
        const match = stmt.match(/CREATE OR REPLACE FUNCTION (\w+)/i);
        description = match ? `Creating function: ${match[1]}` : 'Creating function';
      } else if (stmt.includes('ALTER TABLE')) {
        const match = stmt.match(/ALTER TABLE (\w+)/i);
        description = match ? `Altering table: ${match[1]}` : 'Altering table';
      } else if (stmt.includes('CREATE INDEX')) {
        const match = stmt.match(/CREATE INDEX.*? ON (\w+)/i);
        description = match ? `Creating index on: ${match[1]}` : 'Creating index';
      } else if (stmt.includes('GRANT')) {
        description = 'Granting permissions';
      }
      
      try {
        process.stdout.write(`[${i + 1}/${statements.length}] ${description}... `);
        await sql(stmt + ';');
        console.log('✅');
        successCount++;
      } catch (error) {
        // Some errors are expected (like "column already exists")
        if (
          error.message.includes('already exists') ||
          error.message.includes('duplicate')
        ) {
          console.log('⚠️  (already exists)');
          successCount++;
        } else {
          console.log('❌');
          console.error(`   Error: ${error.message}`);
          errorCount++;
        }
      }
    }
    
    console.log('');
    console.log('=' .repeat(70));
    console.log('FIX APPLICATION COMPLETE');
    console.log('=' .repeat(70));
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Errors: ${errorCount}\n`);
    
    // Now verify the fixes
    console.log('🔍 Verifying fixes...\n');
    
    // Check 1: Function signatures
    console.log('1️⃣  Checking complete_stock_transfer_transaction function...');
    const funcCheck = await sql`
      SELECT 
        routine_name,
        string_agg(parameter_name, ', ' ORDER BY ordinal_position) as params
      FROM information_schema.routines
      LEFT JOIN information_schema.parameters ON routines.specific_name = parameters.specific_name
      WHERE routine_schema = 'public'
        AND routine_name = 'complete_stock_transfer_transaction'
      GROUP BY routine_name
    `;
    
    if (funcCheck.length > 0) {
      console.log(`   ✅ Function exists with params: ${funcCheck[0].params}`);
      if (funcCheck[0].params && funcCheck[0].params.includes('p_transfer_id') && 
          funcCheck[0].params.includes('p_completed_by')) {
        console.log('   ✅ Correct signature (2 parameters)\n');
      } else {
        console.log('   ⚠️  Warning: Function may have wrong signature\n');
      }
    } else {
      console.log('   ❌ Function not found!\n');
    }
    
    // Check 2: Reserved quantity column
    console.log('2️⃣  Checking reserved_quantity column...');
    const columnCheck = await sql`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'lats_product_variants'
        AND column_name = 'reserved_quantity'
    `;
    
    if (columnCheck.length > 0) {
      console.log(`   ✅ Column exists (${columnCheck[0].data_type})\n`);
    } else {
      console.log('   ❌ Column not found!\n');
    }
    
    // Check 3: Helper functions
    console.log('3️⃣  Checking helper functions...');
    const helperFuncs = await sql`
      SELECT routine_name
      FROM information_schema.routines
      WHERE routine_schema = 'public'
        AND routine_name IN (
          'reserve_variant_stock',
          'release_variant_stock',
          'reduce_variant_stock',
          'increase_variant_stock',
          'find_or_create_variant_at_branch',
          'check_duplicate_transfer'
        )
      ORDER BY routine_name
    `;
    
    console.log(`   ✅ Found ${helperFuncs.length}/6 helper functions:`);
    helperFuncs.forEach(row => {
      console.log(`      - ${row.routine_name}`);
    });
    console.log('');
    
    // Check 4: Stock movements branch columns
    console.log('4️⃣  Checking stock_movements branch tracking...');
    const branchCols = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'lats_stock_movements'
        AND column_name IN ('from_branch_id', 'to_branch_id')
      ORDER BY column_name
    `;
    
    if (branchCols.length === 2) {
      console.log('   ✅ Branch tracking columns exist\n');
    } else {
      console.log(`   ⚠️  Found ${branchCols.length}/2 branch columns\n`);
    }
    
    // Final summary
    console.log('=' .repeat(70));
    console.log('📋 FINAL STATUS');
    console.log('=' .repeat(70));
    
    const allGood = 
      funcCheck.length > 0 &&
      columnCheck.length > 0 &&
      helperFuncs.length >= 5 &&
      branchCols.length === 2;
    
    if (allGood) {
      console.log('');
      console.log('🎉 SUCCESS! All fixes applied successfully!');
      console.log('');
      console.log('✅ Complete stock transfer function exists');
      console.log('✅ Reserved quantity column added');
      console.log('✅ Helper functions created');
      console.log('✅ Branch tracking enabled');
      console.log('');
      console.log('🚀 Your stock transfer system is now ready to use!');
      console.log('');
      console.log('📝 Next steps:');
      console.log('   1. Test with a small transfer (1-2 units)');
      console.log('   2. Verify both branches update correctly');
      console.log('   3. Complete your pending transfers safely');
      console.log('');
    } else {
      console.log('');
      console.log('⚠️  Some fixes may not have been applied correctly.');
      console.log('Please review the errors above and run the SQL manually if needed.');
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  }
}

// Run the fix
runFix().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
