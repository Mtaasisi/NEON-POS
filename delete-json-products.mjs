#!/usr/bin/env node

/**
 * Delete Products Imported from JSON File
 * 
 * This script deletes products that were imported from a specific JSON backup file.
 */

import { Pool } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env.production') });

const DATABASE_URL = process.env.DATABASE_URL || process.argv[2] || 
  'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const DEFAULT_JSON_FILE = path.join(__dirname, 'PROD BACKUP', 'lats_products_2025-12-07_01-43-50.json');
const JSON_FILE_PATH = process.argv[3] || process.argv[2] || DEFAULT_JSON_FILE;

const pool = new Pool({ connectionString: DATABASE_URL });
const BATCH_SIZE = 50;

async function deleteProducts() {
  try {
    console.log('🗑️  Delete Products from JSON File');
    console.log('='.repeat(60));
    console.log(`📁 JSON File: ${JSON_FILE_PATH}`);
    console.log('='.repeat(60));

    if (!fs.existsSync(JSON_FILE_PATH)) {
      console.error(`❌ Error: File not found: ${JSON_FILE_PATH}`);
      process.exit(1);
    }

    console.log('\n📖 Reading JSON file...');
    const fileContent = fs.readFileSync(JSON_FILE_PATH, 'utf8');
    const products = JSON.parse(fileContent);

    if (!Array.isArray(products)) {
      console.error('❌ Error: JSON file does not contain an array of products');
      process.exit(1);
    }

    console.log(`✅ Found ${products.length} products in JSON file`);

    // Extract product IDs
    const productIds = products
      .filter(p => p.id)
      .map(p => p.id);

    if (productIds.length === 0) {
      console.log('⚠️  No product IDs found in JSON file');
      process.exit(0);
    }

    console.log(`\n🔍 Checking which products exist in database...`);
    
    // Check how many of these products exist in the database
    const checkResult = await pool.query(
      'SELECT id, name FROM lats_products WHERE id = ANY($1::uuid[])',
      [productIds]
    );

    const existingProducts = checkResult.rows;
    console.log(`   Found ${existingProducts.length} of ${productIds.length} products in database`);

    if (existingProducts.length === 0) {
      console.log('⚠️  No matching products found in database');
      process.exit(0);
    }

    console.log('\n📋 Products to be deleted:');
    existingProducts.slice(0, 10).forEach((p, idx) => {
      console.log(`   ${idx + 1}. ${p.name} (${p.id})`);
    });
    if (existingProducts.length > 10) {
      console.log(`   ... and ${existingProducts.length - 10} more products`);
    }

    console.log(`\n⚠️  WARNING: This will delete ${existingProducts.length} products and their variants!`);
    console.log('   Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));

    const existingIds = existingProducts.map(p => p.id);
    let deletedCount = 0;
    let variantDeletedCount = 0;

    console.log('\n🗑️  Starting deletion...\n');

    // Delete in batches
    for (let i = 0; i < existingIds.length; i += BATCH_SIZE) {
      const batch = existingIds.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(existingIds.length / BATCH_SIZE);

      try {
        // First, delete variants (if any)
        const variantResult = await pool.query(
          'DELETE FROM lats_product_variants WHERE product_id = ANY($1::uuid[]) RETURNING id',
          [batch]
        );
        variantDeletedCount += variantResult.rows.length;

        // Then delete products
        const result = await pool.query(
          'DELETE FROM lats_products WHERE id = ANY($1::uuid[]) RETURNING id, name',
          [batch]
        );
        
        deletedCount += result.rows.length;
        console.log(`   ✅ Batch ${batchNumber}/${totalBatches}: Deleted ${result.rows.length} products (${variantResult.rows.length} variants)`);

      } catch (error) {
        console.error(`   ❌ Batch ${batchNumber} error:`, error.message);
      }

      const progress = ((i + batch.length) / existingIds.length * 100).toFixed(1);
      console.log(`   📊 Progress: ${progress}% (${i + batch.length}/${existingIds.length})`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 DELETION SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Products deleted: ${deletedCount}`);
    console.log(`✅ Variants deleted: ${variantDeletedCount}`);
    console.log(`📦 Total products remaining: ${254 - deletedCount}`);

    // Verify deletion
    const verifyResult = await pool.query(
      'SELECT COUNT(*) as count FROM lats_products WHERE id = ANY($1::uuid[])',
      [existingIds]
    );
    const remainingCount = parseInt(verifyResult.rows[0].count);

    if (remainingCount === 0) {
      console.log('✅ All products successfully deleted');
    } else {
      console.log(`⚠️  Warning: ${remainingCount} products still exist in database`);
    }

    console.log('\n🎉 Deletion completed!');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

deleteProducts();
