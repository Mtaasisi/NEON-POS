#!/usr/bin/env node

/**
 * Apply comprehensive schema fixes for all 400 errors found during testing
 */

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

const sql = neon(DATABASE_URL);

async function applySchemaFixes() {
  console.log('🔧 Starting comprehensive schema fixes...\n');
  
  try {
    let successCount = 0;
    let errorCount = 0;
    
    // Fix 1: WhatsApp instances - add user_id
    console.log('📱 Fix 1: Adding user_id to whatsapp_instances_comprehensive...');
    try {
      await sql`
        DO $$ 
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'whatsapp_instances_comprehensive' 
                AND column_name = 'user_id'
            ) THEN
                ALTER TABLE whatsapp_instances_comprehensive 
                ADD COLUMN user_id UUID;
            END IF;
        END $$;
      `;
      console.log('   ✅ Success\n');
      successCount++;
    } catch (err) {
      console.error(`   ❌ Error: ${err.message}\n`);
      errorCount++;
    }
    
    // Fix 2: Devices - add assigned_to
    console.log('🔧 Fix 2: Adding assigned_to to devices...');
    try {
      await sql`
        DO $$ 
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'devices' 
                AND column_name = 'assigned_to'
            ) THEN
                ALTER TABLE devices 
                ADD COLUMN assigned_to UUID;
            END IF;
        END $$;
      `;
      console.log('   ✅ Success\n');
      successCount++;
    } catch (err) {
      console.error(`   ❌ Error: ${err.message}\n`);
      errorCount++;
    }
    
    // Fix 3: Devices - add issue_description
    console.log('📝 Fix 3: Adding issue_description to devices...');
    try {
      await sql`
        DO $$ 
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'devices' 
                AND column_name = 'issue_description'
            ) THEN
                ALTER TABLE devices 
                ADD COLUMN issue_description TEXT;
            END IF;
        END $$;
      `;
      console.log('   ✅ Success\n');
      successCount++;
    } catch (err) {
      console.error(`   ❌ Error: ${err.message}\n`);
      errorCount++;
    }
    
    // Fix 4: user_daily_goals - add is_active
    console.log('✓ Fix 4: Adding is_active to user_daily_goals...');
    try {
      await sql`
        DO $$ 
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'user_daily_goals' 
                AND column_name = 'is_active'
            ) THEN
                ALTER TABLE user_daily_goals 
                ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
                
                UPDATE user_daily_goals SET is_active = TRUE WHERE is_active IS NULL;
            END IF;
        END $$;
      `;
      console.log('   ✅ Success\n');
      successCount++;
    } catch (err) {
      console.error(`   ❌ Error: ${err.message}\n`);
      errorCount++;
    }
    
    // Fix 5: user_daily_goals - fix unique constraint
    console.log('🔑 Fix 5: Fixing unique constraint on user_daily_goals...');
    try {
      await sql`
        DO $$ 
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.table_constraints 
                WHERE table_name = 'user_daily_goals' 
                AND constraint_name = 'user_daily_goals_user_id_date_key'
            ) THEN
                ALTER TABLE user_daily_goals 
                DROP CONSTRAINT user_daily_goals_user_id_date_key;
            END IF;
            
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.table_constraints 
                WHERE table_name = 'user_daily_goals' 
                AND constraint_name = 'user_daily_goals_user_id_date_goal_type_key'
            ) THEN
                ALTER TABLE user_daily_goals 
                ADD CONSTRAINT user_daily_goals_user_id_date_goal_type_key 
                UNIQUE (user_id, date, goal_type);
            END IF;
        END $$;
      `;
      console.log('   ✅ Success\n');
      successCount++;
    } catch (err) {
      console.error(`   ❌ Error: ${err.message}\n`);
      errorCount++;
    }
    
    // Create indexes for better performance
    console.log('📊 Creating indexes...');
    try {
      await sql`CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_user_id ON whatsapp_instances_comprehensive(user_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_devices_assigned_to ON devices(assigned_to)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_user_daily_goals_active ON user_daily_goals(user_id, date, is_active) WHERE is_active = TRUE`;
      console.log('   ✅ Indexes created\n');
      successCount++;
    } catch (err) {
      console.error(`   ❌ Error creating indexes: ${err.message}\n`);
      errorCount++;
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${errorCount}`);
    console.log(`📋 Total fixes: 6`);
    console.log('='.repeat(60));
    
    if (errorCount === 0) {
      console.log('\n🎉 All schema fixes applied successfully!');
    } else {
      console.log('\n⚠️  Some fixes failed. Please review the errors above.');
    }
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

// Run the fixes
applySchemaFixes().catch(console.error);

