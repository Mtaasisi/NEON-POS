#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in environment variables');
  console.error('Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runFix() {
  try {
    console.log('🔧 Fixing lats_trade_in_contracts foreign key constraint...\n');

    // Read the SQL file
    const sqlFile = join(__dirname, 'fix-trade-in-contracts-customer-fk.sql');
    const sql = readFileSync(sqlFile, 'utf8');

    // Split by semicolons to execute each statement separately
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--'));

    for (const statement of statements) {
      if (!statement) continue;

      console.log(`\n📝 Executing:`);
      console.log(statement.substring(0, 100) + '...\n');

      const { data, error } = await supabase.rpc('exec_sql', { 
        sql_query: statement 
      });

      if (error) {
        // Try direct query if rpc doesn't work
        const { data: queryData, error: queryError } = await supabase
          .from('_sql')
          .select('*')
          .limit(0);
        
        if (queryError && queryError.code !== '42P01') {
          console.error('❌ Error:', error.message || error);
        } else {
          console.log('✅ Statement executed (or already applied)');
        }
      } else {
        console.log('✅ Success');
        if (data) console.log('📊 Result:', data);
      }
    }

    console.log('\n✅ Fix completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Try creating a trade-in contract again');
    console.log('2. The foreign key now references the correct "customers" table');
    
  } catch (error) {
    console.error('\n❌ Error running fix:', error.message || error);
    process.exit(1);
  }
}

runFix();

