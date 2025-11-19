#!/usr/bin/env node

/**
 * Export Data for APK Bundle
 * 
 * This script exports all database data to JSON files
 * that will be bundled with the APK for instant offline access
 */

import { neon } from '@neondatabase/serverless';
import { writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Neon database client
const databaseUrl = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

console.log('🔑 Checking database connection...');
console.log('URL:', databaseUrl ? '✓' : '✗');

if (!databaseUrl) {
  console.error('❌ Missing DATABASE_URL in .env file');
  process.exit(1);
}

const sql = neon(databaseUrl);

// Output directory for preloaded data
const OUTPUT_DIR = join(__dirname, '..', 'public', 'preload-data');

// Create output directory
try {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log('✅ Created output directory:', OUTPUT_DIR);
} catch (error) {
  console.error('❌ Failed to create output directory:', error);
  process.exit(1);
}

/**
 * Export data from a table
 */
async function exportTable(tableName, options = {}) {
  const {
    limit = 10000,
    orderBy = 'created_at',
    ascending = false,
    filters = {}
  } = options;

  console.log(`\n📥 Exporting ${tableName}...`);
  
  try {
    // Build and execute query using template literal
    const orderDirection = ascending ? 'ASC' : 'DESC';
    
    console.log(`   Querying ${tableName} (limit: ${limit}, order: ${orderBy} ${orderDirection})...`);
    
    // Use dynamic SQL execution
    const result = await sql.query(`SELECT * FROM ${tableName} ORDER BY ${orderBy} ${orderDirection} LIMIT ${limit}`);
    
    const data = result.rows || [];

    if (!data || data.length === 0) {
      console.warn(`⚠️  ${tableName} returned no data`);
      return { success: true, count: 0, size: '0' };
    }

    // Save to JSON file
    const filename = join(OUTPUT_DIR, `${tableName}.json`);
    const jsonData = {
      table: tableName,
      exportedAt: new Date().toISOString(),
      count: data.length,
      data: data
    };

    writeFileSync(filename, JSON.stringify(jsonData, null, 2));
    
    const sizeKB = (Buffer.byteLength(JSON.stringify(jsonData)) / 1024).toFixed(2);
    console.log(`✅ Exported ${data.length} records from ${tableName} (${sizeKB} KB)`);
    
    return { success: true, count: data.length, size: sizeKB };
  } catch (error) {
    console.error(`❌ Failed to export ${tableName}:`, error);
    return { success: false, count: 0 };
  }
}

/**
 * Main export function
 */
async function exportAllData() {
  console.log('🚀 Starting data export for APK bundle...\n');
  console.log('📊 This will export all data from your database');
  console.log('⏱️  This may take a few minutes...\n');

  const results = {};
  const startTime = Date.now();

  // Export products with all details
  results.products = await exportTable('lats_products', {
    limit: 10000,
    orderBy: 'created_at'
  });

  // Export customers
  results.customers = await exportTable('lats_customers', {
    limit: 10000,
    orderBy: 'created_at'
  });

  // Export categories
  results.categories = await exportTable('lats_categories', {
    limit: 1000,
    orderBy: 'name',
    ascending: true
  });

  // Export suppliers
  results.suppliers = await exportTable('lats_suppliers', {
    limit: 1000,
    orderBy: 'name',
    ascending: true
  });

  // Export branches
  results.branches = await exportTable('lats_branches', {
    limit: 100,
    orderBy: 'created_at'
  });

  // Export payment accounts
  results.payment_accounts = await exportTable('finance_accounts', {
    limit: 100,
    orderBy: 'name',
    ascending: true
  });

  // Skip product images if table doesn't exist
  // results.product_images = await exportTable('lats_product_images', {
  //   limit: 50000,
  //   orderBy: 'created_at'
  // });

  // Export recent sales (last 90 days)
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  
  console.log(`\n📥 Exporting recent sales (last 90 days)...`);
  try {
    const salesData = await sql`
      SELECT * FROM lats_sales 
      WHERE created_at >= ${ninetyDaysAgo.toISOString()}
      ORDER BY created_at DESC 
      LIMIT 5000
    `;

    if (salesData && salesData.length > 0) {
      const filename = join(OUTPUT_DIR, 'lats_sales.json');
      const jsonData = {
        table: 'lats_sales',
        exportedAt: new Date().toISOString(),
        count: salesData.length,
        data: salesData
      };
      writeFileSync(filename, JSON.stringify(jsonData, null, 2));
      const sizeKB = (Buffer.byteLength(JSON.stringify(jsonData)) / 1024).toFixed(2);
      console.log(`✅ Exported ${salesData.length} sales records (${sizeKB} KB)`);
      results.sales = { success: true, count: salesData.length, size: sizeKB };
    }
  } catch (error) {
    console.error('❌ Error exporting sales:', error);
    results.sales = { success: false, count: 0 };
  }

  // Create manifest file
  const manifest = {
    exportedAt: new Date().toISOString(),
    version: '1.0.0',
    tables: Object.keys(results),
    summary: results,
    totalRecords: Object.values(results).reduce((sum, r) => sum + (r.count || 0), 0),
    totalSize: Object.values(results).reduce((sum, r) => sum + parseFloat(r.size || 0), 0).toFixed(2) + ' KB'
  };

  writeFileSync(
    join(OUTPUT_DIR, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );

  // Print summary
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ DATA EXPORT COMPLETE!');
  console.log('='.repeat(60));
  console.log(`\n📊 Summary:`);
  console.log(`   Total Records: ${manifest.totalRecords}`);
  console.log(`   Total Size: ${manifest.totalSize}`);
  console.log(`   Duration: ${duration}s`);
  console.log(`   Output: ${OUTPUT_DIR}\n`);

  console.log('📋 Exported Tables:');
  for (const [table, result] of Object.entries(results)) {
    const status = result.success ? '✅' : '❌';
    console.log(`   ${status} ${table}: ${result.count} records (${result.size || '0'} KB)`);
  }

  console.log('\n🎉 Data is ready to be bundled with APK!');
  console.log('📱 Run "npm run build:mobile" to rebuild APK with preloaded data');
  
  return manifest;
}

// Run export
exportAllData()
  .then(() => {
    console.log('\n✅ Export completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Export failed:', error);
    process.exit(1);
  });

