#!/usr/bin/env node

/**
 * Automatically Add Pending Trade-In Transactions to Inventory
 * This bypasses the pricing modal and adds devices with default pricing
 */

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.VITE_DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ Missing DATABASE_URL');
  console.error('Please set VITE_DATABASE_URL in your .env file');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

// Default markup percentage for resale price
const DEFAULT_MARKUP = 30; // 30%

async function getOrCreateTradeInCategory(branchId) {
  try {
    // Try to find existing "Trade-In Items" category
    const existingCategory = await sql`
      SELECT id FROM lats_categories
      WHERE name = 'Trade-In Items'
        AND branch_id = ${branchId}
      LIMIT 1
    `;

    if (existingCategory && existingCategory.length > 0) {
      return existingCategory[0].id;
    }

    // Create new category if it doesn't exist
    try {
      const newCategory = await sql`
        INSERT INTO lats_categories (name, description, branch_id, is_active)
        VALUES ('Trade-In Items', 'Devices acquired through trade-in transactions', ${branchId}, true)
        RETURNING id
      `;

      if (newCategory && newCategory.length > 0) {
        return newCategory[0].id;
      }
    } catch (insertError) {
      console.error('⚠️  Error creating Trade-In category:', insertError.message);
      // Fall back to first available category
      const fallbackCategory = await sql`
        SELECT id FROM lats_categories
        WHERE branch_id = ${branchId}
        LIMIT 1
      `;
      
      return fallbackCategory?.[0]?.id || null;
    }

    return null;
  } catch (error) {
    console.error('⚠️  Error in getOrCreateTradeInCategory:', error.message);
    return null;
  }
}

