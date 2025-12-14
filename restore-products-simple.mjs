#!/usr/bin/env node

/**
 * Simple product restore - insert one by one to catch errors
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

async function main() {
  try {
    console.log('🚀 Simple Product Restore');
    console.log('='.repeat(60));

    const products = JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'));
    console.log(`📦 Found ${products.length} products in backup\n`);

    // Get valid foreign keys
    const [categories, branches] = await Promise.all([
      pool.query('SELECT id FROM lats_categories').catch(() => ({ rows: [] })),
      pool.query('SELECT id FROM lats_branches WHERE is_active = true').catch(() => ({ rows: [] }))
    ]);
    
    const validCategoryIds = new Set(categories.rows.map(r => r.id));
    const arushaBranchId = branches.rows[0]?.id || '00000000-0000-0000-0000-000000000001';
    
    console.log(`📍 Using branch: ${arushaBranchId}`);
    console.log(`✅ Found ${validCategoryIds.size} valid categories\n`);

    let imported = 0;
    let updated = 0;
    let errors = 0;
    const errorList = [];

    console.log(`⚠️  About to import ${products.length} products (one by one)`);
    console.log('   Press Ctrl+C to cancel, or wait 3 seconds to continue...\n');
    await new Promise(resolve => setTimeout(resolve, 3000));

    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      
      // Fix foreign keys
      if (product.category_id && !validCategoryIds.has(product.category_id)) {
        product.category_id = null;
      }
      
      // Set branch and sharing
      product.branch_id = arushaBranchId;
      product.is_active = true;
      product.is_shared = true;
      product.sharing_mode = 'shared';
      
      // Prepare values
      const values = {
        id: product.id,
        name: product.name,
        description: product.description || null,
        sku: product.sku,
        barcode: product.barcode || null,
        category_id: product.category_id || null,
        unit_price: parseFloat(product.unit_price || 0),
        cost_price: parseFloat(product.cost_price || 0),
        stock_quantity: parseInt(product.stock_quantity || 0),
        min_stock_level: parseInt(product.min_stock_level || 0),
        max_stock_level: product.max_stock_level ? parseInt(product.max_stock_level) : null,
        is_active: true,
        image_url: product.image_url || null,
        supplier_id: product.supplier_id || null,
        brand: product.brand || null,
        model: product.model || null,
        warranty_period: product.warranty_period ? parseInt(product.warranty_period) : null,
        created_at: product.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        specification: product.specification || null,
        condition: product.condition || 'new',
        selling_price: parseFloat(product.selling_price || 0),
        tags: Array.isArray(product.tags) ? product.tags : [],
        total_quantity: parseInt(product.total_quantity || 0),
        total_value: parseFloat(product.total_value || 0),
        storage_room_id: product.storage_room_id || null,
        store_shelf_id: product.store_shelf_id || null,
        attributes: product.attributes || {},
        metadata: product.metadata || {},
        branch_id: arushaBranchId,
        is_shared: true,
        visible_to_branches: product.visible_to_branches || null,
        sharing_mode: 'shared',
        shelf_id: product.shelf_id || null,
        category: product.category || null
      };

      try {
        const result = await pool.query(`
          INSERT INTO lats_products (
            id, name, description, sku, barcode, category_id, unit_price, cost_price,
            stock_quantity, min_stock_level, max_stock_level, is_active, image_url,
            supplier_id, brand, model, warranty_period, created_at, updated_at,
            specification, condition, selling_price, tags, total_quantity, total_value,
            storage_room_id, store_shelf_id, attributes, metadata, branch_id,
            is_shared, visible_to_branches, sharing_mode, shelf_id, category
          ) VALUES (
            $1::uuid, $2, $3, $4, $5, $6::uuid, $7::numeric, $8::numeric,
            $9::integer, $10::integer, $11::integer, $12::boolean, $13,
            $14::uuid, $15, $16, $17::integer, $18::timestamptz, $19::timestamptz,
            $20, $21, $22::numeric, $23::jsonb, $24::integer, $25::numeric,
            $26::uuid, $27::uuid, $28::jsonb, $29::jsonb, $30::uuid,
            $31::boolean, $32::uuid[], $33, $34::uuid, $35
          )
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            sku = EXCLUDED.sku,
            branch_id = EXCLUDED.branch_id,
            is_active = EXCLUDED.is_active,
            is_shared = EXCLUDED.is_shared,
            sharing_mode = EXCLUDED.sharing_mode,
            updated_at = EXCLUDED.updated_at
          RETURNING id, name
        `, [
          values.id, values.name, values.description, values.sku, values.barcode,
          values.category_id, values.unit_price, values.cost_price,
          values.stock_quantity, values.min_stock_level, values.max_stock_level,
          values.is_active, values.image_url,
          values.supplier_id, values.brand, values.model, values.warranty_period,
          values.created_at, values.updated_at,
          values.specification, values.condition, values.selling_price,
          JSON.stringify(values.tags), values.total_quantity, values.total_value,
          values.storage_room_id, values.store_shelf_id,
          JSON.stringify(values.attributes), JSON.stringify(values.metadata),
          values.branch_id,
          values.is_shared, values.visible_to_branches, values.sharing_mode,
          values.shelf_id, values.category
        ]);

        if (result.rows.length > 0) {
          imported++;
          if (imported % 20 === 0) {
            console.log(`   ✅ Imported ${imported}/${products.length} products...`);
          }
        }
      } catch (error) {
        errors++;
        errorList.push({ product: product.name, error: error.message });
        if (errors <= 10) {
          console.error(`   ❌ Error importing ${product.name}: ${error.message}`);
        }
      }
    }

    // Final setup
    await pool.query(`
      UPDATE lats_products
      SET is_active = true, is_shared = true, sharing_mode = 'shared', updated_at = NOW()
      WHERE is_active = false OR is_shared = false OR sharing_mode != 'shared'
    `);

    await pool.query(`
      UPDATE store_locations
      SET data_isolation_mode = 'hybrid', share_products = true, share_inventory = true, updated_at = NOW()
      WHERE id = $1
    `, [arushaBranchId]);

    // Verify with a direct query
    const verifyQuery = await pool.query('SELECT current_database()');
    console.log(`\n🔍 Verifying in database: ${verifyQuery.rows[0].current_database}`);
    
    const finalCount = await pool.query('SELECT COUNT(*) as count FROM lats_products WHERE is_active = true');

    console.log('\n' + '='.repeat(60));
    console.log('📊 RESTORE SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Products imported/updated: ${imported}`);
    console.log(`❌ Errors: ${errors}`);
    console.log(`📦 Total active products: ${finalCount.rows[0].count}`);
    console.log('='.repeat(60));
    console.log('\n🎉 Restore completed!');
    console.log('💡 Hard refresh your browser (Ctrl+Shift+R)');

    if (errorList.length > 0 && errorList.length <= 10) {
      console.log('\n⚠️  Errors:');
      errorList.forEach(e => console.log(`   - ${e.product}: ${e.error}`));
    }

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
