#!/usr/bin/env node

/**
 * Diagnostic script to check inventory sync issues
 * Checks if inventory items are being created and variants are being synced
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function diagnoseInventorySync() {
  console.log('🔍 Starting Inventory Sync Diagnostic...\n');

  try {
    // 1. Check if sync trigger exists
    console.log('1️⃣ Checking for inventory sync trigger...');
    const { data: triggers, error: triggerError } = await supabase.rpc('get_triggers', {
      table_name: 'inventory_items'
    });

    if (triggerError) {
      console.log('⚠️  Could not check triggers (this is okay if function doesn\'t exist)');
    } else if (triggers) {
      console.log('✅ Triggers found:', triggers.length);
    }

    // 2. Check recent inventory items
    console.log('\n2️⃣ Checking recent inventory items...');
    const { data: inventoryItems, error: invError } = await supabase
      .from('inventory_items')
      .select('id, product_id, variant_id, status, cost_price, selling_price, purchase_order_id, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (invError) {
      console.error('❌ Error fetching inventory items:', invError);
    } else {
      console.log(`✅ Found ${inventoryItems.length} recent inventory items`);
      inventoryItems.forEach(item => {
        console.log(`  - ID: ${item.id.substring(0, 8)}... | Status: ${item.status} | Variant: ${item.variant_id ? item.variant_id.substring(0, 8) + '...' : 'NULL'} | PO: ${item.purchase_order_id ? 'Yes' : 'No'}`);
      });
    }

    // 3. Check variant quantities vs inventory count
    console.log('\n3️⃣ Checking variant quantities vs actual inventory count...');
    const { data: variants, error: variantError } = await supabase
      .from('lats_product_variants')
      .select(`
        id,
        name,
        quantity,
        product:lats_products!inner(id, name)
      `)
      .order('updated_at', { ascending: false })
      .limit(20);

    if (variantError) {
      console.error('❌ Error fetching variants:', variantError);
    } else {
      console.log(`✅ Checking ${variants.length} variants...\n`);
      
      let mismatches = 0;
      for (const variant of variants) {
        // Count available inventory items
        const { count, error: countError } = await supabase
          .from('inventory_items')
          .select('*', { count: 'exact', head: true })
          .eq('variant_id', variant.id)
          .eq('status', 'available');

        if (countError) {
          console.error(`  ❌ Error counting items for variant ${variant.name}:`, countError);
          continue;
        }

        const actualCount = count || 0;
        const variantQty = variant.quantity || 0;

        if (actualCount !== variantQty) {
          mismatches++;
          console.log(`  ⚠️  MISMATCH: ${variant.product?.name || 'Unknown'} - ${variant.name}`);
          console.log(`      Variant Qty: ${variantQty} | Actual Inventory: ${actualCount}`);
        } else {
          console.log(`  ✅ ${variant.product?.name || 'Unknown'} - ${variant.name}: ${variantQty} items`);
        }
      }

      if (mismatches > 0) {
        console.log(`\n⚠️  Found ${mismatches} mismatches!`);
        console.log('   This means the sync trigger is not working properly.');
      } else {
        console.log('\n✅ All variants are in sync!');
      }
    }

    // 4. Check for inventory items without variant_id
    console.log('\n4️⃣ Checking for inventory items without variant_id...');
    const { count: noVariantCount, error: noVariantError } = await supabase
      .from('inventory_items')
      .select('*', { count: 'exact', head: true })
      .is('variant_id', null);

    if (noVariantError) {
      console.error('❌ Error:', noVariantError);
    } else {
      if (noVariantCount > 0) {
        console.log(`⚠️  Found ${noVariantCount} inventory items WITHOUT variant_id`);
        console.log('   These items will not update variant quantities!');
      } else {
        console.log('✅ All inventory items have variant_id');
      }
    }

    // 5. Check recent purchase orders
    console.log('\n5️⃣ Checking recent purchase orders...');
    const { data: recentPOs, error: poError } = await supabase
      .from('lats_purchase_orders')
      .select('id, order_number, status, received_date')
      .eq('status', 'received')
      .order('received_date', { ascending: false })
      .limit(5);

    if (poError) {
      console.error('❌ Error fetching purchase orders:', poError);
    } else {
      console.log(`✅ Found ${recentPOs.length} recently received purchase orders:`);
      
      for (const po of recentPOs) {
        // Count inventory items created from this PO
        const { count: poItemCount, error: poItemError } = await supabase
          .from('inventory_items')
          .select('*', { count: 'exact', head: true })
          .eq('purchase_order_id', po.id);

        if (!poItemError) {
          console.log(`  - ${po.order_number}: ${poItemCount} inventory items created`);
        }
      }
    }

    // 6. Check if items are accumulating or being replaced
    console.log('\n6️⃣ Checking if inventory accumulates correctly...');
    const { data: variantsWithMultiplePOs, error: multiPOError } = await supabase
      .from('inventory_items')
      .select(`
        variant_id,
        purchase_order_id,
        lats_product_variants!inner(name, quantity)
      `)
      .eq('status', 'available')
      .not('variant_id', 'is', null);

    if (multiPOError) {
      console.error('❌ Error:', multiPOError);
    } else {
      // Group by variant to see if they have items from multiple POs
      const variantMap = new Map();
      variantsWithMultiplePOs.forEach(item => {
        if (!variantMap.has(item.variant_id)) {
          variantMap.set(item.variant_id, {
            name: item.lats_product_variants?.name || 'Unknown',
            quantity: item.lats_product_variants?.quantity || 0,
            pos: new Set(),
            count: 0
          });
        }
        const vData = variantMap.get(item.variant_id);
        vData.pos.add(item.purchase_order_id);
        vData.count++;
      });

      let multiPOVariants = 0;
      variantMap.forEach((data, variantId) => {
        if (data.pos.size > 1) {
          multiPOVariants++;
          if (multiPOVariants <= 3) {
            console.log(`  ✅ ${data.name}: ${data.count} items from ${data.pos.size} different POs`);
            if (data.count !== data.quantity) {
              console.log(`      ⚠️  BUT variant shows ${data.quantity} (should be ${data.count})`);
            }
          }
        }
      });

      if (multiPOVariants > 0) {
        console.log(`\n  ✅ Found ${multiPOVariants} variants with items from multiple POs`);
        console.log('     This is GOOD - means stock is accumulating, not being deleted');
      } else {
        console.log('  ⚠️  No variants found with items from multiple POs');
        console.log('     Either you haven\'t received multiple POs for same product,');
        console.log('     OR items are being deleted/replaced (bad!)');
      }
    }

    console.log('\n✅ Diagnostic complete!');

  } catch (error) {
    console.error('❌ Diagnostic failed:', error);
    process.exit(1);
  }
}

// Run diagnostic
diagnoseInventorySync().then(() => {
  process.exit(0);
});

