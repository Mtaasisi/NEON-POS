#!/usr/bin/env node

/**
 * Import Products from JSON Backup
 * 
 * This script imports products from a JSON backup file into the Supabase database.
 * It handles:
 * - Reading products from JSON file
 * - Validating data
 * - Inserting/updating products with conflict resolution
 * - Progress tracking
 * - Error handling
 */

import { createClient } from '@supabase/supabase-js';
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

// Database configuration - support both Supabase and direct PostgreSQL
// Priority: DATABASE_URL env > Command line arg > Default Neon connection
const DATABASE_URL = process.env.DATABASE_URL || process.argv[2] || process.env.VITE_DATABASE_URL || 
  'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

// Determine if using Supabase or direct PostgreSQL
// If DATABASE_URL is provided and contains neon.tech or postgresql://, use direct PostgreSQL
// Otherwise, fall back to Supabase if credentials are available
const USE_DIRECT_POSTGRES = !!(DATABASE_URL && (DATABASE_URL.includes('neon.tech') || DATABASE_URL.includes('postgresql://')));

let supabase;
let pool;

if (USE_DIRECT_POSTGRES && DATABASE_URL.includes('neon.tech')) {
  // Use Neon PostgreSQL directly
  console.log('🔗 Using Neon PostgreSQL connection');
  pool = new Pool({ connectionString: DATABASE_URL });
  
  // Create a Supabase-like interface for compatibility
  supabase = {
    from: (table) => ({
      upsert: (data, options) => {
        const conflictColumn = options?.onConflict || 'id';
        const isArray = Array.isArray(data);
        const rows = isArray ? data : [data];
        
        // Return a chainable object with select() method
        return {
          select: async (columns = '*') => {
            if (rows.length === 0) {
              return { data: [], error: null };
            }

            // Get all columns from first row
            const allColumns = Object.keys(rows[0]);
            const columnList = allColumns.join(', ');
            
            // Build VALUES clause with proper parameterization
            const placeholders = rows.map((row, idx) => {
              const rowPlaceholders = allColumns.map((col, colIdx) => {
                const paramNum = idx * allColumns.length + colIdx + 1;
                return `$${paramNum}`;
              }).join(', ');
              return `(${rowPlaceholders})`;
            }).join(', ');
            
            // Build parameter values
            const params = rows.flatMap(row => 
              allColumns.map(col => {
                const value = row[col];
                if (value === null || value === undefined) return null;
                if (typeof value === 'object' && !Array.isArray(value)) return JSON.stringify(value);
                if (Array.isArray(value)) return JSON.stringify(value);
                return value;
              })
            );
            
            // Build UPDATE clause
            const updateClauses = allColumns
              .filter(col => col !== conflictColumn)
              .map((col, idx) => {
                const paramNum = rows.length * allColumns.length + idx + 1;
                return `${col} = EXCLUDED.${col}`;
              })
              .join(', ');
            
            const query = `
              INSERT INTO ${table} (${columnList}) 
              VALUES ${placeholders}
              ON CONFLICT (${conflictColumn}) DO UPDATE SET ${updateClauses}
              RETURNING *
            `;
            
            try {
              const result = await pool.query(query, params);
              return { data: isArray ? result.rows : (result.rows[0] || null), error: null };
            } catch (error) {
              return { data: null, error: { message: error.message, code: error.code } };
            }
          }
        };
      },
      select: (columns = '*') => ({
        limit: (count) => ({
          then: async (callback) => {
            try {
              const query = `SELECT ${columns} FROM ${table} LIMIT ${count}`;
              const result = await pool.query(query);
              const data = result.rows;
              const response = { data, error: null };
              return callback ? callback(response) : Promise.resolve(response);
            } catch (error) {
              const response = { data: null, error: { message: error.message } };
              return callback ? callback(response) : Promise.resolve(response);
            }
          }
        })
      })
    })
  };
} else if (SUPABASE_URL && SUPABASE_ANON_KEY && !USE_DIRECT_POSTGRES) {
  // Use Supabase (only if not using direct PostgreSQL)
  console.log('🔗 Using Supabase connection');
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else if (!USE_DIRECT_POSTGRES) {
  console.error('❌ No database configuration found');
  process.exit(1);
}

// JSON file path - can be overridden via command line argument
// If DATABASE_URL was in argv[2], then JSON file is in argv[3], otherwise argv[2]
const DEFAULT_JSON_FILE = path.join(__dirname, 'PROD BACKUP', 'lats_products_2025-12-07_01-43-50.json');
const JSON_FILE_PATH = (process.env.DATABASE_URL ? process.argv[2] : process.argv[3]) || DEFAULT_JSON_FILE;

// Batch size for bulk inserts
const BATCH_SIZE = 50;

/**
 * Valid columns in lats_products table (based on schema)
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
 * Get or create default branch ID
 */
let defaultBranchId = null;
async function getDefaultBranchId() {
  if (defaultBranchId) return defaultBranchId;
  
  if (USE_DIRECT_POSTGRES && pool) {
    try {
      // Try to get first branch
      const result = await pool.query('SELECT id FROM lats_branches LIMIT 1');
      if (result.rows && result.rows.length > 0) {
        defaultBranchId = result.rows[0].id;
        return defaultBranchId;
      }
    } catch (error) {
      console.warn('⚠️  Could not fetch branch, will set branch_id to null:', error.message);
    }
  } else {
    try {
      const { data, error } = await supabase.from('lats_branches').select('id').limit(1);
      if (!error && data && data.length > 0) {
        defaultBranchId = data[0].id;
        return defaultBranchId;
      }
    } catch (error) {
      console.warn('⚠️  Could not fetch branch, will set branch_id to null:', error.message);
    }
  }
  
  return null;
}

/**
 * Clean and prepare product data for insertion
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
    branchId = await getDefaultBranchId();
  } else if (!branchId) {
    branchId = await getDefaultBranchId();
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
    branch_id: branchId, // Use validated/default branch_id
    category_id: categoryId, // Use validated category_id (or null)
    supplier_id: supplierId, // Use validated supplier_id (or null)
    storage_room_id: storageRoomId, // Use validated storage_room_id (or null)
    shelf_id: shelfId, // Use validated shelf_id (or null)
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
    // Ensure dates are properly formatted
    created_at: cleanProduct.created_at || new Date().toISOString(),
    updated_at: cleanProduct.updated_at || new Date().toISOString(),
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

  if (USE_DIRECT_POSTGRES && pool) {
    try {
      const [branches, categories, suppliers, storageRooms, shelves] = await Promise.all([
        pool.query('SELECT id FROM lats_branches').catch(() => ({ rows: [] })),
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
  } else {
    try {
      const [branches, categories, suppliers, storageRooms, shelves] = await Promise.all([
        supabase.from('lats_branches').select('id').catch(() => ({ data: [], error: null })),
        supabase.from('lats_categories').select('id').catch(() => ({ data: [], error: null })),
        supabase.from('lats_suppliers').select('id').catch(() => ({ data: [], error: null })),
        supabase.from('storage_rooms').select('id').catch(() => ({ data: [], error: null })),
        supabase.from('store_shelves').select('id').catch(() => ({ data: [], error: null }))
      ]);
      validKeys.branchIds = branches.data?.map(row => row.id) || [];
      validKeys.categoryIds = categories.data?.map(row => row.id) || [];
      validKeys.supplierIds = suppliers.data?.map(row => row.id) || [];
      validKeys.storageRoomIds = storageRooms.data?.map(row => row.id) || [];
      validKeys.shelfIds = shelves.data?.map(row => row.id) || [];
    } catch (error) {
      console.warn('⚠️  Could not fetch foreign keys:', error.message);
    }
  }

  return validKeys;
}

/**
 * Import products in batches
 */
async function importProducts(products) {
  console.log(`\n📦 Starting import of ${products.length} products...\n`);

  // Get valid foreign key IDs
  console.log('🔍 Fetching valid foreign keys...');
  const validKeys = await getValidForeignKeys();
  console.log(`✅ Found ${validKeys.branchIds.length} branches, ${validKeys.categoryIds.length} categories, ${validKeys.supplierIds.length} suppliers, ${validKeys.storageRoomIds.length} storage rooms, ${validKeys.shelfIds.length} shelves`);

  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;
  const errors = [];

  // Process in batches
  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const batch = products.slice(i, i + BATCH_SIZE);
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(products.length / BATCH_SIZE);

    console.log(`\n📦 Processing batch ${batchNumber}/${totalBatches} (${batch.length} products)...`);

    try {
      // Prepare batch data (async map)
      const preparedBatch = await Promise.all(
        batch.map(product => prepareProductData(product, validKeys))
      );

      // Insert/Update using upsert (ON CONFLICT DO UPDATE)
      let result;
      if (USE_DIRECT_POSTGRES) {
        // Direct PostgreSQL - use pool.query directly for better control
        const allColumns = Object.keys(preparedBatch[0]);
        const columns = allColumns.join(', ');
        
        // Build VALUES with correct parameter numbering and type casting
        // We need to track which params are actually used (non-null values)
        let paramCounter = 1;
        const values = preparedBatch.map((product) => {
          const rowValues = allColumns.map((col) => {
            const value = product[col];
            
            // Handle UUID columns
            const uuidColumns = ['id', 'category_id', 'supplier_id', 'storage_room_id', 'store_shelf_id', 'shelf_id', 'branch_id'];
            if (uuidColumns.includes(col)) {
              if (value === null || value === undefined) return 'NULL::uuid';
              const paramNum = paramCounter++;
              return `$${paramNum}::uuid`;
            }
            
            // Handle timestamp columns
            const timestampColumns = ['created_at', 'updated_at'];
            if (timestampColumns.includes(col)) {
              if (value === null || value === undefined) return 'NULL::timestamptz';
              const paramNum = paramCounter++;
              return `$${paramNum}::timestamptz`;
            }
            
            // Handle array columns
            if (col === 'visible_to_branches') {
              if (value === null || value === undefined || !Array.isArray(value)) return 'NULL::uuid[]';
              const paramNum = paramCounter++;
              return `$${paramNum}::uuid[]`;
            }
            
            // Handle integer columns
            const integerColumns = ['stock_quantity', 'min_stock_level', 'max_stock_level', 'total_quantity', 'warranty_period'];
            if (integerColumns.includes(col)) {
              if (value === null || value === undefined) return 'NULL::integer';
              const paramNum = paramCounter++;
              return `$${paramNum}::integer`;
            }
            
            // Handle numeric columns (decimal)
            const numericColumns = ['cost_price', 'selling_price', 'unit_price', 'total_value'];
            if (numericColumns.includes(col)) {
              if (value === null || value === undefined) return 'NULL::numeric';
              const paramNum = paramCounter++;
              return `$${paramNum}::numeric`;
            }
            
            // Handle boolean columns
            if (col === 'is_active' || col === 'is_shared') {
              if (value === null || value === undefined) return 'NULL::boolean';
              const paramNum = paramCounter++;
              return `$${paramNum}::boolean`;
            }
            
            // Handle JSON columns
            const jsonColumns = ['tags', 'attributes', 'metadata'];
            if (jsonColumns.includes(col)) {
              if (value === null || value === undefined) return 'NULL::jsonb';
              const paramNum = paramCounter++;
              return `$${paramNum}::jsonb`;
            }
            
            // Handle text columns (default)
            if (value === null || value === undefined) return 'NULL::text';
            const paramNum = paramCounter++;
            return `$${paramNum}::text`;
          }).join(', ');
          return `(${rowValues})`;
        }).join(', ');
        
        // Build params array - only include non-null values
        // We need to match the parameter numbers used in the VALUES clause
        const params = [];
        preparedBatch.forEach((product) => {
          allColumns.forEach((col) => {
            const value = product[col];
            // Only add to params if it's not null (nulls are handled as NULL::type in SQL)
            if (value !== null && value !== undefined) {
              if (typeof value === 'object') {
                params.push(JSON.stringify(value));
              } else {
                params.push(value);
              }
            }
          });
        });
        
        const updateClauses = allColumns
          .filter(col => col !== 'id')
          .map(col => `${col} = EXCLUDED.${col}`)
          .join(', ');
        
        const query = `
          INSERT INTO lats_products (${columns}) 
          VALUES ${values}
          ON CONFLICT (id) DO UPDATE SET ${updateClauses}
          RETURNING *
        `;
        
        try {
          console.log(`   🔍 Executing batch insert for ${preparedBatch.length} products...`);
          console.log(`   🔍 First product ID: ${preparedBatch[0].id}, Name: ${preparedBatch[0].name}`);
          const dbResult = await pool.query(query, params);
          console.log(`   📊 Query returned ${dbResult.rows?.length || 0} rows`);
          
          // Always verify - even if rows were returned
          const verifyIds = preparedBatch.slice(0, 5).map(p => p.id);
          const verifyResult = await pool.query(
            'SELECT id, name FROM lats_products WHERE id = ANY($1::uuid[])',
            [verifyIds]
          );
          console.log(`   ✅ Verification: ${verifyResult.rows.length} of 5 test products exist in database`);
          
          if (verifyResult.rows.length === 0) {
            console.log(`   ❌ CRITICAL: No products were actually inserted!`);
            console.log(`   🔍 Sample IDs checked: ${verifyIds.slice(0, 2).join(', ')}`);
            throw new Error('Insert query executed but no products found in database');
          }
          
          result = { data: dbResult.rows || preparedBatch, error: null };
        } catch (queryError) {
          console.error(`   ❌ Query error:`, queryError.message);
          console.error(`   🔍 Error code:`, queryError.code);
          if (queryError.message.includes('constraint') || queryError.message.includes('foreign key')) {
            console.error(`   💡 This might be a foreign key constraint violation`);
          }
          throw queryError;
        }
      } else {
        // Supabase - standard API
        result = await supabase
          .from('lats_products')
          .upsert(preparedBatch, {
            onConflict: 'id',
            ignoreDuplicates: false
          })
          .select();
      }
      const { data, error } = result;

      if (error) {
        console.error(`❌ Batch ${batchNumber} error:`, error.message);
        errorCount += batch.length;
        errors.push({
          batch: batchNumber,
          error: error.message,
          products: batch.map(p => ({ id: p.id, name: p.name }))
        });
        
        // Try inserting one by one to identify problematic products
        console.log(`   ⚠️  Attempting individual inserts for batch ${batchNumber}...`);
        for (const product of batch) {
          try {
            const prepared = await prepareProductData(product, validKeys);
            let singleResult;
            if (USE_DIRECT_POSTGRES) {
              singleResult = await supabase
                .from('lats_products')
                .upsert(prepared, { onConflict: 'id' })
                .select();
            } else {
              singleResult = await supabase
                .from('lats_products')
                .upsert(prepared, { onConflict: 'id' })
                .select();
            }
            const { error: singleError } = singleResult;
            
            if (singleError) {
              console.error(`   ❌ Failed: ${product.name} (${product.id}): ${singleError.message}`);
              errors.push({ product: product.name, id: product.id, error: singleError.message });
            } else {
              successCount++;
              console.log(`   ✅ Imported: ${product.name}`);
            }
          } catch (err) {
            console.error(`   ❌ Error importing ${product.name}:`, err.message);
            errorCount++;
          }
        }
      } else {
        const importedCount = data?.length || 0;
        successCount += importedCount;
        if (importedCount > 0) {
          console.log(`   ✅ Successfully imported ${importedCount} products`);
        } else {
          console.log(`   ⚠️  No data returned from upsert (may have failed silently)`);
          // Try to verify by checking if products exist
          const verifyIds = preparedBatch.slice(0, 5).map(p => p.id);
          const verifyResult = await pool.query(
            'SELECT COUNT(*) as count FROM lats_products WHERE id = ANY($1::uuid[])',
            [verifyIds]
          );
          const foundCount = parseInt(verifyResult.rows[0].count);
          if (foundCount > 0) {
            console.log(`   ✅ Verified: ${foundCount} of 5 test products exist in database`);
            successCount += batch.length; // Assume all were inserted if some exist
          } else {
            console.log(`   ❌ Verification failed: Products not found in database`);
            errorCount += batch.length;
            errors.push({ batch: batchNumber, error: 'Upsert returned no data and verification failed' });
          }
        }
      }
    } catch (err) {
      console.error(`❌ Batch ${batchNumber} exception:`, err.message);
      errorCount += batch.length;
      errors.push({ batch: batchNumber, error: err.message });
    }

    // Progress update
    const progress = ((i + batch.length) / products.length * 100).toFixed(1);
    console.log(`   📊 Progress: ${progress}% (${i + batch.length}/${products.length})`);
  }

  return { successCount, errorCount, skippedCount, errors };
}

