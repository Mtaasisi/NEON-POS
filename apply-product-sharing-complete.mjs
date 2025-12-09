#!/usr/bin/env node
/**
 * Apply Product Sharing Configuration - Complete Setup
 * 
 * This script applies the product sharing configuration to the database
 * and verifies it was applied correctly.
 * 
 * Usage:
 *   node apply-product-sharing-complete.mjs
 * 
 * Or with custom connection string:
 *   DATABASE_URL="your_connection_string" node apply-product-sharing-complete.mjs
 */

import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const { Client } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get connection string from environment or use provided one
const connectionString = process.env.DATABASE_URL || 
  'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const client = new Client({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

async function applyConfiguration() {
  console.log('🚀 Applying Product Sharing Configuration...\n');
  console.log('='.repeat(60));
  
  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Step 1: Ensure all branches use hybrid mode
    console.log('1️⃣ Setting hybrid mode for all branches...');
    const step1Result = await client.query(`
      UPDATE store_locations
      SET data_isolation_mode = 'hybrid'
      WHERE is_active = true
        AND (data_isolation_mode IS NULL OR data_isolation_mode NOT IN ('shared', 'isolated', 'hybrid'))
      RETURNING id, name
    `);
    console.log(`   ✅ Updated ${step1Result.rowCount} branches to hybrid mode\n`);

    // Step 2: Apply configuration
    console.log('2️⃣ Applying product sharing configuration...');
    const step2Result = await client.query(`
      UPDATE store_locations
      SET 
        share_products = true,
        share_inventory = false
      WHERE is_active = true
      RETURNING id, name, share_products, share_inventory
    `);
    console.log(`   ✅ Updated ${step2Result.rowCount} branches\n`);

    // Step 3: Set defaults for any missing values
    console.log('3️⃣ Setting defaults for any missing values...');
    const step3Result = await client.query(`
      UPDATE store_locations
      SET 
        data_isolation_mode = COALESCE(data_isolation_mode, 'hybrid'),
        share_products = COALESCE(share_products, true),
        share_inventory = COALESCE(share_inventory, false)
      WHERE is_active = true
        AND (
          data_isolation_mode IS NULL
          OR share_products IS NULL
          OR share_inventory IS NULL
        )
      RETURNING id, name
    `);
    console.log(`   ✅ Updated ${step3Result.rowCount} branches with defaults\n`);

    // Step 4: Verify configuration
    console.log('4️⃣ Verifying configuration...\n');
    const verifyResult = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE share_products = true AND share_inventory = false) as correctly_configured,
        COUNT(*) FILTER (WHERE share_products IS NULL OR share_inventory IS NULL) as missing_values
      FROM store_locations
      WHERE is_active = true
    `);
    
    const stats = verifyResult.rows[0];
    console.log('📊 Configuration Summary:');
    console.log(`   Total active branches: ${stats.total}`);
    console.log(`   Correctly configured: ${stats.correctly_configured}`);
    console.log(`   Missing values: ${stats.missing_values}\n`);

    if (parseInt(stats.correctly_configured) === parseInt(stats.total)) {
      console.log('✅ SUCCESS: All branches are correctly configured!\n');
    } else {
      console.log('⚠️  WARNING: Some branches may need additional configuration\n');
    }

    // Step 5: Show branch details
    console.log('5️⃣ Branch Configuration Details:\n');
    const branchesResult = await client.query(`
      SELECT 
        name,
        code,
        data_isolation_mode,
        share_products,
        share_inventory
      FROM store_locations
      WHERE is_active = true
      ORDER BY name
    `);
    
    branchesResult.rows.forEach((row, i) => {
      console.log(`   ${i + 1}. ${row.name} (${row.code || 'no code'})`);
      console.log(`      Mode: ${row.data_isolation_mode}`);
      console.log(`      share_products: ${row.share_products} ${row.share_products ? '✅' : '❌'}`);
      console.log(`      share_inventory: ${row.share_inventory} ${!row.share_inventory ? '✅' : '❌'}`);
      console.log('');
    });

    // Step 6: Show products and variants distribution
    console.log('6️⃣ Products & Inventory Distribution:\n');
    
    const productsResult = await client.query(`
      SELECT 
        COALESCE(branch_id::TEXT, 'NULL') as branch_id,
        COUNT(*) as total_products,
        COUNT(*) FILTER (WHERE is_active = true) as active_products
      FROM lats_products
      GROUP BY branch_id
      ORDER BY total_products DESC
    `);
    
    console.log('   Products by branch:');
    productsResult.rows.forEach((row) => {
      console.log(`      Branch ${row.branch_id}: ${row.total_products} total (${row.active_products} active)`);
    });
    console.log('');

    const variantsResult = await client.query(`
      SELECT 
        COALESCE(branch_id::TEXT, 'NULL') as branch_id,
        COUNT(*) as total_variants,
        SUM(quantity) as total_stock
      FROM lats_product_variants
      GROUP BY branch_id
      ORDER BY total_stock DESC
    `);
    
    console.log('   Variants (Inventory) by branch:');
    variantsResult.rows.forEach((row) => {
      console.log(`      Branch ${row.branch_id}: ${row.total_variants} variants (${row.total_stock || 0} total stock)`);
    });
    console.log('');

    console.log('='.repeat(60));
    console.log('✅ Configuration applied successfully!');
    console.log('\n📝 Next Steps:');
    console.log('   1. Refresh your browser');
    console.log('   2. Products should now be visible to all branches');
    console.log('   3. Each branch will show its own stock levels');
    console.log('   4. Verify in browser console: localStorage.getItem(\'current_branch_id\')');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('   Details:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run the configuration
applyConfiguration().catch(console.error);
