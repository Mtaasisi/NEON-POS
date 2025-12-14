#!/usr/bin/env node

/**
 * Update Existing Products from Backup
 * 
 * This script updates existing products in the database with data from the backup file.
 * It matches products by ID and updates their fields.
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
const DEFAULT_JSON_FILE = path.join(__dirname, 'PROD BACKUP', 'lats_products_2025-12-07_01-43-50.json');
const JSON_FILE_PATH = process.argv[3] || DEFAULT_JSON_FILE;

const pool = new Pool({ connectionString: DATABASE_URL });

// Batch size for bulk updates
const BATCH_SIZE = 50;

/**
 * Valid columns in lats_products table
 */
const VALID_COLUMNS = [
  'id', 'name', 'description', 'sku', 'barcode', 'category_id',
  'unit_price', 'cost_price', 'stock_quantity', 'min_stock_level',
  'max_stock_level', 'is_active', 'image_url', 'supplier_id',
  'brand', 'model', 'warranty_period', 'created_at', 'updated_at',
  'specification', 'condition', 'selling_price', 'tags', 'total_quantity',
  'total_value', 'storage_room_id', 'store_shelf_id', 'attributes',
  'metadata', 'branch_id', 'is_shared', 'visible_to_branches',
  'sharing_mode', 'shelf_id', 'category'
];

/**
 * Clean and prepare product data for update
 */
async function prepareProductData(product, validKeys = null) {
  // Only include valid database columns
  const cleanProduct = {};
  
  for (const col of VALID_COLUMNS) {
    if (product.hasOwnProperty(col)) {
      cleanProduct[col] = product[col];
    }
  }

  // Handle branch_id - validate it exists or use default/null
  let branchId = cleanProduct.branch_id;
  if (branchId && validKeys?.branchIds && !validKeys.branchIds.includes(branchId)) {
    branchId = validKeys.branchIds[0] || null;
  } else if (!branchId && validKeys?.branchIds && validKeys.branchIds.length > 0) {
    branchId = validKeys.branchIds[0];
  }

  // Handle category_id - set to null if doesn't exist
  let categoryId = cleanProduct.category_id;
  if (categoryId && validKeys?.categoryIds && !validKeys.categoryIds.includes(categoryId)) {
    categoryId = null;
  }

  // Handle supplier_id - set to null if doesn't exist
  let supplierId = cleanProduct.supplier_id;
  if (supplierId && validKeys?.supplierIds && !validKeys.supplierIds.includes(supplierId)) {
    supplierId = null;
  }

  // Handle storage_room_id - set to null if doesn't exist
  let storageRoomId = cleanProduct.storage_room_id;
  if (storageRoomId && validKeys?.storageRoomIds && !validKeys.storageRoomIds.includes(storageRoomId)) {
    storageRoomId = null;
  }

  // Handle shelf_id - set to null if doesn't exist
  let shelfId = cleanProduct.shelf_id;
  if (shelfId && validKeys?.shelfIds && !validKeys.shelfIds.includes(shelfId)) {
    shelfId = null;
  }

  // Ensure required fields have defaults
  return {
    ...cleanProduct,
    branch_id: branchId,
    category_id: categoryId,
    supplier_id: supplierId,
    storage_room_id: storageRoomId,
    shelf_id: shelfId,
    name: cleanProduct.name || 'Unnamed Product',
    is_active: cleanProduct.is_active !== undefined ? cleanProduct.is_active : true,
    condition: cleanProduct.condition || 'new',
    sharing_mode: cleanProduct.sharing_mode || 'isolated',
    is_shared: cleanProduct.is_shared !== undefined ? cleanProduct.is_shared : true,
    // Ensure numeric fields are properly formatted
    cost_price: cleanProduct.cost_price ? parseFloat(cleanProduct.cost_price) : 0,
    selling_price: cleanProduct.selling_price ? parseFloat(cleanProduct.selling_price) : 0,
    unit_price: cleanProduct.unit_price ? parseFloat(cleanProduct.unit_price) : 0,
    total_quantity: cleanProduct.total_quantity || 0,
    total_value: cleanProduct.total_value ? parseFloat(cleanProduct.total_value) : 0,
    stock_quantity: cleanProduct.stock_quantity || 0,
    min_stock_level: cleanProduct.min_stock_level || 0,
    max_stock_level: cleanProduct.max_stock_level !== undefined ? cleanProduct.max_stock_level : null,
    // Ensure JSON fields are properly formatted
    tags: Array.isArray(cleanProduct.tags) ? cleanProduct.tags : (cleanProduct.tags ? (typeof cleanProduct.tags === 'string' ? JSON.parse(cleanProduct.tags) : []) : []),
    attributes: typeof cleanProduct.attributes === 'object' && cleanProduct.attributes !== null ? cleanProduct.attributes : (cleanProduct.attributes && typeof cleanProduct.attributes === 'string' ? JSON.parse(cleanProduct.attributes) : {}),
    metadata: typeof cleanProduct.metadata === 'object' && cleanProduct.metadata !== null ? cleanProduct.metadata : (cleanProduct.metadata && typeof cleanProduct.metadata === 'string' ? JSON.parse(cleanProduct.metadata) : {}),
    visible_to_branches: Array.isArray(cleanProduct.visible_to_branches) ? cleanProduct.visible_to_branches : null,
    // Update timestamp
    updated_at: new Date().toISOString(),
  };
}

