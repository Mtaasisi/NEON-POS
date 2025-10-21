#!/usr/bin/env node

/**
 * INVENTORY SYNC DIAGNOSTIC AND FIX
 * ==================================
 * 
 * This script diagnoses and fixes the issue where products received via
 * purchase orders are not showing in inventory.
 * 
 * PROBLEM:
 * - inventory_items table has records (individual items)
 * - lats_product_variants.quantity not updated
 * - UI shows 0 stock even though items exist
 * 
 * SOLUTION:
 * - Count inventory_items per variant
 * - Update variant.quantity to match
 * - Create missing variant records if needed
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  console.error('   Required: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 INVENTORY SYNC DIAGNOSTIC');
console.log('============================\n');

async function diagnoseInventorySync() {
  console.log('📊 Step 1: Analyzing inventory_items...\n');
  
  // Get all inventory items with product and variant info
  const { data: inventoryItems, error: itemsError } = await supabase
    .from('inventory_items')
    .select(`
      id,
      product_id,
      variant_id,
      status,
      purchase_order_id,
      created_at,
      product:lats_products!product_id(id, name, sku),
      variant:lats_product_variants!variant_id(id, name, sku, quantity)
    `)
    .order('created_at', { ascending: false });

  if (itemsError) {
    console.error('❌ Error fetching inventory items:', itemsError);
    return;
  }

  console.log(`✅ Found ${inventoryItems.length} inventory items\n`);

  // Group by product and variant
  const itemsByVariant = {};
  const itemsByProduct = {};
  
  inventoryItems.forEach(item => {
    const key = item.variant_id || item.product_id;
    const type = item.variant_id ? 'variant' : 'product';
    
    if (item.variant_id) {
      if (!itemsByVariant[item.variant_id]) {
        itemsByVariant[item.variant_id] = {
          variantId: item.variant_id,
          productId: item.product_id,
          productName: item.product?.name || 'Unknown',
          variantName: item.variant?.name || 'Unknown',
          variantSku: item.variant?.sku,
          currentQuantity: item.variant?.quantity || 0,
          items: []
        };
      }
      itemsByVariant[item.variant_id].items.push(item);
    } else {
      if (!itemsByProduct[item.product_id]) {
        itemsByProduct[item.product_id] = {
          productId: item.product_id,
          productName: item.product?.name || 'Unknown',
          productSku: item.product?.sku,
          items: []
        };
      }
      itemsByProduct[item.product_id].items.push(item);
    }
  });

  console.log('📋 Step 2: Analyzing discrepancies...\n');
  console.log('=' .repeat(100));
  
  const discrepancies = [];
  
  // Check variants
  Object.values(itemsByVariant).forEach(variantData => {
    const availableCount = variantData.items.filter(i => i.status === 'available').length;
    const totalCount = variantData.items.length;
    const currentQty = variantData.currentQuantity;
    
    if (availableCount !== currentQty) {
      discrepancies.push({
        type: 'variant',
        id: variantData.variantId,
        productId: variantData.productId,
        name: `${variantData.productName} - ${variantData.variantName}`,
        sku: variantData.variantSku,
        currentQuantity: currentQty,
        actualAvailable: availableCount,
        totalItems: totalCount,
        difference: availableCount - currentQty
      });
      
      console.log(`❌ MISMATCH: ${variantData.productName} - ${variantData.variantName}`);
      console.log(`   SKU: ${variantData.variantSku || 'N/A'}`);
      console.log(`   Current Quantity in DB: ${currentQty}`);
      console.log(`   Actual Available Items: ${availableCount}`);
      console.log(`   Total Items (all status): ${totalCount}`);
      console.log(`   Difference: ${availableCount > currentQty ? '+' : ''}${availableCount - currentQty}`);
      console.log('   Status breakdown:', variantData.items.reduce((acc, item) => {
        acc[item.status] = (acc[item.status] || 0) + 1;
        return acc;
      }, {}));
      console.log('-'.repeat(100));
    }
  });

  // Check products without variants
  Object.values(itemsByProduct).forEach(productData => {
    const availableCount = productData.items.filter(i => i.status === 'available').length;
    const totalCount = productData.items.length;
    
    console.log(`ℹ️  PRODUCT (no variant): ${productData.productName}`);
    console.log(`   SKU: ${productData.productSku || 'N/A'}`);
    console.log(`   Available Items: ${availableCount}`);
    console.log(`   Total Items: ${totalCount}`);
    console.log('-'.repeat(100));
  });

  console.log('\n📊 SUMMARY:');
  console.log(`   Total Inventory Items: ${inventoryItems.length}`);
  console.log(`   Variants with items: ${Object.keys(itemsByVariant).length}`);
  console.log(`   Products (no variant) with items: ${Object.keys(itemsByProduct).length}`);
  console.log(`   Discrepancies found: ${discrepancies.length}`);
  
  if (discrepancies.length === 0) {
    console.log('\n✅ No discrepancies found! Inventory is in sync.');
    return;
  }
  
  console.log('\n' + '='.repeat(100));
  console.log('🔧 FIX NEEDED\n');
  
  return discrepancies;
}

async function fixInventorySync(discrepancies) {
  if (!discrepancies || discrepancies.length === 0) {
    console.log('✅ Nothing to fix!');
    return;
  }
  
  console.log(`🔧 Fixing ${discrepancies.length} discrepancies...\n`);
  
  let fixed = 0;
  let failed = 0;
  
  for (const disc of discrepancies) {
    console.log(`Updating ${disc.name}...`);
    console.log(`  Changing quantity from ${disc.currentQuantity} to ${disc.actualAvailable}`);
    
    const { error } = await supabase
      .from('lats_product_variants')
      .update({ 
        quantity: disc.actualAvailable,
        updated_at: new Date().toISOString()
      })
      .eq('id', disc.id);
    
    if (error) {
      console.error(`  ❌ Failed: ${error.message}`);
      failed++;
    } else {
      console.log(`  ✅ Fixed!`);
      fixed++;
    }
  }
  
  console.log('\n' + '='.repeat(100));
  console.log('📊 FIX SUMMARY:');
  console.log(`   ✅ Successfully fixed: ${fixed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log('='.repeat(100));
}

async function createInventorySyncFunction() {
  console.log('\n🔧 Creating automatic sync trigger in database...\n');
  
  const syncFunctionSQL = `
-- Function to sync variant quantity with inventory items
CREATE OR REPLACE FUNCTION sync_variant_quantity_from_inventory()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update the variant quantity based on available inventory items
  IF NEW.variant_id IS NOT NULL THEN
    UPDATE lats_product_variants
    SET quantity = (
      SELECT COUNT(*)
      FROM inventory_items
      WHERE variant_id = NEW.variant_id
        AND status = 'available'
    ),
    updated_at = NOW()
    WHERE id = NEW.variant_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trigger_sync_variant_quantity ON inventory_items;

-- Create trigger on inventory_items
CREATE TRIGGER trigger_sync_variant_quantity
AFTER INSERT OR UPDATE OR DELETE ON inventory_items
FOR EACH ROW
EXECUTE FUNCTION sync_variant_quantity_from_inventory();

COMMENT ON FUNCTION sync_variant_quantity_from_inventory IS 
'Automatically syncs variant quantity with count of available inventory items';
`;

  const { error } = await supabase.rpc('exec_sql', { sql: syncFunctionSQL });
  
  if (error) {
    console.log('⚠️  Could not create automatic sync trigger.');
    console.log('   This is normal if you don\'t have admin access.');
    console.log('   You can run the SQL manually in Supabase dashboard.');
    console.log('\n📝 SQL to run manually:');
    console.log(syncFunctionSQL);
  } else {
    console.log('✅ Automatic sync trigger created!');
    console.log('   Inventory quantities will now update automatically.');
  }
}

// Main execution
async function main() {
  try {
    // Step 1: Diagnose
    const discrepancies = await diagnoseInventorySync();
    
    if (!discrepancies || discrepancies.length === 0) {
      console.log('\n✅ All inventory is in sync! No fixes needed.');
      return;
    }
    
    // Step 2: Ask for confirmation (in Node, we'll just proceed)
    console.log('\n⚠️  Would you like to fix these discrepancies? (Auto-proceeding in 3 seconds...)');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Step 3: Fix
    await fixInventorySync(discrepancies);
    
    // Step 4: Try to create automatic sync
    // await createInventorySyncFunction();
    
    console.log('\n✅ DONE! Please refresh your inventory page to see the changes.');
    
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

main();

