#!/usr/bin/env node

/**
 * Restore all 199 products from JSON backup
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

const JSON_FILE = path.join(__dirname, 'PROD BACKUP', 'lats_products_2025-12-07_01-43-50.json');

const pool = new Pool({ connectionString: DATABASE_URL });
const BATCH_SIZE = 50;

async function main() {
  try {
    console.log('🚀 Restore Products from JSON Backup');
    console.log('='.repeat(60));
    console.log(`📁 JSON File: ${JSON_FILE}`);
    console.log('='.repeat(60));

    if (!fs.existsSync(JSON_FILE)) {
      console.error(`❌ Error: File not found: ${JSON_FILE}`);
      process.exit(1);
    }

    console.log('\n📖 Reading JSON file...');
    const products = JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'));
    console.log(`✅ Found ${products.length} products\n`);

    // Get valid foreign keys
    console.log('🔍 Fetching valid foreign keys...');
    const [categories, branches, suppliers] = await Promise.all([
      pool.query('SELECT id FROM lats_categories').catch(() => ({ rows: [] })),
      pool.query('SELECT id FROM lats_branches WHERE is_active = true').catch(() => ({ rows: [] })),
      pool.query('SELECT id FROM lats_suppliers').catch(() => ({ rows: [] }))
    ]);
    
    const validCategoryIds = new Set(categories.rows.map(r => r.id));
    const validBranchIds = branches.rows.map(r => r.id);
    const validSupplierIds = new Set(suppliers.rows.map(r => r.id));
    
    const arushaBranchId = validBranchIds[0] || '00000000-0000-0000-0000-000000000001';
    
    console.log(`✅ Found ${validCategoryIds.size} categories, ${validBranchIds.length} branches, ${validSupplierIds.size} suppliers`);
    console.log(`📍 Using branch: ${arushaBranchId}\n`);

    // Prepare products
    console.log('🔧 Preparing products...');
    const preparedProducts = products.map(product => {
      // Fix foreign keys - convert to string for comparison
      const catId = product.category_id ? String(product.category_id) : null;
      const supId = product.supplier_id ? String(product.supplier_id) : null;
      
      if (catId && !validCategoryIds.has(catId)) {
        console.log(`   ⚠️  Invalid category_id for ${product.name}: ${catId} -> setting to NULL`);
        product.category_id = null;
      }
      if (supId && !validSupplierIds.has(supId)) {
        product.supplier_id = null;
      }
      
      // Set branch to Arusha
      product.branch_id = arushaBranchId;
      
      // Ensure active and shared
      product.is_active = true;
      product.is_shared = true;
      product.sharing_mode = 'shared';
      
      // Ensure proper types
      product.cost_price = parseFloat(product.cost_price || 0);
      product.selling_price = parseFloat(product.selling_price || 0);
      product.unit_price = parseFloat(product.unit_price || 0);
      product.stock_quantity = parseInt(product.stock_quantity || 0);
      product.min_stock_level = parseInt(product.min_stock_level || 0);
      product.max_stock_level = product.max_stock_level ? parseInt(product.max_stock_level) : null;
      product.total_quantity = parseInt(product.total_quantity || 0);
      product.total_value = parseFloat(product.total_value || 0);
      product.warranty_period = product.warranty_period ? parseInt(product.warranty_period) : null;
      
      // Ensure JSON fields
      if (typeof product.tags === 'string') {
        try {
          product.tags = JSON.parse(product.tags);
        } catch {
          product.tags = [];
        }
      }
      if (!Array.isArray(product.tags)) {
        product.tags = [];
      }
      
      if (typeof product.attributes === 'string') {
        try {
          product.attributes = JSON.parse(product.attributes);
        } catch {
          product.attributes = {};
        }
      }
      if (typeof product.attributes !== 'object' || !product.attributes) {
        product.attributes = {};
      }
      
      if (typeof product.metadata === 'string') {
        try {
          product.metadata = JSON.parse(product.metadata);
        } catch {
          product.metadata = {};
        }
      }
      if (typeof product.metadata !== 'object' || !product.metadata) {
        product.metadata = {};
      }
      
      return product;
    });

    console.log(`✅ Prepared ${preparedProducts.length} products\n`);

    console.log(`⚠️  About to import ${preparedProducts.length} products`);
    console.log('   Press Ctrl+C to cancel, or wait 3 seconds to continue...\n');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Import in batches
    let imported = 0;
    let errors = 0;

    for (let i = 0; i < preparedProducts.length; i += BATCH_SIZE) {
      const batch = preparedProducts.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(preparedProducts.length / BATCH_SIZE);

      console.log(`📦 Processing batch ${batchNum}/${totalBatches} (${batch.length} products)...`);

      try {
        const columns = Object.keys(batch[0]);
        const columnList = columns.join(', ');
        
        // Build VALUES and params - use consistent parameter numbering
        const params = [];
        let paramCounter = 1;
        
        const values = batch.map((product) => {
          const rowValues = columns.map((col) => {
            const value = product[col];
            
            if (value === null || value === undefined) {
              // Use NULL with explicit type casting (no parameter needed)
              if (col === 'id' || col === 'branch_id' || col === 'category_id' || col === 'supplier_id' || 
                  col === 'storage_room_id' || col === 'store_shelf_id' || col === 'shelf_id') {
                return 'NULL::uuid';
              }
              if (col.includes('_at') || col === 'created_at' || col === 'updated_at') {
                return 'NULL::timestamptz';
              }
              if (col === 'tags' || col === 'attributes' || col === 'metadata') {
                return 'NULL::jsonb';
              }
              if (col === 'visible_to_branches') {
                return 'NULL::uuid[]';
              }
              if (col === 'warranty_period' || col === 'stock_quantity' || col === 'min_stock_level' || 
                  col === 'max_stock_level' || col === 'total_quantity') {
                return 'NULL::integer';
              }
              if (col.includes('price') || col.includes('value')) {
                return 'NULL::numeric';
              }
              return 'NULL::text';
            }
            
            // Non-null values - add to params and use parameter
            const paramNum = paramCounter++;
            
            if (col === 'visible_to_branches') {
              if (Array.isArray(value) && value.length > 0) {
                params.push(value);
                return `$${paramNum}::uuid[]`;
              } else {
                return 'NULL::uuid[]';
              }
            }
            
            if (typeof value === 'object') {
              params.push(JSON.stringify(value));
              return `$${paramNum}::jsonb`;
            }
            
            if (col === 'id' || col === 'branch_id' || col === 'category_id' || col === 'supplier_id' || 
                col === 'storage_room_id' || col === 'store_shelf_id' || col === 'shelf_id') {
              params.push(value);
              return `$${paramNum}::uuid`;
            }
            
            if (col.includes('_at') || col === 'created_at' || col === 'updated_at') {
              params.push(value);
              return `$${paramNum}::timestamptz`;
            }
            
            if (typeof value === 'boolean') {
              params.push(value);
              return `$${paramNum}::boolean`;
            }
            
            if (col === 'warranty_period' || col === 'stock_quantity' || col === 'min_stock_level' || 
                col === 'max_stock_level' || col === 'total_quantity') {
              params.push(value);
              return `$${paramNum}::integer`;
            }
            
            if (typeof value === 'number' || col.includes('price') || col.includes('value')) {
              params.push(value);
              return `$${paramNum}::numeric`;
            }
            
            params.push(value);
            return `$${paramNum}::text`;
          }).join(', ');
          return `(${rowValues})`;
        }).join(', ');

        const updateClauses = columns
          .filter(col => col !== 'id')
          .map(col => `${col} = EXCLUDED.${col}`)
          .join(', ');

        const query = `
          INSERT INTO lats_products (${columnList})
          VALUES ${values}
          ON CONFLICT (id) DO UPDATE SET ${updateClauses}
        `;

        await pool.query(query, params);
        imported += batch.length;
        console.log(`   ✅ Imported ${batch.length} products`);
      } catch (error) {
        console.error(`   ❌ Error in batch ${batchNum}:`, error.message);
        errors += batch.length;
      }
    }

    // Final verification and setup
    console.log('\n' + '='.repeat(60));
    console.log('🔍 FINAL SETUP');
    console.log('='.repeat(60));
    
    // Ensure all are active and shared
    await pool.query(`
      UPDATE lats_products
      SET 
        is_active = true,
        is_shared = true,
        sharing_mode = 'shared',
        updated_at = NOW()
      WHERE is_active = false OR is_shared = false OR sharing_mode != 'shared'
    `);
    console.log('✅ All products are active and shared');
    
    // Configure Arusha branch
    await pool.query(`
      UPDATE store_locations
      SET 
        data_isolation_mode = 'hybrid',
        share_products = true,
        share_inventory = true,
        updated_at = NOW()
      WHERE id = $1
    `, [arushaBranchId]);
    console.log('✅ Arusha branch configured');
    
    // Count final products
    const finalCount = await pool.query('SELECT COUNT(*) as count FROM lats_products WHERE is_active = true');
    console.log(`✅ Total active products: ${finalCount.rows[0].count}\n`);

    console.log('='.repeat(60));
    console.log('📊 RESTORE SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Products imported: ${imported}`);
    console.log(`❌ Errors: ${errors}`);
    console.log(`📦 Total active products: ${finalCount.rows[0].count}`);
    console.log('='.repeat(60));
    console.log('\n🎉 Restore completed!');
    console.log('💡 Hard refresh your browser (Ctrl+Shift+R) to see all products');

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
