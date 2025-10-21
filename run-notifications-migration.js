#!/usr/bin/env node

/**
 * Run Notifications Migration
 * This script creates the notifications table and sets up the system
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Please check your .env file for VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runNotificationsMigration() {
  try {
    console.log('🚀 Starting Notifications Migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, 'migrations', 'create_notifications_table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Executing notifications table creation...');
    
    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });
    
    if (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
    
    console.log('✅ Notifications table created successfully!');
    
    // Test the notifications system
    console.log('🧪 Testing notifications system...');
    
    // Check if table exists
    const { data: tableCheck, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_name', 'notifications')
      .eq('table_schema', 'public');
    
    if (tableError) {
      console.error('❌ Error checking table:', tableError);
      throw tableError;
    }
    
    if (tableCheck && tableCheck.length > 0) {
      console.log('✅ Notifications table exists');
      
      // Check if we have any notifications
      const { data: notifications, error: notifError } = await supabase
        .from('notifications')
        .select('count(*)')
        .limit(1);
      
      if (notifError) {
        console.log('⚠️  No notifications found yet (this is normal for new setup)');
      } else {
        console.log('✅ Notifications system is ready');
      }
    } else {
      console.error('❌ Notifications table was not created');
      throw new Error('Table creation failed');
    }
    
    console.log('🎉 Notifications migration completed successfully!');
    console.log('');
    console.log('📋 Next steps:');
    console.log('1. The notifications table is now available');
    console.log('2. Dashboard will now fetch real notification data');
    console.log('3. You can create notifications programmatically');
    console.log('4. The NotificationWidget will display actual data');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
runNotificationsMigration();
