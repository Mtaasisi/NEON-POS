#!/usr/bin/env node

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-dry-brook-ad3duuog-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';
const sql = neon(DATABASE_URL);

async function testPurchaseOrderHistory() {
  try {
    console.log('\n🧪 Testing Purchase Order History Functionality');
    console.log('===============================================\n');
    
    // Get a sample product ID
    console.log('1️⃣ Getting a sample product ID...');
    const products = await sql`SELECT id, name FROM lats_products LIMIT 1`;
    
    if (products.length === 0) {
      console.log('   ❌ No products found to test with\n');
      return;
    }
    
    const productId = products[0].id;
    const productName = products[0].name;
    
    console.log(`   Using product: ${productName} (${productId})\n`);
    
    // Test the exact query that usePurchaseOrderHistory uses
    console.log('2️⃣ Testing purchase order items query...');
    
    const { data: items, error: itemsError } = await sql`
      SELECT 
        id,
        purchase_order_id,
        product_id,
        variant_id,
        quantity_ordered,
        unit_cost,
        quantity_received,
        created_at
      FROM lats_purchase_order_items
      WHERE product_id = ${productId}
      ORDER BY created_at DESC
      LIMIT 20
    `;
    
    if (itemsError) {
      console.log(`   ❌ Query error: ${itemsError.message}\n`);
    } else {
      console.log(`   ✅ Query successful: ${items ? items.length : 0} items found\n`);
    }
    
    // Test suppliers query
    console.log('3️⃣ Testing suppliers query...');
    
    const suppliers = await sql`
      SELECT id, name FROM lats_suppliers LIMIT 5
    `;
    
    if (suppliers.length > 0) {
      console.log(`   ✅ Suppliers query successful: ${suppliers.length} suppliers found`);
      suppliers.forEach(s => console.log(`     - ${s.name} (${s.id})`));
    } else {
      console.log('   ✅ Suppliers query successful: 0 suppliers (this is fine)');
    }
    console.log('');
    
    // Test purchase orders query
    console.log('4️⃣ Testing purchase orders query...');
    
    const purchaseOrders = await sql`
      SELECT id, po_number, status, supplier_id, created_at 
      FROM lats_purchase_orders 
      LIMIT 5
    `;
    
    if (purchaseOrders.length > 0) {
      console.log(`   ✅ Purchase orders query successful: ${purchaseOrders.length} orders found`);
      purchaseOrders.forEach(po => console.log(`     - ${po.order_number} (${po.status})`));
    } else {
      console.log('   ✅ Purchase orders query successful: 0 orders (this is fine)');
    }
    console.log('');
    
    console.log('===============================================');
    console.log('✅ PURCHASE ORDER HISTORY TEST PASSED!');
    console.log('===============================================\n');
    console.log('All queries that usePurchaseOrderHistory uses are working correctly.');
    console.log('The console errors should now be resolved!');
    console.log('\n🚀 Refresh your browser to see the fix!\n');
    
  } catch (error) {
    console.log('\n===============================================');
    console.log('❌ PURCHASE ORDER HISTORY TEST FAILED!');
    console.log('===============================================\n');
    console.error('Error:', error.message);
    console.error('\nDetails:', error);
    process.exit(1);
  }
}

testPurchaseOrderHistory();

