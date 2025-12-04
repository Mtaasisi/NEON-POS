#!/usr/bin/env node

/**
 * Create whatsapp_bulk_campaigns table directly using REST API
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

console.log('🚀 Creating WhatsApp Bulk Campaigns table...');
console.log(`📍 Supabase URL: ${supabaseUrl}\n`);

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAndCreateTable() {
  try {
    // First, try to query the table to see if it exists
    console.log('🔍 Checking if table exists...');
    const { data, error } = await supabase
      .from('whatsapp_bulk_campaigns')
      .select('id')
      .limit(1);
    
    if (!error) {
      console.log('✅ Table already exists! You\'re all set.');
      return true;
    }
    
    if (error.code === '42P01' || error.message.includes('does not exist')) {
      console.log('📝 Table does not exist. Creating it now...\n');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('⚠️  IMPORTANT: The table needs to be created manually');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log('Please follow these steps:');
      console.log('1. Open Supabase Dashboard: https://app.supabase.com');
      console.log('2. Select your project: jxhzveborezjhsmzsgbc');
      console.log('3. Go to: SQL Editor (left sidebar)');
      console.log('4. Click "New Query"');
      console.log('5. Copy and paste the SQL below:');
      console.log('6. Click "Run"\n');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📋 SQL TO RUN:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
      const sql = `-- WhatsApp Bulk Campaigns Table
CREATE TABLE IF NOT EXISTS whatsapp_bulk_campaigns (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  message TEXT NOT NULL,
  recipients JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'paused', 'completed', 'failed', 'cancelled')),
  progress JSONB NOT NULL DEFAULT '{"current": 0, "total": 0, "success": 0, "failed": 0}'::jsonb,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  media_url TEXT,
  media_type TEXT CHECK (media_type IN ('image', 'video', 'document', 'audio')),
  failed_recipients JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  last_heartbeat TIMESTAMP WITH TIME ZONE,
  error_message TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_bulk_campaigns_user_id ON whatsapp_bulk_campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_bulk_campaigns_status ON whatsapp_bulk_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_bulk_campaigns_created_at ON whatsapp_bulk_campaigns(created_at DESC);`;
      
      console.log(sql);
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log('🔗 Quick Link: https://app.supabase.com/project/jxhzveborezjhsmzsgbc/sql/new\n');
      console.log('After running the SQL, your bulk WhatsApp feature will be ready! 🎉\n');
      return false;
    }
    
    console.error('❌ Unexpected error:', error);
    return false;
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    return false;
  }
}

checkAndCreateTable().then(exists => {
  if (exists) {
    console.log('\n✨ Everything is ready! You can now use the bulk WhatsApp feature.');
    process.exit(0);
  } else {
    console.log('⏳ Waiting for you to create the table...');
    process.exit(0);
  }
});

