#!/usr/bin/env node

/**
 * Import Product Variants by Matching Product Names
 * 
 * This script imports variants by matching them to products by name/SKU
 * since the product IDs may have changed.
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

const DEFAULT_JSON_FILE = path.join(__dirname, 'DEV BACKUP', 'json_data', 'lats_product_variants.json');
const JSON_FILE_PATH = process.argv[3] || DEFAULT_JSON_FILE;

const pool = new Pool({ connectionString: DATABASE_URL });
const BATCH_SIZE = 50;

const VALID_VARIANT_COLUMNS = [
  'id', 'product_id', 'sku', 'barcode', 'quantity', 'min_quantity',
  'unit_price', 'cost_price', 'is_active', 'created_at', 'updated_at',
  'name', 'selling_price', 'attributes', 'weight', 'dimensions',
  'variant_name', 'variant_attributes', 'branch_id', 'stock_per_branch',
  'is_shared', 'visible_to_branches', 'sharing_mode', 'reserved_quantity',
  'reorder_point', 'parent_variant_id', 'is_parent', 'variant_type', 'status'
];

async function getProductMapping() {
  // Get all products from database with their IDs and names
  const result = await pool.query('SELECT id, name, sku FROM lats_products');
  const mapping = new Map();
  
  result.rows.forEach(product => {
    // Map by name (case-insensitive)
    const nameKey = product.name?.toLowerCase().trim();
    if (nameKey) {
      mapping.set(nameKey, product.id);
    }
    // Also map by SKU if available
    if (product.sku) {
      mapping.set(product.sku.toLowerCase().trim(), product.id);
    }
  });
  
  return mapping;
}

function prepareVariantData(variant, productId, validKeys) {
  const cleanVariant = {};
  
  for (const col of VALID_VARIANT_COLUMNS) {
    if (variant.hasOwnProperty(col)) {
      cleanVariant[col] = variant[col];
    }
  }

  let branchId = cleanVariant.branch_id;
  if (branchId && validKeys?.branchIds && !validKeys.branchIds.includes(branchId)) {
    branchId = validKeys.branchIds[0] || null;
  } else if (!branchId && validKeys?.branchIds && validKeys.branchIds.length > 0) {
    branchId = validKeys.branchIds[0];
  }

  return {
    ...cleanVariant,
    product_id: productId, // Use mapped product_id
    branch_id: branchId,
    name: cleanVariant.name || cleanVariant.variant_name || 'Default Variant',
    variant_name: cleanVariant.variant_name || cleanVariant.name || 'Default Variant',
    is_active: cleanVariant.is_active !== undefined ? cleanVariant.is_active : true,
    sharing_mode: cleanVariant.sharing_mode || 'isolated',
    is_shared: cleanVariant.is_shared !== undefined ? cleanVariant.is_shared : true,
    variant_type: cleanVariant.variant_type || 'standard',
    status: cleanVariant.status || 'active',
    cost_price: cleanVariant.cost_price ? parseFloat(cleanVariant.cost_price) : 0,
    selling_price: cleanVariant.selling_price ? parseFloat(cleanVariant.selling_price) : 0,
    unit_price: cleanVariant.unit_price ? parseFloat(cleanVariant.unit_price) : 0,
    quantity: cleanVariant.quantity || 0,
    min_quantity: cleanVariant.min_quantity || 0,
    reserved_quantity: cleanVariant.reserved_quantity || 0,
    reorder_point: cleanVariant.reorder_point || 0,
    is_parent: cleanVariant.is_parent || false,
    attributes: typeof cleanVariant.attributes === 'object' && cleanVariant.attributes !== null ? cleanVariant.attributes : (cleanVariant.attributes && typeof cleanVariant.attributes === 'string' ? JSON.parse(cleanVariant.attributes) : {}),
    variant_attributes: typeof cleanVariant.variant_attributes === 'object' && cleanVariant.variant_attributes !== null ? cleanVariant.variant_attributes : (cleanVariant.variant_attributes && typeof cleanVariant.variant_attributes === 'string' ? JSON.parse(cleanVariant.variant_attributes) : {}),
    stock_per_branch: typeof cleanVariant.stock_per_branch === 'object' && cleanVariant.stock_per_branch !== null ? cleanVariant.stock_per_branch : (cleanVariant.stock_per_branch && typeof cleanVariant.stock_per_branch === 'string' ? JSON.parse(cleanVariant.stock_per_branch) : {}),
    dimensions: typeof cleanVariant.dimensions === 'object' && cleanVariant.dimensions !== null ? cleanVariant.dimensions : (cleanVariant.dimensions && typeof cleanVariant.dimensions === 'string' ? JSON.parse(cleanVariant.dimensions) : null),
    visible_to_branches: Array.isArray(cleanVariant.visible_to_branches) ? cleanVariant.visible_to_branches : null,
    created_at: cleanVariant.created_at || new Date().toISOString(),
    updated_at: cleanVariant.updated_at || new Date().toISOString(),
  };
}

async function getValidForeignKeys() {
  const validKeys = { branchIds: [], productIds: [] };
  try {
    const [branches, products] = await Promise.all([
      pool.query('SELECT id FROM lats_branches WHERE is_active = true').catch(() => ({ rows: [] })),
      pool.query('SELECT id FROM lats_products').catch(() => ({ rows: [] }))
    ]);
    validKeys.branchIds = branches.rows.map(row => row.id);
    validKeys.productIds = products.rows.map(row => row.id);
  } catch (error) {
    console.warn('⚠️  Could not fetch foreign keys:', error.message);
  }
  return validKeys;
}

async function importVariants(variants, productMapping) {
  console.log(`\n📦 Starting import of ${variants.length} variants...\n`);

  const validKeys = await getValidForeignKeys();
  console.log(`✅ Found ${validKeys.branchIds.length} branches, ${validKeys.productIds.length} products\n`);

  // We need product names from variants - but variants don't have product names
  // We'll need to load products from backup to match
  const productsBackupPath = path.join(__dirname, 'PROD BACKUP', 'lats_products_2025-12-07_01-43-50.json');
  let productsBackup = [];
  if (fs.existsSync(productsBackupPath)) {
    const productsData = JSON.parse(fs.readFileSync(productsBackupPath, 'utf8'));
    productsBackup = productsData;
  }

  // Create mapping from old product_id to product name
  const oldProductIdToName = new Map();
  productsBackup.forEach(p => {
    if (p.id && p.name) {
      oldProductIdToName.set(p.id, p.name.toLowerCase().trim());
    }
  });

  // Match variants to current products
  const matchedVariants = [];
  const unmatchedVariants = [];

  variants.forEach(variant => {
    const oldProductId = variant.product_id;
    const productName = oldProductIdToName.get(oldProductId);
    
    if (productName) {
      const newProductId = productMapping.get(productName);
      if (newProductId) {
        matchedVariants.push({ ...variant, mapped_product_id: newProductId, product_name: productName });
      } else {
        unmatchedVariants.push({ variant, reason: `Product name "${productName}" not found in database` });
      }
    } else {
      unmatchedVariants.push({ variant, reason: `Product ID ${oldProductId} not found in backup` });
    }
  });

  console.log(`📋 Matched variants: ${matchedVariants.length}`);
  console.log(`⚠️  Unmatched variants: ${unmatchedVariants.length}\n`);

  if (unmatchedVariants.length > 0 && unmatchedVariants.length <= 10) {
    console.log('Unmatched variants:');
    unmatchedVariants.slice(0, 5).forEach(({ variant, reason }) => {
      console.log(`   - ${variant.name || variant.variant_name || variant.id}: ${reason}`);
    });
    console.log('');
  }

  let successCount = 0;
  let errorCount = 0;
  const errors = [];

  for (let i = 0; i < matchedVariants.length; i += BATCH_SIZE) {
    const batch = matchedVariants.slice(i, i + BATCH_SIZE);
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(matchedVariants.length / BATCH_SIZE);

    console.log(`\n📦 Processing batch ${batchNumber}/${totalBatches} (${batch.length} variants)...`);

    try {
      const preparedBatch = await Promise.all(
        batch.map(item => prepareVariantData(item, item.mapped_product_id, validKeys))
      );

      const allColumns = Object.keys(preparedBatch[0]);
      const columns = allColumns.join(', ');
      
      const values = preparedBatch.map((variant, idx) => {
        const rowValues = allColumns.map((col, colIdx) => {
          const value = variant[col];
          const paramNum = idx * allColumns.length + colIdx + 1;
          if (value === null || value === undefined) return 'NULL';
          if (typeof value === 'string') return `$${paramNum}::text`;
          if (typeof value === 'number') return `$${paramNum}::numeric`;
          if (typeof value === 'boolean') return `$${paramNum}::boolean`;
          if (Array.isArray(value)) return `$${paramNum}::jsonb`;
          if (typeof value === 'object') return `$${paramNum}::jsonb`;
          return `$${paramNum}`;
        }).join(', ');
        return `(${rowValues})`;
      }).join(', ');
      
      const params = preparedBatch.flatMap(variant => 
        allColumns.map(col => {
          const value = variant[col];
          if (value === null || value === undefined) return null;
          if (typeof value === 'object') return JSON.stringify(value);
          return value;
        })
      );
      
      const updateClauses = allColumns
        .filter(col => col !== 'id')
        .map(col => `${col} = EXCLUDED.${col}`)
        .join(', ');
      
      const query = `
        INSERT INTO lats_product_variants (${columns}) 
        VALUES ${values}
        ON CONFLICT (id) DO UPDATE SET ${updateClauses}
        RETURNING *
      `;
      
      const result = await pool.query(query, params);
      successCount += result.rows.length;
      console.log(`   ✅ Successfully imported ${result.rows.length} variants`);

    } catch (err) {
      console.error(`❌ Batch ${batchNumber} error:`, err.message);
      errorCount += batch.length;
      errors.push({ batch: batchNumber, error: err.message });
    }

    const progress = ((i + batch.length) / matchedVariants.length * 100).toFixed(1);
    console.log(`   📊 Progress: ${progress}% (${i + batch.length}/${matchedVariants.length})`);
  }

  return { successCount, errorCount, errors, unmatchedCount: unmatchedVariants.length };
}

async function main() {
  try {
    console.log('🚀 Variant Import Script (by Product Name)');
    console.log('='.repeat(60));
    console.log(`📁 JSON File: ${JSON_FILE_PATH}`);
    console.log('='.repeat(60));

    if (!fs.existsSync(JSON_FILE_PATH)) {
      console.error(`❌ Error: File not found: ${JSON_FILE_PATH}`);
      process.exit(1);
    }

    console.log('\n📖 Reading JSON file...');
    const fileContent = fs.readFileSync(JSON_FILE_PATH, 'utf8');
    const variants = JSON.parse(fileContent);

    if (!Array.isArray(variants)) {
      console.error('❌ Error: JSON file does not contain an array of variants');
      process.exit(1);
    }

    console.log(`✅ Found ${variants.length} variants in JSON file`);

    const validVariants = variants.filter(v => v.id && v.product_id);
    console.log(`✅ ${validVariants.length} valid variants to process\n`);

    console.log('🔍 Building product mapping...');
    const productMapping = await getProductMapping();
    console.log(`✅ Mapped ${productMapping.size} products\n`);

    console.log('🔌 Testing database connection...');
    await pool.query('SELECT id FROM lats_product_variants LIMIT 1');
    console.log('✅ Database connection successful\n');

    console.log(`⚠️  About to import variants (matching by product name)`);
    console.log('   Press Ctrl+C to cancel, or wait 3 seconds to continue...\n');
    await new Promise(resolve => setTimeout(resolve, 3000));

    const result = await importVariants(validVariants, productMapping);

    console.log('\n' + '='.repeat(60));
    console.log('📊 IMPORT SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Successfully imported: ${result.successCount}`);
    console.log(`❌ Failed: ${result.errorCount}`);
    console.log(`⚠️  Unmatched: ${result.unmatchedCount}`);
    console.log(`📦 Total processed: ${validVariants.length}`);

    if (result.errors.length > 0) {
      console.log(`\n⚠️  ${result.errors.length} errors occurred`);
    }

    console.log('\n🎉 Import completed!');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