/**
 * Main import function
 */
async function main() {
  try {
    console.log('🚀 Product Import Script');
    console.log('=' .repeat(50));
    console.log(`📁 JSON File: ${JSON_FILE_PATH}`);
    if (USE_DIRECT_POSTGRES) {
      console.log(`🔗 Database: Neon PostgreSQL (Direct)`);
      console.log(`   Connection: ${DATABASE_URL.substring(0, 50)}...`);
    } else {
      console.log(`🔗 Supabase URL: ${SUPABASE_URL}`);
    }
    console.log('=' .repeat(50));

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

    console.log(`✅ ${validProducts.length} valid products to import`);

    if (validProducts.length === 0) {
      console.log('⚠️  No valid products to import');
      process.exit(0);
    }

    // Test database connection
    console.log('\n🔌 Testing database connection...');
    if (USE_DIRECT_POSTGRES && pool) {
      try {
        const result = await pool.query('SELECT id FROM lats_products LIMIT 1');
        console.log('✅ Database connection successful');
      } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        process.exit(1);
      }
    } else {
      const { data: testData, error: testError } = await supabase
        .from('lats_products')
        .select('id')
        .limit(1);

      if (testError) {
        console.error('❌ Database connection failed:', testError.message);
        process.exit(1);
      }

      console.log('✅ Database connection successful');
    }

    // Ask for confirmation (optional - can be removed for automation)
    console.log(`\n⚠️  About to import ${validProducts.length} products`);
    console.log('   This will update existing products with the same ID');
    console.log('   Press Ctrl+C to cancel, or wait 3 seconds to continue...\n');
    
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Import products
    const result = await importProducts(validProducts);

    // Print summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 IMPORT SUMMARY');
    console.log('='.repeat(50));
    console.log(`✅ Successfully imported: ${result.successCount}`);
    console.log(`❌ Failed: ${result.errorCount}`);
    console.log(`⏭️  Skipped: ${result.skippedCount}`);
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

    console.log('\n🎉 Import completed!');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Close database connection if using direct PostgreSQL
    if (pool) {
      await pool.end();
    }
  }
}

// Run the import
main();
