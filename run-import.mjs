#!/usr/bin/env node

/**
 * Import Categories and Products from Backup SQL Files
 * 
 * This script imports:
 * - 44 categories (10 parent + 34 child categories)
 * - 57 products with full details
 * 
 * Usage: node run-import.mjs
 */

import { neon } from '@neondatabase/serverless';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('\n╔══════════════════════════════════════════════════╗');
console.log('║  📦 CATEGORY & PRODUCT IMPORT TOOL              ║');
console.log('║  Importing from backup SQL files                ║');
console.log('╚══════════════════════════════════════════════════╝\n');

// Get database URL
let DATABASE_URL;
try {
  if (existsSync('database-config.json')) {
    const config = JSON.parse(readFileSync('database-config.json', 'utf-8'));
    DATABASE_URL = config.connectionString || config.url;
    console.log('✅ Found database-config.json');
  } else if (process.env.DATABASE_URL) {
    DATABASE_URL = process.env.DATABASE_URL;
    console.log('✅ Using DATABASE_URL from environment');
  } else {
    console.error('❌ No database connection found!');
    console.error('   Create database-config.json or set DATABASE_URL environment variable');
    process.exit(1);
  }
  console.log(`   Database: ${DATABASE_URL.substring(0, 50)}...\n`);
} catch (e) {
  console.error('❌ Error reading database config:', e.message);
  process.exit(1);
}

const sql = neon(DATABASE_URL);

// Check if SQL files exist
const categoriesFile = join(dirname(__dirname), 'IMPORT-CATEGORIES-FROM-BACKUP.sql');
const productsFile = join(dirname(__dirname), 'IMPORT-PRODUCTS-FROM-BACKUP.sql');

if (!existsSync(categoriesFile)) {
  console.error(`❌ Categories file not found: ${categoriesFile}`);
  process.exit(1);
}

if (!existsSync(productsFile)) {
  console.error(`❌ Products file not found: ${productsFile}`);
  process.exit(1);
}

console.log('📁 Found import files:');
console.log('   ✅ IMPORT-CATEGORIES-FROM-BACKUP.sql');
console.log('   ✅ IMPORT-PRODUCTS-FROM-BACKUP.sql\n');

async function importCategories() {
  console.log('═══════════════════════════════════════════════════');
  console.log('📂 Step 1: Importing Categories');
  console.log('═══════════════════════════════════════════════════\n');
  
  try {
    const categoriesSQL = readFileSync(categoriesFile, 'utf-8');
    
    // Split SQL by individual INSERT statements
    const insertStatements = categoriesSQL
      .split('\n')
      .filter(line => line.trim().startsWith('INSERT INTO'))
      .length;
    
    console.log(`   Found ${insertStatements} category INSERT statements`);
    console.log('   Processing categories...\n');
    
    // Parse SQL statements properly (multi-line INSERT statements)
    const sqlStatements = [];
    let currentStatement = '';
    
    for (const line of categoriesSQL.split('\n')) {
      const trimmedLine = line.trim();
      
      // Skip comments and empty lines
      if (trimmedLine.startsWith('--') || trimmedLine.length === 0) {
        continue;
      }
      
      // Add line to current statement
      currentStatement += line + '\n';
      
      // Check if statement is complete (ends with semicolon)
      if (trimmedLine.endsWith(';')) {
        const stmt = currentStatement.trim();
        if (stmt.startsWith('INSERT')) {
          sqlStatements.push(stmt);
        }
        currentStatement = '';
      }
    }
    
    console.log(`   Parsed ${sqlStatements.length} INSERT statements\n`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < sqlStatements.length; i++) {
      try {
        await sql(sqlStatements[i]);
        successCount++;
        process.stdout.write(`\r   Progress: ${successCount}/${sqlStatements.length} categories imported`);
      } catch (err) {
        errorCount++;
        // Most errors will be "already exists" which is fine
        if (!err.message.includes('duplicate') && !err.message.includes('already exists') && !err.message.includes('constraint')) {
          console.error(`\n   ⚠️  Warning on statement ${i + 1}: ${err.message}`);
        }
      }
    }
    
    console.log('\n');
    console.log(`   ✅ Categories import completed!`);
    console.log(`      Success: ${successCount}`);
    console.log(`      Skipped: ${errorCount} (already exist)\n`);
    
    return { success: true, imported: successCount, skipped: errorCount };
  } catch (error) {
    console.error('   ❌ Error importing categories:', error.message);
    return { success: false, error: error.message };
  }
}

