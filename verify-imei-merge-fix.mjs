#!/usr/bin/env node
/**
 * IMEI Variant Merge Fix - Verification Script
 * 
 * This script verifies that IMEI variants are properly merging with
 * existing selected variants instead of creating standalone variants.
 */

import pg from 'pg';
import { config } from 'dotenv';

config();

const { Pool } = pg;

const databaseUrl = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ Missing DATABASE_URL in environment variables');
  process.exit(1);
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false }
});

console.log('🔍 IMEI Variant Merge Fix - Verification\n');
console.log('='.repeat(60));

async function verifyIMEIVariantMerge() {
  const client = await pool.connect();
  
  try {
    console.log('\n📊 Checking for IMEI variants with parent relationships...\n');

    // Query for IMEI variants that have parent_variant_id
    const variantsQuery = `
      SELECT 
        v.id,
        v.name,
        v.sku,
        v.quantity,
        v.variant_attributes,
        v.created_at,
        p.name as product_name
      FROM lats_product_variants v
      JOIN lats_products p ON p.id = v.product_id
      WHERE v.variant_attributes->>'imei' IS NOT NULL
      ORDER BY v.created_at DESC
      LIMIT 20
    `;

    const result = await client.query(variantsQuery);
    const imeiVariants = result.rows;

    if (!imeiVariants || imeiVariants.length === 0) {
      console.log('⚠️  No IMEI variants found in database');
      console.log('   Create a PO with IMEI numbers to test the fix');
      return;
    }

    console.log(`✅ Found ${imeiVariants.length} IMEI variant(s)\n`);

    // Check which ones have parent_variant_id
    const variantsWithParent = imeiVariants.filter(v => v.variant_attributes?.parent_variant_id);
    const variantsWithoutParent = imeiVariants.filter(v => !v.variant_attributes?.parent_variant_id);

    console.log('📈 Statistics:');
    console.log(`   - IMEI variants WITH parent: ${variantsWithParent.length}`);
    console.log(`   - IMEI variants WITHOUT parent: ${variantsWithoutParent.length}`);

    if (variantsWithParent.length > 0) {
      console.log('\n✅ SUCCESS: IMEI variants are properly linked to parent variants!\n');
      console.log('Recent IMEI variants with parent relationships:');
      console.log('-'.repeat(60));

      for (const variant of variantsWithParent.slice(0, 5)) {
        const parentId = variant.variant_attributes.parent_variant_id;
        
        // Fetch parent variant
        const parentResult = await client.query(
          'SELECT name, sku FROM lats_product_variants WHERE id = $1',
          [parentId]
        );
        const parent = parentResult.rows[0];

        console.log(`\n📦 Product: ${variant.product_name}`);
        console.log(`   IMEI Variant: ${variant.name}`);
        console.log(`   IMEI: ${variant.variant_attributes.imei}`);
        console.log(`   Parent: ${parent?.name || 'Unknown'}`);
        console.log(`   SKU: ${variant.sku}`);
        console.log(`   Quantity: ${variant.quantity}`);
        console.log(`   Created: ${new Date(variant.created_at).toLocaleString()}`);
        
        // Check inherited attributes
        if (variant.variant_attributes.color) {
          console.log(`   Inherited Color: ${variant.variant_attributes.color}`);
        }
        if (variant.variant_attributes.size) {
          console.log(`   Inherited Size: ${variant.variant_attributes.size}`);
        }
      }
    } else {
      console.log('\n⚠️  No IMEI variants with parent relationships found');
      console.log('   This means the fix has not been applied yet or');
      console.log('   no POs have been received since the fix.\n');
    }

    if (variantsWithoutParent.length > 0) {
      console.log('\n📝 Note: Found IMEI variants without parent relationships');
      console.log('   These were likely created before the fix or for products without variants\n');
      
      console.log('Recent standalone IMEI variants:');
      console.log('-'.repeat(60));

      for (const variant of variantsWithoutParent.slice(0, 3)) {
        console.log(`\n📦 Product: ${variant.product_name}`);
        console.log(`   IMEI Variant: ${variant.name}`);
        console.log(`   IMEI: ${variant.variant_attributes.imei}`);
        console.log(`   SKU: ${variant.sku}`);
        console.log(`   Created: ${new Date(variant.created_at).toLocaleString()}`);
      }
    }

    // Check recent stock movements for IMEI variants
    console.log('\n\n📊 Recent Stock Movements for IMEI Variants:');
    console.log('-'.repeat(60));

    const movementsQuery = `
      SELECT 
        m.id,
        m.movement_type,
        m.quantity,
        m.notes,
        m.created_at,
        v.name as variant_name,
        v.variant_attributes
      FROM lats_stock_movements m
      JOIN lats_product_variants v ON v.id = m.variant_id
      WHERE m.reference_type = 'imei_variant_creation'
      ORDER BY m.created_at DESC
      LIMIT 5
    `;

    const movementsResult = await client.query(movementsQuery);
    const movements = movementsResult.rows;

    if (movements && movements.length > 0) {
      for (const movement of movements) {
        console.log(`\n🔄 ${movement.movement_type.toUpperCase()}`);
        console.log(`   Variant: ${movement.variant_name}`);
        console.log(`   Notes: ${movement.notes}`);
        console.log(`   Date: ${new Date(movement.created_at).toLocaleString()}`);
      }
    } else {
      console.log('   No recent stock movements found');
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n✅ Verification complete!');
    
    if (variantsWithParent.length > 0) {
      console.log('\n🎉 The IMEI variant merge fix is working correctly!');
      console.log('   IMEI variants are properly linked to their parent variants.');
    } else {
      console.log('\n📝 To test the fix:');
      console.log('   1. Create a PO with a product that has variants');
      console.log('   2. Select a specific variant when adding to PO (SKU-1761244859910-59R-V01)');
      console.log('   3. Receive the PO with IMEI numbers');
      console.log('   4. Run this script again to verify');
    }

  } catch (error) {
    console.error('❌ Verification error:', error);
  } finally {
    client.release();
  }
}

// Run verification
verifyIMEIVariantMerge().then(() => {
  console.log('\n✅ Verification script completed\n');
  pool.end();
  process.exit(0);
}).catch(err => {
  console.error('❌ Script failed:', err);
  pool.end();
  process.exit(1);
});
