#!/usr/bin/env node
/**
 * View Detailed Information About Duplicate Products
 * Shows full details of all duplicate products for investigation
 * 
 * Usage: node view-duplicate-details.mjs
 */

import { Pool } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configure WebSocket for Node.js
import ws from 'ws';
import { neonConfig } from '@neondatabase/serverless';
neonConfig.webSocketConstructor = ws;

const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL not found in environment variables');
  console.error('Please set VITE_DATABASE_URL or DATABASE_URL in your .env file');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

async function viewDuplicateDetails() {
  try {
    console.log('🔍 Fetching duplicate product details...\n');
    
    // Get detailed information about all duplicate products
    const query = `
      WITH duplicate_products AS (
        SELECT name
        FROM lats_products
        WHERE name IS NOT NULL AND name != ''
        GROUP BY name
        HAVING COUNT(*) > 1
      )
      SELECT 
        p.id,
        p.name,
        p.sku,
        p.barcode,
        p.brand,
        p.model,
        p.category_id,
        p.branch_id,
        p.selling_price,
        p.cost_price,
        p.stock_quantity,
        p.is_active,
        p.created_at,
        p.updated_at,
        -- Get branch name if possible
        (SELECT name FROM lats_branches WHERE id = p.branch_id LIMIT 1) as branch_name
      FROM lats_products p
      INNER JOIN duplicate_products dp ON p.name = dp.name
      ORDER BY p.name, p.branch_id, p.created_at;
    `;
    
    const result = await pool.query(query);
    const products = result.rows;
    
    if (products.length === 0) {
      console.log('✅ No duplicate products found!');
      return;
    }
    
    console.log(`Found ${products.length} products with duplicate names\n`);
    console.log('='.repeat(100));
    
    // Group products by name
    const grouped = {};
    products.forEach(product => {
      if (!grouped[product.name]) {
        grouped[product.name] = [];
      }
      grouped[product.name].push(product);
    });
    
    // Display each group
    Object.entries(grouped).forEach(([name, items], index) => {
      console.log(`\n${index + 1}. Product Name: ${name}`);
      console.log('-'.repeat(100));
      console.log(`   Total Duplicates: ${items.length}`);
      console.log('');
      
      items.forEach((item, itemIndex) => {
        console.log(`   Copy ${itemIndex + 1}:`);
        console.log(`      ID: ${item.id}`);
        console.log(`      SKU: ${item.sku || 'N/A'}`);
        console.log(`      Barcode: ${item.barcode || 'N/A'}`);
        console.log(`      Brand: ${item.brand || 'N/A'}`);
        console.log(`      Model: ${item.model || 'N/A'}`);
        console.log(`      Branch ID: ${item.branch_id}`);
        console.log(`      Branch Name: ${item.branch_name || 'Unknown'}`);
        console.log(`      Selling Price: ${item.selling_price || '0'}`);
        console.log(`      Cost Price: ${item.cost_price || '0'}`);
        console.log(`      Stock: ${item.stock_quantity || 0} units`);
        console.log(`      Active: ${item.is_active ? 'Yes' : 'No'}`);
        console.log(`      Created: ${item.created_at ? new Date(item.created_at).toLocaleString() : 'N/A'}`);
        console.log(`      Updated: ${item.updated_at ? new Date(item.updated_at).toLocaleString() : 'N/A'}`);
        console.log('');
      });
      
      // Analysis
      const allSamePrice = items.every(i => i.selling_price === items[0].selling_price);
      const allSameBranch = items.every(i => i.branch_id === items[0].branch_id);
      const hasStock = items.some(i => i.stock_quantity > 0);
      const totalStock = items.reduce((sum, i) => sum + (parseInt(i.stock_quantity) || 0), 0);
      
      console.log(`   Analysis:`);
      console.log(`      Same Price: ${allSamePrice ? 'Yes' : 'No (price varies by copy)'}`);
      console.log(`      Same Branch: ${allSameBranch ? 'Yes - TRUE DUPLICATE!' : 'No (different branches)'}`);
      console.log(`      Has Stock: ${hasStock ? 'Yes' : 'No'}`);
      console.log(`      Total Stock: ${totalStock} units`);
      
      if (allSameBranch) {
        console.log(`      ⚠️  WARNING: True duplicate - same product in same branch!`);
        console.log(`      ⚠️  This should be cleaned up.`);
      } else {
        console.log(`      ℹ️  Cross-branch duplicate - likely intentional for multi-branch inventory`);
      }
      
      console.log('');
      console.log('='.repeat(100));
    });
    
    // Summary
    console.log('\n📊 SUMMARY');
    console.log('='.repeat(100));
    
    const trueDuplicates = Object.values(grouped).filter(items => {
      return items.every(i => i.branch_id === items[0].branch_id);
    });
    
    const crossBranchDuplicates = Object.values(grouped).filter(items => {
      return items.some(i => i.branch_id !== items[0].branch_id);
    });
    
    console.log(`Total Duplicate Product Names: ${Object.keys(grouped).length}`);
    console.log(`True Duplicates (same branch): ${trueDuplicates.length}`);
    console.log(`Cross-Branch Duplicates: ${crossBranchDuplicates.length}`);
    console.log('');
    
    if (trueDuplicates.length > 0) {
      console.log('🚨 TRUE DUPLICATES FOUND!');
      console.log('   These products exist multiple times in the SAME branch:');
      trueDuplicates.forEach(items => {
        console.log(`   - ${items[0].name} (${items.length} copies in branch ${items[0].branch_id})`);
      });
      console.log('');
      console.log('   Action Required: Review and merge/remove these duplicates');
      console.log('   Use: find_and_remove_duplicates.sql for removal options');
    } else {
      console.log('✅ No true duplicates found (same product in same branch)');
      console.log('   All duplicates are cross-branch, which is normal for multi-location inventory');
    }
    
    console.log('');
    console.log('✅ Analysis complete!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the analysis
viewDuplicateDetails().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

