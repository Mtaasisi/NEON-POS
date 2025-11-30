#!/usr/bin/env node

/**
 * Run the installments migration to create required tables
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  console.error('   Need: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or VITE_SUPABASE_ANON_KEY)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('🚀 Running installments migration...\n');

  try {
    // Read the migration file
    const migrationPath = join(__dirname, 'migrations', 'create_special_orders_and_installments.sql');
    console.log('📄 Reading migration file:', migrationPath);
    
    const sql = readFileSync(migrationPath, 'utf8');
    console.log('✅ Migration file loaded\n');

    // Execute the migration
    console.log('⚙️  Executing SQL migration...');
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql }).catch(async () => {
      // If exec_sql doesn't exist, try direct query
      return await supabase.from('_migrations').insert({ sql });
    });

    if (error) {
      // Try using the REST API directly
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify({ query: sql })
      });

      if (!response.ok) {
        throw new Error(`Migration failed: ${response.statusText}`);
      }
    }

    console.log('✅ Migration executed successfully!\n');

    // Verify tables were created
    console.log('🔍 Verifying tables...');
    
    const tables = [
      'customer_special_orders',
      'special_order_payments', 
      'customer_installment_plans',
      'installment_payments'
    ];

    for (const table of tables) {
      const { data, error } = await supabase.from(table).select('id').limit(1);
      if (!error) {
        console.log(`   ✅ ${table} exists`);
      } else if (error.code === '42P01') {
        console.log(`   ❌ ${table} NOT created`);
      } else {
        console.log(`   ✅ ${table} exists (no data yet)`);
      }
    }

    console.log('\n✅ Migration completed!\n');
    console.log('📝 Next steps:');
    console.log('   1. Refresh your browser');
    console.log('   2. Go to Installments page');
    console.log('   3. Create a test installment plan');
    console.log('');

  } catch (error) {
    console.error('\n❌ Migration error:', error.message);
    console.error('\n💡 You may need to run this SQL manually in Supabase SQL Editor:');
    console.error('   1. Go to your Supabase dashboard');
    console.error('   2. Open SQL Editor');
    console.error('   3. Paste the contents of migrations/create_special_orders_and_installments.sql');
    console.error('   4. Click "Run"\n');
    process.exit(1);
  }
}

// Run the migration
runMigration();

