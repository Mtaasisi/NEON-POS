#!/usr/bin/env node

import { neon } from '@neondatabase/serverless';
import chalk from 'chalk';

const DATABASE_URL = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-dry-brook-ad3duuog-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

console.log(chalk.blue('\n🔧 Fixing lats_sale_items subtotal column...\n'));

const sql = neon(DATABASE_URL);

async function fixSubtotalColumn() {
  try {
    // Make subtotal nullable or set a default
    console.log(chalk.yellow('📝 Step 1: Making subtotal column nullable (or defaulting to 0)...'));
    await sql`
      ALTER TABLE lats_sale_items 
      ALTER COLUMN subtotal DROP NOT NULL
    `;
    console.log(chalk.green('   ✅ subtotal column is now nullable\n'));

    // Set default value for future inserts
    console.log(chalk.yellow('📝 Step 2: Setting default value for subtotal...'));
    await sql`
      ALTER TABLE lats_sale_items 
      ALTER COLUMN subtotal SET DEFAULT 0
    `;
    console.log(chalk.green('   ✅ subtotal default set to 0\n'));

    // Also make discount nullable and set default
    console.log(chalk.yellow('📝 Step 3: Making discount column nullable with default...'));
    await sql`
      ALTER TABLE lats_sale_items 
      ALTER COLUMN discount DROP NOT NULL
    `;
    await sql`
      ALTER TABLE lats_sale_items 
      ALTER COLUMN discount SET DEFAULT 0
    `;
    console.log(chalk.green('   ✅ discount column fixed\n'));

    // Test the fix
    console.log(chalk.yellow('🧪 Step 4: Testing the fix...'));
    const testSaleId = 'e2276079-e22f-477e-8af4-b025c28e8c80'; // Using a test UUID
    const testItem = {
      sale_id: testSaleId,
      product_id: 'f03c9b46-5af4-4f75-85df-2bf1730d1eab',
      variant_id: '0ace60e1-f4fd-4706-9736-cc57cdb0eb05',
      product_name: 'Test Product',
      variant_name: 'Default',
      sku: 'TEST-SKU',
      quantity: 1,
      unit_price: 100,
      total_price: 100,
      cost_price: 50,
      profit: 50
    };

    console.log(chalk.gray('  Attempting insert without subtotal field...'));
    
    // This should now work without explicit subtotal
    await sql`
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
        ${testItem.sale_id}::uuid,
        ${testItem.product_id}::uuid,
        ${testItem.variant_id}::uuid,
        ${testItem.product_name},
        ${testItem.variant_name},
        ${testItem.sku},
        ${testItem.quantity},
        ${testItem.unit_price},
        ${testItem.total_price},
        ${testItem.cost_price},
        ${testItem.profit}
      )
    `.catch(err => {
      // Expected to fail if sale_id doesn't exist, which is fine
      if (err.code === '23503') {
        console.log(chalk.green('  ✅ Insert works (failed on foreign key as expected for test data)\n'));
        return;
      }
      throw err;
    });

    console.log(chalk.green('========================================'));
    console.log(chalk.green('  ✅ Sale Items Subtotal Column Fixed!'));
    console.log(chalk.green('========================================\n'));

    console.log(chalk.cyan('💡 Changes applied:'));
    console.log(chalk.cyan('  ✓ subtotal column is now nullable'));
    console.log(chalk.cyan('  ✓ subtotal defaults to 0'));
    console.log(chalk.cyan('  ✓ discount column is now nullable'));
    console.log(chalk.cyan('  ✓ discount defaults to 0\n'));

    console.log(chalk.green('🚀 Your sales should work now!'));
    console.log(chalk.green('   Restart your dev server and try again!\n'));

  } catch (error) {
    console.error(chalk.red('\n❌ Error:'), error.message);
    console.error(chalk.yellow('  Code:'), error.code);
    process.exit(1);
  }
}

fixSubtotalColumn();

