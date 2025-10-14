#!/usr/bin/env node

/**
 * Automatic Sample Payment Data Generator
 * Inserts realistic payment data for testing Payment Management Dashboard
 */

import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, '.env') });

const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ Missing DATABASE_URL in .env file');
  console.error('   Required: VITE_DATABASE_URL or DATABASE_URL');
  process.exit(1);
}

const sql = neon(DATABASE_URL, {
  fetchOptions: { cache: 'no-store' },
  fullResults: true
});

console.log('🚀 Starting automatic sample payment data insertion...\n');

// Helper function to generate random data
const random = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomFloat = () => Math.random();

// Payment method options
const paymentMethods = ['cash', 'mobile_money', 'card', 'bank_transfer'];
const providers = ['M-Pesa', 'Tigo Pesa', 'Airtel Money', 'Visa/Mastercard'];
const failureReasons = ['Insufficient Funds', 'Network Timeout', 'Invalid Card', 'Transaction Declined'];

// Generate sample payment transactions
async function generatePaymentTransactions() {
  console.log('📊 Generating payment transactions...');
  
  const transactions = [];
  const now = new Date();
  
  // Generate 250 transactions over last 90 days
  for (let dayOffset = 0; dayOffset < 90; dayOffset++) {
    // 3-5 transactions per day
    const transactionsPerDay = random(3, 5);
    
    for (let i = 0; i < transactionsPerDay; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - dayOffset);
      
      // Set random business hour (8 AM - 8 PM)
      const hour = random(8, 20);
      const minute = random(0, 59);
      date.setHours(hour, minute, 0, 0);
      
      // Determine amount based on distribution
      let amount;
      const rand = randomFloat();
      if (rand < 0.3) {
        amount = random(50000, 150000); // Small
      } else if (rand < 0.7) {
        amount = random(150000, 500000); // Medium
      } else {
        amount = random(500000, 2000000); // Large
      }
      
      // Determine status
      let status;
      const statusRand = randomFloat();
      if (statusRand < 0.85) {
        status = 'completed';
      } else if (statusRand < 0.93) {
        status = 'pending';
      } else {
        status = 'failed';
      }
      
      const method = paymentMethods[random(0, paymentMethods.length - 1)];
      const provider = providers[random(0, providers.length - 1)];
      const customerId = random(1, 50);
      
      const failureReason = status === 'failed' ? failureReasons[random(0, failureReasons.length - 1)] : null;
      
      const transaction = {
        order_id: crypto.randomUUID(),
        amount,
        currency: 'TZS',
        provider: `${provider} (${method})`, // Include method in provider for visibility
        status,
        reference: `SAMPLE-PT-${date.toISOString().split('T')[0]}-${String(i).padStart(4, '0')}`,
        customer_name: `Sample Customer ${customerId}`,
        customer_email: `customer${customerId}@example.com`,
        customer_phone: `+255${random(700000000, 799999999)}`,
        metadata: {
          sample_data: true,
          payment_method: method,
          method: method, // Also add here for compatibility
          day_of_week: date.toLocaleDateString('en-US', { weekday: 'long' }),
          hour,
          payment_type: 'pos_sale',
          provider_name: provider,
          ...(failureReason && {
            failure_reason: failureReason
          })
        },
        created_at: date.toISOString(),
        updated_at: date.toISOString()
      };
      
      transactions.push(transaction);
    }
  }
  
  console.log(`   Generated ${transactions.length} payment transactions`);
  return transactions;
}

// Generate sample purchase order payments
async function generatePurchaseOrderPayments() {
  console.log('📦 Generating purchase order payments...');
  
  const payments = [];
  const now = new Date();
  
  // Generate ~30 PO payments over last 60 days
  for (let dayOffset = 0; dayOffset < 60; dayOffset++) {
    // 50% chance of PO payment on any day
    if (randomFloat() > 0.5) continue;
    
    const date = new Date(now);
    date.setDate(date.getDate() - dayOffset);
    date.setHours(random(8, 18), random(0, 59), 0, 0);
    
    const amount = random(500000, 5500000);
    const method = randomFloat() < 0.5 ? 'bank_transfer' : 'mobile_money';
    
    let status;
    const statusRand = randomFloat();
    if (statusRand < 0.90) {
      status = 'completed';
    } else if (statusRand < 0.95) {
      status = 'pending';
    } else {
      status = 'cancelled';
    }
    
    const payment = {
      purchase_order_id: crypto.randomUUID(),
      amount,
      currency: 'TZS',
      payment_method: method,
      status,
      payment_date: date.toISOString().split('T')[0],
      reference: `SAMPLE-POP-${date.toISOString().split('T')[0]}-${String(payments.length).padStart(3, '0')}`,
      notes: `Sample purchase order payment for testing - ${method}`,
      created_at: date.toISOString(),
      updated_at: date.toISOString()
    };
    
    payments.push(payment);
  }
  
  console.log(`   Generated ${payments.length} purchase order payments`);
  return payments;
}

