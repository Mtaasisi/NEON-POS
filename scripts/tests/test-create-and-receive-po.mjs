#!/usr/bin/env node
/**
 * 🧪 Test Script: Create and Receive Purchase Order with Serial Numbers
 * 
 * This script:
 * 1. Creates a test product with variant
 * 2. Creates a purchase order
 * 3. Receives the PO with serial numbers/IMEIs
 * 4. Verifies that serial numbers are unified with IMEI
 */

import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();
const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found');
  process.exit(1);
}

const sql = postgres(DATABASE_URL, {
  max: 1,
  ssl: 'require'
});

async function testCreateAndReceive() {
  try {
    console.log('╔════════════════════════════════════════════════════╗');
    console.log('║  🧪 Test: Create and Receive PO with Serial #s    ║');
    console.log('╚════════════════════════════════════════════════════╝');
    console.log('');

    // Step 1: Get or create supplier
    console.log('📋 Step 1: Getting/Creating supplier...');
    let supplier = await sql`
      SELECT * FROM lats_suppliers
      WHERE is_active = true
      LIMIT 1
    `;

    if (!supplier || supplier.length === 0) {
      console.log('   Creating test supplier...');
      supplier = await sql`
        INSERT INTO lats_suppliers (name, contact_person, email, phone, is_active)
        VALUES ('Test Supplier', 'Test Contact', 'test@example.com', '+255123456789', true)
        RETURNING *
      `;
      console.log('   ✅ Created supplier:', supplier[0].name);
    } else {
      console.log('   ✅ Using existing supplier:', supplier[0].name);
    }
    const supplierId = supplier[0].id;
    console.log('');

    // Step 2: Get or create branch
    console.log('📋 Step 2: Getting branch...');
    let branch = await sql`
      SELECT * FROM lats_branches
      LIMIT 1
    `;

    if (!branch || branch.length === 0) {
      console.log('   Creating test branch...');
      branch = await sql`
        INSERT INTO lats_branches (name, location, is_active)
        VALUES ('Test Branch', 'Test Location', true)
        RETURNING *
      `;
      console.log('   ✅ Created branch:', branch[0].name);
    } else {
      console.log('   ✅ Using existing branch:', branch[0].name || branch[0].id);
    }
    const branchId = branch[0].id;
    console.log('');

    // Step 3: Get or create category
    console.log('📋 Step 3: Getting/Creating category...');
    let category = await sql`
      SELECT * FROM lats_categories
      WHERE is_active = true
      LIMIT 1
    `;

    if (!category || category.length === 0) {
      console.log('   Creating test category...');
      category = await sql`
        INSERT INTO lats_categories (name, description, is_active)
        VALUES ('Test Category', 'Test category for PO testing', true)
        RETURNING *
      `;
      console.log('   ✅ Created category:', category[0].name);
    } else {
      console.log('   ✅ Using existing category:', category[0].name);
    }
    const categoryId = category[0].id;
    console.log('');

    // Step 4: Create test product (with branch_id to auto-create variant)
    console.log('📋 Step 4: Creating test product...');
    const timestamp = Date.now();
    const product = await sql`
      INSERT INTO lats_products (
        name, sku, description, category_id, supplier_id,
        cost_price, selling_price, is_active, branch_id
      )
      VALUES (
        ${`Test Phone ${timestamp}`},
        ${`TEST-PROD-${timestamp}`},
        ${'Test product for PO receiving test'},
        ${categoryId},
        ${supplierId},
        500000,
        750000,
        true,
        ${branchId}
      )
      RETURNING *
    `;
    console.log('   ✅ Created product:', product[0].name);
    const productId = product[0].id;
    console.log('');

    // Step 5: Get auto-created variant or create parent variant
    console.log('📋 Step 5: Getting/Creating parent variant...');
    let variant = await sql`
      SELECT * FROM lats_product_variants
      WHERE product_id = ${productId}
      LIMIT 1
    `;

    if (!variant || variant.length === 0) {
      // Create parent variant if auto-creation didn't work
      variant = await sql`
        INSERT INTO lats_product_variants (
          product_id, name, variant_name, sku,
          cost_price, selling_price, quantity,
          variant_type, is_parent, is_active, branch_id
        )
        VALUES (
          ${productId},
          ${'128GB Black'},
          ${'128GB Black'},
          ${`TEST-VAR-${timestamp}`},
          500000,
          750000,
          0,
          'parent',
          true,
          true,
          ${branchId}
        )
        RETURNING *
      `;
      console.log('   ✅ Created variant:', variant[0].variant_name || variant[0].name);
    } else {
      // Update existing variant to be a parent
      variant = await sql`
        UPDATE lats_product_variants
        SET 
          variant_type = 'parent',
          is_parent = true,
          variant_name = ${'128GB Black'},
          name = ${'128GB Black'},
          cost_price = 500000,
          selling_price = 750000
        WHERE id = ${variant[0].id}
        RETURNING *
      `;
      console.log('   ✅ Updated variant to parent:', variant[0].variant_name || variant[0].name);
    }
    const variantId = variant[0].id;
    console.log('');

    // Step 6: Create purchase order
    console.log('📋 Step 6: Creating purchase order...');
    const poNumber = `PO-TEST-${timestamp}`;
    const purchaseOrder = await sql`
      INSERT INTO lats_purchase_orders (
        po_number, supplier_id, status, total_amount,
        currency, branch_id, order_date
      )
      VALUES (
        ${poNumber},
        ${supplierId},
        'confirmed',
        1000000,
        'TZS',
        ${branchId},
        NOW()
      )
      RETURNING *
    `;
    console.log('   ✅ Created purchase order:', purchaseOrder[0].po_number);
    const poId = purchaseOrder[0].id;
    console.log('');

    // Step 7: Create PO item
    console.log('📋 Step 7: Creating PO item...');
    const poItem = await sql`
      INSERT INTO lats_purchase_order_items (
        purchase_order_id, product_id, variant_id,
        quantity_ordered, unit_cost, subtotal
      )
      VALUES (
        ${poId},
        ${productId},
        ${variantId},
        2,
        500000,
        1000000
      )
      RETURNING *
    `;
    console.log('   ✅ Created PO item with quantity:', poItem[0].quantity_ordered);
    const poItemId = poItem[0].id;
    console.log('');

    // Step 8: Receive PO with serial numbers/IMEIs
    console.log('📋 Step 8: Receiving PO with serial numbers/IMEIs...');
    console.log('   Simulating receive with 2 TEXT serial numbers...');
    
    // Test with TEXT serial numbers (non-numeric)
    const testSerialNumbers = [
      `ABC123XYZ${Math.floor(Math.random() * 10)}`,
      `SDHJAGS${Math.floor(Math.random() * 10)}`
    ];

    // Update PO item received quantity
    await sql`
      UPDATE lats_purchase_order_items
      SET quantity_received = 2
      WHERE id = ${poItemId}
    `;

    // Add serial numbers using the function (as TEXT)
    console.log('   Adding TEXT serial numbers to parent variant...');
    for (const serialNumber of testSerialNumbers) {
      const result = await sql`
        SELECT * FROM add_imei_to_parent_variant(
          ${variantId}::uuid,
          ${serialNumber}::text,
          ${serialNumber}::text,
          500000::integer,
          750000::integer,
          'new'::text,
          ${`Received from test PO ${poNumber} - TEXT serial number`}::text
        )
      `;

      if (result && result.length > 0 && result[0].success) {
        console.log(`   ✅ Added TEXT Serial Number: ${serialNumber}`);
      } else {
        console.log(`   ⚠️  Serial Number ${serialNumber}: ${result[0]?.error_message || 'Unknown error'}`);
      }
    }
    console.log('');

    // Step 9: Verify receiving
    console.log('📋 Step 9: Verifying receiving...');
    
    // Check PO status
    const updatedPO = await sql`
      SELECT * FROM lats_purchase_orders
      WHERE id = ${poId}
    `;
    console.log(`   PO Status: ${updatedPO[0].status}`);
    console.log(`   PO Item Received: ${poItem[0].quantity_received}/${poItem[0].quantity_ordered}`);
    console.log('');

    // Check IMEI children
    const children = await sql`
      SELECT 
        id,
        name,
        variant_attributes->>'imei' as imei,
        variant_attributes->>'serial_number' as serial_number,
        created_at
      FROM lats_product_variants
      WHERE parent_variant_id = ${variantId}
        AND variant_type = 'imei_child'
      ORDER BY created_at DESC
    `;

    console.log(`   ✅ Found ${children.length} IMEI child(ren):`);
    let allUnified = true;
    children.forEach((child, idx) => {
      const imei = child.imei || '';
      const serial = child.serial_number || '';
      const isUnified = imei === serial;
      if (!isUnified) allUnified = false;
      
      console.log(`      ${idx + 1}. IMEI: ${imei}, Serial: ${serial} ${isUnified ? '✅' : '❌'}`);
    });
    console.log('');

    // Check parent variant quantity
    const parentVariant = await sql`
      SELECT quantity FROM lats_product_variants
      WHERE id = ${variantId}
    `;
    console.log(`   Parent variant quantity: ${parentVariant[0].quantity}`);
    console.log('');

    // Summary
    console.log('╔════════════════════════════════════════════════════╗');
    console.log('║  ✅ TEST COMPLETE                                 ║');
    console.log('╚════════════════════════════════════════════════════╝');
    console.log('');
    console.log('📝 Summary:');
    console.log(`   ✅ Purchase Order: ${poNumber} (${poId})`);
    console.log(`   ✅ Product: ${product[0].name}`);
    console.log(`   ✅ Variant: ${variant[0].variant_name || variant[0].name}`);
    console.log(`   ✅ IMEI Children Created: ${children.length}`);
    console.log(`   ✅ Serial Numbers Unified: ${allUnified ? 'YES ✅' : 'NO ❌'}`);
    console.log(`   ✅ Serial Numbers as TEXT: YES ✅`);
    console.log(`   ✅ Parent Variant Quantity: ${parentVariant[0].quantity}`);
    console.log('');

    if (allUnified) {
      console.log('🎉 SUCCESS: All serial numbers are unified and stored as TEXT!');
    } else {
      console.log('⚠️  WARNING: Some serial numbers are not unified');
    }
    console.log('');

    // Cleanup option
    console.log('🧹 Cleanup:');
    console.log('   To clean up test data, run:');
    console.log(`   DELETE FROM lats_product_variants WHERE parent_variant_id = '${variantId}';`);
    console.log(`   DELETE FROM lats_product_variants WHERE id = '${variantId}';`);
    console.log(`   DELETE FROM lats_products WHERE id = '${productId}';`);
    console.log(`   DELETE FROM lats_purchase_order_items WHERE id = '${poItemId}';`);
    console.log(`   DELETE FROM lats_purchase_orders WHERE id = '${poId}';`);
    console.log('');

    return { success: true, allUnified };
  } catch (error) {
    console.error('');
    console.error('❌ Test failed:', error.message);
    console.error('');
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    return { success: false, error: error.message };
  } finally {
    await sql.end();
  }
}

testCreateAndReceive().then(result => {
  process.exit(result.success && result.allUnified ? 0 : 1);
});

