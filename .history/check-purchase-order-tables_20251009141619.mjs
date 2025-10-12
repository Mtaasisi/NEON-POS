#!/usr/bin/env node

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-dry-brook-ad3duuog-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';
const sql = neon(DATABASE_URL);

async function checkPurchaseOrderTables() {
  try {
    console.log('\n🔍 Checking Purchase Order Tables');
    console.log('==================================\n');
    
    // Check what purchase order tables exist
    console.log('1️⃣ Checking existing tables...');
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%purchase%'
      ORDER BY table_name
    `;
    
    console.log('   Purchase order related tables:');
    if (tables.length > 0) {
      tables.forEach(t => console.log(`   - ${t.table_name}`));
    } else {
      console.log('   - No purchase order tables found');
    }
    console.log('');
    
    // Check if lats_purchase_order_items exists
    console.log('2️⃣ Checking lats_purchase_order_items table...');
    const itemsTableExists = await sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'lats_purchase_order_items'
      ) as exists
    `;
    
    if (itemsTableExists[0].exists) {
      console.log('   ✅ lats_purchase_order_items table exists');
      
      // Check columns
      const columns = await sql`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'lats_purchase_order_items'
        ORDER BY ordinal_position
      `;
      
      console.log('   Columns:');
      columns.forEach(c => console.log(`     - ${c.column_name} (${c.data_type})`));
    } else {
      console.log('   ❌ lats_purchase_order_items table does not exist');
    }
    console.log('');
    
    // Check if lats_purchase_orders exists
    console.log('3️⃣ Checking lats_purchase_orders table...');
    const ordersTableExists = await sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'lats_purchase_orders'
      ) as exists
    `;
    
    if (ordersTableExists[0].exists) {
      console.log('   ✅ lats_purchase_orders table exists');
    } else {
      console.log('   ❌ lats_purchase_orders table does not exist');
    }
    console.log('');
    
    // Check if lats_suppliers exists
    console.log('4️⃣ Checking lats_suppliers table...');
    const suppliersTableExists = await sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'lats_suppliers'
      ) as exists
    `;
    
    if (suppliersTableExists[0].exists) {
      console.log('   ✅ lats_suppliers table exists');
    } else {
      console.log('   ❌ lats_suppliers table does not exist');
    }
    console.log('');
    
    console.log('==================================');
    console.log('📊 PURCHASE ORDER TABLES STATUS');
    console.log('==================================\n');
    
    const missingTables = [];
    if (!itemsTableExists[0].exists) missingTables.push('lats_purchase_order_items');
    if (!ordersTableExists[0].exists) missingTables.push('lats_purchase_orders');
    if (!suppliersTableExists[0].exists) missingTables.push('lats_suppliers');
    
    if (missingTables.length === 0) {
      console.log('✅ All purchase order tables exist!');
    } else {
      console.log(`❌ Missing tables: ${missingTables.join(', ')}`);
      console.log('\nThis explains the purchase order history errors!');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

checkPurchaseOrderTables();

