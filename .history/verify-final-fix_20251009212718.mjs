#!/usr/bin/env node

import { neon } from '@neondatabase/serverless';
import chalk from 'chalk';

const DATABASE_URL = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-dry-brook-ad3duuog-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

console.log(chalk.blue.bold('\n╔══════════════════════════════════════════════════╗'));
console.log(chalk.blue.bold('║      FINAL VERIFICATION - All Fixes              ║'));
console.log(chalk.blue.bold('╚══════════════════════════════════════════════════╝\n'));

const sql = neon(DATABASE_URL);

async function verifyAllFixes() {
  try {
    const checks = [];

    // Check 1: payment_method is JSONB
    console.log(chalk.cyan('📋 Check 1: payment_method column type...'));
    const pmType = await sql`
      SELECT data_type 
      FROM information_schema.columns 
      WHERE table_name = 'lats_sales' AND column_name = 'payment_method'
    `;
    const pmOk = pmType[0]?.data_type === 'jsonb';
    checks.push({ name: 'payment_method is JSONB', status: pmOk });
    console.log(pmOk ? chalk.green('  ✅ JSONB') : chalk.red('  ❌ Not JSONB'));
    console.log('');

    // Check 2: subtotal in sale_items is nullable
    console.log(chalk.cyan('📋 Check 2: sale_items.subtotal nullable...'));
    const subtotalNull = await sql`
      SELECT is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'lats_sale_items' AND column_name = 'subtotal'
    `;
    const subtotalOk = subtotalNull[0]?.is_nullable === 'YES';
    checks.push({ name: 'sale_items.subtotal is nullable', status: subtotalOk });
    console.log(subtotalOk ? chalk.green('  ✅ Nullable') : chalk.red('  ❌ Not nullable'));
    console.log('');

    // Check 3: discount column exists in sales
    console.log(chalk.cyan('📋 Check 3: lats_sales.discount column...'));
    const discountExists = await sql`
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_name = 'lats_sales' AND column_name = 'discount'
    `;
    const discountOk = discountExists.length > 0;
    checks.push({ name: 'discount column exists', status: discountOk });
    console.log(discountOk ? chalk.green('  ✅ Exists') : chalk.red('  ❌ Missing'));
    console.log('');

    // Check 4: tax column exists
    console.log(chalk.cyan('📋 Check 4: lats_sales.tax column...'));
    const taxExists = await sql`
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_name = 'lats_sales' AND column_name = 'tax'
    `;
    const taxOk = taxExists.length > 0;
    checks.push({ name: 'tax column exists', status: taxOk });
    console.log(taxOk ? chalk.green('  ✅ Exists') : chalk.red('  ❌ Missing'));
    console.log('');

    // Check 5: payment_status column exists
    console.log(chalk.cyan('📋 Check 5: lats_sales.payment_status column...'));
    const psExists = await sql`
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_name = 'lats_sales' AND column_name = 'payment_status'
    `;
    const psOk = psExists.length > 0;
    checks.push({ name: 'payment_status column exists', status: psOk });
    console.log(psOk ? chalk.green('  ✅ Exists') : chalk.red('  ❌ Missing'));
    console.log('');

    // Check 6: sold_by column exists
    console.log(chalk.cyan('📋 Check 6: lats_sales.sold_by column...'));
    const sbExists = await sql`
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_name = 'lats_sales' AND column_name = 'sold_by'
    `;
    const sbOk = sbExists.length > 0;
    checks.push({ name: 'sold_by column exists', status: sbOk });
    console.log(sbOk ? chalk.green('  ✅ Exists') : chalk.red('  ❌ Missing'));
    console.log('');

    // Check 7: Complete sale test
    console.log(chalk.cyan('📋 Check 7: Complete sale insert test...'));
    const testSaleNumber = `VERIFY-${Date.now()}`;
    
    // Insert sale
    const saleResult = await sql`
      INSERT INTO lats_sales (
        sale_number, customer_id, total_amount, 
        payment_method, payment_status, sold_by,
        subtotal, discount, tax
      ) VALUES (
        ${testSaleNumber},
        '5ca5204d-8c3c-4e61-82da-e59b19bc3441',
        100,
        '{"type":"Cash","amount":100}'::jsonb,
        'completed',
        'test@test.com',
        100, 0, 0
      ) RETURNING id
    `;
    
    // Insert sale item (without subtotal - should use default)
    const itemResult = await sql`
      INSERT INTO lats_sale_items (
        sale_id, product_id, variant_id,
        product_name, variant_name, sku,
        quantity, unit_price, total_price,
        cost_price, profit
      ) VALUES (
        ${saleResult[0].id}::uuid,
        'f03c9b46-5af4-4f75-85df-2bf1730d1eab'::uuid,
        '0ace60e1-f4fd-4706-9736-cc57cdb0eb05'::uuid,
        'Test Product', 'Default', 'TEST-SKU',
        1, 100, 100, 50, 50
      ) RETURNING id
    `;
    
    // Clean up
    await sql`DELETE FROM lats_sales WHERE sale_number = ${testSaleNumber}`;
    
    const saleTestOk = saleResult.length > 0 && itemResult.length > 0;
    checks.push({ name: 'Complete sale insert', status: saleTestOk });
    console.log(saleTestOk ? chalk.green('  ✅ Success') : chalk.red('  ❌ Failed'));
    console.log('');

    // Summary
    const allPassed = checks.every(c => c.status);
    
    console.log(chalk.blue.bold('╔══════════════════════════════════════════════════╗'));
    if (allPassed) {
      console.log(chalk.green.bold('║            ✅ ALL CHECKS PASSED! ✅              ║'));
    } else {
      console.log(chalk.red.bold('║           ⚠️  SOME CHECKS FAILED  ⚠️             ║'));
    }
    console.log(chalk.blue.bold('╚══════════════════════════════════════════════════╝\n'));

    console.log(chalk.cyan('📊 Verification Results:'));
    checks.forEach(check => {
      const icon = check.status ? '✅' : '❌';
      const color = check.status ? chalk.green : chalk.red;
      console.log(color(`  ${icon} ${check.name}`));
    });
    console.log('');

    if (allPassed) {
      console.log(chalk.green.bold('🎉 YOUR DATABASE IS READY!'));
      console.log(chalk.cyan('\n🚀 Next steps:'));
      console.log(chalk.white('  1. Restart your dev server: npm run dev'));
      console.log(chalk.white('  2. Go to POS page'));
      console.log(chalk.white('  3. Process a sale'));
      console.log(chalk.white('  4. ✅ See success message!\n'));
    } else {
      console.log(chalk.yellow('\n⚠️  Some fixes may not have been applied.'));
      console.log(chalk.white('   Run the fix scripts again:\n'));
      console.log(chalk.cyan('   node auto-fix-sales-schema.mjs'));
      console.log(chalk.cyan('   node fix-payment-method-column.mjs'));
      console.log(chalk.cyan('   node fix-sale-items-subtotal.mjs\n'));
    }

  } catch (error) {
    console.error(chalk.red('\n❌ Verification failed:'), error.message);
    console.error(chalk.yellow('\nThis might indicate an issue. Please check the error above.\n'));
    process.exit(1);
  }
}

verifyAllFixes();