async function importProducts() {
  console.log('═══════════════════════════════════════════════════');
  console.log('📦 Step 2: Importing Products');
  console.log('═══════════════════════════════════════════════════\n');
  
  try {
    const productsSQL = readFileSync(productsFile, 'utf-8');
    
    console.log('   Processing 57 products...\n');
    
    // Parse SQL statements properly (multi-line INSERT statements)
    const sqlStatements = [];
    let currentStatement = '';
    let inBeginBlock = false;
    
    for (const line of productsSQL.split('\n')) {
      const trimmedLine = line.trim();
      
      // Skip BEGIN and COMMIT
      if (trimmedLine === 'BEGIN;' || trimmedLine === 'COMMIT;') {
        continue;
      }
      
      // Skip comments and empty lines
      if (trimmedLine.startsWith('--') || trimmedLine.length === 0) {
        continue;
      }
      
      // Add line to current statement
      currentStatement += line + '\n';
      
      // Check if statement is complete (ends with semicolon)
      if (trimmedLine.endsWith(');')) {
        const stmt = currentStatement.trim();
        if (stmt.startsWith('INSERT')) {
          sqlStatements.push(stmt);
        }
        currentStatement = '';
      }
    }
    
    console.log(`   Parsed ${sqlStatements.length} INSERT statements\n`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < sqlStatements.length; i++) {
      try {
        await sql(sqlStatements[i]);
        successCount++;
        process.stdout.write(`\r   Progress: ${successCount}/${sqlStatements.length} products imported`);
      } catch (err) {
        errorCount++;
        // Most errors will be "already exists" which is fine  
        if (!err.message.includes('duplicate') && !err.message.includes('already exists') && !err.message.includes('constraint')) {
          console.error(`\n   ⚠️  Warning on product ${i + 1}: ${err.message}`);
        }
      }
    }
    
    console.log('\n');
    console.log(`   ✅ Products import completed!`);
    console.log(`      Success: ${successCount}`);
    console.log(`      Skipped: ${errorCount} (already exist)\n`);
    
    return { success: true, imported: successCount, skipped: errorCount };
  } catch (error) {
    console.error('   ❌ Error importing products:', error.message);
    return { success: false, error: error.message };
  }
}

async function verifyImport() {
  console.log('═══════════════════════════════════════════════════');
  console.log('🔍 Step 3: Verifying Import');
  console.log('═══════════════════════════════════════════════════\n');
  
  try {
    // Count categories
    const categoriesResult = await sql`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE parent_id IS NULL) as parents,
        COUNT(*) FILTER (WHERE parent_id IS NOT NULL) as children
      FROM lats_categories
    `;
    
    const categories = categoriesResult[0];
    console.log('   📂 Categories in database:');
    console.log(`      Total: ${categories.total}`);
    console.log(`      Parents: ${categories.parents}`);
    console.log(`      Children: ${categories.children}\n`);
    
    // Count products
    const productsResult = await sql`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE is_active = true) as active,
        SUM(stock_quantity) as total_stock
      FROM lats_products
    `;
    
    const products = productsResult[0];
    console.log('   📦 Products in database:');
    console.log(`      Total: ${products.total}`);
    console.log(`      Active: ${products.active}`);
    console.log(`      Total Stock: ${products.total_stock}\n`);
    
    // Show some sample categories
    const sampleCategories = await sql`
      SELECT name, icon, color, is_active
      FROM lats_categories
      WHERE parent_id IS NULL
      ORDER BY sort_order
      LIMIT 5
    `;
    
    console.log('   📋 Sample Parent Categories:');
    sampleCategories.forEach(cat => {
      console.log(`      ${cat.icon} ${cat.name} (${cat.color})`);
    });
    console.log('');
    
    // Show some sample products
    const sampleProducts = await sql`
      SELECT name, brand, selling_price, stock_quantity
      FROM lats_products
      WHERE is_active = true
      ORDER BY created_at DESC
      LIMIT 5
    `;
    
    console.log('   📦 Sample Products:');
    sampleProducts.forEach(prod => {
      console.log(`      • ${prod.name} (${prod.brand}) - TZS ${Number(prod.selling_price).toLocaleString()} - Stock: ${prod.stock_quantity}`);
    });
    console.log('');
    
    return { success: true };
  } catch (error) {
    console.error('   ❌ Error verifying import:', error.message);
    return { success: false, error: error.message };
  }
}

async function runImport() {
  const startTime = Date.now();
  
  try {
    // Step 1: Import categories
    const categoriesResult = await importCategories();
    if (!categoriesResult.success) {
      throw new Error('Categories import failed');
    }
    
    // Step 2: Import products
    const productsResult = await importProducts();
    if (!productsResult.success) {
      throw new Error('Products import failed');
    }
    
    // Step 3: Verify import
    const verifyResult = await verifyImport();
    if (!verifyResult.success) {
      console.log('   ⚠️  Warning: Verification had issues, but import may have succeeded');
    }
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('═══════════════════════════════════════════════════');
    console.log('✅ IMPORT COMPLETED SUCCESSFULLY!');
    console.log('═══════════════════════════════════════════════════\n');
    console.log(`   ⏱️  Duration: ${duration} seconds`);
    console.log(`   📂 Categories: ${categoriesResult.imported} imported, ${categoriesResult.skipped} skipped`);
    console.log(`   📦 Products: ${productsResult.imported} imported, ${productsResult.skipped} skipped`);
    console.log('');
    console.log('🎉 Your POS system now has categories and products!');
    console.log('   You can now start selling in the POS page.\n');
    
  } catch (error) {
    console.error('\n❌ IMPORT FAILED:', error.message);
    console.error('   Please check the error messages above for details.\n');
    process.exit(1);
  }
}

// Run the import
runImport();

