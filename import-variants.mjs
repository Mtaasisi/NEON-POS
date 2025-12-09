#!/usr/bin/env node

/**
 * Import Product Variants from JSON Backup
 * 
 * This script imports product variants from a JSON backup file.
 */

import { Pool } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env.production') });

// Database configuration
const DATABASE_URL = process.argv[2] || process.env.DATABASE_URL || process.env.VITE_DATABASE_URL || 
  'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

// JSON file path - can be overridden via command line argument
const DEFAULT_JSON_FILE = path.join(__dirname, 'BackupRestoreManager', 'PROD BACKUP', 'DEV', 'lats_product_variants_2025-12-07_13-57-54.json');
const JSON_FILE_PATH = process.argv[3] || DEFAULT_JSON_FILE;

const pool = new Pool({ connectionString: DATABASE_URL });

// Batch size for bulk inserts
const BATCH_SIZE = 50;

/**
 * Valid columns in lats_product_variants table
 */
const VALID_VARIANT_COLUMNS = [
  'id', 'product_id', 'sku', 'barcode', 'quantity', 'min_quantity',
  'unit_price', 'cost_price', 'is_active', 'created_at', 'updated_at',
  'name', 'selling_price', 'attributes', 'weight', 'dimensions',
  'variant_name', 'variant_attributes', 'branch_id', 'stock_per_branch',
  'is_shared', 'visible_to_branches', 'sharing_mode', 'reserved_quantity',
  'reorder_point', 'parent_variant_id', 'is_parent', 'variant_type', 'status'
];

/**
 * Clean and prepare variant data for insertion
 */
function prepareVariantData(variant, validKeys = null) {
  // Only include valid database columns
  const cleanVariant = {};
  
  for (const col of VALID_VARIANT_COLUMNS) {
    if (variant.hasOwnProperty(col)) {
      cleanVariant[col] = variant[col];
    }
  }

  // Handle branch_id - use default if doesn't exist
  let branchId = cleanVariant.branch_id;
  if (branchId && validKeys?.branchIds && !validKeys.branchIds.includes(branchId)) {
    branchId = validKeys.branchIds[0] || null; // Use first available branch
  } else if (!branchId && validKeys?.branchIds && validKeys.branchIds.length > 0) {
    branchId = validKeys.branchIds[0]; // Use first available branch
  }

  // Ensure required fields have defaults
  return {
    ...cleanVariant,
    branch_id: branchId, // Use validated/default branch_id
    name: cleanVariant.name || cleanVariant.variant_name || 'Default Variant',
    variant_name: cleanVariant.variant_name || cleanVariant.name || 'Default Variant',
    is_active: cleanVariant.is_active !== undefined ? cleanVariant.is_active : true,
    sharing_mode: cleanVariant.sharing_mode || 'isolated',
    is_shared: cleanVariant.is_shared !== undefined ? cleanVariant.is_shared : true,
    variant_type: cleanVariant.variant_type || 'standard',
    status: cleanVariant.status || 'active',
    // Ensure numeric fields are properly formatted
    cost_price: cleanVariant.cost_price ? parseFloat(cleanVariant.cost_price) : 0,
    selling_price: cleanVariant.selling_price ? parseFloat(cleanVariant.selling_price) : 0,
    unit_price: cleanVariant.unit_price ? parseFloat(cleanVariant.unit_price) : 0,
    quantity: cleanVariant.quantity || 0,
    min_quantity: cleanVariant.min_quantity || 0,
    reserved_quantity: cleanVariant.reserved_quantity || 0,
    reorder_point: cleanVariant.reorder_point || 0,
    is_parent: cleanVariant.is_parent || false,
    // Ensure JSON fields are properly formatted
    attributes: typeof cleanVariant.attributes === 'object' && cleanVariant.attributes !== null ? cleanVariant.attributes : (cleanVariant.attributes && typeof cleanVariant.attributes === 'string' ? JSON.parse(cleanVariant.attributes) : {}),
    variant_attributes: typeof cleanVariant.variant_attributes === 'object' && cleanVariant.variant_attributes !== null ? cleanVariant.variant_attributes : (cleanVariant.variant_attributes && typeof cleanVariant.variant_attributes === 'string' ? JSON.parse(cleanVariant.variant_attributes) : {}),
    stock_per_branch: typeof cleanVariant.stock_per_branch === 'object' && cleanVariant.stock_per_branch !== null ? cleanVariant.stock_per_branch : (cleanVariant.stock_per_branch && typeof cleanVariant.stock_per_branch === 'string' ? JSON.parse(cleanVariant.stock_per_branch) : {}),
    dimensions: typeof cleanVariant.dimensions === 'object' && cleanVariant.dimensions !== null ? cleanVariant.dimensions : (cleanVariant.dimensions && typeof cleanVariant.dimensions === 'string' ? JSON.parse(cleanVariant.dimensions) : null),
    visible_to_branches: Array.isArray(cleanVariant.visible_to_branches) ? cleanVariant.visible_to_branches : null,
    // Ensure dates are properly formatted
    created_at: cleanVariant.created_at || new Date().toISOString(),
    updated_at: cleanVariant.updated_at || new Date().toISOString(),
  };
}

