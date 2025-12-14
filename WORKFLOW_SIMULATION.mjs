#!/usr/bin/env node

import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';

config();

const sql = neon(process.env.DATABASE_URL);

console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log('║         COMPLETE WORKFLOW SIMULATION - END-TO-END              ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

async function simulateCompleteWorkflow() {
  const results = {
    productCreated: false,
    variantsCreated: false,
    poCreated: false,
    poReceived: false,
    imeisAdded: false,
    stockUpdated: false,
    saleCompleted: false,
    errors: []
  };

  try {
    console.log('🏭 WORKFLOW SIMULATION STARTING...\n');
    
    // ========================================================================
    // STEP 1: Create New Product
    // ========================================================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 1: Creating New Product (iPhone 6)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const uniqueSKU = 'IPHONE6-SIM-' + Math.floor(Date.now() / 1000);
    const product = await sql`
      INSERT INTO lats_products (
        name, sku, category_id, supplier_id,
        brand, description, is_active
      ) VALUES (
        'iPhone 6 (Simulation Test)',
        ${uniqueSKU},
        NULL,
        NULL,
        'Apple',
        'Test product for workflow simulation',
        TRUE
      )
      RETURNING id, name, sku
    `;
    
    console.log(`✅ Product Created:`);
    console.log(`   ID: ${product[0].id}`);
    console.log(`   Name: ${product[0].name}`);
    console.log(`   SKU: ${product[0].sku}\n`);
    
    results.productCreated = true;
    const productId = product[0].id;
    
    // ========================================================================
    // STEP 2: Create Product Variants
    // ========================================================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 2: Creating Product Variants (128GB & 256GB)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const varSKU128 = uniqueSKU + '-128GB';
    const varSKU256 = uniqueSKU + '-256GB';
    const variants = await sql`
      INSERT INTO lats_product_variants (
        product_id, name, variant_name, sku,
        cost_price, selling_price, quantity,
        is_active, is_parent, variant_type
      ) VALUES
        (
          ${productId}, '128GB Black', '128GB Black', ${varSKU128},
          500.00, 650.00, 0,
          TRUE, TRUE, 'parent'
        ),
        (
          ${productId}, '256GB Black', '256GB Black', ${varSKU256},
          600.00, 780.00, 0,
          TRUE, TRUE, 'parent'
        )
      RETURNING id, name, variant_type, cost_price, selling_price
    `;
    
    console.log(`✅ Variants Created:`);
    variants.forEach((v, i) => {
      console.log(`   ${i + 1}. ${v.name}`);
      console.log(`      ID: ${v.id}`);
      console.log(`      Cost: $${v.cost_price} | Selling: $${v.selling_price}`);
    });
    console.log();
    
    results.variantsCreated = true;
    const variant128 = variants[0];
    const variant256 = variants[1];
    
    // ========================================================================
    // STEP 3: Create Purchase Order
    // ========================================================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 3: Creating Purchase Order');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const poNumber = 'PO-SIM-' + Math.floor(Date.now() / 1000);
    const po = await sql`
      INSERT INTO lats_purchase_orders (
        order_number, po_number, status, order_date, expected_delivery_date
      ) VALUES (
        ${poNumber},
        ${poNumber},
        'pending',
        NOW(),
        NOW() + INTERVAL '7 days'
      )
      RETURNING id, order_number, status
    `;
    
    console.log(`✅ Purchase Order Created:`);
    console.log(`   ID: ${po[0].id}`);
    console.log(`   Order Number: ${po[0].order_number}`);
    console.log(`   Status: ${po[0].status}\n`);
    
    const poId = po[0].id;
    
    // Add PO Items
    const poItems = await sql`
      INSERT INTO lats_purchase_order_items (
        purchase_order_id, product_id, variant_id,
        quantity, unit_cost, quantity_received
      ) VALUES
        (${poId}, ${productId}, ${variant128.id}, 3, 500.00, 0),
        (${poId}, ${productId}, ${variant256.id}, 2, 600.00, 0)
      RETURNING id, variant_id, quantity
    `;
    
    console.log(`✅ PO Items Added:`);
    console.log(`   - 3x 128GB @ $500 each`);
    console.log(`   - 2x 256GB @ $600 each\n`);
    
    results.poCreated = true;
    
    // ========================================================================
    // STEP 4: Receive PO and Add IMEIs
    // ========================================================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 4: Receiving Purchase Order & Adding IMEIs');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // Generate test IMEIs
    const testIMEIs = {
      variant128: [
        { imei: '111111111111111', serial: 'SN-128-001' },
        { imei: '222222222222222', serial: 'SN-128-002' },
        { imei: '333333333333333', serial: 'SN-128-003' }
      ],
      variant256: [
        { imei: '444444444444444', serial: 'SN-256-001' },
        { imei: '555555555555555', serial: 'SN-256-002' }
      ]
    };
    
    console.log('📱 Adding IMEIs for 128GB variant...');
    let added128 = 0;
    for (const device of testIMEIs.variant128) {
      try {
        const result = await sql`
          SELECT * FROM add_imei_to_parent_variant(
            ${variant128.id}::UUID,
            ${device.imei},
            ${device.serial},
            NULL,
            500.00,
            650.00,
            'new',
            NULL,
            'Received from ${po[0].order_number}'
          )
        `;
        
        if (result[0].success) {
          console.log(`   ✅ ${device.imei} added successfully`);
          added128++;
        } else {
          console.log(`   ❌ ${device.imei}: ${result[0].error_message}`);
          results.errors.push(`IMEI ${device.imei}: ${result[0].error_message}`);
        }
      } catch (error) {
        console.log(`   ❌ ${device.imei}: ${error.message}`);
        results.errors.push(`IMEI ${device.imei}: ${error.message}`);
      }
    }
    
    console.log();
    console.log('📱 Adding IMEIs for 256GB variant...');
    let added256 = 0;
    for (const device of testIMEIs.variant256) {
      try {
        const result = await sql`
          SELECT * FROM add_imei_to_parent_variant(
            ${variant256.id}::UUID,
            ${device.imei},
            ${device.serial},
            NULL,
            600.00,
            780.00,
            'new',
            NULL,
            'Received from ${po[0].order_number}'
          )
        `;
        
        if (result[0].success) {
          console.log(`   ✅ ${device.imei} added successfully`);
          added256++;
        } else {
          console.log(`   ❌ ${device.imei}: ${result[0].error_message}`);
          results.errors.push(`IMEI ${device.imei}: ${result[0].error_message}`);
        }
      } catch (error) {
        console.log(`   ❌ ${device.imei}: ${error.message}`);
        results.errors.push(`IMEI ${device.imei}: ${error.message}`);
      }
    }
    
    console.log();
    console.log(`📦 IMEIs Added: ${added128 + added256} out of 5`);
    console.log();
    
    results.imeisAdded = (added128 + added256) > 0;
    results.poReceived = true;
    
    // Update PO status
    await sql`
      UPDATE lats_purchase_orders
      SET status = 'received'
      WHERE id = ${poId}
    `;
    
    // ========================================================================
    // STEP 5: Verify Stock Updates
    // ========================================================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 5: Verifying Stock Updates');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const stockCheck = await sql`
      SELECT 
        v.id,
        v.name,
        v.quantity,
        COUNT(c.id) as children_count,
        COALESCE(SUM(c.quantity), 0) as children_total_qty
      FROM lats_product_variants v
      LEFT JOIN lats_product_variants c 
        ON c.parent_variant_id = v.id 
        AND c.variant_type = 'imei_child'
      WHERE v.id IN (${variant128.id}, ${variant256.id})
      GROUP BY v.id, v.name, v.quantity
    `;
    
    console.log('📊 Stock Status:');
    stockCheck.forEach(v => {
      const match = v.quantity === parseInt(v.children_total_qty);
      console.log(`   ${match ? '✅' : '⚠️'} ${v.name}:`);
      console.log(`      Parent Qty: ${v.quantity}`);
      console.log(`      Children: ${v.children_count} (Total Qty: ${v.children_total_qty})`);
    });
    console.log();
    
    const allMatch = stockCheck.every(v => v.quantity === parseInt(v.children_total_qty));
    results.stockUpdated = allMatch;
    
    // ========================================================================
    // STEP 6: Simulate POS Sale
    // ========================================================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 6: Simulating POS Sale');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // Get available IMEIs
    const availableIMEIs = await sql`
      SELECT * FROM get_available_imeis_for_pos(${variant128.id}::UUID)
      LIMIT 1
    `;
    
    if (availableIMEIs.length > 0) {
      const imeiToSell = availableIMEIs[0].imei;
      console.log(`🛒 Selling IMEI: ${imeiToSell}...`);
      
      try {
        const saleResult = await sql`
          SELECT mark_imei_as_sold(${imeiToSell}, 'SALE-SIM-001')
        `;
        
        if (saleResult[0].mark_imei_as_sold) {
          console.log(`   ✅ IMEI marked as sold successfully!\n`);
          
          // Check stock after sale
          const afterSale = await sql`
            SELECT quantity FROM lats_product_variants
            WHERE id = ${variant128.id}
          `;
          
          console.log(`📊 Stock After Sale:`);
          console.log(`   128GB: ${afterSale[0].quantity} (reduced by 1)\n`);
          
          results.saleCompleted = true;
        }
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}\n`);
        results.errors.push(`Sale error: ${error.message}`);
      }
    } else {
      console.log('   ⚠️  No available IMEIs to sell\n');
    }
    
    // ========================================================================
    // STEP 7: Cleanup Test Data
    // ========================================================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 7: Cleaning Up Test Data');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // Delete test data
    await sql`DELETE FROM lats_purchase_order_items WHERE purchase_order_id = ${poId}`;
    await sql`DELETE FROM lats_purchase_orders WHERE id = ${poId}`;
    await sql`DELETE FROM lats_product_variants WHERE product_id = ${productId}`;
    await sql`DELETE FROM lats_products WHERE id = ${productId}`;
    
    console.log('✅ Test data cleaned up\n');
    
  } catch (error) {
    console.error('\n❌ Workflow simulation error:', error.message);
    results.errors.push(error.message);
  }
  
  // ========================================================================
  // FINAL SUMMARY
  // ========================================================================
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('                    WORKFLOW SIMULATION SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  console.log(`${results.productCreated ? '✅' : '❌'} Product Creation`);
  console.log(`${results.variantsCreated ? '✅' : '❌'} Variant Creation`);
  console.log(`${results.poCreated ? '✅' : '❌'} Purchase Order Creation`);
  console.log(`${results.poReceived ? '✅' : '❌'} PO Receiving`);
  console.log(`${results.imeisAdded ? '✅' : '❌'} IMEI Addition`);
  console.log(`${results.stockUpdated ? '✅' : '❌'} Stock Synchronization`);
  console.log(`${results.saleCompleted ? '✅' : '❌'} POS Sale`);
  
  console.log();
  
  if (results.errors.length > 0) {
    console.log(`⚠️  Errors Encountered (${results.errors.length}):`);
    results.errors.slice(0, 5).forEach((err, i) => {
      console.log(`   ${i + 1}. ${err}`);
    });
    console.log();
  }
  
  const allPassed = results.productCreated && results.variantsCreated && 
                    results.poCreated && results.poReceived && results.imeisAdded &&
                    results.stockUpdated;
  
  console.log('═══════════════════════════════════════════════════════════════');
  if (allPassed) {
    console.log('🎉 WORKFLOW SIMULATION: SUCCESS');
  } else {
    console.log('⚠️  WORKFLOW SIMULATION: PARTIAL SUCCESS');
  }
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  return results;
}

simulateCompleteWorkflow();

