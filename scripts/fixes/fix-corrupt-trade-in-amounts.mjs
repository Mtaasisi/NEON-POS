#!/usr/bin/env node
/**
 * Fix corrupt trade-in amounts in the database
 * Identifies and optionally fixes unrealistic amounts
 */

import pg from 'pg';
const { Client } = pg;

const MAX_REALISTIC_AMOUNT = 1_000_000_000_000; // 1 trillion

async function main() {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('❌ DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Check for corrupt amounts in lats_trade_in_transactions
    console.log('🔍 Checking lats_trade_in_transactions for corrupt amounts...\n');
    
    const corruptQuery = `
      SELECT 
        id,
        transaction_number,
        device_name,
        final_trade_in_value,
        total_damage_deductions,
        estimated_market_value,
        status,
        created_at
      FROM lats_trade_in_transactions
      WHERE 
        ABS(final_trade_in_value) > $1
        OR ABS(total_damage_deductions) > $1
        OR ABS(estimated_market_value) > $1
        OR NOT (final_trade_in_value = final_trade_in_value) -- Check for NaN
        OR NOT (total_damage_deductions = total_damage_deductions)
        OR NOT (estimated_market_value = estimated_market_value)
      ORDER BY created_at DESC;
    `;

    const result = await client.query(corruptQuery, [MAX_REALISTIC_AMOUNT]);
    
    if (result.rows.length === 0) {
      console.log('✅ No corrupt trade-in amounts found!');
      return;
    }

    console.log(`⚠️  Found ${result.rows.length} transactions with corrupt amounts:\n`);
    
    for (const row of result.rows) {
      console.log(`Transaction: ${row.transaction_number} (ID: ${row.id})`);
      console.log(`  Device: ${row.device_name}`);
      console.log(`  Status: ${row.status}`);
      console.log(`  Created: ${row.created_at}`);
      console.log(`  Final Value: ${row.final_trade_in_value}`);
      console.log(`  Damage Deductions: ${row.total_damage_deductions}`);
      console.log(`  Market Value: ${row.estimated_market_value}`);
      console.log('');
    }

    // Ask user if they want to fix
    console.log('\n⚠️  WARNING: Corrupt amounts detected!');
    console.log('\nOptions to fix:');
    console.log('1. Set corrupt amounts to 0 (safe, but loses data)');
    console.log('2. Delete corrupt transactions (if they are test data)');
    console.log('3. Manual review required (export data and fix manually)');
    console.log('\nTo fix automatically, run:');
    console.log('  node fix-corrupt-trade-in-amounts.mjs --fix-zero');
    console.log('  node fix-corrupt-trade-in-amounts.mjs --delete');
    
    // Check if user wants to fix
    if (process.argv.includes('--fix-zero')) {
      console.log('\n🔧 Setting corrupt amounts to 0...');
      
      const fixQuery = `
        UPDATE lats_trade_in_transactions
        SET 
          final_trade_in_value = CASE 
            WHEN ABS(final_trade_in_value) > $1 OR NOT (final_trade_in_value = final_trade_in_value) 
            THEN 0 
            ELSE final_trade_in_value 
          END,
          total_damage_deductions = CASE 
            WHEN ABS(total_damage_deductions) > $1 OR NOT (total_damage_deductions = total_damage_deductions) 
            THEN 0 
            ELSE total_damage_deductions 
          END,
          estimated_market_value = CASE 
            WHEN ABS(estimated_market_value) > $1 OR NOT (estimated_market_value = estimated_market_value) 
            THEN 0 
            ELSE estimated_market_value 
          END
        WHERE 
          ABS(final_trade_in_value) > $1
          OR ABS(total_damage_deductions) > $1
          OR ABS(estimated_market_value) > $1
          OR NOT (final_trade_in_value = final_trade_in_value)
          OR NOT (total_damage_deductions = total_damage_deductions)
          OR NOT (estimated_market_value = estimated_market_value);
      `;
      
      const fixResult = await client.query(fixQuery, [MAX_REALISTIC_AMOUNT]);
      console.log(`✅ Fixed ${fixResult.rowCount} transactions`);
    } else if (process.argv.includes('--delete')) {
      console.log('\n🗑️  Deleting corrupt transactions...');
      
      const deleteQuery = `
        DELETE FROM lats_trade_in_transactions
        WHERE 
          ABS(final_trade_in_value) > $1
          OR ABS(total_damage_deductions) > $1
          OR ABS(estimated_market_value) > $1
          OR NOT (final_trade_in_value = final_trade_in_value)
          OR NOT (total_damage_deductions = total_damage_deductions)
          OR NOT (estimated_market_value = estimated_market_value);
      `;
      
      const deleteResult = await client.query(deleteQuery, [MAX_REALISTIC_AMOUNT]);
      console.log(`✅ Deleted ${deleteResult.rowCount} corrupt transactions`);
    }

    // Also check contracts table
    console.log('\n🔍 Checking lats_trade_in_contracts for corrupt amounts...\n');
    
    const contractQuery = `
      SELECT 
        id,
        contract_number,
        payment_method,
        payment_amount,
        balance_remaining,
        trade_in_credit_used,
        status,
        created_at
      FROM lats_trade_in_contracts
      WHERE 
        ABS(payment_amount) > $1
        OR ABS(COALESCE(balance_remaining, 0)) > $1
        OR ABS(COALESCE(trade_in_credit_used, 0)) > $1
        OR NOT (payment_amount = payment_amount)
      ORDER BY created_at DESC;
    `;

    const contractResult = await client.query(contractQuery, [MAX_REALISTIC_AMOUNT]);
    
    if (contractResult.rows.length > 0) {
      console.log(`⚠️  Found ${contractResult.rows.length} contracts with corrupt amounts:\n`);
      
      for (const row of contractResult.rows) {
        console.log(`Contract: ${row.contract_number} (ID: ${row.id})`);
        console.log(`  Status: ${row.status}`);
        console.log(`  Payment Method: ${row.payment_method}`);
        console.log(`  Payment Amount: ${row.payment_amount}`);
        console.log(`  Balance Remaining: ${row.balance_remaining}`);
        console.log(`  Trade-in Credit: ${row.trade_in_credit_used}`);
        console.log('');
      }
      
      if (process.argv.includes('--fix-zero')) {
        console.log('\n🔧 Setting corrupt contract amounts to 0...');
        
        const fixContractQuery = `
          UPDATE lats_trade_in_contracts
          SET 
            payment_amount = CASE 
              WHEN ABS(payment_amount) > $1 OR NOT (payment_amount = payment_amount) 
              THEN 0 
              ELSE payment_amount 
            END,
            balance_remaining = CASE 
              WHEN ABS(COALESCE(balance_remaining, 0)) > $1 OR NOT (balance_remaining = balance_remaining) 
              THEN 0 
              ELSE balance_remaining 
            END,
            trade_in_credit_used = CASE 
              WHEN ABS(COALESCE(trade_in_credit_used, 0)) > $1 OR NOT (trade_in_credit_used = trade_in_credit_used) 
              THEN 0 
              ELSE trade_in_credit_used 
            END
          WHERE 
            ABS(payment_amount) > $1
            OR ABS(COALESCE(balance_remaining, 0)) > $1
            OR ABS(COALESCE(trade_in_credit_used, 0)) > $1
            OR NOT (payment_amount = payment_amount);
        `;
        
        const fixContractResult = await client.query(fixContractQuery, [MAX_REALISTIC_AMOUNT]);
        console.log(`✅ Fixed ${fixContractResult.rowCount} contracts`);
      }
    } else {
      console.log('✅ No corrupt contract amounts found!');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();

