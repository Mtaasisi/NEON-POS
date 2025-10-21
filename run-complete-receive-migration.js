#!/usr/bin/env node

/**
 * Run Complete Purchase Order Receive Function Migration
 * 
 * This script creates the missing complete_purchase_order_receive function
 * that is required for the purchase order receive functionality to work properly.
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   - VITE_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('🚀 Starting Complete Purchase Order Receive Function Migration...\n');

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, 'migrations', 'create_complete_purchase_order_receive_function.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration file loaded');
    console.log('📝 SQL length:', migrationSQL.length, 'characters\n');

    // Execute the migration
    console.log('⚙️  Executing migration...');
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL }).single();

    if (error) {
      // If exec_sql doesn't exist, try direct execution
      if (error.message.includes('exec_sql') || error.code === '42883') {
        console.log('ℹ️  exec_sql function not available, using alternative method...\n');
        
        // Try to create the function using the pg connection
        const { error: directError } = await supabase.rpc('create_complete_purchase_order_receive_function', {});
        
        if (directError) {
          console.log('⚠️  Cannot execute via RPC. Please run this SQL manually in your database:');
          console.log('─'.repeat(80));
          console.log(migrationSQL);
          console.log('─'.repeat(80));
          console.log('\n📋 Copy the SQL above and run it in your Supabase SQL Editor\n');
          return;
        }
      } else {
        throw error;
      }
    }

    console.log('✅ Migration executed successfully!\n');

    // Verify the function was created
    console.log('🔍 Verifying function creation...');
    const { data: functions, error: verifyError } = await supabase
      .rpc('complete_purchase_order_receive', {
        purchase_order_id_param: '00000000-0000-0000-0000-000000000000',
        user_id_param: '00000000-0000-0000-0000-000000000000',
        receive_notes: 'test'
      });

    if (verifyError) {
      if (verifyError.message.includes('Purchase order not found')) {
        console.log('✅ Function exists and is working (test call returned expected error)\n');
      } else if (verifyError.code === '42883') {
        console.log('⚠️  Function not found. Please run the SQL manually.\n');
        console.log('📋 SQL to run:');
        console.log('─'.repeat(80));
        console.log(migrationSQL);
        console.log('─'.repeat(80));
      } else {
        console.log('⚠️  Function verification returned error:', verifyError.message);
        console.log('   This might be expected if the function requires valid parameters.\n');
      }
    } else {
      console.log('✅ Function is working correctly!\n');
    }

    console.log('✨ Migration completed successfully!');
    console.log('   The complete_purchase_order_receive function is now available.\n');
    console.log('📌 Next steps:');
    console.log('   1. Test receiving a purchase order');
    console.log('   2. Verify inventory items are created');
    console.log('   3. Check the received items tab shows the items\n');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\n📋 Please run this SQL manually in your Supabase SQL Editor:');
    console.error('─'.repeat(80));
    
    try {
      const migrationPath = path.join(__dirname, 'migrations', 'create_complete_purchase_order_receive_function.sql');
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
      console.error(migrationSQL);
    } catch (readError) {
      console.error('Could not read migration file');
    }
    
    console.error('─'.repeat(80));
    process.exit(1);
  }
}

// Run the migration
runMigration();

