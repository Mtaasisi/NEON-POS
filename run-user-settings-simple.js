#!/usr/bin/env node

/**
 * Simple User Settings Migration Runner
 * Creates the user_settings table step by step
 */

import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';

// Database URL from database-config.json
const configPath = path.join(process.cwd(), 'database-config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const DATABASE_URL = config.url;

console.log('🔧 Running Simple User Settings Migration...');
console.log('📊 Database URL:', DATABASE_URL.substring(0, 50) + '...');

// Create Neon client
const sql = neon(DATABASE_URL);

async function runMigration() {
  try {
    console.log('🚀 Creating user_settings table...');
    
    // Step 1: Create the table
    await sql`
      CREATE TABLE IF NOT EXISTS user_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        settings JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    console.log('✅ Table created');
    
    // Step 2: Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_user_settings_updated_at ON user_settings(updated_at)`;
    console.log('✅ Indexes created');
    
    // Step 3: Create trigger function
    await sql`
      CREATE OR REPLACE FUNCTION update_user_settings_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `;
    console.log('✅ Trigger function created');
    
    // Step 4: Create trigger
    await sql`
      DROP TRIGGER IF EXISTS trigger_user_settings_updated_at ON user_settings
    `;
    await sql`
      CREATE TRIGGER trigger_user_settings_updated_at
          BEFORE UPDATE ON user_settings
          FOR EACH ROW
          EXECUTE FUNCTION update_user_settings_updated_at()
    `;
    console.log('✅ Trigger created');
    
    // Step 5: Enable RLS
    await sql`ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY`;
    console.log('✅ RLS enabled');
    
    // Step 6: Create policies
    await sql`
      DROP POLICY IF EXISTS "Users can view their own settings" ON user_settings
    `;
    await sql`
      CREATE POLICY "Users can view their own settings" ON user_settings
          FOR SELECT USING (true)
    `;
    
    await sql`
      DROP POLICY IF EXISTS "Users can insert their own settings" ON user_settings
    `;
    await sql`
      CREATE POLICY "Users can insert their own settings" ON user_settings
          FOR INSERT WITH CHECK (true)
    `;
    
    await sql`
      DROP POLICY IF EXISTS "Users can update their own settings" ON user_settings
    `;
    await sql`
      CREATE POLICY "Users can update their own settings" ON user_settings
          FOR UPDATE USING (true)
    `;
    
    await sql`
      DROP POLICY IF EXISTS "Users can delete their own settings" ON user_settings
    `;
    await sql`
      CREATE POLICY "Users can delete their own settings" ON user_settings
          FOR DELETE USING (true)
    `;
    console.log('✅ RLS policies created');
    
    // Step 7: Grant permissions
    await sql`GRANT ALL ON user_settings TO authenticated`;
    await sql`GRANT ALL ON user_settings TO service_role`;
    console.log('✅ Permissions granted');
    
    console.log('✅ User settings table created successfully!');
    
    // Test the table creation
    console.log('🧪 Testing table access...');
    const testResult = await sql`SELECT COUNT(*) as count FROM user_settings`;
    console.log('✅ Table test successful:', testResult);
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    
    // Check if table already exists
    if (error.message.includes('already exists')) {
      console.log('ℹ️ Table already exists, checking structure...');
      try {
        const checkResult = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'user_settings'`;
        console.log('📋 Table structure:', checkResult);
        console.log('✅ User settings table is ready!');
      } catch (checkError) {
        console.error('❌ Could not verify table structure:', checkError.message);
      }
    }
  }
}

runMigration().then(() => {
  console.log('🎉 Migration process completed!');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Migration process failed:', error);
  process.exit(1);
});
