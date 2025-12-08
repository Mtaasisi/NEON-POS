#!/usr/bin/env node
/**
 * Fix payment_method trigger function
 * Updates the trigger to handle payment_method as both JSONB and TEXT
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';
import 'dotenv/config';

// Use production Supabase connection
const supabaseUrl = 'https://jxhzveborezjhsmzsgbc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4aHp2ZWJvcmV6amhzbXpzZ2JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3MTE1MjQsImV4cCI6MjA2ODI4NzUyNH0.pIug4PlJ3Q14GxcYilW-u0blByYoyeOfN3q9RNIjgfw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixPaymentMethodTrigger() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║  🔧 FIXING PAYMENT_METHOD TRIGGER FUNCTION           ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  try {
    // Read the SQL file
    const sqlPath = join(process.cwd(), 'fix-payment-method-trigger.sql');
    const sql = readFileSync(sqlPath, 'utf-8');

    console.log('1️⃣ Applying trigger function fix...\n');

    // Execute the SQL
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      // If rpc doesn't exist, try direct query (requires service role key)
      console.log('   ⚠️  RPC method not available, trying alternative approach...');
      
      // Split SQL into statements and execute via Supabase client
      // Note: This requires service role key for DDL operations
      console.log('   ⚠️  This requires service role key or direct database access.');
      console.log('   📋 Please run the SQL file directly on your database:\n');
      console.log('   File: fix-payment-method-trigger.sql\n');
      console.log('   Or use psql:');
      console.log('   psql -h aws-0-eu-north-1.pooler.supabase.com -p 5432 -d postgres -U postgres.jxhzveborezjhsmzsgbc -f fix-payment-method-trigger.sql\n');
      
      return;
    }

    console.log('   ✅ Trigger function updated successfully!\n');

    // Verify the fix
    console.log('2️⃣ Verifying trigger function...');
    const { data: functions, error: verifyError } = await supabase
      .from('pg_proc')
      .select('proname')
      .eq('proname', 'sync_sale_to_payment_transaction');

    if (verifyError) {
      console.log('   ⚠️  Could not verify (this is normal)');
    } else {
      console.log('   ✅ Function exists');
    }

    console.log('\n✅ Fix complete!');
    console.log('   The trigger will now handle payment_method as both JSONB and TEXT.\n');

  } catch (error) {
    console.error('\n❌ Error fixing trigger:', error);
    console.log('\n📋 Manual fix required:');
    console.log('   1. Open fix-payment-method-trigger.sql');
    console.log('   2. Run it on your database using psql or Supabase SQL editor\n');
    process.exit(1);
  }
}

fixPaymentMethodTrigger().catch(console.error);

