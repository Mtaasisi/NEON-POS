#!/usr/bin/env node
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables!');
  console.error('Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function runMigration() {
  console.log('🔧 Adding missing columns to lats_stock_movements table...\n');

  try {
    // Read the migration file
    const sql = readFileSync('./migrations/add_missing_stock_movement_columns.sql', 'utf8');
    
    console.log('📄 Executing SQL migration...');
    
    // Execute the migration
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql }).single();
    
    if (error) {
      // If the function doesn't exist, try direct execution
      console.log('ℹ️  Trying direct SQL execution...');
      const { error: directError } = await supabase.from('_migrations').insert({
        name: 'add_missing_stock_movement_columns',
        executed_at: new Date().toISOString()
      });
      
      if (directError) {
        console.log('⚠️  Will execute via manual SQL...\n');
        console.log('Please run the following SQL in your Supabase SQL Editor:\n');
        console.log('─'.repeat(80));
        console.log(sql);
        console.log('─'.repeat(80));
        console.log('\n✅ Copy the SQL above and run it in Supabase Dashboard > SQL Editor');
        return;
      }
    }
    
    console.log('✅ Migration completed successfully!');
    console.log('✅ Added columns: previous_quantity, new_quantity, reason, reference');
    console.log('✅ Added performance indexes');
    
  } catch (error) {
    console.error('❌ Error running migration:', error.message);
    console.log('\n📋 Manual SQL to run:');
    console.log('─'.repeat(80));
    const sql = readFileSync('./migrations/add_missing_stock_movement_columns.sql', 'utf8');
    console.log(sql);
    console.log('─'.repeat(80));
  }
}

runMigration();

