#!/usr/bin/env node

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database connection string
const connectionString = 'postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function restoreProducts() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('✅ Connected to database');
    
    // Read backup data
    const backupPath = path.join(__dirname, '../database-backup-2025-10-26T17-18-24-701Z.json');
    const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    
    const categories = backup.tables.lats_categories.data;
    const products = backup.tables.lats_products.data;
    const variants = backup.tables.lats_product_variants.data;
    
    console.log(`\n📦 Data to restore:`);
    console.log(`  - ${categories.length} categories`);
    console.log(`  - ${products.length} products`);
    console.log(`  - ${variants.length} product variants`);
    console.log('');
    
    // Start transaction
    await client.query('BEGIN');
    
    // 1. Restore Categories
    console.log('🏷️  Restoring categories...');
    let categoriesRestored = 0;
    for (const category of categories) {
      try {
        await client.query(`
          INSERT INTO lats_categories (
            id, name, description, parent_id, is_active, 
            created_at, updated_at, branch_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            parent_id = EXCLUDED.parent_id,
            is_active = EXCLUDED.is_active,
            updated_at = EXCLUDED.updated_at
        `, [
          category.id,
          category.name,
          category.description,
          category.parent_id,
          category.is_active !== false,
          category.created_at || new Date(),
          category.updated_at || new Date(),
          category.branch_id
        ]);
        categoriesRestored++;
      } catch (err) {
        console.log(`  ⚠️  Warning: Could not restore category "${category.name}": ${err.message}`);
      }
    }
    console.log(`  ✅ Restored ${categoriesRestored}/${categories.length} categories`);
    
    // 2. Restore Products
    console.log('\n📱 Restoring products...');
    let productsRestored = 0;
    for (const product of products) {
      try {
        await client.query(`
          INSERT INTO lats_products (
            id, name, description, category_id, sku, barcode,
            cost_price, selling_price, min_price, stock_quantity,
            reorder_level, brand, warranty_period, warranty_type,
            supplier_id, is_active, is_featured, has_variants,
            tags, notes, branch_id, tax_rate, unit,
            created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
            $11, $12, $13, $14, $15, $16, $17, $18,
            $19, $20, $21, $22, $23, $24, $25
          )
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            category_id = EXCLUDED.category_id,
            sku = EXCLUDED.sku,
            barcode = EXCLUDED.barcode,
            cost_price = EXCLUDED.cost_price,
            selling_price = EXCLUDED.selling_price,
            min_price = EXCLUDED.min_price,
            stock_quantity = EXCLUDED.stock_quantity,
            reorder_level = EXCLUDED.reorder_level,
            brand = EXCLUDED.brand,
            warranty_period = EXCLUDED.warranty_period,
            warranty_type = EXCLUDED.warranty_type,
            is_active = EXCLUDED.is_active,
            is_featured = EXCLUDED.is_featured,
            has_variants = EXCLUDED.has_variants,
            tags = EXCLUDED.tags,
            notes = EXCLUDED.notes,
            tax_rate = EXCLUDED.tax_rate,
            unit = EXCLUDED.unit,
            updated_at = EXCLUDED.updated_at
        `, [
          product.id,
          product.name,
          product.description,
          product.category_id,
          product.sku,
          product.barcode,
          product.cost_price || 0,
          product.selling_price || 0,
          product.min_price || 0,
          product.stock_quantity || 0,
          product.reorder_level || 0,
          product.brand,
          product.warranty_period,
          product.warranty_type,
          product.supplier_id,
          product.is_active !== false,
          product.is_featured || false,
          product.has_variants || false,
          product.tags,
          product.notes,
          product.branch_id,
          product.tax_rate || 0,
          product.unit || 'piece',
          product.created_at || new Date(),
          product.updated_at || new Date()
        ]);
        productsRestored++;
      } catch (err) {
        console.log(`  ⚠️  Warning: Could not restore product "${product.name}": ${err.message}`);
      }
    }
    console.log(`  ✅ Restored ${productsRestored}/${products.length} products`);
    
    // 3. Restore Product Variants
    console.log('\n🔧 Restoring product variants...');
    let variantsRestored = 0;
    for (const variant of variants) {
      try {
        await client.query(`
          INSERT INTO lats_product_variants (
            id, product_id, name, variant_name, sku, cost_price,
            selling_price, quantity, is_active, variant_attributes,
            barcode, parent_variant_id, is_parent, variant_type,
            branch_id, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
            $11, $12, $13, $14, $15, $16, $17
          )
          ON CONFLICT (id) DO UPDATE SET
            product_id = EXCLUDED.product_id,
            name = EXCLUDED.name,
            variant_name = EXCLUDED.variant_name,
            sku = EXCLUDED.sku,
            cost_price = EXCLUDED.cost_price,
            selling_price = EXCLUDED.selling_price,
            quantity = EXCLUDED.quantity,
            is_active = EXCLUDED.is_active,
            variant_attributes = EXCLUDED.variant_attributes,
            barcode = EXCLUDED.barcode,
            parent_variant_id = EXCLUDED.parent_variant_id,
            is_parent = EXCLUDED.is_parent,
            variant_type = EXCLUDED.variant_type,
            updated_at = EXCLUDED.updated_at
        `, [
          variant.id,
          variant.product_id,
          variant.name,
          variant.variant_name,
          variant.sku,
          variant.cost_price || 0,
          variant.selling_price || 0,
          variant.quantity || 0,
          variant.is_active !== false,
          typeof variant.variant_attributes === 'string' 
            ? variant.variant_attributes 
            : JSON.stringify(variant.variant_attributes || {}),
          variant.barcode,
          variant.parent_variant_id,
          variant.is_parent || false,
          variant.variant_type || 'standard',
          variant.branch_id,
          variant.created_at || new Date(),
          variant.updated_at || new Date()
        ]);
        variantsRestored++;
      } catch (err) {
        console.log(`  ⚠️  Warning: Could not restore variant "${variant.name}": ${err.message}`);
      }
    }
    console.log(`  ✅ Restored ${variantsRestored}/${variants.length} product variants`);
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log('\n🎉 Product restoration completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`  ✅ Categories: ${categoriesRestored}/${categories.length}`);
    console.log(`  ✅ Products: ${productsRestored}/${products.length}`);
    console.log(`  ✅ Variants: ${variantsRestored}/${variants.length}`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Error during restoration:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run the restoration
restoreProducts();

