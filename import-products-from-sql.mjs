#!/usr/bin/env node

/**
 * Import Products from SQL File
 * 
 * This script imports products from a SQL backup file.
 * It parses INSERT statements and imports the products.
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

const DEFAULT_SQL_FILE = path.join(__dirname, 'PROD BACKUP', 'lats_products_2025-12-07_01-43-50.sql');
const SQL_FILE_PATH = process.argv[3] || DEFAULT_SQL_FILE;

const pool = new Pool({ connectionString: DATABASE_URL });
const BATCH_SIZE = 50;

/**
 * Parse SQL INSERT statement to extract product data
 */
function parseSQLInsert(sqlContent) {
  // Find the INSERT INTO statement
  const insertMatch = sqlContent.match(/INSERT INTO\s+lats_products\s*\(([^)]+)\)\s*VALUES\s*(.+);/is);
  
  if (!insertMatch) {
    throw new Error('Could not find INSERT INTO statement in SQL file');
  }

  const columns = insertMatch[1].split(',').map(col => col.trim());
  const valuesSection = insertMatch[2].trim();

  // Parse individual value rows
  const products = [];
  const valueRows = valuesSection.split(/\),\s*\(/);
  
  for (let i = 0; i < valueRows.length; i++) {
    let row = valueRows[i];
    // Remove leading/trailing parentheses
    if (i === 0) row = row.replace(/^\(/, '');
    if (i === valueRows.length - 1) row = row.replace(/\);?\s*$/, '');
    else row = row.replace(/\);?\s*$/, '');
    
    // Split by comma, but be careful with quoted strings and JSON
    const values = [];
    let currentValue = '';
    let inQuotes = false;
    let quoteChar = null;
    let inJson = false;
    let parenDepth = 0;
    
    for (let j = 0; j < row.length; j++) {
      const char = row[j];
      const nextChar = row[j + 1];
      
      if (!inQuotes && !inJson && char === "'" && nextChar === "'") {
        // Escaped quote
        currentValue += "''";
        j++;
        continue;
      }
      
      if (!inQuotes && !inJson && (char === "'" || char === '"')) {
        inQuotes = true;
        quoteChar = char;
        currentValue += char;
        continue;
      }
      
      if (inQuotes && char === quoteChar && row[j - 1] !== '\\') {
        inQuotes = false;
        quoteChar = null;
        currentValue += char;
        continue;
      }
      
      if (!inQuotes && char === '{') {
        inJson = true;
        parenDepth = 0;
        currentValue += char;
        continue;
      }
      
      if (inJson) {
        if (char === '{') parenDepth++;
        if (char === '}') parenDepth--;
        currentValue += char;
        if (parenDepth === 0 && char === '}') {
          inJson = false;
        }
        continue;
      }
      
      if (!inQuotes && !inJson && char === ',' && (j === 0 || row[j - 1] !== '\\')) {
        values.push(currentValue.trim());
        currentValue = '';
        continue;
      }
      
      currentValue += char;
    }
    
    if (currentValue.trim()) {
      values.push(currentValue.trim());
    }
    
    // Map values to columns
    const product = {};
    columns.forEach((col, idx) => {
      let value = values[idx];
      
      if (value === 'NULL' || value === null || value === undefined) {
        product[col] = null;
        return;
      }
      
      // Remove quotes
      if ((value.startsWith("'") && value.endsWith("'")) || 
          (value.startsWith('"') && value.endsWith('"'))) {
        value = value.slice(1, -1);
        // Unescape quotes
        value = value.replace(/''/g, "'");
      }
      
      // Handle type casts
      if (value.includes('::')) {
        const [actualValue, type] = value.split('::');
        value = actualValue.trim();
        
        // Remove quotes from typed values
        if ((value.startsWith("'") && value.endsWith("'")) || 
            (value.startsWith('"') && value.endsWith('"'))) {
          value = value.slice(1, -1);
          value = value.replace(/''/g, "'");
        }
        
        // Parse based on type
        if (type.includes('jsonb')) {
          try {
            product[col] = JSON.parse(value);
          } catch (e) {
            product[col] = value;
          }
        } else if (type.includes('timestamptz')) {
          product[col] = value;
        } else if (type.includes('numeric') || type.includes('int')) {
          product[col] = parseFloat(value) || 0;
        } else if (type.includes('bool')) {
          product[col] = value.toLowerCase() === 'true';
        } else {
          product[col] = value;
        }
      } else {
        // Try to parse as number
        if (/^-?\d+\.?\d*$/.test(value)) {
          product[col] = parseFloat(value);
        } else if (value.toLowerCase() === 'true') {
          product[col] = true;
        } else if (value.toLowerCase() === 'false') {
          product[col] = false;
        } else {
          product[col] = value;
        }
      }
    });
    
    products.push(product);
  }
  
  return products;
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
 * Clean and prepare product data for insertion
 */
