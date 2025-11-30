#!/usr/bin/env node

/**
 * Fix Parent Stock by Recalculating from Children
 */

import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

async function fixParentStock() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('🔧 FIXING PARENT STOCK CALCULATION');
    console.log('═'.repeat(60));
    console.log('');

    // Find all parent variants
    const { rows: parents } = await client.query(`
      SELECT 
        id,
        product_id,
        variant_name,
        quantity as current_qty
      FROM lats_product_variants
      WHERE (is_parent = TRUE OR variant_type = 'parent')
        AND is_active = TRUE
    `);

    console.log(`📊 Found ${parents.length} parent variants`);
    console.log('');

    for (const parent of parents) {
      console.log(`\n📦 Processing: ${parent.variant_name}`);
      console.log(`   Current stock: ${parent.current_qty}`);

      // Calculate stock from children
      const { rows: calc } = await client.query(`
        SELECT calculate_parent_variant_stock($1) as correct_stock
      `, [parent.id]);

      const correctStock = calc[0].correct_stock;
      console.log(`   Calculated from children: ${correctStock}`);

      if (correctStock !== parent.current_qty) {
        console.log(`   ⚠️  MISMATCH! Updating...`);

        // Update parent stock
        await client.query(`
          UPDATE lats_product_variants
          SET quantity = $1,
              updated_at = NOW()
          WHERE id = $2
        `, [correctStock, parent.id]);

        console.log(`   ✅ Updated: ${parent.current_qty} → ${correctStock}`);

        // Also update product stock
        const { rows: productStock } = await client.query(`
          SELECT COALESCE(SUM(quantity), 0) as total_stock
          FROM lats_product_variants
          WHERE product_id = $1
            AND is_active = TRUE
            AND (variant_type = 'parent' OR variant_type = 'standard')
        `, [parent.product_id]);

        await client.query(`
          UPDATE lats_products
          SET stock_quantity = $1,
              updated_at = NOW()
          WHERE id = $2
        `, [productStock[0].total_stock, parent.product_id]);

        console.log(`   ✅ Product stock also updated`);
      } else {
        console.log(`   ✅ Stock is correct`);
      }
    }

    console.log('');
    console.log('═'.repeat(60));
    console.log('✅ PARENT STOCK FIX COMPLETE!');
    console.log('═'.repeat(60));
    console.log('');
    console.log('📝 Summary:');
    console.log(`   • Processed ${parents.length} parent variants`);
    console.log(`   • Stock now correctly calculated from children`);
    console.log('');
    console.log('🔄 REFRESH your product page now!');
    console.log('   You should see correct stock values.');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found');
  process.exit(1);
}

fixParentStock();

