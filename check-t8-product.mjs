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

async function checkT8Product() {
  console.log('🔍 Searching for product "t8" in database...\n');

  try {
    // Search for product by name containing "t8"
    const productsResult = await pool.query(`
      SELECT * FROM lats_products
      WHERE LOWER(name) LIKE LOWER('%t8%')
      LIMIT 10
    `);

    const products = productsResult.rows;

    if (!products || products.length === 0) {
      console.log('❌ No products found with "t8" in the name');

      // Also try exact match
      console.log('\n🔍 Trying exact match for "t8"...');
      const exactResult = await pool.query(`
        SELECT * FROM lats_products
        WHERE LOWER(name) = LOWER('t8')
        LIMIT 5
      `);

      if (exactResult.rows.length === 0) {
        console.log('❌ No exact match for "t8" found either');
        return;
      } else {
        console.log('✅ Found exact match for "t8":');
        products.push(...exactResult.rows);
      }
    }

    console.log('✅ Found products:');
    console.log('='.repeat(50));

    for (const product of products) {
      console.log(`📦 Product: ${product.name}`);
      console.log(`   SKU: ${product.sku || 'N/A'}`);
      console.log(`   ID: ${product.id}`);
      console.log(`   Category: ${product.category || 'N/A'}`);
      console.log(`   Price: ${product.selling_price || product.price || 'N/A'}`);
      console.log('');

      // Check variants for this product
      const variantsResult = await pool.query(`
        SELECT * FROM lats_product_variants
        WHERE product_id = $1
        ORDER BY created_at DESC
      `, [product.id]);

      const variants = variantsResult.rows;

      if (variants && variants.length > 0) {
        console.log(`   📋 Variants (${variants.length}):`);
        let totalStock = 0;

        variants.forEach(variant => {
          const stock = variant.quantity || variant.stock_quantity || 0;
          totalStock += stock;

          console.log(`     • ${variant.variant_name || variant.name || 'Unnamed'}`);
          console.log(`       SKU: ${variant.sku || 'N/A'}`);
          console.log(`       Stock: ${stock}`);
          console.log(`       Price: ${variant.selling_price || variant.price || 'N/A'}`);
          console.log('');
        });

        console.log(`   📊 Total Product Stock: ${totalStock}`);
      } else {
        console.log('   ⚠️  No variants found');
      }
      console.log('-'.repeat(30));
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  } finally {
    await pool.end();
  }
}

checkT8Product();
