#!/usr/bin/env node

/**
 * Check for Trade-In Transactions That Haven't Been Added to Inventory
 */

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.VITE_DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ Missing DATABASE_URL');
  console.error('Please set VITE_DATABASE_URL in your .env file');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function checkPendingTradeIns() {
  console.log('\n🔍 Checking for pending trade-in transactions...\n');

  try {
    // Find trade-in transactions that don't have an inventory_item_id
    const pendingTradeIns = await sql`
      SELECT 
        t.id,
        t.transaction_number,
        t.device_name,
        t.device_model,
        t.device_imei,
        t.condition_rating,
        t.final_trade_in_value,
        t.needs_repair,
        t.inventory_item_id,
        t.created_at,
        c.name as customer_name,
        c.phone as customer_phone
      FROM lats_trade_in_transactions t
      LEFT JOIN lats_customers c ON t.customer_id = c.id
      WHERE t.inventory_item_id IS NULL
        AND t.status = 'completed'
      ORDER BY t.created_at DESC
    `;

    if (!pendingTradeIns || pendingTradeIns.length === 0) {
      console.log('✅ No pending trade-ins found. All trade-ins have been added to inventory!');
      return;
    }

    console.log(`⚠️  Found ${pendingTradeIns.length} trade-in(s) NOT yet added to inventory:\n`);
    console.log('─'.repeat(100));

    pendingTradeIns.forEach((tradeIn, index) => {
      console.log(`\n${index + 1}. Transaction: ${tradeIn.transaction_number || tradeIn.id}`);
      console.log(`   📱 Device: ${tradeIn.device_name} ${tradeIn.device_model}`);
      if (tradeIn.device_imei) {
        console.log(`   🔢 IMEI: ${tradeIn.device_imei}`);
      }
      console.log(`   ⭐ Condition: ${tradeIn.condition_rating?.toUpperCase() || 'N/A'}`);
      console.log(`   💰 Trade-In Value: ${Number(tradeIn.final_trade_in_value || 0).toLocaleString()} TZS`);
      console.log(`   🔧 Needs Repair: ${tradeIn.needs_repair ? 'Yes ⚠️' : 'No'}`);
      if (tradeIn.customer_name) {
        console.log(`   👤 Customer: ${tradeIn.customer_name} (${tradeIn.customer_phone || 'N/A'})`);
      }
      console.log(`   📅 Date: ${new Date(tradeIn.created_at).toLocaleString()}`);
    });

    console.log('\n' + '─'.repeat(100));
    console.log('\n📋 NEXT STEPS:');
    console.log('   1. Open POS system');
    console.log('   2. Complete a trade-in sale');
    console.log('   3. After payment, the Pricing Modal will open');
    console.log('   4. Set selling price and click "Confirm & Add to Inventory"');
    console.log('\n   OR run: node add-pending-trade-ins-to-inventory.mjs (automated fix)\n');

  } catch (error) {
    console.error('❌ Error:', error?.message || error);
  }
}

checkPendingTradeIns();

