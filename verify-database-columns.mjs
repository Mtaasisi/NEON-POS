#!/usr/bin/env node

/**
 * Database Column Verification Script
 * Verifies that the required columns exist after migration
 */

import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

async function verifyColumns() {
  console.log('🔍 Verifying database columns...\n');
  
  const sql = postgres(DATABASE_URL, {
    max: 1,
    ssl: 'require'
  });

  try {
    // Check branch_id in lats_sale_items
    console.log('1️⃣  Checking lats_sale_items.branch_id...');
    const saleItemsCheck = await sql`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'lats_sale_items' 
      AND column_name = 'branch_id'
    `;
    
    if (saleItemsCheck.length > 0) {
      console.log('   ✅ branch_id exists in lats_sale_items');
      console.log('   📊 Type:', saleItemsCheck[0].data_type);
      console.log('   📌 Default:', saleItemsCheck[0].column_default || 'none');
    } else {
      console.log('   ❌ branch_id MISSING in lats_sale_items');
    }
    
    // Check category in lats_products
    console.log('\n2️⃣  Checking lats_products.category...');
    const productsCheck = await sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'lats_products' 
      AND column_name = 'category'
    `;
    
    if (productsCheck.length > 0) {
      console.log('   ✅ category exists in lats_products');
      console.log('   📊 Type:', productsCheck[0].data_type);
    } else {
      console.log('   ❌ category MISSING in lats_products');
    }
    
    // Check trigger
    console.log('\n3️⃣  Checking sync trigger...');
    const triggerCheck = await sql`
      SELECT trigger_name
      FROM information_schema.triggers
      WHERE trigger_name = 'trigger_sync_product_category'
    `;
    
    if (triggerCheck.length > 0) {
      console.log('   ✅ trigger_sync_product_category exists');
    } else {
      console.log('   ⚠️  trigger_sync_product_category not found');
    }
    
    // Sample data check
    console.log('\n4️⃣  Sample data check...');
    const sampleProducts = await sql`
      SELECT id, name, category_id, category
      FROM lats_products
      WHERE category IS NOT NULL
      LIMIT 3
    `;
    
    console.log(`   📦 Found ${sampleProducts.length} products with categories`);
    if (sampleProducts.length > 0) {
      console.log('   Sample:');
      sampleProducts.forEach(p => {
        console.log(`      - ${p.name}: "${p.category}"`);
      });
    }
    
    const sampleSaleItems = await sql`
      SELECT id, branch_id
      FROM lats_sale_items
      WHERE branch_id IS NOT NULL
      LIMIT 3
    `;
    
    console.log(`\n   📦 Found ${sampleSaleItems.length} sale items with branch_id`);
    
    // Check indexes
    console.log('\n5️⃣  Checking indexes...');
    const indexes = await sql`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename IN ('lats_sale_items', 'lats_products')
      AND indexname IN ('idx_sale_items_branch', 'idx_products_category_text')
    `;
    
    console.log(`   📊 Found ${indexes.length}/2 expected indexes`);
    indexes.forEach(idx => {
      console.log(`      ✅ ${idx.indexname}`);
    });
    
    console.log('\n================================================');
    console.log('✅ Verification completed successfully!');
    console.log('================================================\n');
    
  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

verifyColumns();

