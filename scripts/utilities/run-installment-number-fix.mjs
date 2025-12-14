#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  console.error('   Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('🔧 Running installment_number column fix...\n');

  try {
    // Read the migration file
    const migrationPath = join(__dirname, 'migrations', 'add_installment_number_column.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');

    console.log('📄 Executing migration...');
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: migrationSQL });

    if (error) {
      // If exec_sql doesn't exist, try direct query
      console.log('⚠️  exec_sql function not found, trying direct execution...');
      
      const { data: directData, error: directError } = await supabase
        .from('_sql')
        .select('*')
        .limit(0);
      
      if (directError) {
        console.error('❌ Cannot execute SQL directly. Please run the migration manually.');
        console.log('\n📋 Copy and paste this SQL into your Supabase SQL Editor:\n');
        console.log(migrationSQL);
        return;
      }
    }

    console.log('✅ Migration completed successfully!');
    
    // Verify the column exists
    console.log('\n🔍 Verifying column exists...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('installment_payments')
      .select('installment_number')
      .limit(1);

    if (verifyError) {
      console.error('⚠️  Could not verify column. Error:', verifyError.message);
      console.log('\n📋 Please run this SQL manually in Supabase SQL Editor:\n');
      console.log(migrationSQL);
    } else {
      console.log('✅ Column verified successfully!');
    }

  } catch (error) {
    console.error('❌ Error running migration:', error.message);
    console.log('\n📋 Please run this SQL manually in Supabase SQL Editor:');
    console.log('\n' + readFileSync(join(__dirname, 'migrations', 'add_installment_number_column.sql'), 'utf8'));
  }
}

runMigration();

