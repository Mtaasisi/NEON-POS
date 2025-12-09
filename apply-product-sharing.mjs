#!/usr/bin/env node
/**
 * Apply Product Sharing Configuration
 * 
 * This script applies the recommended configuration to the database:
 * - share_products = true   (Shared catalog)
 * - share_inventory = false  (Isolated stock)
 * 
 * Usage:
 *   node apply-product-sharing.mjs
 */

import pg from 'pg';
const { Client } = pg;

// Get connection string from environment or use provided one
const connectionString = process.env.DATABASE_URL || 
  'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const client = new Client({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

async function applyProductSharingConfig() {
  console.log('🚀 Applying Product Sharing Configuration...\n');
  console.log('='.repeat(60));
  
  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Step 1: Apply configuration to all active branches
    console.log('1️⃣ Applying configuration to active branches...');
    const updateResult = await client.query(`
      UPDATE store_locations
      SET 
        share_products = true,
        share_inventory = false
      WHERE is_active = true
        AND data_isolation_mode = 'hybrid'
      RETURNING id, name, code
    `);
    console.log(`   ✅ Updated ${updateResult.rows.length} branches\n`);

    // Step 2: Set defaults for branches without settings
    console.log('2️⃣ Setting defaults for branches without settings...');
    const defaultsResult = await client.query(`
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
      RETURNING id, name, code
    `);
    console.log(`   ✅ Updated ${defaultsResult.rows.length} branches with defaults\n`);

    // Step 3: Verify configuration
    console.log('3️⃣ Verifying configuration...');
    const verifyResult = await client.query(`
      SELECT 
        id,
        name,
        code,
        data_isolation_mode,
        share_products,
        share_inventory,
        is_active
      FROM store_locations
      WHERE is_active = true
      ORDER BY name
    `);
    
    console.log(`   📊 Found ${verifyResult.rows.length} active branches:\n`);
    verifyResult.rows.forEach((row, i) => {
      const productsStatus = row.share_products ? '✅ Shared' : '❌ Isolated';
      const inventoryStatus = row.share_inventory ? '❌ Shared' : '✅ Isolated';
      console.log(`   ${i + 1}. ${row.name} (${row.code || 'no code'})`);
      console.log(`      Mode: ${row.data_isolation_mode || 'NULL'}`);
      console.log(`      Products: ${productsStatus}`);
      console.log(`      Inventory: ${inventoryStatus}`);
      console.log('');
    });

    // Step 4: Show summary
    console.log('4️⃣ Configuration Summary');
    console.log('-'.repeat(60));
    const summaryResult = await client.query(`
      SELECT 
        COUNT(*) FILTER (WHERE share_products = true) as branches_with_shared_products,
        COUNT(*) FILTER (WHERE share_inventory = false) as branches_with_isolated_inventory,
        COUNT(*) as total_active_branches
      FROM store_locations
      WHERE is_active = true
    `);
    
    const summary = summaryResult.rows[0];
    console.log(`   📊 Total active branches: ${summary.total_active_branches}`);
    console.log(`   ✅ Branches with shared products: ${summary.branches_with_shared_products}`);
    console.log(`   ✅ Branches with isolated inventory: ${summary.branches_with_isolated_inventory}`);
    console.log('');

    console.log('='.repeat(60));
    console.log('✅ Configuration applied successfully!');
    console.log('');
    console.log('📋 What this means:');
    console.log('   • All branches can see the same product catalog');
    console.log('   • Each branch has its own independent stock levels');
    console.log('   • Products are visible across all branches');
    console.log('   • Inventory is isolated per branch');
    console.log('');
    console.log('🔄 Next steps:');
    console.log('   1. Refresh your browser');
    console.log('   2. Products should now be visible to all branches');
    console.log('   3. Each branch will show its own stock levels');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('   Details:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run the script
applyProductSharingConfig().catch(console.error);
