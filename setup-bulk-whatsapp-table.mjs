#!/usr/bin/env node

/**
 * Automatically create the whatsapp_bulk_campaigns table in Supabase
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ ERROR: Supabase credentials not found in .env file');
  console.error('Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set');
  process.exit(1);
}

console.log('🚀 Setting up WhatsApp Bulk Campaigns table...');
console.log(`📍 Supabase URL: ${supabaseUrl}`);

const supabase = createClient(supabaseUrl, supabaseKey);

// SQL to create the table
const createTableSQL = `
-- WhatsApp Bulk Campaigns Table
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
CREATE INDEX IF NOT EXISTS idx_bulk_campaigns_created_at ON whatsapp_bulk_campaigns(created_at DESC);
`;

async function setupTable() {
  try {
    console.log('📝 Creating whatsapp_bulk_campaigns table...');
    
    // Execute the SQL using Supabase RPC or direct query
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql: createTableSQL 
    }).catch(async (err) => {
      // If RPC doesn't exist, try using the REST API directly
      console.log('⚠️  RPC method not available, checking if table already exists...');
      
      // Try to query the table to see if it exists
      const { data, error } = await supabase
        .from('whatsapp_bulk_campaigns')
        .select('id')
        .limit(1);
      
      if (error && error.code === '42P01') {
        // Table doesn't exist
        throw new Error('Table does not exist and cannot be created via API. Please run the SQL manually in Supabase SQL Editor.');
      } else if (error) {
        throw error;
      } else {
        console.log('✅ Table already exists!');
        return { success: true, exists: true };
      }
    });
    
    if (error) {
      console.error('❌ Error:', error.message);
      console.log('\n📋 Please run this SQL manually in Supabase SQL Editor:');
      console.log('   Dashboard → SQL Editor → New Query\n');
      console.log(createTableSQL);
      console.log('\n🔗 Direct link: ' + supabaseUrl + '/project/_/sql');
      return { success: false };
    }
    
    console.log('✅ Table setup complete!');
    return { success: true };
    
  } catch (err) {
    console.error('❌ Setup failed:', err.message);
    console.log('\n📋 Please run this SQL manually in Supabase SQL Editor:');
    console.log('   Dashboard → SQL Editor → New Query\n');
    console.log(createTableSQL);
    console.log('\n🔗 Direct link: ' + supabaseUrl.replace('//', '//app.') + '/project/_/sql');
    return { success: false };
  }
}

// Run setup
setupTable().then(result => {
  if (result.success) {
    console.log('\n🎉 Setup complete! Your bulk WhatsApp feature is ready to use.');
    console.log('   You can now send bulk WhatsApp campaigns from your app.');
    process.exit(0);
  } else {
    console.log('\n⚠️  Manual setup required. Follow the instructions above.');
    process.exit(1);
  }
});