// Insert data in batches using Neon SQL
async function insertInBatches(table, data, batchSize = 50) {
  const totalBatches = Math.ceil(data.length / batchSize);
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < totalBatches; i++) {
    const start = i * batchSize;
    const end = Math.min(start + batchSize, data.length);
    const batch = data.slice(start, end);
    
    try {
      // Build INSERT query with multiple values
      const columns = Object.keys(batch[0]);
      const columnNames = columns.join(', ');
      
      const valueRows = batch.map(row => {
        const values = columns.map(col => {
          const val = row[col];
          if (val === null || val === undefined) return 'NULL';
          if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
          if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
          if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
          return val;
        });
        return `(${values.join(', ')})`;
      });
      
      const query = `
        INSERT INTO ${table} (${columnNames})
        VALUES ${valueRows.join(', ')}
        RETURNING *
      `;
      
      // Use Neon's tagged template syntax by constructing template parts
      const parts = [query];
      parts.raw = [query];
      const result = await sql(parts);
      const rows = result?.rows || result || [];
      
      successCount += rows.length;
      process.stdout.write(`   ✅ Batch ${i + 1}/${totalBatches} inserted (${successCount}/${data.length})\r`);
    } catch (err) {
      console.error(`\n   ⚠️ Batch ${i + 1}/${totalBatches} had errors:`, err.message);
      errorCount += batch.length;
    }
  }
  
  console.log('\n');
  return { successCount, errorCount };
}

// Main execution
async function main() {
  try {
    // Generate data
    const paymentTransactions = await generatePaymentTransactions();
    const purchaseOrderPayments = await generatePurchaseOrderPayments();
    
    console.log('\n💾 Inserting data into database...\n');
    
    // Insert payment transactions
    console.log('Inserting payment_transactions table...');
    const ptResult = await insertInBatches('payment_transactions', paymentTransactions);
    
    // Skip purchase order payments for now (requires existing purchase orders)
    const popResult = { successCount: 0, errorCount: 0 };
    console.log('Skipping purchase_order_payments (requires existing purchase orders)');
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ SAMPLE DATA INSERTION COMPLETE');
    console.log('='.repeat(60));
    console.log('');
    console.log(`📊 Payment Transactions:`);
    console.log(`   ✅ Inserted: ${ptResult.successCount} records`);
    if (ptResult.errorCount > 0) {
      console.log(`   ⚠️ Failed: ${ptResult.errorCount} records`);
    }
    console.log('');
    console.log(`📦 Purchase Order Payments:`);
    console.log(`   ✅ Inserted: ${popResult.successCount} records`);
    if (popResult.errorCount > 0) {
      console.log(`   ⚠️ Failed: ${popResult.errorCount} records`);
    }
    console.log('');
    
    // Calculate totals
    const totalAmount = paymentTransactions.reduce((sum, t) => sum + t.amount, 0);
    const failedCount = paymentTransactions.filter(t => t.status === 'failed').length;
    
    console.log(`💰 Total Sample Amount: TZS ${totalAmount.toLocaleString('en-US')}`);
    console.log(`❌ Failed Payments: ${failedCount} records`);
    console.log('');
    console.log('📈 CHARTS THAT WILL NOW DISPLAY:');
    console.log('   ✅ Daily Performance (last 7-30 days)');
    console.log('   ✅ Monthly Trends (last 3 months)');
    console.log('   ✅ Hourly Trends (8 AM - 8 PM)');
    console.log('   ✅ Payment Methods Distribution');
    console.log('   ✅ Payment Status Breakdown');
    console.log('   ✅ Failed Payment Analysis');
    console.log('   ✅ Currency Usage (TZS)');
    console.log('');
    console.log('🎯 Next Steps:');
    console.log('   1. Refresh Payment Management dashboard');
    console.log('   2. Navigate to Tracking tab');
    console.log('   3. All 11 graphs should now display data');
    console.log('');
    console.log('🗑️  To Remove Sample Data Later:');
    console.log("   Run: DELETE FROM payment_transactions WHERE reference LIKE 'SAMPLE-%';");
    console.log("   Run: DELETE FROM purchase_order_payments WHERE reference LIKE 'SAMPLE-%';");
    console.log('');
    console.log('='.repeat(60));
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error during insertion:', error);
    process.exit(1);
  }
}

// Run the script
main();

