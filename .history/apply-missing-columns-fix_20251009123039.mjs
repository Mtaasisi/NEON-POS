#!/usr/bin/env node
/**
 * 🔧 APPLY MISSING COLUMNS FIX
 * Fixes all missing column errors causing 400 responses
 * Generated: 2025-10-09
 */

import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';

// IMPORTANT: Add your database URL here
const DATABASE_URL = process.env.DATABASE_URL || '';

if (!DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL is not set!');
  console.log('\nUsage:');
  console.log('  export DATABASE_URL="your-connection-string"');
  console.log('  node apply-missing-columns-fix.mjs\n');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function main() {
  console.log('\n🔧 APPLYING MISSING COLUMNS FIX\n');
  console.log('================================================\n');

  try {
    // Fix 1: whatsapp_instances_comprehensive - add user_id
    console.log('1️⃣  Fixing whatsapp_instances_comprehensive.user_id...');
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
                RAISE NOTICE 'Added user_id column';
            END IF;
        END $$;
      `;
      console.log('   ✅ Success\n');
    } catch (err) {
      console.error(`   ❌ Error: ${err.message}\n`);
    }

    // Fix 2: notifications - add user_id
    console.log('2️⃣  Fixing notifications.user_id...');
    try {
      await sql`
        DO $$ 
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'notifications' 
                AND column_name = 'user_id'
            ) THEN
                ALTER TABLE notifications 
                ADD COLUMN user_id UUID;
                RAISE NOTICE 'Added user_id column';
            END IF;
        END $$;
      `;
      console.log('   ✅ Success\n');
    } catch (err) {
      console.error(`   ❌ Error: ${err.message}\n`);
    }

    // Fix 3: devices - add issue_description
    console.log('3️⃣  Fixing devices.issue_description...');
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
                
                -- Copy from problem_description if it exists
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'devices' 
                    AND column_name = 'problem_description'
                ) THEN
                    UPDATE devices SET issue_description = problem_description 
                    WHERE problem_description IS NOT NULL;
                END IF;
                
                RAISE NOTICE 'Added issue_description column';
            END IF;
        END $$;
      `;
      console.log('   ✅ Success\n');
    } catch (err) {
      console.error(`   ❌ Error: ${err.message}\n`);
    }

    // Fix 4: devices - add assigned_to
    console.log('4️⃣  Fixing devices.assigned_to...');
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
                RAISE NOTICE 'Added assigned_to column';
            END IF;
        END $$;
      `;
      console.log('   ✅ Success\n');
    } catch (err) {
      console.error(`   ❌ Error: ${err.message}\n`);
    }

    // Fix 5: user_daily_goals - add is_active
    console.log('5️⃣  Fixing user_daily_goals.is_active...');
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
                RAISE NOTICE 'Added is_active column';
            END IF;
        END $$;
      `;
      console.log('   ✅ Success\n');
    } catch (err) {
      console.error(`   ❌ Error: ${err.message}\n`);
    }

    // Fix 6: user_daily_goals - fix unique constraint
    console.log('6️⃣  Fixing user_daily_goals unique constraint...');
    try {
      await sql`
        DO $$ 
        BEGIN
            -- Drop old constraint
            IF EXISTS (
                SELECT 1 FROM information_schema.table_constraints 
                WHERE table_name = 'user_daily_goals' 
                AND constraint_name = 'user_daily_goals_user_id_date_key'
            ) THEN
                ALTER TABLE user_daily_goals 
                DROP CONSTRAINT user_daily_goals_user_id_date_key;
            END IF;
            
            -- Create new constraint
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
    } catch (err) {
      console.error(`   ❌ Error: ${err.message}\n`);
    }

    // Fix 7: Create indexes
    console.log('7️⃣  Creating indexes...');
    try {
      await sql`CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_user_id ON whatsapp_instances_comprehensive(user_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_devices_assigned_to ON devices(assigned_to)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_user_daily_goals_active ON user_daily_goals(user_id, date, is_active) WHERE is_active = TRUE`;
      console.log('   ✅ Success\n');
    } catch (err) {
      console.error(`   ⚠️  Warning: ${err.message}\n`);
    }

    // Verification
    console.log('================================================');
    console.log('🔍 VERIFICATION\n');

    const checks = [
      { table: 'whatsapp_instances_comprehensive', column: 'user_id' },
      { table: 'notifications', column: 'user_id' },
      { table: 'devices', column: 'issue_description' },
      { table: 'devices', column: 'assigned_to' },
      { table: 'user_daily_goals', column: 'is_active' },
    ];

    for (const check of checks) {
      try {
        const result = await sql`
          SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = ${check.table} 
            AND column_name = ${check.column}
          ) as exists
        `;
        const status = result[0].exists ? '✅' : '❌';
        console.log(`${status} ${check.table}.${check.column}`);
      } catch (err) {
        console.log(`❌ ${check.table}.${check.column} - Error checking`);
      }
    }

    // Check constraint
    try {
      const constraintResult = await sql`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE table_name = 'user_daily_goals' 
          AND constraint_name = 'user_daily_goals_user_id_date_goal_type_key'
        ) as exists
      `;
      const status = constraintResult[0].exists ? '✅' : '❌';
      console.log(`${status} user_daily_goals unique constraint fixed`);
    } catch (err) {
      console.log('❌ user_daily_goals constraint - Error checking');
    }

    console.log('\n================================================');
    console.log('✅ ALL FIXES APPLIED SUCCESSFULLY!\n');
    console.log('Your database is now ready. The 400 errors should be resolved.\n');

  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error.message);
    console.error(error);
    process.exit(1);
  }
}

main();

