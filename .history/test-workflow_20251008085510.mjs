#!/usr/bin/env node

/**
 * Automatic Purchase Order Workflow Test
 * This script connects to your Neon database and tests the complete workflow
 */

import { neon } from '@neondatabase/serverless';

// ANSI color codes for pretty output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✅${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}❌${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}\n`),
  step: (num, msg) => console.log(`\n${colors.magenta}📋 Step ${num}:${colors.reset} ${msg}`),
};

async function testPurchaseOrderWorkflow() {
  try {
    // Get database URL from environment or .env file
    const databaseUrl = process.env.DATABASE_URL || process.env.VITE_SUPABASE_URL;
    
    if (!databaseUrl) {
      log.error('Database URL not found!');
      log.info('Please set DATABASE_URL environment variable or check .env file');
      process.exit(1);
    }

    log.header('═══════════════════════════════════════════════════════');
    log.header('🧪 STARTING COMPLETE PURCHASE ORDER WORKFLOW TEST');
    log.header('═══════════════════════════════════════════════════════');

    // Connect to database
    const sql = neon(databaseUrl);
    log.success('Connected to Neon database');

    // ============================================
    // STEP 1: Get test data
    // ============================================
    log.step(1, 'Getting test data...');
    
    const suppliers = await sql`SELECT id, name FROM lats_suppliers LIMIT 1`;
    if (suppliers.length === 0) {
      throw new Error('No suppliers found! Please create a supplier first.');
    }
    const supplierId = suppliers[0].id;
    log.success(`Supplier: ${suppliers[0].name} (${supplierId})`);

    const products = await sql`SELECT id, name FROM lats_products LIMIT 1`;
    if (products.length === 0) {
      throw new Error('No products found! Please create a product first.');
    }
    const productId = products[0].id;
    log.success(`Product: ${products[0].name} (${productId})`);

    const variants = await sql`SELECT id, variant_name FROM lats_product_variants WHERE product_id = ${productId} LIMIT 1`;
    if (variants.length === 0) {
      throw new Error('No variants found! Please create a variant first.');
    }
    const variantId = variants[0].id;
    log.success(`Variant: ${variants[0].variant_name} (${variantId})`);

    const users = await sql`SELECT id, email FROM users WHERE email = 'care@care.com' LIMIT 1`;
    if (users.length === 0) {
      throw new Error('User care@care.com not found!');
    }
    const userId = users[0].id;
    log.success(`User: ${users[0].email} (${userId})`);

    // ============================================
    // STEP 2: Check stock BEFORE
    // ============================================
    log.step(2, 'Checking stock levels BEFORE...');
    
    const beforeStock = await sql`SELECT quantity FROM lats_product_variants WHERE id = ${variantId}`;
    const stockBefore = beforeStock[0].quantity;
    log.info(`📦 Stock BEFORE: ${stockBefore} units`);

    // ============================================
    // STEP 3: Create Purchase Order
    // ============================================
    log.step(3, 'Creating purchase order...');
    
    const poNumber = `PO-TEST-${Date.now()}`;
    const orderQty = 10;
    const unitCost = 15000.00;
    const subtotal = orderQty * unitCost;

    const poResult = await sql`
      INSERT INTO lats_purchase_orders (
        po_number, supplier_id, status, total_amount, created_by
      ) VALUES (
        ${poNumber}, ${supplierId}, 'draft', ${subtotal}, ${userId}
      ) RETURNING id
    `;
    const poId = poResult[0].id;
    log.success(`PO Created: ${poNumber}`);

    await sql`
      INSERT INTO lats_purchase_order_items (
        purchase_order_id, product_id, variant_id, 
        quantity_ordered, quantity_received, unit_cost, subtotal
      ) VALUES (
        ${poId}, ${productId}, ${variantId}, 
        ${orderQty}, 0, ${unitCost}, ${subtotal}
      )
    `;
    log.success(`PO Item Added: ${orderQty} units @ ${unitCost} each`);

    // ============================================
    // STEP 4: Verify PO was created
    // ============================================
    log.step(4, 'Verifying PO creation...');
    
    const poCheck = await sql`SELECT id FROM lats_purchase_orders WHERE id = ${poId}`;
    if (poCheck.length === 0) throw new Error('PO not found after creation!');
    log.success('PO exists in database');

    const itemsCheck = await sql`SELECT id FROM lats_purchase_order_items WHERE purchase_order_id = ${poId}`;
    if (itemsCheck.length === 0) throw new Error('PO items not found!');
    log.success('PO items exist in database');

    // ============================================
    // STEP 5: Receive Purchase Order (THE MAGIC!)
    // ============================================
    log.step(5, 'RECEIVING purchase order (importing to inventory)...');
    log.info('🔄 Calling complete_purchase_order_receive()...');
    
    const receiveResult = await sql`
      SELECT complete_purchase_order_receive(
        ${poId}::UUID,
        ${userId}::UUID,
        'Automated test receive'
      )
    `;
    log.success(`Receive completed!`);
    console.log('   Result:', JSON.stringify(receiveResult[0], null, 2));

    // ============================================
    // STEP 6: Verify PO status changed
    // ============================================
    log.step(6, 'Verifying PO status...');
    
    const statusCheck = await sql`
      SELECT status, received_date 
      FROM lats_purchase_orders 
      WHERE id = ${poId}
    `;
    
    if (statusCheck[0].status !== 'received') {
      throw new Error(`Status is "${statusCheck[0].status}", expected "received"`);
    }
    log.success('PO status changed to "received"');
    
    if (!statusCheck[0].received_date) {
      throw new Error('received_date was not set!');
    }
    log.success(`received_date set to ${statusCheck[0].received_date}`);

    // ============================================
    // STEP 7: Verify items were marked as received
    // ============================================
    log.step(7, 'Verifying items were received...');
    
    const itemsReceived = await sql`
      SELECT quantity_received 
      FROM lats_purchase_order_items 
      WHERE purchase_order_id = ${poId}
    `;
    
    if (itemsReceived[0].quantity_received !== orderQty) {
      throw new Error(`Received ${itemsReceived[0].quantity_received}, expected ${orderQty}`);
    }
    log.success(`Items marked as received (${orderQty} units)`);

    // ============================================
    // STEP 8: Verify inventory adjustment
    // ============================================
    log.step(8, 'Verifying inventory adjustment...');
    
    const adjustments = await sql`
      SELECT type, quantity, reason 
      FROM lats_inventory_adjustments 
      WHERE variant_id = ${variantId}
        AND type = 'purchase_order'
        AND reason LIKE ${`%${poId}%`}
      ORDER BY created_at DESC
      LIMIT 1
    `;
    
    if (adjustments.length === 0) {
      throw new Error('Inventory adjustment not created!');
    }
    log.success(`Inventory adjustment created (qty: ${adjustments[0].quantity})`);

    // ============================================
    // STEP 9: Verify stock was updated
    // ============================================
    log.step(9, 'Verifying stock levels AFTER...');
    
    const afterStock = await sql`SELECT quantity FROM lats_product_variants WHERE id = ${variantId}`;
    const stockAfter = afterStock[0].quantity;
    
    log.info(`📦 Stock BEFORE: ${stockBefore} units`);
    log.info(`📦 Stock AFTER:  ${stockAfter} units`);
    log.info(`📈 Stock CHANGE: +${stockAfter - stockBefore} units`);
    
    if (stockAfter !== stockBefore + orderQty) {
      throw new Error(`Stock should be ${stockBefore + orderQty}, got ${stockAfter}`);
    }
    log.success(`Stock increased correctly by ${orderQty} units!`);

    // ============================================
    // STEP 10: Test summary function
    // ============================================
    log.step(10, 'Testing get_purchase_order_receive_summary()...');
    
    const summary = await sql`
      SELECT * FROM get_purchase_order_receive_summary(${poId}::UUID)
    `;
    
    if (summary.length > 0) {
      log.success('Summary function works');
      console.log('   Summary:', {
        total_items: summary[0].total_items,
        total_ordered: summary[0].total_ordered,
        total_received: summary[0].total_received,
        percent_received: summary[0].percent_received + '%'
      });
    }

    // ============================================
    // FINAL SUMMARY
    // ============================================
    log.header('═══════════════════════════════════════════════════════');
    log.header('🎉 ALL TESTS PASSED! WORKFLOW IS WORKING CORRECTLY!');
    log.header('═══════════════════════════════════════════════════════');
    
    console.log('\n✅ Test Summary:');
    console.log(`   • Purchase order: ${poNumber}`);
    console.log(`   • PO status: received`);
    console.log(`   • Items received: ${orderQty} units`);
    console.log(`   • Stock before: ${stockBefore} units`);
    console.log(`   • Stock after: ${stockAfter} units`);
    console.log(`   • Stock increase: +${orderQty} units`);
    console.log(`   • Inventory adjustment: ✅ created`);
    console.log(`   • RPC functions: ✅ working`);
    
    console.log('\n🎯 Next Steps:');
    console.log('   1. Test via UI at: http://localhost:3000/lats/purchase-order/create');
    console.log('   2. Create a PO with products');
    console.log('   3. Click "Complete Receive" button');
    console.log('   4. Verify inventory increased');
    
    log.header('═══════════════════════════════════════════════════════');

  } catch (error) {
    log.error('Test failed!');
    console.error('\n' + error.message);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  }
}

// Run the test
testPurchaseOrderWorkflow();

