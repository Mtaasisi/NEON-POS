#!/usr/bin/env node

/**
 * Delete Products from Backup
 * 
 * This script deletes products that were imported from the PROD BACKUP file.
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

const DATABASE_URL = process.argv[2] || process.env.DATABASE_URL || 
  'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const DEFAULT_JSON_FILE = path.join(__dirname, 'PROD BACKUP', 'lats_products_2025-12-07_01-43-50.json');
const JSON_FILE_PATH = process.argv[3] || DEFAULT_JSON_FILE;

const pool = new Pool({ connectionString: DATABASE_URL });
const BATCH_SIZE = 50;

async function deleteProducts() {
  try {
    console.log('🗑️  Delete Products from Backup');
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

    const productIds = products.filter(p => p.id).map(p => p.id);
    console.log(`✅ Found ${productIds.length} product IDs to delete\n`);

    if (productIds.length === 0) {
      console.log('⚠️  No product IDs found in backup file');
      process.exit(0);
    }

    // Check how many exist in database
    console.log('🔍 Checking products in database...');
    const checkResult = await pool.query(
      'SELECT COUNT(*) as count FROM lats_products WHERE id = ANY($1::uuid[])',
      [productIds]
    );
    const existingCount = parseInt(checkResult.rows[0].count);
    console.log(`   Found ${existingCount} products to delete\n`);

    if (existingCount === 0) {
      console.log('⚠️  No matching products found in database');
      process.exit(0);
    }

    // Show sample products to be deleted
    const sampleResult = await pool.query(
      'SELECT id, name, sku FROM lats_products WHERE id = ANY($1::uuid[]) LIMIT 10',
      [productIds]
    );
    console.log('📋 Sample products to be deleted:');
    sampleResult.rows.forEach((p, idx) => {
      console.log(`   ${idx + 1}. ${p.name} (${p.sku || 'No SKU'})`);
    });
    if (existingCount > 10) {
      console.log(`   ... and ${existingCount - 10} more products`);
    }
    console.log('');

    // Ask for confirmation
    console.log(`⚠️  About to DELETE ${existingCount} products`);
    console.log('   This action cannot be undone!');
    console.log('   Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Delete in batches
    let deletedCount = 0;
    let errorCount = 0;
    const errors = [];

    for (let i = 0; i < productIds.length; i += BATCH_SIZE) {
      const batch = productIds.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(productIds.length / BATCH_SIZE);

      console.log(`\n🗑️  Deleting batch ${batchNumber}/${totalBatches} (${batch.length} products)...`);

      try {
        // First, delete variants (if any)
        const variantDeleteResult = await pool.query(
          'DELETE FROM lats_product_variants WHERE product_id = ANY($1::uuid[])',
          [batch]
        );
        const variantsDeleted = variantDeleteResult.rowCount;
        if (variantsDeleted > 0) {
          console.log(`   🗑️  Deleted ${variantsDeleted} variants`);
        }

        // Then delete products
        const result = await pool.query(
          'DELETE FROM lats_products WHERE id = ANY($1::uuid[]) RETURNING id, name',
          [batch]
        );

        deletedCount += result.rows.length;
        console.log(`   ✅ Deleted ${result.rows.length} products`);

      } catch (err) {
        console.error(`   ❌ Batch ${batchNumber} error:`, err.message);
        errorCount += batch.length;
        errors.push({ batch: batchNumber, error: err.message });
      }

      const progress = ((i + batch.length) / productIds.length * 100).toFixed(1);
      console.log(`   📊 Progress: ${progress}% (${i + batch.length}/${productIds.length})`);
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 DELETE SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Successfully deleted: ${deletedCount}`);
    console.log(`❌ Failed: ${errorCount}`);
    console.log(`📦 Total processed: ${productIds.length}`);

    if (errors.length > 0) {
      console.log(`\n⚠️  ${errors.length} errors occurred`);
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
