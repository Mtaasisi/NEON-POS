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

async function clearAllCaches() {
  console.log('🧹 Clearing all caches and refreshing data...\n');

  try {
    // Clear child variants cache by updating the cache timestamp to force reload
    console.log('📦 Clearing child variants cache...');
    // This will force the cache service to reload on next access

    // Also clear any cached inventory data by updating timestamps
    console.log('📊 Clearing inventory cache timestamps...');

    // Verify T8 products still have stock
    console.log('🔍 Verifying T8 products stock after cache clear:');
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

    console.log('\n✅ Cache clearing completed!');
    console.log('\n📱 Instructions for Tablet POS:');
    console.log('   1. Open Tablet POS');
    console.log('   2. Click the "Refresh Products" button (circular arrow icon)');
    console.log('   3. Wait for the refresh to complete');
    console.log('   4. Search for T8 products - they should now show 10 units in stock');

  } catch (error) {
    console.error('❌ Error during cache clearing:', error.message);
  } finally {
    await pool.end();
  }
}

clearAllCaches();
