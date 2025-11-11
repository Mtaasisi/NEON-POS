#!/usr/bin/env node

/**
 * Confirm and Add ALL Pending Trade-In Transactions to Inventory
 * Works with 'pending' status - perfect for batch confirming!
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
    // Try to find existing "Trade-In Items" category (check without branch first)
    const existingCategory = await sql`
      SELECT id FROM lats_categories
      WHERE name = 'Trade-In Items'
      LIMIT 1
    `;

    if (existingCategory && existingCategory.length > 0) {
      return existingCategory[0].id;
    }

    // Try to find for specific branch
    const branchCategory = await sql`
      SELECT id FROM lats_categories
      WHERE branch_id = ${branchId}
      LIMIT 1
    `;

    if (branchCategory && branchCategory.length > 0) {
      return branchCategory[0].id;
    }

    // Create new category if nothing exists
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
      // Category might exist, try to fetch it again
      const retryCategory = await sql`
        SELECT id FROM lats_categories
        WHERE name = 'Trade-In Items'
        LIMIT 1
      `;
      
      if (retryCategory && retryCategory.length > 0) {
        return retryCategory[0].id;
      }
      
      console.error('⚠️  Error creating Trade-In category:', insertError.message);
      return null;
    }

    return null;
  } catch (error) {
    console.error('⚠️  Error in getOrCreateTradeInCategory:', error.message);
    return null;
  }
}

async function getOrCreateSupplier(customerName, customerPhone, customerEmail) {
  try {
    const supplierName = `Trade-In: ${customerName}`;
    
    // Check if supplier exists
    const existing = await sql`
      SELECT id FROM lats_suppliers
      WHERE name = ${supplierName}
      LIMIT 1
    `;
    
    if (existing && existing.length > 0) {
      return existing[0].id;
    }
    
    // Create new supplier
    // Mark as trade-in customer so they don't appear in supplier management pages
    const newSupplier = await sql`
      INSERT INTO lats_suppliers (name, contact_person, phone, email, is_active, is_trade_in_customer)
      VALUES (${supplierName}, ${customerName}, ${customerPhone}, ${customerEmail}, true, true)
      RETURNING id
    `;
    
    return newSupplier?.[0]?.id || null;
  } catch (error) {
    console.warn('⚠️  Could not create supplier:', error.message);
    return null;
  }
}

async function addTradeInToInventory(transaction, categoryId, customer) {
  try {
    // Use valid branch ID (DAR branch)
    const branchId = '24cd45b8-1ce1-486a-b055-29d169c3a8ea';
    
    // Check for duplicate IMEI first
    if (transaction.device_imei) {
      const existingIMEI = await sql`
        SELECT p.id, p.name, p.sku 
        FROM lats_products p
        JOIN lats_product_variants v ON v.product_id = p.id
        WHERE v.variant_attributes->>'imei' = ${transaction.device_imei}
        LIMIT 1
      `;
      
      if (existingIMEI && existingIMEI.length > 0) {
        console.log(`   ⚠️  SKIPPED: IMEI ${transaction.device_imei} already exists in inventory`);
        console.log(`      - Product: ${existingIMEI[0].name}`);
        console.log(`      - SKU: ${existingIMEI[0].sku}`);
        return { success: false, error: 'Duplicate IMEI', skipped: true };
      }
    }
    
    // Get customer info
    const customerName = customer?.name || 'Trade-In Customer';
    
    // Create supplier entry for customer
    const supplierId = await getOrCreateSupplier(
      customerName,
      customer?.phone,
      customer?.email
    );
    
    // Create product name and SKU
    const productName = `${transaction.device_name} - ${transaction.device_model} (Trade-In)`;
    const sku = `TI-${Date.now()}-${transaction.device_imei || 'NOIMEI'}`;
    const costPrice = Number(transaction.final_trade_in_value || 0);
    const sellingPrice = costPrice * (1 + DEFAULT_MARKUP / 100); // 30% markup
    const needsRepair = transaction.needs_repair || false;

    console.log(`\n   📦 Adding ${productName}...`);
    if (supplierId) {
      console.log(`   👤 Customer: ${customerName}`);
    }

    // Step 1: Create the product
    const description = `Trade-in from ${customerName} - ${transaction.condition_rating} condition. IMEI: ${transaction.device_imei || 'N/A'}. ${transaction.condition_description || ''}`;
    const productResult = await sql`
      INSERT INTO lats_products (
        name, description, sku, category_id, branch_id, supplier_id,
        cost_price, selling_price, stock_quantity, min_stock_level, is_active, 
        created_at, updated_at
      )
      VALUES (
        ${productName}, ${description}, ${sku}, ${categoryId}, ${branchId}, ${supplierId},
        ${costPrice}, ${sellingPrice}, 1, 0, ${!needsRepair}, 
        NOW(), NOW()
      )
      RETURNING *
    `;

    if (!productResult || productResult.length === 0) {
      console.error(`   ❌ Failed to create product`);
      return { success: false, error: 'Failed to create product' };
    }

    const product = productResult[0];
    console.log(`   ✓ Product created (ID: ${product.id})`);

    // Step 2: Create a variant with the IMEI and customer info
    const variantName = transaction.device_imei ? `IMEI: ${transaction.device_imei}` : 'Default';
    const variantAttributes = JSON.stringify({
      imei: transaction.device_imei,
      serial_number: transaction.device_serial_number,
      condition: transaction.condition_rating,
      trade_in_transaction: transaction.id,
      transaction_number: transaction.transaction_number,
      original_owner: transaction.customer_id,
      customer_name: customerName,
      customer_phone: customer?.phone,
      damage_items: transaction.damage_items,
      source: 'trade-in',
    });

    const variantResult = await sql`
      INSERT INTO lats_product_variants (
        product_id, variant_name, sku, cost_price, selling_price, is_active, variant_attributes
      )
      VALUES (
        ${product.id}, ${variantName}, ${sku}, ${costPrice}, ${sellingPrice}, ${!needsRepair}, ${variantAttributes}::jsonb
      )
      RETURNING *
    `;

    if (!variantResult || variantResult.length === 0) {
      console.error(`   ❌ Failed to create variant`);
      return { success: false, error: 'Failed to create variant' };
    }

    const variant = variantResult[0];
    console.log(`   ✓ Variant created (ID: ${variant.id})`);

    // Step 3: Update trade-in transaction with resale info and status
    await sql`
      UPDATE lats_trade_in_transactions
      SET needs_repair = ${needsRepair},
          ready_for_resale = ${!needsRepair},
          resale_price = ${sellingPrice},
          status = 'completed'
      WHERE id = ${transaction.id}
    `;

    console.log(`   ✓ Transaction updated (status: completed)`);

    // Step 4: Create stock movement record
    try {
      await sql`
        INSERT INTO lats_stock_movements (
          product_id, variant_id, branch_id, movement_type, 
          quantity, new_stock, reference_type, reference_id, reason, notes
        )
        VALUES (
          ${product.id}, ${variant.id}, ${branchId}, 'trade_in',
          1, 1, 'trade_in', ${transaction.id}, 
          'Trade-in from customer', 
          'Trade-in from ${customerName} (auto-confirmed)'
        )
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
    if (supplierId) {
      console.log(`      - Supplier: ${customerName} ✨`);
    }

    return {
      success: true,
      data: { product, variant },
    };
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function confirmAllPendingTradeIns() {
  console.log('\n🔍 Finding ALL pending trade-in transactions...\n');

  try {
    // Find ALL trade-in transactions not yet added to inventory (regardless of status)
    const pendingTradeIns = await sql`
      SELECT 
        t.id,
        t.transaction_number,
        t.device_name,
        t.device_model,
        t.device_imei,
        t.device_serial_number,
        t.condition_rating,
        t.condition_description,
        t.final_trade_in_value,
        t.needs_repair,
        t.damage_items,
        t.customer_id,
        t.branch_id,
        t.status,
        t.created_at,
        c.name as customer_name,
        c.phone,
        c.email
      FROM lats_trade_in_transactions t
      LEFT JOIN customers c ON c.id = t.customer_id
      WHERE NOT EXISTS (
        SELECT 1 FROM lats_products p 
        WHERE p.sku LIKE 'TI-%' || t.device_imei || '%'
      )
      ORDER BY t.created_at DESC
    `;

    if (!pendingTradeIns || pendingTradeIns.length === 0) {
      console.log('✅ No pending trade-ins found. All trade-ins have been added to inventory!');
      return;
    }

    console.log(`📋 Found ${pendingTradeIns.length} pending trade-in(s)\n`);
    console.log('─'.repeat(100));

    let successCount = 0;
    let failCount = 0;
    let skippedCount = 0;

    for (const tradeIn of pendingTradeIns) {
      console.log(`\n${successCount + failCount + skippedCount + 1}. ${tradeIn.transaction_number || tradeIn.id}`);
      console.log(`   Device: ${tradeIn.device_name} ${tradeIn.device_model}`);
      console.log(`   Current Status: ${tradeIn.status}`);

      // Get or create category for this branch
      const categoryId = await getOrCreateTradeInCategory(
        tradeIn.branch_id || '24cd45b8-1ce1-486a-b055-29d169c3a8ea'
      );

      if (!categoryId) {
        console.log('   ❌ Failed to get/create category');
        failCount++;
        continue;
      }

      const customer = {
        name: tradeIn.customer_name,
        phone: tradeIn.phone,
        email: tradeIn.email,
      };

      const result = await addTradeInToInventory(tradeIn, categoryId, customer);
      
      if (result.success) {
        successCount++;
      } else if (result.skipped) {
        skippedCount++;
      } else {
        failCount++;
      }
    }

    console.log('\n' + '─'.repeat(100));
    console.log('\n📊 SUMMARY:');
    console.log(`   ✅ Successfully confirmed: ${successCount}`);
    console.log(`   ⚠️  Skipped (duplicate IMEI): ${skippedCount}`);
    console.log(`   ❌ Failed: ${failCount}`);
    console.log(`   📦 Total processed: ${successCount + failCount + skippedCount}`);
    
    if (successCount > 0) {
      console.log('\n✨ Trade-in devices are now in inventory and ready for resale!');
      console.log(`   Category: "Trade-In Items"`);
      console.log(`   Default Markup: ${DEFAULT_MARKUP}%`);
      console.log(`   ⭐ Customer names will show in Supplier column!`);
    }

  } catch (error) {
    console.error('❌ Error:', error?.message || error);
  }
}

confirmAllPendingTradeIns();

