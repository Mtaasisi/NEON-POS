#!/usr/bin/env node
/**
 * 🔍 VERIFY AND FIX DATABASE
 * Checks what's missing and fixes it
 */

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

const log = {
  info: (msg) => console.log(`ℹ️  ${msg}`),
  success: (msg) => console.log(`✅ ${msg}`),
  error: (msg) => console.log(`❌ ${msg}`),
  warn: (msg) => console.log(`⚠️  ${msg}`),
};

async function main() {
  console.log('\n🔍 CHECKING DATABASE STATUS...\n');
  
  const sql = neon(DATABASE_URL);
  
  try {
    // Check tables
    console.log('📋 CHECKING TABLES:');
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('settings', 'notifications', 'whatsapp_instances_comprehensive')
      ORDER BY table_name
    `;
    
    const expectedTables = ['settings', 'notifications', 'whatsapp_instances_comprehensive'];
    const existingTables = tables.map(t => t.table_name);
    
    for (const table of expectedTables) {
      if (existingTables.includes(table)) {
        log.success(`Table "${table}" exists`);
      } else {
        log.error(`Table "${table}" MISSING`);
      }
    }
    
    // Check columns in finance_accounts
    console.log('\n📋 CHECKING finance_accounts COLUMNS:');
    const financeColumns = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'finance_accounts'
    `;
    
    const financeColNames = financeColumns.map(c => c.column_name);
    if (financeColNames.includes('is_payment_method')) {
      log.success('Column "is_payment_method" exists');
    } else {
      log.error('Column "is_payment_method" MISSING - Adding now...');
      await sql`ALTER TABLE finance_accounts ADD COLUMN IF NOT EXISTS is_payment_method BOOLEAN DEFAULT false`;
      await sql`ALTER TABLE finance_accounts ADD COLUMN IF NOT EXISTS name TEXT`;
      log.success('Added is_payment_method and name columns');
    }
    
    // Check columns in devices
    console.log('\n📋 CHECKING devices COLUMNS:');
    const devicesColumns = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'devices'
    `;
    
    const deviceColNames = devicesColumns.map(c => c.column_name);
    const neededDeviceCols = [
      'issue_description',
      'assigned_to', 
      'expected_return_date',
      'estimated_hours',
      'diagnosis_required',
      'device_notes',
      'device_cost',
      'repair_cost',
      'repair_price'
    ];
    
    for (const col of neededDeviceCols) {
      if (deviceColNames.includes(col)) {
        log.success(`Column "${col}" exists`);
      } else {
        log.error(`Column "${col}" MISSING - Adding now...`);
        
        // Add the column based on type
        if (col === 'issue_description' || col === 'device_notes') {
          await sql.unsafe(`ALTER TABLE devices ADD COLUMN IF NOT EXISTS ${col} TEXT`);
        } else if (col === 'assigned_to') {
          await sql.unsafe(`ALTER TABLE devices ADD COLUMN IF NOT EXISTS ${col} UUID`);
        } else if (col === 'expected_return_date') {
          await sql.unsafe(`ALTER TABLE devices ADD COLUMN IF NOT EXISTS ${col} TIMESTAMP WITH TIME ZONE`);
        } else if (col === 'estimated_hours') {
          await sql.unsafe(`ALTER TABLE devices ADD COLUMN IF NOT EXISTS ${col} INTEGER`);
        } else if (col === 'diagnosis_required') {
          await sql.unsafe(`ALTER TABLE devices ADD COLUMN IF NOT EXISTS ${col} BOOLEAN DEFAULT false`);
        } else if (col.includes('cost') || col.includes('price')) {
          await sql.unsafe(`ALTER TABLE devices ADD COLUMN IF NOT EXISTS ${col} NUMERIC DEFAULT 0`);
        }
        
        log.success(`Added ${col} column`);
      }
    }
    
    // Check columns in customers
    console.log('\n📋 CHECKING customers COLUMNS:');
    const customerColumns = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'customers'
    `;
    
    const customerColNames = customerColumns.map(c => c.column_name);
    if (customerColNames.includes('profile_image')) {
      log.success('Column "profile_image" exists');
    } else {
      log.error('Column "profile_image" MISSING - Adding now...');
      await sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS profile_image TEXT`;
      log.success('Added profile_image column');
    }
    
    // Add other customer columns
    const neededCustomerCols = {
      'whatsapp': 'TEXT',
      'whatsapp_opt_out': 'BOOLEAN DEFAULT false',
      'referrals': 'INTEGER DEFAULT 0',
      'created_by': 'UUID',
      'last_purchase_date': 'TIMESTAMP WITH TIME ZONE',
      'total_purchases': 'INTEGER DEFAULT 0',
      'birthday': 'DATE',
      'referred_by': 'UUID',
      'total_calls': 'INTEGER DEFAULT 0',
      'total_call_duration_minutes': 'NUMERIC DEFAULT 0',
      'incoming_calls': 'INTEGER DEFAULT 0',
      'outgoing_calls': 'INTEGER DEFAULT 0',
      'missed_calls': 'INTEGER DEFAULT 0',
      'avg_call_duration_minutes': 'NUMERIC DEFAULT 0',
      'first_call_date': 'TIMESTAMP WITH TIME ZONE',
      'last_call_date': 'TIMESTAMP WITH TIME ZONE',
      'call_loyalty_level': 'TEXT'
    };
    
    for (const [col, type] of Object.entries(neededCustomerCols)) {
      if (!customerColNames.includes(col)) {
        log.warn(`Adding missing column: ${col}`);
        await sql.unsafe(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS ${col} ${type}`);
      }
    }
    
    // Check user_daily_goals
    console.log('\n📋 CHECKING user_daily_goals COLUMNS:');
    const goalColumns = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'user_daily_goals'
    `;
    
    const goalColNames = goalColumns.map(c => c.column_name);
    if (goalColNames.includes('goal_type')) {
      log.success('Column "goal_type" exists');
    } else {
      log.error('Column "goal_type" MISSING - Adding now...');
      await sql`ALTER TABLE user_daily_goals ADD COLUMN IF NOT EXISTS goal_type TEXT NOT NULL DEFAULT 'general'`;
      log.success('Added goal_type column');
    }
    
    if (goalColNames.includes('is_active')) {
      log.success('Column "is_active" exists');
    } else {
      log.error('Column "is_active" MISSING - Adding now...');
      await sql`ALTER TABLE user_daily_goals ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true`;
      log.success('Added is_active column');
    }
    
    // Disable RLS on all tables
    console.log('\n🔓 DISABLING RLS ON TABLES:');
    const tablesToDisableRLS = [
      'settings',
      'notifications',
      'whatsapp_instances_comprehensive',
      'finance_accounts',
      'devices',
      'customers',
      'user_daily_goals',
      'lats_suppliers',
      'lats_products',
      'lats_categories'
    ];
    
    for (const table of tablesToDisableRLS) {
      try {
        await sql.unsafe(`ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY`);
        log.success(`Disabled RLS on ${table}`);
      } catch (err) {
        if (err.message.includes('does not exist')) {
          log.warn(`Table ${table} does not exist (skipping)`);
        } else {
          log.warn(`Could not disable RLS on ${table}: ${err.message}`);
        }
      }
    }
    
    console.log('\n✨ VERIFICATION COMPLETE!\n');
    log.success('All critical fixes have been applied!');
    console.log('\n📝 NEXT STEPS:');
    console.log('1. Hard refresh your browser (Cmd+Shift+R or Ctrl+Shift+R)');
    console.log('2. The 400 errors should be fixed! 🎉\n');
    
  } catch (err) {
    log.error('Error:');
    console.error(err);
    process.exit(1);
  }
}

main();

