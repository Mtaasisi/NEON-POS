#!/usr/bin/env node
import { Pool } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import ws from 'ws';
import * as fs from 'fs';

dotenv.config();

if (typeof WebSocket === 'undefined') {
  global.WebSocket = ws;
}

const pool = new Pool({ connectionString: process.env.VITE_DATABASE_URL || process.env.DATABASE_URL });

async function applyFix() {
  try {
    console.log('🔧 Applying Product Insert Fix...\n');
    console.log('='.repeat(60));
    
    // Step 1: Make branch_id nullable
    console.log('\n1️⃣ Making branch_id nullable...');
    await pool.query('ALTER TABLE lats_products ALTER COLUMN branch_id DROP NOT NULL');
    console.log('   ✅ branch_id is now nullable');
    
    // Step 2: Sync branches
    console.log('\n2️⃣ Syncing branches from lats_branches to store_locations...');
    const syncResult = await pool.query(`
      INSERT INTO store_locations (
        id,
        name,
        code,
        city,
        address,
        phone,
        is_main,
        is_active,
        data_isolation_mode,
        share_products,
        share_customers,
        share_inventory,
        created_at,
        updated_at
      )
      SELECT 
        lb.id,
        lb.name,
        UPPER(LEFT(lb.name, 3)) as code,
        'N/A' as city,
        'To be configured' as address,
        '' as phone,
        CASE WHEN lb.id = '00000000-0000-0000-0000-000000000001' THEN true ELSE false END as is_main,
        lb.is_active,
        'isolated' as data_isolation_mode,
        false as share_products,
        false as share_customers,
        false as share_inventory,
        lb.created_at,
        lb.updated_at
      FROM lats_branches lb
      WHERE NOT EXISTS (
        SELECT 1 FROM store_locations sl WHERE sl.id = lb.id
      )
      RETURNING name, id;
    `);
    
    if (syncResult.rows.length > 0) {
      console.log(`   ✅ Synced ${syncResult.rows.length} branches:`);
      syncResult.rows.forEach(b => console.log(`      - ${b.name} (${b.id})`));
    } else {
      console.log('   ℹ️  No branches to sync (all already exist)');
    }
    
    // Step 3: Fix existing products
    console.log('\n3️⃣ Fixing existing products with invalid branch_id...');
    const fixResult = await pool.query(`
      UPDATE lats_products
      SET branch_id = NULL
      WHERE branch_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM store_locations WHERE id = lats_products.branch_id
        )
      RETURNING id, name, branch_id;
    `);
    
    if (fixResult.rows.length > 0) {
      console.log(`   ✅ Fixed ${fixResult.rows.length} products with invalid branch_id`);
    } else {
      console.log('   ✅ No products with invalid branch_id found');
    }
    
    // Step 4: Verify
    console.log('\n4️⃣ Verification...');
    const verifyResult = await pool.query(`
      SELECT 
        'Products with valid branch_id' as status,
        COUNT(*) as count
      FROM lats_products
      WHERE branch_id IS NOT NULL
      UNION ALL
      SELECT 
        'Products with NULL branch_id' as status,
        COUNT(*) as count
      FROM lats_products
      WHERE branch_id IS NULL
      UNION ALL
      SELECT 
        'Total products' as status,
        COUNT(*) as count
      FROM lats_products;
    `);
    
    console.log('   Product Statistics:');
    verifyResult.rows.forEach(row => {
      console.log(`      ${row.status}: ${row.count}`);
    });
    
    // Step 5: Show available branches
    console.log('\n5️⃣ Available Branches in store_locations:');
    const branchesResult = await pool.query(`
      SELECT id, name, is_main, is_active
      FROM store_locations
      WHERE is_active = true
      ORDER BY is_main DESC, name;
    `);
    
    branchesResult.rows.forEach(b => {
      const main = b.is_main ? ' (MAIN)' : '';
      console.log(`      - ${b.name}${main}`);
      console.log(`        ID: ${b.id}`);
    });
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Fix applied successfully!\n');
    console.log('📝 Next steps:');
    console.log('   1. Clear browser localStorage: localStorage.clear()');
    console.log('   2. Refresh the page to reload branch data');
    console.log('   3. Try creating a product again');
    console.log('   4. If the issue persists, check browser console for detailed logs');
    
  } catch (error) {
    console.error('\n❌ Error applying fix:', error);
    console.error('   Message:', error.message);
    if (error.code) {
      console.error('   Code:', error.code);
    }
  } finally {
    await pool.end();
  }
}

applyFix();

