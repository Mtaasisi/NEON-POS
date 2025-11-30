#!/usr/bin/env node
/**
 * Fix Corrupt Trade-In Amounts
 * 
 * This script identifies and optionally fixes trade-in transactions with
 * unrealistic amounts (> 1 trillion TZS) that are likely due to data corruption
 * or string concatenation bugs.
 */

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const sql = neon(process.env.VITE_DATABASE_URL);

const MAX_REALISTIC_AMOUNT = 1_000_000_000_000; // 1 trillion TZS

async function identifyCorruptData() {
  console.log('🔍 Scanning for corrupt data...\n');
  
  try {
    // Check trade-in transactions
    const corruptTransactions = await sql`
      SELECT 
        id,
        transaction_number,
        device_name,
        base_trade_in_price,
        final_trade_in_value,
        new_device_price,
        customer_payment_amount,
        created_at
      FROM lats_trade_in_transactions
      WHERE 
        ABS(final_trade_in_value) > ${MAX_REALISTIC_AMOUNT}
        OR ABS(new_device_price) > ${MAX_REALISTIC_AMOUNT}
        OR ABS(customer_payment_amount) > ${MAX_REALISTIC_AMOUNT}
        OR ABS(base_trade_in_price) > ${MAX_REALISTIC_AMOUNT}
      ORDER BY created_at DESC
    `;

    if (corruptTransactions.length === 0) {
      console.log('✅ No corrupt data found!');
      return [];
    }

    console.log(`❌ Found ${corruptTransactions.length} corrupt transaction(s):\n`);
    
    corruptTransactions.forEach((t, index) => {
      console.log(`${index + 1}. Transaction: ${t.transaction_number || t.id}`);
      console.log(`   Device: ${t.device_name}`);
      console.log(`   Base Price: ${t.base_trade_in_price}`);
      console.log(`   Final Value: ${t.final_trade_in_value}`);
      console.log(`   New Device Price: ${t.new_device_price}`);
      console.log(`   Customer Payment: ${t.customer_payment_amount}`);
      console.log(`   Created: ${t.created_at}`);
      console.log('');
    });

    return corruptTransactions;
  } catch (error) {
    console.error('❌ Error scanning for corrupt data:', error.message);
    throw error;
  }
}

async function analyzePattern(corruptValue) {
  // Try to detect if it's a string concatenation pattern
  const valueStr = String(corruptValue);
  
  // Check for repeated patterns
  const patterns = [];
  
  // Look for repeated sequences (e.g., "300000" repeated)
  for (let len = 3; len <= valueStr.length / 2; len++) {
    const chunk = valueStr.substring(0, len);
    if (valueStr.startsWith(chunk.repeat(Math.floor(valueStr.length / len)))) {
      patterns.push({
        type: 'repetition',
        chunk,
        suggestion: parseFloat(chunk)
      });
    }
  }
  
  // Check if it looks like a concatenation (e.g., "300000300000300000255000")
  // This could be multiple values stuck together
  const possibleNumbers = valueStr.match(/\d{3,}/g);
  if (possibleNumbers && possibleNumbers.length > 1) {
    patterns.push({
      type: 'concatenation',
      parts: possibleNumbers.map(n => parseFloat(n)),
      suggestion: parseFloat(possibleNumbers[0]) // Use first number as likely correct value
    });
  }
  
  return patterns;
}