/**
 * Get all valid foreign key IDs from database
 */
async function getValidForeignKeys() {
  const validKeys = {
    branchIds: [],
    categoryIds: [],
    supplierIds: [],
    storageRoomIds: [],
    shelfIds: []
  };

  try {
    const [branches, categories, suppliers, storageRooms, shelves] = await Promise.all([
      pool.query('SELECT id FROM lats_branches WHERE is_active = true').catch(() => ({ rows: [] })),
      pool.query('SELECT id FROM lats_categories').catch(() => ({ rows: [] })),
      pool.query('SELECT id FROM lats_suppliers').catch(() => ({ rows: [] })),
      pool.query('SELECT id FROM storage_rooms').catch(() => ({ rows: [] })),
      pool.query('SELECT id FROM store_shelves').catch(() => ({ rows: [] }))
    ]);
    validKeys.branchIds = branches.rows.map(row => row.id);
    validKeys.categoryIds = categories.rows.map(row => row.id);
    validKeys.supplierIds = suppliers.rows.map(row => row.id);
    validKeys.storageRoomIds = storageRooms.rows.map(row => row.id);
    validKeys.shelfIds = shelves.rows.map(row => row.id);
  } catch (error) {
    console.warn('⚠️  Could not fetch foreign keys:', error.message);
  }

  return validKeys;
}

/**
 * Update products in batches
 */
async function updateProducts(products) {
  console.log(`\n📦 Starting update of ${products.length} products...\n`);

  // Get valid foreign key IDs
  console.log('🔍 Fetching valid foreign keys...');
  const validKeys = await getValidForeignKeys();
  console.log(`✅ Found ${validKeys.branchIds.length} branches, ${validKeys.categoryIds.length} categories, ${validKeys.supplierIds.length} suppliers, ${validKeys.storageRoomIds.length} storage rooms, ${validKeys.shelfIds.length} shelves`);
  console.log('');

  let successCount = 0;
  let errorCount = 0;
  const errors = [];

  // Process in batches
  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const batch = products.slice(i, i + BATCH_SIZE);
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(products.length / BATCH_SIZE);

    console.log(`\n📦 Processing batch ${batchNumber}/${totalBatches} (${batch.length} products)...`);

    try {
      // Prepare batch data
      const preparedBatch = await Promise.all(
        batch.map(product => prepareProductData(product, validKeys))
      );

      // Update each product individually (UPDATE WHERE id = ...)
      for (const product of preparedBatch) {
        try {
          const allColumns = Object.keys(product).filter(col => col !== 'id');
          const timestampColumns = ['created_at', 'updated_at'];
          
          const setClauses = allColumns.map((col, idx) => {
            const value = product[col];
            const paramNum = idx + 1;
            
            if (value === null || value === undefined) return `${col} = NULL`;
            
            // Handle timestamp columns
            if (timestampColumns.includes(col)) {
              return `${col} = $${paramNum}::timestamptz`;
            }
            
            if (typeof value === 'string') return `${col} = $${paramNum}::text`;
            if (typeof value === 'number') return `${col} = $${paramNum}::numeric`;
            if (typeof value === 'boolean') return `${col} = $${paramNum}::boolean`;
            if (Array.isArray(value)) return `${col} = $${paramNum}::jsonb`;
            if (typeof value === 'object') return `${col} = $${paramNum}::jsonb`;
            return `${col} = $${paramNum}`;
          }).join(', ');
          
          const params = allColumns.map(col => {
            const value = product[col];
            if (value === null || value === undefined) return null;
            
            // Handle timestamp columns - ensure they're in ISO format
            if (timestampColumns.includes(col) && typeof value === 'string') {
              return value; // Already in ISO format from prepareProductData
            }
            
            if (typeof value === 'object') return JSON.stringify(value);
            return value;
          });
          
          // Add product ID as last parameter
          params.push(product.id);
          
          const query = `
            UPDATE lats_products 
            SET ${setClauses}
            WHERE id = $${params.length}
            RETURNING id, name
          `;
          
          const result = await pool.query(query, params);
          
          if (result.rows.length > 0) {
            successCount++;
          } else {
            // Product not found - might need to insert instead
            console.log(`   ⚠️  Product not found: ${product.name} (${product.id})`);
            errorCount++;
            errors.push({ product: product.name, id: product.id, error: 'Product not found' });
          }
        } catch (singleError) {
          console.error(`   ❌ Failed to update ${product.name}: ${singleError.message}`);
          errorCount++;
          errors.push({ product: product.name, id: product.id, error: singleError.message });
        }
      }

      console.log(`   ✅ Updated ${batch.length} products in batch ${batchNumber}`);

    } catch (err) {
      console.error(`❌ Batch ${batchNumber} exception:`, err.message);
      errorCount += batch.length;
      errors.push({ batch: batchNumber, error: err.message });
    }

    // Progress update
    const progress = ((i + batch.length) / products.length * 100).toFixed(1);
    console.log(`   📊 Progress: ${progress}% (${i + batch.length}/${products.length})`);
  }

  return { successCount, errorCount, errors };
}

