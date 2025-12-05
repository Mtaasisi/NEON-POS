#!/usr/bin/env node

/**
 * Create whatsapp_bulk_campaigns table in Supabase using SQL execution
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials not found in .env');
  process.exit(1);
}

console.log('🚀 Creating WhatsApp Bulk Campaigns table in Supabase...');
console.log(`📍 Supabase URL: ${supabaseUrl}\n`);

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTable() {
  try {
    // First check if table exists
    console.log('🔍 Checking if table exists...');
    const { data: existing, error: checkError } = await supabase
      .from('whatsapp_bulk_campaigns')
      .select('id')
      .limit(1);
    
    if (!checkError) {
      console.log('✅ Table already exists! You\'re all set.');
      return true;
    }
    
    if (checkError.code !== '42P01' && !checkError.message.includes('does not exist')) {
      console.error('❌ Unexpected error:', checkError);
      return false;
    }
    
    // Table doesn't exist - need to create it via SQL Editor
    console.log('📝 Table does not exist.\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('⚠️  You need to create the table via Supabase SQL Editor');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('Please follow these steps:');
    console.log('1. Open: https://app.supabase.com/project/jxhzveborezjhsmzsgbc/sql/new');
    console.log('2. Copy the SQL below');
    console.log('3. Paste it into the SQL Editor');
    console.log('4. Click "RUN"\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 SQL TO RUN:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // Read and display the SQL
    const sql = readFileSync('migrations/create_whatsapp_bulk_campaigns.sql', 'utf8');
    console.log(sql);
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('🔗 Direct Link: https://app.supabase.com/project/jxhzveborezjhsmzsgbc/sql/new\n');
    console.log('After running the SQL, your bulk WhatsApp feature will be ready! 🎉\n');
    
    return false;
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

createTable().then(exists => {
  if (exists) {
    console.log('\n✨ Everything is ready! You can now use the bulk WhatsApp feature.');
  } else {
    console.log('⏳ After creating the table in Supabase, run this script again to verify.');
  }
  process.exit(0);
});

