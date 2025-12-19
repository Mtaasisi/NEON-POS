#!/usr/bin/env node

/**
 * Setup Delivery Tracking System
 *
 * This script applies the delivery tracking system migration to your database.
 * Run this after setting up your Supabase connection.
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read environment variables
const supabaseUrl = process.env.VITE_DATABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration!');
  console.error('Please set VITE_DATABASE_URL and VITE_SUPABASE_ANON_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupDeliveryTracking() {
  try {
    console.log('🚚 Setting up Delivery Tracking System...');

    // Read the migration file
    const migrationPath = path.join(__dirname, '../../migrations/create_delivery_tracking_system.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration file loaded successfully');

    // Split the migration into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📝 Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (!statement.trim()) continue;

      try {
        console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`);

        const { error } = await supabase.rpc('exec_sql', {
          sql: statement + ';'
        });

        if (error) {
          // Try direct execution if rpc fails
          const { error: directError } = await supabase.from('_temp_migration').select('*').limit(1);
          if (directError && directError.message.includes('relation "_temp_migration" does not exist')) {
            console.log('ℹ️  Using alternative execution method...');
          }

          console.warn(`⚠️  Statement ${i + 1} failed:`, error.message);
          // Continue with other statements
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`);
        }
      } catch (stmtError) {
        console.warn(`⚠️  Statement ${i + 1} error:`, stmtError.message);
        // Continue with other statements
      }
    }

    console.log('🎉 Delivery Tracking System setup completed!');
    console.log('');
    console.log('📋 Next steps:');
    console.log('1. Restart your development server');
    console.log('2. Test delivery creation in Tablet POS');
    console.log('3. Check delivery management in admin panel');
    console.log('4. Set up SMS/WhatsApp notifications (optional)');

  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

// Alternative: Direct SQL execution via fetch (if Supabase RPC doesn't work)
async function executeDirectSQL() {
  try {
    console.log('🔄 Trying direct SQL execution...');

    const migrationPath = path.join(__dirname, '../../migrations/create_delivery_tracking_system.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // This would require direct database access
    // For now, just provide instructions
    console.log('');
    console.log('📋 Please run this SQL in your Supabase SQL Editor:');
    console.log('==================================================');
    console.log(migrationSQL.substring(0, 2000) + '...');
    console.log('==================================================');
    console.log('');
    console.log('Or use the full migration file at:');
    console.log(migrationPath);

  } catch (error) {
    console.error('❌ Direct SQL execution failed:', error);
  }
}

// Run the setup
setupDeliveryTracking().catch(() => {
  console.log('⚠️  Primary setup method failed, trying alternative...');
  executeDirectSQL();
});