/**
 * Main update function
 */
async function main() {
  try {
    console.log('🚀 Update Existing Products Script');
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
    const products = JSON.parse(fileContent);

    if (!Array.isArray(products)) {
      console.error('❌ Error: JSON file does not contain an array of products');
      process.exit(1);
    }

    console.log(`✅ Found ${products.length} products in JSON file`);

    // Validate products have required fields
    console.log('\n🔍 Validating products...');
    const validProducts = products.filter(p => {
      if (!p.id) {
        console.warn(`⚠️  Skipping product without ID: ${p.name || 'Unknown'}`);
        return false;
      }
      if (!p.name) {
        console.warn(`⚠️  Skipping product without name: ${p.id}`);
        return false;
      }
      return true;
    });

    console.log(`✅ ${validProducts.length} valid products to update`);

    if (validProducts.length === 0) {
      console.log('⚠️  No valid products to update');
      process.exit(0);
    }

    // Test database connection
    console.log('\n🔌 Testing database connection...');
    try {
      await pool.query('SELECT id FROM lats_products LIMIT 1');
      console.log('✅ Database connection successful');
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      process.exit(1);
    }

    // Check how many products exist in database
    const existingCount = await pool.query('SELECT COUNT(*) as count FROM lats_products WHERE id = ANY($1::uuid[])', 
      [validProducts.map(p => p.id)]);
    const existingProductsCount = parseInt(existingCount.rows[0].count);
    
    console.log(`\n📊 Found ${existingProductsCount} existing products to update out of ${validProducts.length} in backup`);
    
    if (existingProductsCount === 0) {
      console.log('⚠️  No matching products found in database. Use import script instead.');
      process.exit(0);
    }

    // Ask for confirmation
    console.log(`\n⚠️  About to UPDATE ${existingProductsCount} existing products`);
    console.log('   This will overwrite existing product data with backup data');
    console.log('   Press Ctrl+C to cancel, or wait 3 seconds to continue...\n');
    
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Update products
    const result = await updateProducts(validProducts);

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 UPDATE SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Successfully updated: ${result.successCount}`);
    console.log(`❌ Failed: ${result.errorCount}`);
    console.log(`📦 Total processed: ${validProducts.length}`);

    if (result.errors.length > 0) {
      console.log(`\n⚠️  ${result.errors.length} errors occurred:`);
      result.errors.slice(0, 10).forEach((err, idx) => {
        console.log(`   ${idx + 1}. ${err.product || `Batch ${err.batch}`}: ${err.error}`);
      });
      if (result.errors.length > 10) {
        console.log(`   ... and ${result.errors.length - 10} more errors`);
      }
    }

    console.log('\n🎉 Update completed!');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the update
main();