async function addTradeInToInventory(transaction, categoryId) {
  try {
    const branchId = transaction.branch_id || '00000000-0000-0000-0000-000000000001';
    
    // Create product name and SKU
    const productName = `${transaction.device_name} - ${transaction.device_model} (Trade-In)`;
    const sku = `TI-${transaction.device_imei || Date.now()}`;
    const costPrice = Number(transaction.final_trade_in_value || 0);
    const sellingPrice = costPrice * (1 + DEFAULT_MARKUP / 100); // 30% markup
    const needsRepair = transaction.needs_repair || false;

    console.log(`\n   📦 Adding ${productName}...`);

    // Step 1: Create the product
    const description = `Trade-in device - ${transaction.condition_rating} condition. ${transaction.condition_description || ''}`;
    const productResult = await sql`
      INSERT INTO lats_products (name, description, sku, category_id, branch_id, cost_price, selling_price, stock_quantity, is_active, created_at)
      VALUES (${productName}, ${description}, ${sku}, ${categoryId}, ${branchId}, ${costPrice}, ${sellingPrice}, 1, ${!needsRepair}, NOW())
      RETURNING *
    `;

    if (!productResult || productResult.length === 0) {
      console.error(`   ❌ Failed to create product`);
      return { success: false, error: 'Failed to create product' };
    }

    const product = productResult[0];
    console.log(`   ✓ Product created (ID: ${product.id})`);

    // Step 2: Create a variant with the IMEI
    const variantName = transaction.device_imei ? `IMEI: ${transaction.device_imei}` : 'Default';
    const variantAttributes = JSON.stringify({
      imei: transaction.device_imei,
      serial_number: transaction.device_serial_number,
      condition: transaction.condition_rating,
      trade_in_transaction: transaction.id,
      original_owner: transaction.customer_id,
      damage_items: transaction.damage_items,
    });

    const variantResult = await sql`
      INSERT INTO lats_product_variants (product_id, variant_name, sku, cost_price, selling_price, stock_quantity, is_active, variant_attributes)
      VALUES (${product.id}, ${variantName}, ${sku}, ${costPrice}, ${sellingPrice}, 1, ${!needsRepair}, ${variantAttributes}::jsonb)
      RETURNING *
    `;

    if (!variantResult || variantResult.length === 0) {
      console.error(`   ❌ Failed to create variant`);
      return { success: false, error: 'Failed to create variant' };
    }

    const variant = variantResult[0];
    console.log(`   ✓ Variant created (ID: ${variant.id})`);

    // Step 3: Create inventory item record
    const notes = needsRepair ? 'Trade-in device - needs repair' : 'Trade-in device ready for sale';
    const status = needsRepair ? 'needs_repair' : 'available';
    
    const inventoryResult = await sql`
      INSERT INTO lats_inventory_items (product_id, variant_id, branch_id, quantity, location_id, status, notes)
      VALUES (${product.id}, ${variant.id}, ${branchId}, 1, NULL, ${status}, ${notes})
      RETURNING *
    `;

    if (!inventoryResult || inventoryResult.length === 0) {
      console.error(`   ❌ Failed to create inventory item`);
      return { success: false, error: 'Failed to create inventory item' };
    }

    const inventoryItem = inventoryResult[0];
    console.log(`   ✓ Inventory item created (ID: ${inventoryItem.id})`);

    // Step 4: Update trade-in transaction with inventory references
    const repairStatus = needsRepair ? 'pending' : 'completed';
    await sql`
      UPDATE lats_trade_in_transactions
      SET inventory_item_id = ${inventoryItem.id},
          needs_repair = ${needsRepair},
          repair_status = ${repairStatus},
          ready_for_resale = ${!needsRepair},
          resale_price = ${sellingPrice}
      WHERE id = ${transaction.id}
    `;

    console.log(`   ✓ Transaction updated with inventory link`);

    // Step 5: Create stock movement record
    try {
      await sql`
        INSERT INTO lats_stock_movements (product_id, variant_id, branch_id, movement_type, quantity, reference_type, reference_id, notes)
        VALUES (${product.id}, ${variant.id}, ${branchId}, 'trade_in', 1, 'trade_in_transaction', ${transaction.id}, 'Trade-in from customer (auto-added by script)')
      `;
      console.log(`   ✓ Stock movement recorded`);
    } catch (movementError) {
      console.error(`   ⚠️  Failed to create stock movement: ${movementError.message}`);
    }

    console.log(`   ✅ SUCCESS: Added to inventory!`);
    console.log(`      - SKU: ${sku}`);
    console.log(`      - Cost: ${costPrice.toLocaleString()} TZS`);
    console.log(`      - Selling Price: ${sellingPrice.toLocaleString()} TZS (${DEFAULT_MARKUP}% markup)`);
    console.log(`      - Status: ${needsRepair ? 'Needs Repair' : 'Ready for Sale'}`);

    return {
      success: true,
      data: { product, variant, inventoryItem },
    };
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function addAllPendingTradeIns() {
  console.log('\n🔍 Finding pending trade-in transactions...\n');

  try {
    // Find trade-in transactions that don't have an inventory_item_id
    const pendingTradeIns = await sql`
      SELECT 
        id,
        transaction_number,
        device_name,
        device_model,
        device_imei,
        device_serial_number,
        condition_rating,
        condition_description,
        final_trade_in_value,
        needs_repair,
        damage_items,
        customer_id,
        branch_id,
        inventory_item_id,
        created_at
      FROM lats_trade_in_transactions
      WHERE inventory_item_id IS NULL
        AND status = 'completed'
      ORDER BY created_at DESC
    `;

    if (!pendingTradeIns || pendingTradeIns.length === 0) {
      console.log('✅ No pending trade-ins found. All trade-ins have been added to inventory!');
      return;
    }

    console.log(`📋 Found ${pendingTradeIns.length} pending trade-in(s)\n`);
    console.log('─'.repeat(100));

    let successCount = 0;
    let failCount = 0;

    for (const tradeIn of pendingTradeIns) {
      console.log(`\n${successCount + failCount + 1}. ${tradeIn.transaction_number || tradeIn.id}`);
      console.log(`   Device: ${tradeIn.device_name} ${tradeIn.device_model}`);

      // Get or create category for this branch
      const categoryId = await getOrCreateTradeInCategory(
        tradeIn.branch_id || '00000000-0000-0000-0000-000000000001'
      );

      if (!categoryId) {
        console.log('   ❌ Failed to get/create category');
        failCount++;
        continue;
      }

      const result = await addTradeInToInventory(tradeIn, categoryId);
      
      if (result.success) {
        successCount++;
      } else {
        failCount++;
      }
    }

    console.log('\n' + '─'.repeat(100));
    console.log('\n📊 SUMMARY:');
    console.log(`   ✅ Successfully added: ${successCount}`);
    console.log(`   ❌ Failed: ${failCount}`);
    console.log(`   📦 Total processed: ${successCount + failCount}`);
    
    if (successCount > 0) {
      console.log('\n✨ Trade-in devices are now in inventory and ready for resale!');
      console.log(`   Category: "Trade-In Items"`);
      console.log(`   Default Markup: ${DEFAULT_MARKUP}%`);
    }

  } catch (error) {
    console.error('❌ Error:', error?.message || error);
  }
}

addAllPendingTradeIns();

