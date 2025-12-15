#!/usr/bin/env node

import { Pool } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env.production') });

// Database configuration
const DATABASE_URL = process.argv[2] || process.env.DATABASE_URL || process.env.VITE_DATABASE_URL ||
  'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const pool = new Pool({ connectionString: DATABASE_URL });

// Default stock to add
const STOCK_TO_ADD = 10;

async function addStockToT8Products() {
  console.log('📦 Adding stock to T8 products...\n');

  try {
    // Get all T8 products
    const productsResult = await pool.query(`
      SELECT id, name, sku FROM lats_products
      WHERE LOWER(name) LIKE LOWER('%t8%')
      ORDER BY name
    `);

    const products = productsResult.rows;
    console.log(`Found ${products.length} T8 products to update:\n`);

    for (const product of products) {
      console.log(`🔄 Updating: ${product.name} (ID: ${product.id})`);

      // Get variants for this product
      const variantsResult = await pool.query(`
        SELECT id, variant_name, quantity FROM lats_product_variants
        WHERE product_id = $1
      `, [product.id]);

      const variants = variantsResult.rows;

      if (variants.length === 0) {
        console.log(`   ⚠️  No variants found for ${product.name}`);
        continue;
      }

      console.log(`   📋 Updating ${variants.length} variant(s):`);

      for (const variant of variants) {
        const newStock = (variant.quantity || 0) + STOCK_TO_ADD;

        // Update variant stock
        await pool.query(`
          UPDATE lats_product_variants
          SET quantity = $1, updated_at = NOW()
          WHERE id = $2
        `, [newStock, variant.id]);

        console.log(`     • ${variant.variant_name || 'Unnamed'}: ${variant.quantity || 0} → ${newStock}`);
      }

      console.log('');
    }

    console.log('✅ Stock update completed!\n');

    // Verify the updates
    console.log('🔍 Verifying updated stock levels:');
    const verifyResult = await pool.query(`
      SELECT
        p.name as product_name,
        p.sku as product_sku,
        v.variant_name,
        v.quantity as stock
      FROM lats_products p
      JOIN lats_product_variants v ON p.id = v.product_id
      WHERE LOWER(p.name) LIKE LOWER('%t8%')
      ORDER BY p.name, v.variant_name
    `);

    console.log('='.repeat(60));
    verifyResult.rows.forEach(row => {
      console.log(`${row.product_name} (${row.product_sku}): ${row.stock} units`);
    });

  } catch (error) {
    console.error('❌ Error updating stock:', error.message);
  } finally {
    await pool.end();
  }
}

// Allow custom stock amount via command line argument
if (process.argv[3]) {
  const customStock = parseInt(process.argv[3]);
  if (!isNaN(customStock) && customStock >= 0) {
    STOCK_TO_ADD = customStock;
    console.log(`Using custom stock amount: ${STOCK_TO_ADD}\n`);
  }
}

addStockToT8Products();
