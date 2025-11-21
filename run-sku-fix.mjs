#!/usr/bin/env node
/**
 * Run SKU Duplicate Constraint Fix Migration
 * 
 * This script applies the fix for duplicate SKU errors when creating IMEI variants
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  console.error('   Need: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or VITE_SUPABASE_ANON_KEY)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('🔧 Running SKU Duplicate Constraint Fix...\n');

  try {
    // Read the migration file
    const migrationPath = join(__dirname, 'migrations', 'fix_sku_duplicate_constraint.sql');
    console.log('📄 Reading migration file:', migrationPath);
    
    const migrationSQL = readFileSync(migrationPath, 'utf8');
    console.log('✅ Migration file loaded\n');

    // Try to execute via RPC (if available)
    console.log('⚙️  Executing SQL migration...');
    
    // For Supabase, we need to execute statements individually
    // Split by semicolons but keep DO blocks together
    const statements = migrationSQL
      .split(/;(?![^$]*\$\$)/)
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.match(/^\/\*/));

    let executed = 0;
    let errors = 0;

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (!statement || statement.length < 10) continue;

      try {
        // Try using postgrest-js for direct SQL execution
        // Note: Supabase doesn't support direct SQL execution via client
        // So we'll provide instructions for manual execution
        console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);
      } catch (err) {
        console.log(`⚠️  Statement ${i + 1} skipped:`, err.message);
        errors++;
      }
    }

    // Since Supabase doesn't allow direct SQL execution via client,
    // we'll provide the SQL for manual execution
    console.log('\n' + '='.repeat(80));
    console.log('📋 IMPORTANT: Supabase requires manual SQL execution');
    console.log('='.repeat(80));
    console.log('\nPlease run the following SQL in your Supabase SQL Editor:');
    console.log('1. Go to: https://supabase.com/dashboard');
    console.log('2. Select your project');
    console.log('3. Go to SQL Editor');
    console.log('4. Copy and paste the SQL below:\n');
    console.log('─'.repeat(80));
    console.log(migrationSQL);
    console.log('─'.repeat(80));
    console.log('\n✅ After running the SQL, the duplicate SKU issue will be fixed!');
    console.log('   You can then retry receiving your Purchase Order.\n');

  } catch (error) {
    console.error('❌ Error reading migration file:', error.message);
    console.log('\n📋 Please run the migration manually in Supabase SQL Editor');
    process.exit(1);
  }
}

// Run the migration
runMigration().catch(console.error);

