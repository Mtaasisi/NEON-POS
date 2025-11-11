#!/usr/bin/env node

/**
 * Migration Script: Convert Inventory Items to IMEI Variants
 * 
 * This script migrates existing IMEI data from the inventory_items table
 * to the new variant-based IMEI system where each IMEI becomes a variant.
 * 
 * What it does:
 * 1. Finds all inventory_items with IMEI numbers
 * 2. Groups them by product_id
 * 3. Creates product variants for each IMEI
 * 4. Preserves all data (serial number, cost, price, location, etc.)
 * 5. Marks old inventory_items as migrated (sets status to 'migrated')
 * 
 * Run: node migrate-inventory-items-to-imei-variants.mjs
 */

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

const sql = neon(process.env.VITE_DATABASE_URL || process.env.VITE_NEON_DATABASE_URL);

// Statistics
const stats = {
  totalItems: 0,
  totalProducts: 0,
  variantsCreated: 0,
  errors: 0,
  skipped: 0,
};

/**
 * Main migration function
 */
async function migrateInventoryItemsToVariants() {
  console.log('🔄 Starting migration: Inventory Items → IMEI Variants\n');
  console.log('━'.repeat(60));

  try {
    // Step 1: Get all inventory items with IMEI
    console.log('\n📊 Step 1: Fetching inventory items with IMEI...');
    const inventoryItems = await sql`
      SELECT 
        ii.*,
        p.name as product_name,
        p.branch_id
      FROM inventory_items ii
      LEFT JOIN lats_products p ON p.id = ii.product_id
      WHERE ii.imei IS NOT NULL 
        AND ii.imei != ''
        AND ii.status != 'migrated'
      ORDER BY ii.product_id, ii.created_at
    `;

    stats.totalItems = inventoryItems.length;
    console.log(`   ✓ Found ${stats.totalItems} inventory items with IMEI`);

    if (stats.totalItems === 0) {
      console.log('\n✅ No inventory items to migrate. All done!');
      return;
    }

    // Step 2: Group by product
    console.log('\n📦 Step 2: Grouping items by product...');
    const productGroups = {};
    for (const item of inventoryItems) {
      if (!item.product_id) {
        console.log(`   ⚠️  Skipping item ${item.id}: No product_id`);
        stats.skipped++;
        continue;
      }

      if (!productGroups[item.product_id]) {
        productGroups[item.product_id] = [];
      }
      productGroups[item.product_id].push(item);
    }

    stats.totalProducts = Object.keys(productGroups).length;
    console.log(`   ✓ Grouped into ${stats.totalProducts} products`);

    // Step 3: Create variants for each product
    console.log('\n🔧 Step 3: Creating IMEI variants...\n');

    for (const [productId, items] of Object.entries(productGroups)) {
      const productName = items[0]?.product_name || 'Unknown Product';
      console.log(`   📦 Product: ${productName} (${items.length} items)`);

      for (const item of items) {
        try {
          // Check if variant already exists for this IMEI
          const existingVariant = await sql`
            SELECT id 
            FROM lats_product_variants 
            WHERE variant_attributes->>'imei' = ${item.imei}
            LIMIT 1
          `;

          if (existingVariant.length > 0) {
            console.log(`      ⚠️  IMEI ${item.imei} already exists as variant, skipping`);
            stats.skipped++;
            
            // Mark inventory item as migrated
            await sql`
              UPDATE inventory_items 
              SET status = 'migrated',
                  updated_at = NOW()
              WHERE id = ${item.id}
            `;
            continue;
          }

          // Generate SKU for variant
          const variantSku = `${productId.substring(0, 8)}-${item.imei.substring(0, 8)}`;

          // Prepare variant attributes
          const variantAttributes = {
            imei: item.imei,
            serial_number: item.serial_number,
            mac_address: item.mac_address,
            condition: item.metadata?.condition || 'used',
            location: item.location,
            warranty_start: item.warranty_start,
            warranty_end: item.warranty_end,
            notes: item.metadata?.notes || item.notes,
            source: 'migration',
            original_inventory_item_id: item.id,
            migrated_at: new Date().toISOString(),
          };

          // Create variant
          const createdVariant = await sql`
            INSERT INTO lats_product_variants (
              product_id,
              variant_name,
              sku,
              cost_price,
              selling_price,
              quantity,
              is_active,
              variant_attributes,
              branch_id,
              created_at,
              updated_at
            ) VALUES (
              ${productId},
              ${`IMEI: ${item.imei}`},
              ${variantSku},
              ${item.cost_price || 0},
              ${item.selling_price || 0},
              ${item.status === 'available' ? 1 : 0},
              ${item.status === 'available'},
              ${JSON.stringify(variantAttributes)}::jsonb,
              ${item.branch_id},
              ${item.created_at || new Date().toISOString()},
              NOW()
            )
            RETURNING id
          `;

          if (createdVariant.length > 0) {
            console.log(`      ✓ Created variant for IMEI: ${item.imei}`);
            stats.variantsCreated++;

            // Mark inventory item as migrated
            await sql`
              UPDATE inventory_items 
              SET status = 'migrated',
                  metadata = jsonb_set(
                    COALESCE(metadata, '{}'::jsonb),
                    '{migrated_to_variant_id}',
                    to_jsonb(${createdVariant[0].id}::text)
                  ),
                  updated_at = NOW()
              WHERE id = ${item.id}
            `;

            // Update product stock quantity
            await sql`
              UPDATE lats_products
              SET stock_quantity = (
                SELECT COUNT(*) 
                FROM lats_product_variants 
                WHERE product_id = ${productId}
                  AND is_active = true
                  AND quantity > 0
              ),
              updated_at = NOW()
              WHERE id = ${productId}
            `;

            // Create stock movement record
            await sql`
              INSERT INTO lats_stock_movements (
                product_id,
                variant_id,
                branch_id,
                movement_type,
                quantity,
                reference_type,
                reference_id,
                notes,
                created_at
              ) VALUES (
                ${productId},
                ${createdVariant[0].id},
                ${item.branch_id},
                'migration',
                1,
                'inventory_item_migration',
                ${item.id},
                'Migrated from inventory_items to IMEI variants',
                NOW()
              )
            `;
          }
        } catch (error) {
          console.log(`      ❌ Error migrating IMEI ${item.imei}: ${error.message}`);
          stats.errors++;
        }
      }

      console.log(''); // Empty line between products
    }

    // Step 4: Print summary
    console.log('━'.repeat(60));
    console.log('\n📊 Migration Summary:');
    console.log(`   • Total inventory items found: ${stats.totalItems}`);
    console.log(`   • Products processed: ${stats.totalProducts}`);
    console.log(`   • Variants created: ${stats.variantsCreated}`);
    console.log(`   • Items skipped: ${stats.skipped}`);
    console.log(`   • Errors: ${stats.errors}`);

    if (stats.errors > 0) {
      console.log('\n⚠️  Some items failed to migrate. Check the logs above.');
    } else if (stats.variantsCreated > 0) {
      console.log('\n✅ Migration completed successfully!');
      console.log('\n📝 Next steps:');
      console.log('   1. Verify the migrated variants in the database');
      console.log('   2. Test IMEI variant selection in POS');
      console.log('   3. Old inventory_items are marked as "migrated" but not deleted');
      console.log('   4. You can safely delete them after verification');
    } else {
      console.log('\n✅ No new variants needed to be created.');
    }
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

/**
 * Verification function to check migration results
 */
async function verifyMigration() {
  console.log('\n\n🔍 Running verification...\n');

  try {
    // Count migrated items
    const migratedItems = await sql`
      SELECT COUNT(*) as count
      FROM inventory_items
      WHERE status = 'migrated'
        AND imei IS NOT NULL
    `;

    // Count IMEI variants
    const imeiVariants = await sql`
      SELECT COUNT(*) as count
      FROM lats_product_variants
      WHERE variant_attributes->>'imei' IS NOT NULL
    `;

    // Count variants from migration
    const migratedVariants = await sql`
      SELECT COUNT(*) as count
      FROM lats_product_variants
      WHERE variant_attributes->>'source' = 'migration'
    `;

    console.log('Verification Results:');
    console.log(`   • Inventory items marked as migrated: ${migratedItems[0].count}`);
    console.log(`   • Total IMEI variants in system: ${imeiVariants[0].count}`);
    console.log(`   • Variants created by migration: ${migratedVariants[0].count}`);

    // Sample some migrated variants
    console.log('\n📋 Sample of migrated variants:');
    const sampleVariants = await sql`
      SELECT 
        v.id,
        p.name as product_name,
        v.variant_name,
        v.variant_attributes->>'imei' as imei,
        v.selling_price,
        v.quantity,
        v.is_active
      FROM lats_product_variants v
      JOIN lats_products p ON p.id = v.product_id
      WHERE v.variant_attributes->>'source' = 'migration'
      ORDER BY v.created_at DESC
      LIMIT 5
    `;

    for (const variant of sampleVariants) {
      console.log(`   • ${variant.product_name} - IMEI: ${variant.imei} - Price: ${variant.selling_price} - Active: ${variant.is_active}`);
    }
  } catch (error) {
    console.error('❌ Verification failed:', error);
  }
}

// Run migration
console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║  IMEI Migration: inventory_items → product_variants        ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

migrateInventoryItemsToVariants()
  .then(() => verifyMigration())
  .then(() => {
    console.log('\n✅ All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });

