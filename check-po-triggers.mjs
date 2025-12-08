#!/usr/bin/env node

/**
 * Check if purchase order isolation triggers are in place
 */

import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env.production') });

const DATABASE_URL = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

if (!DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL or SUPABASE_DB_URL not found in environment variables');
  process.exit(1);
}

async function checkTriggers() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: DATABASE_URL.includes('supabase') ? { rejectUnauthorized: false } : false,
  });

  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected to database\n');

    // Check triggers
    const triggerResult = await client.query(`
      SELECT 
        trigger_name,
        event_manipulation,
        event_object_table,
        action_statement
      FROM information_schema.triggers
      WHERE trigger_name IN (
        'ensure_purchase_order_isolation',
        'ensure_purchase_order_payment_isolation'
      )
      ORDER BY event_object_table, trigger_name
    `);

    console.log('📋 Purchase Order Isolation Triggers:');
    console.log('=====================================\n');

    if (triggerResult.rows.length === 0) {
      console.log('❌ No triggers found!\n');
    } else {
      triggerResult.rows.forEach((row, index) => {
        console.log(`${index + 1}. ${row.trigger_name}`);
        console.log(`   Table: ${row.event_object_table}`);
        console.log(`   Event: ${row.event_manipulation}`);
        console.log('');
      });
    }

    // Check if purchase_order_payments has branch_id column
    const columnResult = await client.query(`
      SELECT 
        column_name,
        data_type,
        is_nullable
      FROM information_schema.columns
      WHERE table_name = 'purchase_order_payments'
        AND column_name = 'branch_id'
    `);

    console.log('📊 Purchase Order Payments Table:');
    console.log('================================\n');
    
    if (columnResult.rows.length > 0) {
      console.log('✅ branch_id column exists');
      console.log(`   Type: ${columnResult.rows[0].data_type}`);
      console.log(`   Nullable: ${columnResult.rows[0].is_nullable}\n`);
    } else {
      console.log('❌ branch_id column is MISSING!\n');
      console.log('⚠️  The purchase_order_payments table needs a branch_id column for isolation.');
      console.log('   You may need to add it with:');
      console.log('   ALTER TABLE purchase_order_payments ADD COLUMN branch_id UUID REFERENCES store_locations(id);\n');
    }

    // Summary
    console.log('📝 Summary:');
    console.log('==========\n');
    
    const poTriggerExists = triggerResult.rows.some(r => r.trigger_name === 'ensure_purchase_order_isolation');
    const poPaymentTriggerExists = triggerResult.rows.some(r => r.trigger_name === 'ensure_purchase_order_payment_isolation');
    const branchIdColumnExists = columnResult.rows.length > 0;

    console.log(`Purchase Order Trigger:        ${poTriggerExists ? '✅' : '❌'}`);
    console.log(`Purchase Order Payment Trigger: ${poPaymentTriggerExists ? '✅' : '❌'}`);
    console.log(`branch_id Column:              ${branchIdColumnExists ? '✅' : '❌'}\n`);

    if (poTriggerExists && poPaymentTriggerExists && branchIdColumnExists) {
      console.log('✅ All purchase order isolation components are in place!');
    } else {
      console.log('⚠️  Some components are missing. Please run ENSURE_PURCHASE_ORDERS_ALWAYS_ISOLATED.sql');
    }

  } catch (error) {
    console.error('❌ Error checking triggers:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the script
checkTriggers().catch(console.error);
