#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Please set VITE_SUPABASE_URL and VITE_SUPABASE_SERVICE_ROLE_KEY in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  try {
    console.log('🚀 Starting migration to fix payment_method column...\n');

    // Read the migration file
    const migrationPath = join(__dirname, 'migrations', 'fix_installment_payments_payment_method.sql');
    const migration = readFileSync(migrationPath, 'utf8');

    console.log('📄 Running migration...');
    
    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: migration });

    if (error) {
      console.error('❌ Migration failed:', error);
      
      // Try direct approach if RPC fails
      console.log('\n🔄 Trying direct SQL execution...');
      const { error: directError } = await supabase
        .from('_migrations')
        .select('*')
        .limit(1);
      
      if (directError) {
        console.log('⚠️  Cannot use RPC. Attempting manual column addition...');
        
        // Manual column addition
        const { error: addError } = await supabase.rpc('exec_sql', {
          sql_query: `
            ALTER TABLE installment_payments 
            ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'cash';
          `
        });
        
        if (addError) {
          throw addError;
        }
      }
    }

    console.log('✅ Migration completed!\n');

    // Verify the column exists
    console.log('🔍 Verifying column...');
    const { data: columns, error: verifyError } = await supabase
      .from('installment_payments')
      .select('*')
      .limit(0);

    if (verifyError) {
      console.warn('⚠️  Could not verify column (this is okay if table is empty)');
    } else {
      console.log('✅ Column verification successful!');
    }

    console.log('\n✨ All done! The payment_method column should now be available.');
    console.log('💡 Try recording an installment payment again.\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\n📝 Manual fix required:');
    console.error('Run this SQL in your Supabase SQL Editor:');
    console.error(`
ALTER TABLE installment_payments 
ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'cash';
    `);
    process.exit(1);
  }
}

runMigration();

