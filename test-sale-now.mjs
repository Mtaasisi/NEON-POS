#!/usr/bin/env node

import { neon } from '@neondatabase/serverless';
import chalk from 'chalk';

const DATABASE_URL = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-dry-brook-ad3duuog-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

console.log(chalk.blue('\n========================================'));
console.log(chalk.blue('  Testing Sale Insert'));
console.log(chalk.blue('========================================\n'));

const sql = neon(DATABASE_URL);

async function testSale() {
  try {
    // Test data
    const testSale = {
      sale_number: `TEST-${Date.now()}`,
      customer_id: '5ca5204d-8c3c-4e61-82da-e59b19bc3441',
      total_amount: 433,
      payment_method: {
        type: 'Cash',
        amount: 433,
        details: {
          payments: [{
            method: 'Cash',
            amount: 433,
            timestamp: new Date().toISOString()
          }]
        }
      },
      payment_status: 'completed',
      sold_by: 'test@test.com',
      subtotal: 433,
      discount: 0,
      tax: 0,
      customer_name: 'Test Customer',
      customer_phone: '1234567890'
    };

    console.log(chalk.cyan('📝 Test sale data:'));
    console.log(chalk.gray(JSON.stringify(testSale, null, 2)));
    console.log('');

    console.log(chalk.yellow('🔄 Inserting test sale...'));
    
    const result = await sql`
      INSERT INTO lats_sales (
        sale_number,
        customer_id,
        total_amount,
        payment_method,
        payment_status,
        sold_by,
        subtotal,
        discount,
        tax,
        customer_name,
        customer_phone
      ) VALUES (
        ${testSale.sale_number},
        ${testSale.customer_id},
        ${testSale.total_amount},
        ${JSON.stringify(testSale.payment_method)}::jsonb,
        ${testSale.payment_status},
        ${testSale.sold_by},
        ${testSale.subtotal},
        ${testSale.discount},
        ${testSale.tax},
        ${testSale.customer_name},
        ${testSale.customer_phone}
      )
      RETURNING *
    `;

    console.log(chalk.green('✅ Test sale inserted successfully!\n'));
    console.log(chalk.cyan('📄 Inserted sale:'));
    console.log(chalk.gray(JSON.stringify(result[0], null, 2)));
    console.log('');

    console.log(chalk.green('========================================'));
    console.log(chalk.green('  ✅ Database is Working Perfectly!'));
    console.log(chalk.green('========================================\n'));

    console.log(chalk.cyan('🎉 Your POS system is ready to use!'));
    console.log(chalk.cyan('   The error is FIXED!\n'));

    // Clean up test sale
    console.log(chalk.yellow('🧹 Cleaning up test sale...'));
    await sql`DELETE FROM lats_sales WHERE sale_number = ${testSale.sale_number}`;
    console.log(chalk.green('✅ Test sale removed\n'));

  } catch (error) {
    console.error(chalk.red('\n❌ Error:'), error.message);
    console.error(chalk.yellow('\nThis might indicate remaining schema issues.'));
    console.error(chalk.yellow('Please check the error message above.\n'));
    process.exit(1);
  }
}

testSale();