async function prepareProductData(product, validKeys = null) {
  const cleanProduct = {};
  
  for (const col of VALID_COLUMNS) {
    if (product.hasOwnProperty(col)) {
      cleanProduct[col] = product[col];
    }
  }

  // Handle branch_id
  let branchId = cleanProduct.branch_id;
  if (branchId && validKeys?.branchIds && !validKeys.branchIds.includes(branchId)) {
    branchId = validKeys.branchIds[0] || null;
  } else if (!branchId && validKeys?.branchIds && validKeys.branchIds.length > 0) {
    branchId = validKeys.branchIds[0];
  }

  // Handle category_id
  let categoryId = cleanProduct.category_id;
  if (categoryId && validKeys?.categoryIds && !validKeys.categoryIds.includes(categoryId)) {
    categoryId = null;
  }

  // Handle supplier_id
  let supplierId = cleanProduct.supplier_id;
  if (supplierId && validKeys?.supplierIds && !validKeys.supplierIds.includes(supplierId)) {
    supplierId = null;
  }

  // Handle storage_room_id
  let storageRoomId = cleanProduct.storage_room_id;
  if (storageRoomId && validKeys?.storageRoomIds && !validKeys.storageRoomIds.includes(storageRoomId)) {
    storageRoomId = null;
  }

  // Handle shelf_id
  let shelfId = cleanProduct.shelf_id;
  if (shelfId && validKeys?.shelfIds && !validKeys.shelfIds.includes(shelfId)) {
    shelfId = null;
  }

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
    cost_price: cleanProduct.cost_price ? parseFloat(cleanProduct.cost_price) : 0,
    selling_price: cleanProduct.selling_price ? parseFloat(cleanProduct.selling_price) : 0,
    unit_price: cleanProduct.unit_price ? parseFloat(cleanProduct.unit_price) : 0,
    total_quantity: cleanProduct.total_quantity || 0,
    total_value: cleanProduct.total_value ? parseFloat(cleanProduct.total_value) : 0,
    stock_quantity: cleanProduct.stock_quantity || 0,
    min_stock_level: cleanProduct.min_stock_level || 0,
    max_stock_level: cleanProduct.max_stock_level !== undefined ? cleanProduct.max_stock_level : null,
    tags: Array.isArray(cleanProduct.tags) ? cleanProduct.tags : (cleanProduct.tags ? (typeof cleanProduct.tags === 'string' ? JSON.parse(cleanProduct.tags) : []) : []),
    attributes: typeof cleanProduct.attributes === 'object' && cleanProduct.attributes !== null ? cleanProduct.attributes : (cleanProduct.attributes && typeof cleanProduct.attributes === 'string' ? JSON.parse(cleanProduct.attributes) : {}),
    metadata: typeof cleanProduct.metadata === 'object' && cleanProduct.metadata !== null ? cleanProduct.metadata : (cleanProduct.metadata && typeof cleanProduct.metadata === 'string' ? JSON.parse(cleanProduct.metadata) : {}),
    visible_to_branches: Array.isArray(cleanProduct.visible_to_branches) ? cleanProduct.visible_to_branches : null,
    created_at: cleanProduct.created_at || new Date().toISOString(),
    updated_at: cleanProduct.updated_at || new Date().toISOString(),
  };
}

/**
 * Import products in batches
 */
