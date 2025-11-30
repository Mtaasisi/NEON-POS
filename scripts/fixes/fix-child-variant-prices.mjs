/**
 * Fix Child Variant Prices
 * 
 * Updates child variants with TSh 0.00 to inherit price from parent
 */

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ Missing DATABASE_URL');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

console.log('\n🔧 ========================================');
console.log('🔧 FIX CHILD VARIANT PRICES');
console.log('🔧 ========================================\n');

async function fixChildVariantPrices() {
  try {
    // Find all child variants with 0 price
    console.log('📋 Finding child variants with 0 price...');
    const childrenWithZeroPrice = await sql`
      SELECT 
        c.id as child_id,
        c.variant_name as child_name,
        c.selling_price as child_price,
        c.parent_variant_id,
        p.variant_name as parent_name,
        p.selling_price as parent_price
      FROM lats_product_variants c
      LEFT JOIN lats_product_variants p ON c.parent_variant_id = p.id
      WHERE c.variant_type = 'imei_child'
        AND c.is_active = true
        AND (c.selling_price = 0 OR c.selling_price IS NULL)
    `;

    console.log(`✅ Found ${childrenWithZeroPrice.length} child variants with zero price\n`);

    if (childrenWithZeroPrice.length === 0) {
      console.log('✅ All child variants have proper prices!');
      return;
    }

    // Update each child with parent's price
    console.log('🔧 Updating child variant prices...\n');
    let updated = 0;
    let failed = 0;

    for (const child of childrenWithZeroPrice) {
      try {
        console.log(`Updating: ${child.child_name}`);
        console.log(`  Parent: ${child.parent_name} (TSh ${child.parent_price})`);
        
        await sql`
          UPDATE lats_product_variants
          SET selling_price = ${child.parent_price},
              cost_price = ${child.parent_price}
          WHERE id = ${child.child_id}
        `;
        
        console.log(`  ✅ Updated to TSh ${child.parent_price}\n`);
        updated++;
      } catch (error) {
        console.error(`  ❌ Failed: ${error.message}\n`);
        failed++;
      }
    }

    console.log('\n📊 ========================================');
    console.log('📊 SUMMARY');
    console.log('📊 ========================================');
    console.log(`Updated: ${updated}`);
    console.log(`Failed: ${failed}`);
    console.log(`Total: ${childrenWithZeroPrice.length}`);
    
    if (updated > 0) {
      console.log('\n✅ Child variant prices fixed!');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixChildVariantPrices();

