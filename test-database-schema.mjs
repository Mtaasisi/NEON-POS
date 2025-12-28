#!/usr/bin/env node

/**
 * Test script to verify database schema fixes
 */

import { initializeLocalDatabase, executeQuery } from './src/lib/localDatabase.ts';
import { runMigrations } from './src/lib/databaseMigration.ts';

async function testDatabaseSchema() {
  console.log('🧪 Testing database schema fixes...\n');

  try {
    // Initialize database
    console.log('1. Initializing local database...');
    await initializeLocalDatabase();
    console.log('✅ Database initialized\n');

    // Run migrations
    console.log('2. Running migrations...');
    const migrationResult = await runMigrations();
    console.log(`✅ Migrations completed (version: ${migrationResult.version})\n`);

    // Check if sku column exists in lats_products
    console.log('3. Checking lats_products schema...');
    const productColumns = executeQuery("PRAGMA table_info(lats_products)");
    const hasSkuColumn = productColumns.some(col => col.name === 'sku');
    console.log(`   - sku column exists: ${hasSkuColumn ? '✅' : '❌'}`);

    // Check sample data
    console.log('4. Checking sample data...');
    const products = executeQuery("SELECT id, name, sku FROM lats_products LIMIT 5");

    console.log(`   - Found ${products.length} products`);
    for (const product of products) {
      const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(product.id);
      console.log(`   - ${product.name}: ID=${product.id.substring(0, 8)}... (${isValidUUID ? 'UUID✅' : 'UUID❌'}), SKU=${product.sku || 'null'}`);
    }

    // Check variants
    console.log('\n5. Checking product variants...');
    const variants = executeQuery("SELECT id, product_id, sku FROM lats_product_variants LIMIT 5");
    console.log(`   - Found ${variants.length} variants`);
    for (const variant of variants) {
      const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(variant.id);
      console.log(`   - Variant ID=${variant.id.substring(0, 8)}... (${isValidUUID ? 'UUID✅' : 'UUID❌'}), Product=${variant.product_id.substring(0, 8)}..., SKU=${variant.sku}`);
    }

    console.log('\n🎉 Schema test completed successfully!');

  } catch (error) {
    console.error('❌ Schema test failed:', error);
    process.exit(1);
  }
}

testDatabaseSchema();