async function importProducts(products) {
  console.log(`\n📦 Starting import of ${products.length} products...\n`);

  const validKeys = await getValidForeignKeys();
  console.log(`✅ Found ${validKeys.branchIds.length} branches, ${validKeys.categoryIds.length} categories, ${validKeys.supplierIds.length} suppliers, ${validKeys.storageRoomIds.length} storage rooms, ${validKeys.shelfIds.length} shelves\n`);

  let successCount = 0;
  let errorCount = 0;
  const errors = [];

  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const batch = products.slice(i, i + BATCH_SIZE);
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(products.length / BATCH_SIZE);

    console.log(`\n📦 Processing batch ${batchNumber}/${totalBatches} (${batch.length} products)...`);

    try {
      const preparedBatch = await Promise.all(
        batch.map(product => prepareProductData(product, validKeys))
      );

      const allColumns = Object.keys(preparedBatch[0]);
      const columns = allColumns.join(', ');
      
      // UUID columns that need casting
      const uuidColumns = ['id', 'category_id', 'supplier_id', 'storage_room_id', 'store_shelf_id', 'shelf_id', 'branch_id'];
      const timestampColumns = ['created_at', 'updated_at'];
      const arrayColumns = ['visible_to_branches'];
      
      const values = preparedBatch.map((variant, idx) => {
        const rowValues = allColumns.map((col, colIdx) => {
          const value = variant[col];
          const paramNum = idx * allColumns.length + colIdx + 1;
          if (value === null || value === undefined) return 'NULL';
          
          // Handle UUID columns
          if (uuidColumns.includes(col) && typeof value === 'string') {
            return `$${paramNum}::uuid`;
          }
          
          // Handle timestamp columns
          if (timestampColumns.includes(col) && typeof value === 'string') {
            return `$${paramNum}::timestamptz`;
          }
          
          // Handle array columns
          if (arrayColumns.includes(col) && Array.isArray(value)) {
            return `$${paramNum}::uuid[]`;
          }
          
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
        INSERT INTO lats_products (${columns}) 
        VALUES ${values}
        ON CONFLICT (id) DO UPDATE SET ${updateClauses}
        RETURNING *
      `;
      
      const result = await pool.query(query, params);
      successCount += result.rows.length;
      console.log(`   ✅ Successfully imported ${result.rows.length} products`);

    } catch (err) {
      console.error(`❌ Batch ${batchNumber} error:`, err.message);
      errorCount += batch.length;
      errors.push({ batch: batchNumber, error: err.message });
      
      // Try individual inserts
      console.log(`   ⚠️  Attempting individual inserts...`);
      for (const product of batch) {
        try {
          const prepared = await prepareProductData(product, validKeys);
          const singleColumns = Object.keys(prepared);
          const uuidColumns = ['id', 'category_id', 'supplier_id', 'storage_room_id', 'store_shelf_id', 'shelf_id', 'branch_id'];
          const timestampColumns = ['created_at', 'updated_at'];
          const arrayColumns = ['visible_to_branches'];
          
          const singleValues = singleColumns.map((col, idx) => {
            const value = prepared[col];
            const paramNum = idx + 1;
            if (value === null || value === undefined) return 'NULL';
            
            // Handle UUID columns
            if (uuidColumns.includes(col) && typeof value === 'string') {
              return `$${paramNum}::uuid`;
            }
            
            // Handle timestamp columns
            if (timestampColumns.includes(col) && typeof value === 'string') {
              return `$${paramNum}::timestamptz`;
            }
            
            // Handle array columns
            if (arrayColumns.includes(col) && Array.isArray(value)) {
              return `$${paramNum}::uuid[]`;
            }
            
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
            INSERT INTO lats_products (${singleColumns.join(', ')}) 
            VALUES (${singleValues})
            ON CONFLICT (id) DO UPDATE SET ${singleUpdateClauses}
            RETURNING *
          `;
          
          await pool.query(singleQuery, singleParams);
          successCount++;
        } catch (singleErr) {
          console.error(`   ❌ Failed: ${product.name || product.id}: ${singleErr.message}`);
          errors.push({ product: product.name || product.id, error: singleErr.message });
        }
      }
    }

    const progress = ((i + batch.length) / products.length * 100).toFixed(1);
    console.log(`   📊 Progress: ${progress}% (${i + batch.length}/${products.length})`);
  }

  return { successCount, errorCount, errors };
}

async function main() {
  try {
    console.log('🚀 Import Products from SQL File');
    console.log('='.repeat(60));
    console.log(`📁 SQL File: ${SQL_FILE_PATH}`);
    console.log('='.repeat(60));

    if (!fs.existsSync(SQL_FILE_PATH)) {
      console.error(`❌ Error: File not found: ${SQL_FILE_PATH}`);
      process.exit(1);
    }

    console.log('\n📖 Reading SQL file...');
    const sqlContent = fs.readFileSync(SQL_FILE_PATH, 'utf8');
    
    console.log('🔍 Parsing SQL INSERT statements...');
    const products = parseSQLInsert(sqlContent);
    console.log(`✅ Parsed ${products.length} products from SQL file\n`);

    const validProducts = products.filter(p => p.id && p.name);
    console.log(`✅ ${validProducts.length} valid products to import\n`);

    if (validProducts.length === 0) {
      console.log('⚠️  No valid products to import');
      process.exit(0);
    }

    console.log('🔌 Testing database connection...');
    await pool.query('SELECT id FROM lats_products LIMIT 1');
    console.log('✅ Database connection successful\n');

    console.log(`⚠️  About to import ${validProducts.length} products`);
    console.log('   Press Ctrl+C to cancel, or wait 3 seconds to continue...\n');
    await new Promise(resolve => setTimeout(resolve, 3000));

    const result = await importProducts(validProducts);

    console.log('\n' + '='.repeat(60));
    console.log('📊 IMPORT SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Successfully imported: ${result.successCount}`);
    console.log(`❌ Failed: ${result.errorCount}`);
    console.log(`📦 Total processed: ${validProducts.length}`);

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
