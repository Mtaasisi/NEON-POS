#!/usr/bin/env node

import postgres from 'postgres';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbConfig = JSON.parse(readFileSync(join(__dirname, 'database-config.json'), 'utf-8'));
const sql = postgres(dbConfig.url, { ssl: 'require' });

async function verifyImport() {
  try {
    console.log('\n🔍 Verifying Imported Data\n');

    // Count categories
    const categoryCount = await sql`SELECT COUNT(*) as count FROM lats_categories`;
    console.log(`📁 Categories: ${categoryCount[0].count}`);

    // Count suppliers
    const supplierCount = await sql`SELECT COUNT(*) as count FROM lats_suppliers`;
    console.log(`🏢 Suppliers: ${supplierCount[0].count}`);

    // Count products
    const productCount = await sql`SELECT COUNT(*) as count FROM lats_products`;
    console.log(`📦 Products: ${productCount[0].count}`);

    // Count variants
    const variantCount = await sql`SELECT COUNT(*) as count FROM lats_product_variants`;
    console.log(`🎨 Product Variants: ${variantCount[0].count}`);

    // Show total stock quantity and value
    const stats = await sql`
      SELECT 
        SUM(stock_quantity) as total_quantity,
        SUM(stock_quantity * unit_price) as total_value
      FROM lats_products
    `;
    console.log(`\n📊 Inventory Statistics:`);
    console.log(`   Total Items: ${stats[0].total_quantity || 0}`);
    console.log(`   Total Value: ${Number(stats[0].total_value || 0).toLocaleString()} TZS`);

    // Show sample products
    console.log(`\n🎯 Sample Products (First 10):\n`);
    const sampleProducts = await sql`
      SELECT 
        name, 
        stock_quantity, 
        unit_price,
        (SELECT lats_categories.name FROM lats_categories WHERE lats_categories.id = lats_products.category_id) as category
      FROM lats_products
      ORDER BY created_at DESC
      LIMIT 10
    `;
    
    sampleProducts.forEach(p => {
      console.log(`   • ${p.name}`);
      console.log(`     Category: ${p.category || 'N/A'} | Qty: ${p.stock_quantity} | Price: ${Number(p.unit_price).toLocaleString()} TZS`);
    });

    console.log('\n✅ Import verification complete!\n');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await sql.end();
  }
}

verifyImport();

