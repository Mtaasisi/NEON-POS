#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('🔧 Fixing installment_payments amount column...\n');
  
  try {
    // Read the SQL file
    const sqlPath = join(__dirname, 'migrations', 'fix_installment_payments_amount_column.sql');
    const sql = readFileSync(sqlPath, 'utf-8');
    
    console.log('📄 SQL Migration:');
    console.log('=' .repeat(60));
    console.log(sql);
    console.log('=' .repeat(60) + '\n');
    
    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      console.error('❌ Migration failed:', error.message);
      
      // Try alternative method using direct query
      console.log('\n🔄 Trying alternative method...\n');
      
      const { error: altError } = await supabase.from('installment_payments').select('amount').limit(1);
      
      if (altError && altError.message.includes('column "amount" does not exist')) {
        console.log('✅ Confirmed: amount column is missing');
        console.log('\n📋 Please run this SQL manually in your Supabase SQL Editor:');
        console.log('=' .repeat(60));
        console.log(`
ALTER TABLE installment_payments 
ADD COLUMN IF NOT EXISTS amount NUMERIC NOT NULL DEFAULT 0;

-- Verify
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'installment_payments' 
AND column_name = 'amount';
`);
        console.log('=' .repeat(60));
      }
      
      process.exit(1);
    }
    
    console.log('✅ Migration completed successfully!\n');
    
    // Verify the column exists
    const { data: columns, error: verifyError } = await supabase
      .from('installment_payments')
      .select('amount')
      .limit(1);
    
    if (!verifyError) {
      console.log('✅ Verified: amount column now exists in installment_payments');
    } else if (verifyError.message.includes('column "amount" does not exist')) {
      console.log('⚠️  Column still missing. Please run the SQL manually.');
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

runMigration();

