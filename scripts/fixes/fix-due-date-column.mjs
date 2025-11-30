#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials!');
  console.error('Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixDueDateColumn() {
  console.log('🔧 Adding due_date column to installment_payments table...\n');

  try {
    // Read the SQL file
    const sqlPath = join(__dirname, 'migrations', 'fix_installment_payments_due_date.sql');
    const sql = readFileSync(sqlPath, 'utf8');

    console.log('Executing SQL migration...\n');
    
    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql }).single();

    if (error) {
      // If exec_sql doesn't exist, try direct query
      console.log('Trying direct query...\n');
      const { data: directData, error: directError } = await supabase
        .from('installment_payments')
        .select('*')
        .limit(0);
      
      if (directError && directError.message.includes('due_date')) {
        // Column still doesn't exist, we need to run the SQL manually
        console.error('❌ Error: Could not add column automatically.');
        console.error('\n📋 Please run this SQL manually in your Supabase SQL Editor:\n');
        console.log(sql);
        process.exit(1);
      }
    }

    console.log('✅ Migration completed successfully!\n');
    
    // Verify the column exists
    console.log('🔍 Verifying column exists...\n');
    const { data: verifyData, error: verifyError } = await supabase
      .from('installment_payments')
      .select('id, due_date')
      .limit(1);

    if (verifyError) {
      console.error('❌ Verification failed:', verifyError.message);
      console.error('\n📋 Please run this SQL manually in your Supabase SQL Editor:\n');
      console.log(sql);
      process.exit(1);
    } else {
      console.log('✅ Column verified successfully!');
      console.log('✅ The due_date column is now available in installment_payments table');
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error('\n📋 Please run the SQL manually. Here it is:\n');
    const sqlPath = join(__dirname, 'migrations', 'fix_installment_payments_due_date.sql');
    const sql = readFileSync(sqlPath, 'utf8');
    console.log(sql);
    process.exit(1);
  }
}

fixDueDateColumn();