/**
 * Get all valid foreign key IDs from database
 */
async function getValidForeignKeys() {
  const validKeys = {
    branchIds: [],
    productIds: []
  };

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

/**
 * Import variants in batches
 */
async function importVariants(variants) {
  console.log(`\n📦 Starting import of ${variants.length} variants...\n`);

  // Get valid foreign key IDs
  console.log('🔍 Fetching valid foreign keys...');
  const validKeys = await getValidForeignKeys();
  console.log(`✅ Found ${validKeys.branchIds.length} branches, ${validKeys.productIds.length} products`);
  console.log('');

  // Filter variants to only those with valid product_ids
  const validVariants = variants.filter(v => {
    if (!v.product_id) {
      return false;
    }
    if (validKeys.productIds.length > 0 && !validKeys.productIds.includes(v.product_id)) {
      return false;
    }
    return true;
  });

  console.log(`📋 Filtered to ${validVariants.length} variants with valid product_ids`);
  if (validVariants.length < variants.length) {
    console.log(`   ⚠️  Skipped ${variants.length - validVariants.length} variants with invalid/missing product_ids`);
  }
  console.log('');

  let successCount = 0;
  let errorCount = 0;
  const errors = [];

  // Process in batches
  for (let i = 0; i < validVariants.length; i += BATCH_SIZE) {
    const batch = validVariants.slice(i, i + BATCH_SIZE);
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(validVariants.length / BATCH_SIZE);

    console.log(`\n📦 Processing batch ${batchNumber}/${totalBatches} (${batch.length} variants)...`);

    try {
      // Prepare batch data
      const preparedBatch = await Promise.all(
        batch.map(variant => prepareVariantData(variant, validKeys))
      );

      // Build INSERT query with ON CONFLICT
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
      
      // Build parameter values
      const params = preparedBatch.flatMap(variant => 
        allColumns.map(col => {
          const value = variant[col];
          if (value === null || value === undefined) return null;
          if (typeof value === 'object') return JSON.stringify(value);
          return value;
        })
      );
      
      // Build UPDATE clause for conflict resolution
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
      
      // Try inserting one by one to identify problematic variants
      console.log(`   ⚠️  Attempting individual inserts for batch ${batchNumber}...`);
      for (const variant of batch) {
        try {
          const prepared = await prepareVariantData(variant, validKeys);
          const singleColumns = Object.keys(prepared);
          const singleValues = singleColumns.map((col, idx) => {
            const value = prepared[col];
            const paramNum = idx + 1;
            if (value === null || value === undefined) return 'NULL';
            if (typeof value === 'string') return `$${paramNum}::text`;
            if (typeof value === 'number') return `$${paramNum}::numeric`;
            if (typeof value === 'boolean') return `$${paramNum}::boolean`;
            if (Array.isArray(value)) return `$${paramNum}::jsonb`;
            if (typeof value === 'object') return `$${paramNum}::jsonb`;
            return `$${paramNum}`;
          }).join(', ');
          
          const singleParams = singleColumns.map(col => {
            const value = prepared[col];
            if (value === null || value === undefined) return null;
            if (typeof value === 'object') return JSON.stringify(value);
            return value;
          });
          
          const singleUpdateClauses = singleColumns
            .filter(col => col !== 'id')
            .map(col => `${col} = EXCLUDED.${col}`)
            .join(', ');
          
          const singleQuery = `
            INSERT INTO lats_product_variants (${singleColumns.join(', ')}) 
            VALUES (${singleValues})
            ON CONFLICT (id) DO UPDATE SET ${singleUpdateClauses}
            RETURNING *
          `;
          
          await pool.query(singleQuery, singleParams);
          successCount++;
        } catch (singleErr) {
          console.error(`   ❌ Failed: ${variant.name || variant.variant_name || variant.id}: ${singleErr.message}`);
          errors.push({ variant: variant.name || variant.id, error: singleErr.message });
        }
      }
    }

    // Progress update
    const progress = ((i + batch.length) / validVariants.length * 100).toFixed(1);
    console.log(`   📊 Progress: ${progress}% (${i + batch.length}/${validVariants.length})`);
  }

  return { successCount, errorCount, errors };
}

/**
 * Main import function
 */
async function main() {
  try {
    console.log('🚀 Variant Import Script');
    console.log('='.repeat(60));
    console.log(`📁 JSON File: ${JSON_FILE_PATH}`);
    console.log(`🔗 Database: Neon PostgreSQL (Direct)`);
    console.log('='.repeat(60));

    // Check if file exists
    if (!fs.existsSync(JSON_FILE_PATH)) {
      console.error(`❌ Error: File not found: ${JSON_FILE_PATH}`);
      process.exit(1);
    }

    // Read and parse JSON file
    console.log('\n📖 Reading JSON file...');
    const fileContent = fs.readFileSync(JSON_FILE_PATH, 'utf8');
    const variants = JSON.parse(fileContent);

    if (!Array.isArray(variants)) {
      console.error('❌ Error: JSON file does not contain an array of variants');
      process.exit(1);
    }

    console.log(`✅ Found ${variants.length} variants in JSON file`);

    // Validate variants have required fields
    console.log('\n🔍 Validating variants...');
    const validVariants = variants.filter(v => {
      if (!v.id) {
        console.warn(`⚠️  Skipping variant without ID`);
        return false;
      }
      if (!v.product_id) {
        console.warn(`⚠️  Skipping variant without product_id: ${v.id}`);
        return false;
      }
      return true;
    });

    console.log(`✅ ${validVariants.length} valid variants to import`);

    if (validVariants.length === 0) {
      console.log('⚠️  No valid variants to import');
      process.exit(0);
    }

    // Test database connection
    console.log('\n🔌 Testing database connection...');
    try {
      await pool.query('SELECT id FROM lats_product_variants LIMIT 1');
      console.log('✅ Database connection successful');
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      process.exit(1);
    }

    // Ask for confirmation
    console.log(`\n⚠️  About to import ${validVariants.length} variants`);
    console.log('   This will update existing variants with the same ID');
    console.log('   Press Ctrl+C to cancel, or wait 3 seconds to continue...\n');
    
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Import variants
    const result = await importVariants(validVariants);

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 IMPORT SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Successfully imported: ${result.successCount}`);
    console.log(`❌ Failed: ${result.errorCount}`);
    console.log(`📦 Total processed: ${validVariants.length}`);

    if (result.errors.length > 0) {
      console.log(`\n⚠️  ${result.errors.length} errors occurred:`);
      result.errors.slice(0, 10).forEach((err, idx) => {
        console.log(`   ${idx + 1}. ${err.variant || `Batch ${err.batch}`}: ${err.error}`);
      });
      if (result.errors.length > 10) {
        console.log(`   ... and ${result.errors.length - 10} more errors`);
      }
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

// Run the import
main();
