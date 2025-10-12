#!/usr/bin/env node
/**
 * 🔍 FINAL DATABASE CHECK
 * Shows exactly what's in the database
 */

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function main() {
  console.log('\n📊 FINAL DATABASE STATUS REPORT\n');
  console.log('='.repeat(60));
  
  const sql = neon(DATABASE_URL);
  
  try {
    // Check all critical tables
    const tables = await sql`
      SELECT 
        table_name,
        (SELECT COUNT(*) FROM information_schema.columns WHERE c.table_name = columns.table_name) as column_count
      FROM information_schema.tables c
      WHERE table_schema = 'public' 
      AND table_name IN (
        'settings', 
        'notifications', 
        'whatsapp_instances_comprehensive',
        'finance_accounts',
        'devices',
        'customers',
        'user_daily_goals'
      )
      ORDER BY table_name
    `;
    
    console.log('\n📋 CRITICAL TABLES:');
    console.log('─'.repeat(60));
    for (const table of tables) {
      console.log(`✅ ${table.table_name.padEnd(40)} (${table.column_count} columns)`);
    }
    
    // Check specific columns in devices
    const deviceCols = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'devices'
      AND column_name IN (
        'issue_description', 'assigned_to', 'expected_return_date',
        'estimated_hours', 'diagnosis_required', 'device_notes',
        'device_cost', 'repair_cost', 'repair_price'
      )
      ORDER BY column_name
    `;
    
    console.log('\n📋 DEVICES TABLE - Critical Columns:');
    console.log('─'.repeat(60));
    if (deviceCols.length > 0) {
      for (const col of deviceCols) {
        console.log(`✅ ${col.column_name.padEnd(30)} (${col.data_type})`);
      }
    } else {
      console.log('❌ NO CRITICAL COLUMNS FOUND!');
    }
    
    // Check finance_accounts columns
    const financeCols = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'finance_accounts'
      AND column_name IN ('is_payment_method', 'name')
      ORDER BY column_name
    `;
    
    console.log('\n📋 FINANCE_ACCOUNTS TABLE - Critical Columns:');
    console.log('─'.repeat(60));
    if (financeCols.length > 0) {
      for (const col of financeCols) {
        console.log(`✅ ${col.column_name.padEnd(30)} (${col.data_type})`);
      }
    } else {
      console.log('❌ NO CRITICAL COLUMNS FOUND!');
    }
    
    // Check customers columns
    const customerCols = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'customers'
      AND column_name = 'profile_image'
    `;
    
    console.log('\n📋 CUSTOMERS TABLE - Critical Columns:');
    console.log('─'.repeat(60));
    if (customerCols.length > 0) {
      for (const col of customerCols) {
        console.log(`✅ ${col.column_name.padEnd(30)} (${col.data_type})`);
      }
    } else {
      console.log('❌ profile_image column NOT FOUND!');
    }
    
    // Check user_daily_goals columns
    const goalCols = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'user_daily_goals'
      AND column_name IN ('goal_type', 'is_active')
      ORDER BY column_name
    `;
    
    console.log('\n📋 USER_DAILY_GOALS TABLE - Critical Columns:');
    console.log('─'.repeat(60));
    if (goalCols.length > 0) {
      for (const col of goalCols) {
        console.log(`✅ ${col.column_name.padEnd(30)} (${col.data_type})`);
      }
    } else {
      console.log('❌ NO CRITICAL COLUMNS FOUND!');
    }
    
    // Count rows in settings
    const settingsCount = await sql`SELECT COUNT(*) as count FROM settings`;
    console.log('\n📊 DATA CHECK:');
    console.log('─'.repeat(60));
    console.log(`settings table has ${settingsCount[0].count} rows`);
    
    console.log('\n' + '='.repeat(60));
    console.log('\n✅ DATABASE SCAN COMPLETE!\n');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

main();

