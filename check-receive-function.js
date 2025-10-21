#!/usr/bin/env node
/**
 * CHECK IF RECEIVE FUNCTION EXISTS
 * Verifies the database function needed for receiving purchase orders
 */

import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env') });

const DATABASE_URL = process.env.VITE_DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ Missing VITE_DATABASE_URL in .env file');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function checkReceiveFunction() {
  console.log('\n🔍 CHECKING PURCHASE ORDER RECEIVE FUNCTION\n');
  console.log('='.repeat(60));

  try {
    // 1. Check if the function exists
    console.log('\n📋 Step 1: Checking if complete_purchase_order_receive function exists...');
    
    const functionCheck = await sql`
      SELECT 
        p.proname as function_name,
        pg_catalog.pg_get_function_arguments(p.oid) as arguments,
        pg_catalog.pg_get_function_result(p.oid) as return_type
      FROM pg_catalog.pg_proc p
      LEFT JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
      WHERE p.proname = 'complete_purchase_order_receive'
      AND n.nspname = 'public'
    `;

    if (functionCheck && functionCheck.length > 0) {
      console.log('✅ Function EXISTS!');
      console.log(`   Name: ${functionCheck[0].function_name}`);
      console.log(`   Arguments: ${functionCheck[0].arguments}`);
      console.log(`   Returns: ${functionCheck[0].return_type}`);
    } else {
      console.log('❌ Function DOES NOT EXIST!');
      console.log('\n💡 To fix this, run:');
      console.log('   node run-complete-receive-migration.js');
      console.log('\n   Or manually run the SQL migration from:');
      console.log('   migrations/create_complete_purchase_order_receive_function.sql');
      return;
    }

    // 2. Get all purchase orders with details
    console.log('\n📋 Step 2: Checking purchase orders...');
    
    const orders = await sql`
      SELECT 
        po.id,
        po.order_number,
        po.status,
        po.payment_status,
        po.total_amount,
        po.created_at,
        COUNT(poi.id) as item_count,
        SUM(poi.quantity_ordered) as total_ordered,
        SUM(COALESCE(poi.quantity_received, 0)) as total_received
      FROM lats_purchase_orders po
      LEFT JOIN lats_purchase_order_items poi ON poi.purchase_order_id = po.id
      GROUP BY po.id, po.order_number, po.status, po.payment_status, po.total_amount, po.created_at
      ORDER BY po.created_at DESC
      LIMIT 10
    `;

    if (!orders || orders.length === 0) {
      console.log('⚠️  No purchase orders found');
      return;
    }

    console.log(`✅ Found ${orders.length} recent purchase orders\n`);

    // 3. Analyze each order
    console.log('📊 PURCHASE ORDER ANALYSIS:');
    console.log('='.repeat(60));

    orders.forEach((order, index) => {
      console.log(`\n${index + 1}. Order #${order.order_number}`);
      console.log(`   ID: ${order.id}`);
      console.log(`   Status: ${order.status}`);
      console.log(`   Payment Status: ${order.payment_status || 'unknown'}`);
      console.log(`   Total Amount: $${order.total_amount || 0}`);
      console.log(`   Items: ${order.item_count} items`);
      console.log(`   Quantities: ${order.total_received}/${order.total_ordered} received`);
      
      const totalOrdered = parseInt(order.total_ordered) || 0;
      const totalReceived = parseInt(order.total_received) || 0;
      const remaining = totalOrdered - totalReceived;
      
      // Check if can receive with current frontend rules
      const canReceiveStrict = 
        ['shipped', 'partial_received'].includes(order.status) &&
        order.payment_status === 'paid' &&
        remaining > 0;
      
      // Check if can receive with relaxed rules (updated frontend)
      const canReceiveRelaxed = 
        ['shipped', 'partial_received', 'confirmed', 'sent'].includes(order.status) &&
        remaining > 0;
      
      console.log(`   Can Receive (old rules): ${canReceiveStrict ? '✅ YES' : '❌ NO'}`);
      console.log(`   Can Receive (new rules): ${canReceiveRelaxed ? '✅ YES' : '❌ NO'}`);
      
      // Explain why not
      if (!canReceiveRelaxed) {
        const reasons = [];
        if (!['shipped', 'partial_received', 'confirmed', 'sent'].includes(order.status)) {
          reasons.push(`Status is '${order.status}' (need shipped/partial_received/confirmed/sent)`);
        }
        if (remaining <= 0) {
          reasons.push(`Already fully received (${totalReceived}/${totalOrdered})`);
        }
        
        if (reasons.length > 0) {
          console.log(`   ⚠️  Blocking reasons:`);
          reasons.forEach(reason => console.log(`      - ${reason}`));
        }
      }
      
      if (!canReceiveStrict && canReceiveRelaxed) {
        const oldReasons = [];
        if (!['shipped', 'partial_received'].includes(order.status)) {
          oldReasons.push(`Status '${order.status}' not allowed`);
        }
        if (order.payment_status !== 'paid') {
          oldReasons.push(`Payment status '${order.payment_status}' requires 'paid'`);
        }
        
        if (oldReasons.length > 0) {
          console.log(`   ℹ️  Was blocked by old rules:`);
          oldReasons.forEach(reason => console.log(`      - ${reason}`));
        }
      }
    });

    // 4. Check inventory_items table
    console.log('\n\n📦 Step 3: Checking inventory items created from POs...');
    const inventoryItems = await sql`
      SELECT 
        COUNT(*) as count,
        MAX(created_at) as last_created
      FROM inventory_items
      WHERE purchase_order_id IS NOT NULL
    `;

    if (inventoryItems && inventoryItems.length > 0) {
      const count = inventoryItems[0].count;
      const lastCreated = inventoryItems[0].last_created;
      console.log(`✅ Found ${count} inventory items from purchase orders`);
      if (lastCreated) {
        console.log(`   Last created: ${new Date(lastCreated).toLocaleString()}`);
      }
    } else {
      console.log('⚠️  No inventory items found from purchase orders');
    }

    // 5. Recommendations
    console.log('\n\n💡 RECOMMENDATIONS:');
    console.log('='.repeat(60));
    
    const receivableOrders = orders.filter(order => 
      ['shipped', 'partial_received', 'confirmed', 'sent'].includes(order.status) &&
      (parseInt(order.total_ordered) - parseInt(order.total_received)) > 0
    );
    
    if (receivableOrders.length > 0) {
      console.log('\n✅ Orders that CAN be received now:');
      receivableOrders.forEach(order => {
        console.log(`   - Order #${order.order_number} (${order.status})`);
      });
    } else {
      console.log('\n⚠️  No orders available to receive');
      console.log('   Make sure your order is in one of these statuses:');
      console.log('   - shipped, partial_received, confirmed, or sent');
    }
    
    console.log('\n📝 Next steps:');
    console.log('   1. Refresh your browser page');
    console.log('   2. Try receiving the order again');
    console.log('   3. Check the browser console for detailed logs');

  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Check complete!\n');
}

// Run check
checkReceiveFunction();