async function suggestFixes(corruptTransactions) {
  console.log('\n📋 Suggested Fixes:\n');
  
  const fixes = [];
  
  for (const transaction of corruptTransactions) {
    const fix = {
      id: transaction.id,
      transaction_number: transaction.transaction_number,
      current: {},
      suggested: {}
    };
    
    // Analyze each corrupt field
    if (Math.abs(transaction.base_trade_in_price) > MAX_REALISTIC_AMOUNT) {
      const patterns = await analyzePattern(transaction.base_trade_in_price);
      fix.current.base_trade_in_price = transaction.base_trade_in_price;
      fix.suggested.base_trade_in_price = patterns[0]?.suggestion || 0;
    }
    
    if (Math.abs(transaction.final_trade_in_value) > MAX_REALISTIC_AMOUNT) {
      const patterns = await analyzePattern(transaction.final_trade_in_value);
      fix.current.final_trade_in_value = transaction.final_trade_in_value;
      fix.suggested.final_trade_in_value = patterns[0]?.suggestion || 0;
    }
    
    if (Math.abs(transaction.new_device_price) > MAX_REALISTIC_AMOUNT) {
      const patterns = await analyzePattern(transaction.new_device_price);
      fix.current.new_device_price = transaction.new_device_price;
      fix.suggested.new_device_price = patterns[0]?.suggestion || 0;
    }
    
    if (Math.abs(transaction.customer_payment_amount) > MAX_REALISTIC_AMOUNT) {
      const patterns = await analyzePattern(transaction.customer_payment_amount);
      fix.current.customer_payment_amount = transaction.customer_payment_amount;
      fix.suggested.customer_payment_amount = patterns[0]?.suggestion || 0;
    }
    
    fixes.push(fix);
    
    console.log(`Transaction ${transaction.transaction_number || transaction.id}:`);
    console.log('  Current:', JSON.stringify(fix.current, null, 2));
    console.log('  Suggested:', JSON.stringify(fix.suggested, null, 2));
    console.log('');
  }
  
  return fixes;
}

async function applyFixes(fixes, dryRun = true) {
  console.log(`\n${dryRun ? '🔄 DRY RUN - No changes will be made' : '💾 APPLYING FIXES'}...\n`);
  
  for (const fix of fixes) {
    const updates = fix.suggested;
    
    if (Object.keys(updates).length === 0) {
      console.log(`⏭️  No fixes needed for ${fix.transaction_number || fix.id}`);
      continue;
    }
    
    if (dryRun) {
      console.log(`Would update ${fix.transaction_number || fix.id}:`, updates);
    } else {
      try {
        // Build the UPDATE query dynamically
        const setClause = Object.keys(updates)
          .map((key, idx) => `${key} = $${idx + 2}`)
          .join(', ');
        
        const values = [fix.id, ...Object.values(updates)];
        
        await sql(`
          UPDATE lats_trade_in_transactions
          SET ${setClause}, updated_at = NOW()
          WHERE id = $1
        `, values);
        
        console.log(`✅ Updated ${fix.transaction_number || fix.id}`);
      } catch (error) {
        console.error(`❌ Error updating ${fix.transaction_number || fix.id}:`, error.message);
      }
    }
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const applyFlag = args.includes('--apply');
  const helpFlag = args.includes('--help') || args.includes('-h');
  
  if (helpFlag) {
    console.log(`
Fix Corrupt Trade-In Amounts

Usage:
  node fix-corrupt-amounts.mjs [options]

Options:
  --apply     Apply the fixes (default is dry-run)
  --help, -h  Show this help message

Examples:
  node fix-corrupt-amounts.mjs           # Scan and suggest fixes (dry-run)
  node fix-corrupt-amounts.mjs --apply   # Scan and apply fixes
    `);
    process.exit(0);
  }
  
  console.log('🔧 Trade-In Corrupt Amount Fixer\n');
  console.log('=' .repeat(60) + '\n');
  
  // Step 1: Identify corrupt data
  const corruptTransactions = await identifyCorruptData();
  
  if (corruptTransactions.length === 0) {
    process.exit(0);
  }
  
  // Step 2: Suggest fixes
  const fixes = await suggestFixes(corruptTransactions);
  
  // Step 3: Apply fixes (if requested)
  await applyFixes(fixes, !applyFlag);
  
  if (!applyFlag) {
    console.log('\n💡 Tip: Run with --apply to apply these fixes');
  }
  
  console.log('\n✅ Done!');
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

