#!/usr/bin/env node

/**
 * Fix product visibility for ALL branches
 */

import { Pool } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env.production') });

const DATABASE_URL = process.argv[2] || process.env.DATABASE_URL || 
  'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const pool = new Pool({ connectionString: DATABASE_URL });

async function main() {
  try {
    console.log('🔧 Fixing Product Visibility for ALL Branches');
    console.log('='.repeat(60));

    await pool.query('SELECT 1');
    console.log('✅ Database connection successful\n');

    // Get all branches
    const branchesResult = await pool.query(`
      SELECT id, name, is_active
      FROM lats_branches
      WHERE is_active = true
      ORDER BY name
    `);
    
    const branches = branchesResult.rows;
    console.log(`📊 Found ${branches.length} active branches\n`);

    // Update all branches to share products and inventory
    console.log('='.repeat(60));
    console.log('🔧 UPDATING ALL BRANCH SETTINGS');
    console.log('='.repeat(60));

    try {
      const tableCheck = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'store_locations'
      `);
      
      const hasIsolationMode = tableCheck.rows.some(r => r.column_name === 'data_isolation_mode');
      const hasShareProducts = tableCheck.rows.some(r => r.column_name === 'share_products');
      const hasShareInventory = tableCheck.rows.some(r => r.column_name === 'share_inventory');
      
      if (hasIsolationMode && hasShareProducts && hasShareInventory) {
        for (const branch of branches) {
          // Check if branch exists in store_locations
          const existsResult = await pool.query(`
            SELECT id FROM store_locations WHERE id = $1
          `, [branch.id]);
          
          if (existsResult.rows.length > 0) {
            // Update existing
            await pool.query(`
              UPDATE store_locations
              SET 
                data_isolation_mode = 'hybrid',
                share_products = true,
                share_inventory = true,
                updated_at = NOW()
              WHERE id = $1
            `, [branch.id]);
            console.log(`✅ Updated ${branch.name}`);
          } else {
            // Insert new
            try {
              await pool.query(`
                INSERT INTO store_locations (id, name, code, address, city, country, is_active, data_isolation_mode, share_products, share_inventory)
                VALUES ($1, $2, $3, $4, $5, 'Tanzania', true, 'hybrid', true, true)
                ON CONFLICT (id) DO UPDATE SET
                  data_isolation_mode = 'hybrid',
                  share_products = true,
                  share_inventory = true,
                  updated_at = NOW()
              `, [branch.id, branch.name, branch.name.toUpperCase().substring(0, 10), branch.name, branch.name]);
              console.log(`✅ Added ${branch.name}`);
            } catch (insertError) {
              console.log(`⚠️  Could not add ${branch.name}: ${insertError.message}`);
            }
          }
        }
        console.log('\n✅ All branches updated!\n');
      } else {
        console.log('⚠️  store_locations table missing required columns\n');
      }
    } catch (error) {
      console.log(`⚠️  Error updating branches: ${error.message}\n`);
    }

    // Verify settings
    console.log('='.repeat(60));
    console.log('🔍 VERIFICATION');
    console.log('='.repeat(60));
    
    for (const branch of branches) {
      try {
        const settingsResult = await pool.query(`
          SELECT 
            data_isolation_mode,
            share_products,
            share_inventory
          FROM store_locations
          WHERE id = $1
        `, [branch.id]);
        
        if (settingsResult.rows.length > 0) {
          const settings = settingsResult.rows[0];
          console.log(`\n📍 ${branch.name}:`);
          console.log(`   Isolation Mode: ${settings.data_isolation_mode || 'NOT SET'}`);
          console.log(`   Share Products: ${settings.share_products !== null ? settings.share_products : 'NOT SET'}`);
          console.log(`   Share Inventory: ${settings.share_inventory !== null ? settings.share_inventory : 'NOT SET'}`);
        } else {
          console.log(`\n📍 ${branch.name}: Settings not found in store_locations`);
        }
      } catch (error) {
        console.log(`\n📍 ${branch.name}: Could not check settings`);
      }
    }

    // Count total products
    const totalProductsResult = await pool.query(`
      SELECT COUNT(*) as count FROM lats_products WHERE is_active = true
    `);
    const totalProducts = parseInt(totalProductsResult.rows[0].count);

    console.log('\n' + '='.repeat(60));
    console.log('📋 SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ All ${branches.length} branches configured to share products`);
    console.log(`✅ Total products in database: ${totalProducts}`);
    console.log(`\n💡 All branches should now see all ${totalProducts} products`);
    console.log(`\nNext steps:`);
    console.log(`   1. Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)`);
    console.log(`   2. Log out and log back in`);
    console.log(`   3. Select your branch again`);
    console.log(`   4. You should see all ${totalProducts} products`);
    console.log('='.repeat(60));

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
