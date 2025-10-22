#!/usr/bin/env node
import pkg from 'pg';
const { Pool } = pkg;

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment variables');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function verifyPaymentRecording() {
  console.log('🔍 Verifying Payment Recording System\n');
  console.log('='.repeat(80));

  try {
    // 1. Check recent POS sales
    console.log('\n📊 Recent POS Sales (Last 5):');
    console.log('-'.repeat(80));
    const salesResult = await pool.query(`
      SELECT 
        id,
        sale_number,
        customer_name,
        total_amount,
        payment_status,
        payment_method->>'type' as payment_type,
        created_at
      FROM lats_sales
      ORDER BY created_at DESC
      LIMIT 5
    `);

    if (salesResult.rows.length === 0) {
      console.log('ℹ️  No sales found');
    } else {
      salesResult.rows.forEach((sale, idx) => {
        console.log(`\n${idx + 1}. Sale ${sale.sale_number}`);
        console.log(`   Customer: ${sale.customer_name || 'N/A'}`);
        console.log(`   Amount: TZS ${sale.total_amount?.toLocaleString() || 0}`);
        console.log(`   Payment: ${sale.payment_type || 'N/A'}`);
        console.log(`   Status: ${sale.payment_status}`);
        console.log(`   Date: ${new Date(sale.created_at).toLocaleString()}`);
      });
    }

    // 2. Check recent sale items
    console.log('\n\n📦 Recent Sale Items (Last 10):');
    console.log('-'.repeat(80));
    const itemsResult = await pool.query(`
      SELECT 
        si.product_name,
        si.variant_name,
        si.quantity,
        si.unit_price,
        si.total_price,
        s.sale_number,
        si.created_at
      FROM lats_sale_items si
      JOIN lats_sales s ON s.id = si.sale_id
      ORDER BY si.created_at DESC
      LIMIT 10
    `);

    if (itemsResult.rows.length === 0) {
      console.log('ℹ️  No sale items found');
    } else {
      itemsResult.rows.forEach((item, idx) => {
        console.log(`\n${idx + 1}. ${item.product_name} - ${item.variant_name}`);
        console.log(`   Sale: ${item.sale_number}`);
        console.log(`   Qty: ${item.quantity} × TZS ${item.unit_price?.toLocaleString()} = TZS ${item.total_price?.toLocaleString()}`);
        console.log(`   Date: ${new Date(item.created_at).toLocaleString()}`);
      });
    }

    // 3. Check finance account transactions
    console.log('\n\n💰 Recent Finance Account Transactions (Last 10):');
    console.log('-'.repeat(80));
    const transactionsResult = await pool.query(`
      SELECT 
        at.transaction_type,
        at.amount,
        at.reference_number,
        at.description,
        at.created_at,
        fa.account_name
      FROM account_transactions at
      JOIN finance_accounts fa ON fa.id = at.account_id
      ORDER BY at.created_at DESC
      LIMIT 10
    `);

    if (transactionsResult.rows.length === 0) {
      console.log('ℹ️  No account transactions found');
    } else {
      transactionsResult.rows.forEach((tx, idx) => {
        console.log(`\n${idx + 1}. ${tx.transaction_type}`);
        console.log(`   Account: ${tx.account_name}`);
        console.log(`   Amount: TZS ${tx.amount?.toLocaleString()}`);
        console.log(`   Ref: ${tx.reference_number || 'N/A'}`);
        console.log(`   Description: ${tx.description || 'N/A'}`);
        console.log(`   Date: ${new Date(tx.created_at).toLocaleString()}`);
      });
    }

    // 4. Check finance account balances
    console.log('\n\n💵 Finance Account Balances:');
    console.log('-'.repeat(80));
    const accountsResult = await pool.query(`
      SELECT 
        account_name,
        balance,
        currency,
        updated_at
      FROM finance_accounts
      ORDER BY updated_at DESC
    `);

    if (accountsResult.rows.length === 0) {
      console.log('ℹ️  No finance accounts found');
    } else {
      accountsResult.rows.forEach((acc, idx) => {
        console.log(`\n${idx + 1}. ${acc.account_name}`);
        console.log(`   Balance: ${acc.currency} ${acc.balance?.toLocaleString()}`);
        console.log(`   Last Updated: ${new Date(acc.updated_at).toLocaleString()}`);
      });
    }

    // 5. Check purchase order payments
    console.log('\n\n🛒 Recent Purchase Order Payments (Last 10):');
    console.log('-'.repeat(80));
    const poPaymentsResult = await pool.query(`
      SELECT 
        pop.amount,
        pop.currency,
        pop.payment_method,
        pop.status,
        pop.payment_date,
        po.po_number
      FROM purchase_order_payments pop
      JOIN lats_purchase_orders po ON po.id = pop.purchase_order_id
      ORDER BY pop.created_at DESC
      LIMIT 10
    `);

    if (poPaymentsResult.rows.length === 0) {
      console.log('ℹ️  No purchase order payments found');
    } else {
      poPaymentsResult.rows.forEach((payment, idx) => {
        console.log(`\n${idx + 1}. PO ${payment.po_number}`);
        console.log(`   Amount: ${payment.currency} ${payment.amount?.toLocaleString()}`);
        console.log(`   Method: ${payment.payment_method}`);
        console.log(`   Status: ${payment.status}`);
        console.log(`   Date: ${new Date(payment.payment_date).toLocaleString()}`);
      });
    }

    // 6. Check customer payments (repairs)
    console.log('\n\n🔧 Recent Customer Payments/Repairs (Last 10):');
    console.log('-'.repeat(80));
    const customerPaymentsResult = await pool.query(`
      SELECT 
        cp.amount,
        cp.method,
        cp.payment_type,
        cp.status,
        c.name as customer_name,
        cp.created_at
      FROM customer_payments cp
      LEFT JOIN customers c ON c.id = cp.customer_id
      ORDER BY cp.created_at DESC
      LIMIT 10
    `);

    if (customerPaymentsResult.rows.length === 0) {
      console.log('ℹ️  No customer payments found');
    } else {
      customerPaymentsResult.rows.forEach((payment, idx) => {
        console.log(`\n${idx + 1}. ${payment.payment_type} Payment`);
        console.log(`   Customer: ${payment.customer_name || 'N/A'}`);
        console.log(`   Amount: TZS ${payment.amount?.toLocaleString()}`);
        console.log(`   Method: ${payment.method}`);
        console.log(`   Status: ${payment.status}`);
        console.log(`   Date: ${new Date(payment.created_at).toLocaleString()}`);
      });
    }

    // 7. Data integrity checks
    console.log('\n\n🔍 Data Integrity Checks:');
    console.log('-'.repeat(80));

    // Check for sales without items
    const salesWithoutItems = await pool.query(`
      SELECT s.sale_number, s.created_at
      FROM lats_sales s
      LEFT JOIN lats_sale_items si ON si.sale_id = s.id
      WHERE si.id IS NULL
      ORDER BY s.created_at DESC
      LIMIT 5
    `);

    if (salesWithoutItems.rows.length > 0) {
      console.log('\n⚠️  Sales without items found:');
      salesWithoutItems.rows.forEach(sale => {
        console.log(`   - ${sale.sale_number} (${new Date(sale.created_at).toLocaleString()})`);
      });
    } else {
      console.log('\n✅ All sales have items');
    }

    // Check for completed sales without payment transactions
    const salesWithoutTransactions = await pool.query(`
      SELECT s.sale_number, s.total_amount, s.created_at
      FROM lats_sales s
      LEFT JOIN account_transactions at ON at.metadata->>'sale_id' = s.id::text
      WHERE s.payment_status = 'completed' 
        AND at.id IS NULL
        AND s.created_at > NOW() - INTERVAL '7 days'
      ORDER BY s.created_at DESC
      LIMIT 5
    `);

    if (salesWithoutTransactions.rows.length > 0) {
      console.log('\n⚠️  Completed sales without account transactions (last 7 days):');
      salesWithoutTransactions.rows.forEach(sale => {
        console.log(`   - ${sale.sale_number}: TZS ${sale.total_amount?.toLocaleString()} (${new Date(sale.created_at).toLocaleString()})`);
      });
    } else {
      console.log('✅ All completed sales have account transactions');
    }

    // Summary statistics
    console.log('\n\n📈 Summary Statistics:');
    console.log('-'.repeat(80));

    const stats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM lats_sales WHERE created_at > NOW() - INTERVAL '24 hours') as sales_last_24h,
        (SELECT COUNT(*) FROM purchase_order_payments WHERE created_at > NOW() - INTERVAL '24 hours') as po_payments_last_24h,
        (SELECT COUNT(*) FROM customer_payments WHERE created_at > NOW() - INTERVAL '24 hours') as customer_payments_last_24h,
        (SELECT COUNT(*) FROM account_transactions WHERE created_at > NOW() - INTERVAL '24 hours') as transactions_last_24h,
        (SELECT SUM(total_amount) FROM lats_sales WHERE created_at > NOW() - INTERVAL '24 hours') as total_sales_24h
    `);

    const summary = stats.rows[0];
    console.log(`\nLast 24 Hours:`);
    console.log(`   POS Sales: ${summary.sales_last_24h || 0}`);
    console.log(`   PO Payments: ${summary.po_payments_last_24h || 0}`);
    console.log(`   Customer Payments: ${summary.customer_payments_last_24h || 0}`);
    console.log(`   Account Transactions: ${summary.transactions_last_24h || 0}`);
    console.log(`   Total Sales Amount: TZS ${summary.total_sales_24h?.toLocaleString() || 0}`);

    console.log('\n' + '='.repeat(80));
    console.log('✅ Verification Complete\n');

  } catch (error) {
    console.error('\n❌ Error during verification:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

// Run verification
verifyPaymentRecording().catch(console.error);

