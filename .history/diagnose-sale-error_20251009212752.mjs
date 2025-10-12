#!/usr/bin/env node

import { neon } from '@neondatabase/serverless';
import chalk from 'chalk';

const DATABASE_URL = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-dry-brook-ad3duuog-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

console.log(chalk.blue('\n🔍 Diagnosing Sale Error...\n'));

const sql = neon(DATABASE_URL);

async function diagnoseSaleError() {
  try {
    // Step 1: Check lats_sales schema
    console.log(chalk.yellow('📋 Step 1: Checking lats_sales schema...'));
    const salesSchema = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'lats_sales' 
      ORDER BY ordinal_position
    `;
    console.log(chalk.cyan('  lats_sales columns:'));
    salesSchema.forEach(col => {
      console.log(chalk.gray(`    - ${col.column_name} (${col.data_type})`));
    });
    console.log('');

    // Step 2: Check lats_sale_items schema
    console.log(chalk.yellow('📋 Step 2: Checking lats_sale_items schema...'));
    const itemsSchema = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'lats_sale_items' 
      ORDER BY ordinal_position
    `;
    console.log(chalk.cyan('  lats_sale_items columns:'));
    itemsSchema.forEach(col => {
      console.log(chalk.gray(`    - ${col.column_name} (${col.data_type})`));
    });
    console.log('');

    // Step 3: Try to insert a test sale (matching your exact data structure)
    console.log(chalk.yellow('🔄 Step 3: Testing sale insert with exact structure...'));
    
    const testSale = {
      sale_number: `DIAG-${Date.now()}`,
      customer_id: '5ca5204d-8c3c-4e61-82da-e59b19bc3441',
      total_amount: 433,
      payment_method: {
        type: 'Mobile Money',
        amount: 433,
        details: {
          payments: [{
            method: 'Mobile Money',
            amount: 433,
            accountId: '27bb429b-04b4-44b6-bbda-6e410b9ba9c1',
            timestamp: new Date().toISOString()
          }],
          totalPaid: 433
        }
      },
      payment_status: 'completed',
      sold_by: 'care@care.com',
      subtotal: 433,
      discount: 0,
      tax: 0,
      customer_name: 'Test Customer',
      customer_phone: '1234567890',
      customer_email: 'test@example.com'
    };

    console.log(chalk.gray('  Test sale data:'));
    console.log(chalk.gray(JSON.stringify(testSale, null, 2)));
    console.log('');

    const saleResult = await sql`
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
        customer_phone,
        customer_email
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
        ${testSale.customer_phone},
        ${testSale.customer_email}
      )
      RETURNING *
    `;

    console.log(chalk.green('  ✅ Sale inserted successfully!'));
    console.log(chalk.gray(`  Sale ID: ${saleResult[0].id}\n`));

    // Step 4: Try to insert sale items
    console.log(chalk.yellow('🔄 Step 4: Testing sale items insert...'));
    
    const testItem = {
      sale_id: saleResult[0].id,
      product_id: 'f03c9b46-5af4-4f75-85df-2bf1730d1eab',
      variant_id: '0ace60e1-f4fd-4706-9736-cc57cdb0eb05',
      product_name: 'Min Mac A1347',
      variant_name: 'Default',
      sku: 'MINMACA134-VAR-1760017176930-20GE4A',
      quantity: 1,
      unit_price: 433,
      total_price: 433,
      cost_price: 34,
      profit: 399
    };

    console.log(chalk.gray('  Test item data:'));
    console.log(chalk.gray(JSON.stringify(testItem, null, 2)));
    console.log('');

    const itemResult = await sql`
      INSERT INTO lats_sale_items (
        sale_id,
        product_id,
        variant_id,
        product_name,
        variant_name,
        sku,
        quantity,
        unit_price,
        total_price,
        cost_price,
        profit
      ) VALUES (
        ${testItem.sale_id},
        ${testItem.product_id},
        ${testItem.variant_id},
        ${testItem.product_name},
        ${testItem.variant_name},
        ${testItem.sku},
        ${testItem.quantity},
        ${testItem.unit_price},
        ${testItem.total_price},
        ${testItem.cost_price},
        ${testItem.profit}
      )
      RETURNING *
    `;

    console.log(chalk.green('  ✅ Sale item inserted successfully!'));
    console.log(chalk.gray(`  Item ID: ${itemResult[0].id}\n`));

    // Clean up
    console.log(chalk.yellow('🧹 Cleaning up test data...'));
    await sql`DELETE FROM lats_sales WHERE sale_number = ${testSale.sale_number}`;
    console.log(chalk.green('  ✅ Test data removed\n'));

    console.log(chalk.green('========================================'));
    console.log(chalk.green('  ✅ Diagnosis Complete - No Issues Found!'));
    console.log(chalk.green('========================================\n'));

    console.log(chalk.cyan('💡 The database schema is correct.'));
    console.log(chalk.cyan('   The issue might be in the frontend code.\n'));

  } catch (error) {
    console.error(chalk.red('\n❌ Error during diagnosis:'));
    console.error(chalk.red('  Message:'), error.message);
    console.error(chalk.red('  Code:'), error.code);
    console.error(chalk.red('  Details:'), error.details);
    console.error(chalk.red('  Hint:'), error.hint);
    console.error(chalk.yellow('\n  Full error:'));
    console.error(chalk.gray(JSON.stringify(error, null, 2)));
    process.exit(1);
  }
}

diagnoseSaleError();

