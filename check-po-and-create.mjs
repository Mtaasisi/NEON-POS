#!/usr/bin/env node

/**
 * Check if PO-1761424582968 exists, and create it if needed
 */

import postgres from 'postgres';
import 'dotenv/config';

const DATABASE_URL = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment variables');
  process.exit(1);
}

const sql = postgres(DATABASE_URL);

async function main() {
  console.log('🔍 Checking for PO-1761424582968...\n');
  
  try {
    // Check if PO exists
    const pos = await sql`
      SELECT 
        id, 
        po_number, 
        status,
        supplier_id,
        branch_id,
        total_amount,
        created_at
      FROM lats_purchase_orders
      WHERE po_number = 'PO-1761424582968'
      LIMIT 1
    `;
    
    if (pos.length > 0) {
      console.log('✅ Found PO-1761424582968:');
      console.log(JSON.stringify(pos[0], null, 2));
      console.log('\n📦 Fetching items...');
      
      const items = await sql`
        SELECT 
          poi.id,
          poi.product_id,
          poi.variant_id,
          poi.quantity,
          poi.unit_cost,
          p.name as product_name,
          pv.name as variant_name
        FROM lats_purchase_order_items poi
        LEFT JOIN lats_products p ON p.id = poi.product_id
        LEFT JOIN lats_product_variants pv ON pv.id = poi.variant_id
        WHERE poi.purchase_order_id = ${pos[0].id}
      `;
      
      console.log(`\n📋 Found ${items.length} items:`);
      items.forEach((item, idx) => {
        console.log(`  ${idx + 1}. ${item.product_name} ${item.variant_name || ''} - Qty: ${item.quantity}`);
      });
      
      console.log(`\n✅ PO exists! You can proceed with the automated test.`);
      console.log(`   PO ID (UUID): ${pos[0].id}`);
      
    } else {
      console.log('❌ PO-1761424582968 not found in database.');
      console.log('\n📋 Available purchase orders:');
      
      const allPos = await sql`
        SELECT 
          id,
          po_number,
          status,
          total_amount,
          created_at
        FROM lats_purchase_orders
        ORDER BY created_at DESC
        LIMIT 10
      `;
      
      if (allPos.length === 0) {
        console.log('   No purchase orders found.');
      } else {
        allPos.forEach((po, idx) => {
          console.log(`  ${idx + 1}. ${po.po_number} - Status: ${po.status} - Amount: ${po.total_amount}`);
        });
      }
      
      console.log('\n🔧 Creating PO-1761424582968 for testing...');
      
      // Get a supplier and branch
      const suppliers = await sql`SELECT id, name FROM lats_suppliers LIMIT 1`;
      const branches = await sql`SELECT id, name FROM lats_branches LIMIT 1`;
      const users = await sql`SELECT id FROM lats_users LIMIT 1`;
      
      if (suppliers.length === 0 || branches.length === 0 || users.length === 0) {
        console.log('❌ Need at least one supplier, branch, and user to create test PO');
        return;
      }
      
      console.log(`   Using supplier: ${suppliers[0].name}`);
      console.log(`   Using branch: ${branches[0].name}`);
      
      // Get a product with variants for IMEI testing
      const products = await sql`
        SELECT p.id, p.name
        FROM lats_products p
        WHERE EXISTS (
          SELECT 1 FROM lats_product_variants pv 
          WHERE pv.product_id = p.id AND pv.parent_variant_id IS NULL
        )
        LIMIT 1
      `;
      
      if (products.length === 0) {
        console.log('❌ Need at least one product with variants');
        return;
      }
      
      console.log(`   Using product: ${products[0].name}`);
      
      // Get variants for this product
      const variants = await sql`
        SELECT id, name, sku
        FROM lats_product_variants
        WHERE product_id = ${products[0].id}
          AND parent_variant_id IS NULL
        LIMIT 2
      `;
      
      console.log(`   Found ${variants.length} variants`);
      
      // Create PO
      const newPO = await sql`
        INSERT INTO lats_purchase_orders (
          po_number,
          supplier_id,
          branch_id,
          status,
          total_amount,
          notes,
          created_by
        )
        VALUES (
          'PO-1761424582968',
          ${suppliers[0].id},
          ${branches[0].id},
          'sent',
          0,
          'Test PO for IMEI automated testing',
          ${users[0].id}
        )
        RETURNING id, po_number
      `;
      
      console.log(`\n✅ Created PO: ${newPO[0].po_number} (ID: ${newPO[0].id})`);
      
      // Add items to PO
      let totalAmount = 0;
      
      for (let i = 0; i < Math.min(variants.length, 2); i++) {
        const variant = variants[i];
        const quantity = 2; // 2 units per variant for IMEI testing
        const unitCost = 100 + (i * 50); // $100, $150
        totalAmount += quantity * unitCost;
        
        await sql`
          INSERT INTO lats_purchase_order_items (
            purchase_order_id,
            product_id,
            variant_id,
            quantity,
            unit_cost,
            total_cost
          )
          VALUES (
            ${newPO[0].id},
            ${products[0].id},
            ${variant.id},
            ${quantity},
            ${unitCost},
            ${quantity * unitCost}
          )
        `;
        
        console.log(`   Added: ${products[0].name} - ${variant.name} x${quantity} @ $${unitCost}`);
      }
      
      // Update total amount
      await sql`
        UPDATE lats_purchase_orders
        SET total_amount = ${totalAmount}
        WHERE id = ${newPO[0].id}
      `;
      
      console.log(`\n✅ PO-1761424582968 created successfully!`);
      console.log(`   Total Amount: $${totalAmount}`);
      console.log(`   PO ID (UUID): ${newPO[0].id}`);
      console.log(`\n🎯 You can now run the automated test!`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sql.end();
  }
}

main();

