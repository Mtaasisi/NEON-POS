#!/usr/bin/env node
/**
 * Quick Duplicate Products Checker
 * Run this script to check for duplicate products in your database
 * 
 * Usage: node check-duplicates-quick.mjs
 */

import { neon, neonConfig, Pool } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configure WebSocket for Node.js
import ws from 'ws';
neonConfig.webSocketConstructor = ws;

const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL not found in environment variables');
  console.error('Please set VITE_DATABASE_URL or DATABASE_URL in your .env file');
  process.exit(1);
}

console.log('🔍 Connecting to database...\n');

const pool = new Pool({ connectionString: DATABASE_URL });

async function checkDuplicates() {
  try {
    // 1. Summary Statistics
    console.log('📊 SUMMARY STATISTICS');
    console.log('='.repeat(70));
    
    const summaryQuery = `
      WITH duplicate_stats AS (
        SELECT 
          COUNT(*) as total_products,
          COUNT(DISTINCT name) as unique_names,
          COUNT(*) FILTER (WHERE name IN (
            SELECT name FROM lats_products 
            WHERE name IS NOT NULL AND name != ''
            GROUP BY name HAVING COUNT(*) > 1
          )) as products_with_duplicate_names,
          COUNT(*) FILTER (WHERE sku IN (
            SELECT sku FROM lats_products 
            WHERE sku IS NOT NULL AND sku != ''
            GROUP BY sku HAVING COUNT(*) > 1
          )) as products_with_duplicate_skus,
          COUNT(*) FILTER (WHERE barcode IN (
            SELECT barcode FROM lats_products 
            WHERE barcode IS NOT NULL AND barcode != ''
            GROUP BY barcode HAVING COUNT(*) > 1
          )) as products_with_duplicate_barcodes
        FROM lats_products
      )
      SELECT * FROM duplicate_stats
    `;
    
    const summaryResult = await pool.query(summaryQuery);
    const stats = summaryResult.rows[0];
    
    console.log(`Total Products: ${stats.total_products}`);
    console.log(`Unique Names: ${stats.unique_names}`);
    console.log(`Products with Duplicate Names: ${stats.products_with_duplicate_names}`);
    console.log(`Products with Duplicate SKUs: ${stats.products_with_duplicate_skus}`);
    console.log(`Products with Duplicate Barcodes: ${stats.products_with_duplicate_barcodes}`);
    console.log('');
    
    // 2. Duplicate Names
    console.log('📝 DUPLICATE PRODUCT NAMES (Top 10)');
    console.log('='.repeat(70));
    
    const dupNamesQuery = `
      SELECT 
        name,
        COUNT(*) as duplicate_count,
        STRING_AGG(DISTINCT branch_id::text, ', ') as branches,
        STRING_AGG(id::text, ', ') as product_ids
      FROM lats_products
      WHERE name IS NOT NULL AND name != ''
      GROUP BY name
      HAVING COUNT(*) > 1
      ORDER BY duplicate_count DESC, name
      LIMIT 10
    `;
    
    const dupNamesResult = await pool.query(dupNamesQuery);
    
    if (dupNamesResult.rows.length === 0) {
      console.log('✅ No duplicate product names found!');
    } else {
      dupNamesResult.rows.forEach((row, index) => {
        console.log(`\n${index + 1}. ${row.name}`);
        console.log(`   Count: ${row.duplicate_count}`);
        console.log(`   Branches: ${row.branches}`);
        console.log(`   IDs: ${row.product_ids.substring(0, 100)}${row.product_ids.length > 100 ? '...' : ''}`);
      });
    }
    console.log('');
    
    // 3. Duplicate SKUs
    console.log('🏷️  DUPLICATE SKUs');
    console.log('='.repeat(70));
    
    const dupSKUsQuery = `
      SELECT 
        sku,
        COUNT(*) as duplicate_count,
        STRING_AGG(name, ' | ') as product_names,
        STRING_AGG(id::text, ', ') as product_ids
      FROM lats_products
      WHERE sku IS NOT NULL AND sku != ''
      GROUP BY sku
      HAVING COUNT(*) > 1
      ORDER BY duplicate_count DESC
      LIMIT 10
    `;
    
    const dupSKUsResult = await pool.query(dupSKUsQuery);
    
    if (dupSKUsResult.rows.length === 0) {
      console.log('✅ No duplicate SKUs found!');
    } else {
      console.log('⚠️  WARNING: Duplicate SKUs found (SKUs must be unique!)');
      dupSKUsResult.rows.forEach((row, index) => {
        console.log(`\n${index + 1}. SKU: ${row.sku}`);
        console.log(`   Count: ${row.duplicate_count}`);
        console.log(`   Products: ${row.product_names.substring(0, 100)}${row.product_names.length > 100 ? '...' : ''}`);
      });
    }
    console.log('');
    
    // 4. Duplicate Barcodes
    console.log('📦 DUPLICATE BARCODES');
    console.log('='.repeat(70));
    
    const dupBarcodesQuery = `
      SELECT 
        barcode,
        COUNT(*) as duplicate_count,
        STRING_AGG(name, ' | ') as product_names,
        STRING_AGG(id::text, ', ') as product_ids
      FROM lats_products
      WHERE barcode IS NOT NULL AND barcode != ''
      GROUP BY barcode
      HAVING COUNT(*) > 1
      ORDER BY duplicate_count DESC
      LIMIT 10
    `;
    
    const dupBarcodesResult = await pool.query(dupBarcodesQuery);
    
    if (dupBarcodesResult.rows.length === 0) {
      console.log('✅ No duplicate barcodes found!');
    } else {
      console.log('⚠️  WARNING: Duplicate barcodes found (Barcodes must be unique!)');
      dupBarcodesResult.rows.forEach((row, index) => {
        console.log(`\n${index + 1}. Barcode: ${row.barcode}`);
        console.log(`   Count: ${row.duplicate_count}`);
        console.log(`   Products: ${row.product_names.substring(0, 100)}${row.product_names.length > 100 ? '...' : ''}`);
      });
    }
    console.log('');
    
    // 5. Cross-Branch Duplicates
    console.log('🏢 CROSS-BRANCH DUPLICATES');
    console.log('='.repeat(70));
    
    const crossBranchQuery = `
      SELECT 
        name,
        COUNT(DISTINCT branch_id) as branch_count,
        COUNT(*) as total_products,
        STRING_AGG(DISTINCT branch_id::text, ', ') as branch_ids
      FROM lats_products
      WHERE name IS NOT NULL AND name != ''
      GROUP BY name
      HAVING COUNT(DISTINCT branch_id) > 1
      ORDER BY total_products DESC
      LIMIT 10
    `;
    
    const crossBranchResult = await pool.query(crossBranchQuery);
    
    if (crossBranchResult.rows.length === 0) {
      console.log('✅ No cross-branch duplicates found!');
    } else {
      console.log('ℹ️  Products with same name in multiple branches:');
      crossBranchResult.rows.forEach((row, index) => {
        console.log(`\n${index + 1}. ${row.name}`);
        console.log(`   Branches: ${row.branch_count}`);
        console.log(`   Total Products: ${row.total_products}`);
        console.log(`   Branch IDs: ${row.branch_ids}`);
      });
    }
    console.log('');
    
    // Summary and Recommendations
    console.log('💡 RECOMMENDATIONS');
    console.log('='.repeat(70));
    
    const hasDuplicateNames = stats.products_with_duplicate_names > 0;
    const hasDuplicateSKUs = stats.products_with_duplicate_skus > 0;
    const hasDuplicateBarcodes = stats.products_with_duplicate_barcodes > 0;
    
    if (!hasDuplicateNames && !hasDuplicateSKUs && !hasDuplicateBarcodes) {
      console.log('✅ Excellent! No critical duplicates found.');
      console.log('   Your product database is clean.');
    } else {
      if (hasDuplicateSKUs || hasDuplicateBarcodes) {
        console.log('🚨 CRITICAL: Duplicate SKUs or Barcodes found!');
        console.log('   Action Required: These must be unique for proper operation.');
        console.log('   - Review the lists above');
        console.log('   - Update or regenerate duplicate SKUs/Barcodes');
        console.log('');
      }
      
      if (hasDuplicateNames) {
        console.log('⚠️  Duplicate product names detected.');
        console.log('   Recommended Actions:');
        console.log('   1. Run DUPLICATE_PRODUCTS_REPORT.sql for detailed analysis');
        console.log('   2. Use find_and_remove_duplicates.sql to see removal options');
        console.log('   3. Consider merging duplicates instead of deleting');
        console.log('   4. Add unique constraints after cleanup');
        console.log('');
      }
    }
    
    console.log('📄 For detailed analysis, run:');
    console.log('   psql $DATABASE_URL -f DUPLICATE_PRODUCTS_REPORT.sql');
    console.log('');
    console.log('✅ Duplicate check complete!');
    
  } catch (error) {
    console.error('❌ Error checking duplicates:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the check
checkDuplicates().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

