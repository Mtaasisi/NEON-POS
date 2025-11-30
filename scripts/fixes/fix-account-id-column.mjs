import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Supabase configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ajhnxlcgtdfrgzfqsfds.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqaG54bGNndGRmcmd6ZnFzZmRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzEwODI4MjIsImV4cCI6MjA0NjY1ODgyMn0.UJoFzFJgDRbK5AabPO06zWV1HXA0IZoeCVc78K_uMKg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function addAccountIdColumn() {
  console.log('🔧 Adding account_id column to installment_payments table...');
  console.log('=' .repeat(60));

  try {
    // Read the migration SQL file
    const sqlFile = join(__dirname, 'migrations', 'add_account_id_to_installment_payments.sql');
    const sql = readFileSync(sqlFile, 'utf8');

    console.log('📄 Executing migration SQL...\n');
    
    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      // Try direct execution via the REST API
      console.log('⚠️  RPC method not available, trying direct execution...');
      
      const { data: result, error: execError } = await supabase
        .from('installment_payments')
        .select('account_id')
        .limit(1);

      if (execError && execError.message?.includes('column "account_id" does not exist')) {
        console.log('❌ Column still does not exist. Please run the SQL manually in Supabase SQL Editor.');
        console.log('\n📋 Copy and paste this SQL in your Supabase SQL Editor:\n');
        console.log('=' .repeat(60));
        console.log(sql);
        console.log('=' .repeat(60));
        return false;
      } else if (!execError) {
        console.log('✅ Column already exists!');
        return true;
      }
    }

    console.log('✅ Migration executed successfully!');
    console.log('\n🔍 Verifying column was added...');

    // Verify the column exists by trying to select it
    const { data: verifyData, error: verifyError } = await supabase
      .from('installment_payments')
      .select('account_id')
      .limit(1);

    if (verifyError) {
      if (verifyError.message?.includes('column "account_id" does not exist')) {
        console.log('❌ Column was not added. Please run the SQL manually.');
        console.log('\n📋 Run this in Supabase SQL Editor:\n');
        console.log('=' .repeat(60));
        console.log(sql);
        console.log('=' .repeat(60));
        return false;
      }
      throw verifyError;
    }

    console.log('✅ Column verified successfully!');
    console.log('\n🎉 Fix completed! The account_id column is now available.');
    return true;

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n📋 Please run this SQL manually in Supabase SQL Editor:\n');
    console.log('=' .repeat(60));
    const sqlFile = join(__dirname, 'migrations', 'add_account_id_to_installment_payments.sql');
    const sql = readFileSync(sqlFile, 'utf8');
    console.log(sql);
    console.log('=' .repeat(60));
    return false;
  }
}

// Run the fix
addAccountIdColumn()
  .then(success => {
    if (success) {
      console.log('\n✅ All done! You can now use installment payments with account tracking.');
    } else {
      console.log('\n⚠️  Manual intervention needed. Please run the SQL in Supabase.');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

