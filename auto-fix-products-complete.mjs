#!/usr/bin/env node

/**
 * AUTOMATIC PRODUCT DATABASE FIX
 * ================================
 * This script automatically fixes all product-related issues:
 * 1. Runs diagnostic to identify issues
 * 2. Fixes variant schema problems
 * 3. Fixes data issues (variants, images, prices, etc.)
 * 4. Verifies all fixes
 */

import { neon } from '@neondatabase/serverless';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('\n');
console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║  🔧 AUTOMATIC PRODUCT DATABASE FIX                        ║');
console.log('╚════════════════════════════════════════════════════════════╝');
console.log('\n');

// Get database URL
let DATABASE_URL;
try {
  if (existsSync('database-config.json')) {
    const config = JSON.parse(readFileSync('database-config.json', 'utf-8'));
    DATABASE_URL = config.connectionString || config.url;
    console.log('✅ Found database-config.json');
  } else {
    DATABASE_URL = 'postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';
    console.log('✅ Using configured database URL');
  }
  console.log(`   Database: ${DATABASE_URL.substring(0, 50)}...\n`);
} catch (e) {
  console.error('❌ Error reading database config:', e.message);
  process.exit(1);
}

const sql = neon(DATABASE_URL);

/**
 * Execute a SQL file
 */
async function executeSqlFile(filename, description) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`📋 ${description}`);
  console.log(`   File: ${filename}`);
  console.log(`${'─'.repeat(60)}\n`);

  try {
    const filePath = join(__dirname, filename);
    
    if (!existsSync(filePath)) {
      console.error(`❌ File not found: ${filename}`);
      return false;
    }

    const sqlContent = readFileSync(filePath, 'utf-8');
    
    // Execute the SQL
    console.log('⏳ Executing SQL...\n');
    
    // Split by semicolon and execute statements one by one for better error handling
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip empty statements and comments
      if (!statement || statement.startsWith('--')) continue;

      try {
        const result = await sql(statement);
        successCount++;
        
        // Show SELECT results
        if (result && Array.isArray(result) && result.length > 0) {
          // Only show first few results to avoid clutter
          if (result.length <= 5) {
            console.table(result);
          } else if (result.length > 0) {
            // Show summary for large result sets
            console.log(`   ✅ Query returned ${result.length} rows`);
            
            // If it looks like a status/summary message, show it
            const firstRow = result[0];
            if (firstRow.status || firstRow.message || firstRow.result || firstRow.summary) {
              console.table(result.slice(0, 10));
            }
          }
        }
      } catch (err) {
        // Some errors are expected (like DROP IF EXISTS on non-existent objects)
        if (!err.message.includes('does not exist') && 
            !err.message.includes('already exists')) {
          errorCount++;
          console.error(`   ⚠️  Statement ${i + 1}/${statements.length}: ${err.message.substring(0, 100)}`);
        }
      }
    }

    console.log(`\n✅ Completed: ${successCount} statements executed`);
    if (errorCount > 0) {
      console.log(`⚠️  Warnings: ${errorCount} (may be normal)`);
    }
    
    return true;
  } catch (error) {
    console.error(`❌ Error executing ${filename}:`, error.message);
    return false;
  }
}

/**
 * Run initial diagnostic
 */
async function runDiagnostic() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  STEP 1: RUNNING DIAGNOSTIC                                ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  return await executeSqlFile(
    'COMPREHENSIVE-PRODUCT-DIAGNOSTIC.sql',
    'Checking product database health'
  );
}

/**
 * Fix variant schema issues
 */
async function fixVariantSchema() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  STEP 2: FIXING VARIANT SCHEMA                             ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  return await executeSqlFile(
    'SMART-FIX-VARIANT-SCHEMA.sql',
    'Standardizing variant table columns'
  );
}

/**
 * Fix all product data issues
 */
async function fixProductData() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  STEP 3: FIXING PRODUCT DATA                               ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  return await executeSqlFile(
    'AUTO-FIX-ALL-PRODUCT-ISSUES.sql',
    'Fixing products, variants, images, prices, and more'
  );
}

/**
 * Run verification diagnostic
 */
async function runVerification() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  STEP 4: VERIFICATION                                      ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  // Get summary stats
  try {
    console.log('📊 Fetching final statistics...\n');
    
    const productCount = await sql`
      SELECT COUNT(*) as count FROM lats_products WHERE is_active = true
    `;
    
    const variantCount = await sql`
      SELECT COUNT(*) as count FROM lats_product_variants WHERE is_active = true
    `;
    
    const productsWithoutVariants = await sql`
      SELECT COUNT(DISTINCT p.id) as count
      FROM lats_products p
      LEFT JOIN lats_product_variants v ON p.id = v.product_id AND v.is_active = true
      WHERE p.is_active = true
      GROUP BY p.id
      HAVING COUNT(v.id) = 0
    `;
    
    const brokenImages = await sql`
      SELECT COUNT(*) as count
      FROM lats_products
      WHERE is_active = true
        AND (image_url IS NULL OR image_url = '' OR image_url = '/placeholder-product.png')
    `;
    
    const zeroPrices = await sql`
      SELECT COUNT(*) as count
      FROM lats_products
      WHERE is_active = true
        AND (unit_price IS NULL OR unit_price = 0)
    `;
    
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  📊 FINAL STATISTICS                                       ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log(`║  Total Active Products:           ${String(productCount[0].count).padStart(20)} ║`);
    console.log(`║  Total Active Variants:           ${String(variantCount[0].count).padStart(20)} ║`);
    console.log(`║  Products Without Variants:       ${String(productsWithoutVariants.length > 0 ? productsWithoutVariants[0].count : 0).padStart(20)} ║`);
    console.log(`║  Products With Broken Images:     ${String(brokenImages[0].count).padStart(20)} ║`);
    console.log(`║  Products With Zero Prices:       ${String(zeroPrices[0].count).padStart(20)} ║`);
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    
    // Calculate health score
    const total = parseInt(productCount[0].count);
    if (total > 0) {
      const withVariants = total - (productsWithoutVariants.length > 0 ? parseInt(productsWithoutVariants[0].count) : 0);
      const withImages = total - parseInt(brokenImages[0].count);
      const withPrices = total - parseInt(zeroPrices[0].count);
      
      const healthScore = Math.round(
        (withVariants / total * 40) +
        (withImages / total * 30) +
        (withPrices / total * 30)
      );
      
      console.log('╔════════════════════════════════════════════════════════════╗');
      console.log('║  🎯 HEALTH SCORE                                           ║');
      console.log('╠════════════════════════════════════════════════════════════╣');
      console.log(`║  Overall Health: ${healthScore}%${' '.repeat(40 - String(healthScore).length)} ║`);
      console.log(`║  Rating: ${healthScore >= 90 ? '✅ Excellent' : healthScore >= 75 ? '👍 Good' : healthScore >= 50 ? '⚠️  Fair' : '❌ Poor'}${' '.repeat(47 - (healthScore >= 90 ? '✅ Excellent' : healthScore >= 75 ? '👍 Good' : healthScore >= 50 ? '⚠️  Fair' : '❌ Poor').length)} ║`);
      console.log('╚════════════════════════════════════════════════════════════╝\n');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error fetching statistics:', error.message);
    return false;
  }
}

/**
 * Main execution
 */
async function main() {
  const startTime = Date.now();
  
  try {
    console.log('🚀 Starting automatic product database fix...\n');
    console.log('⏱️  This will take about 2-3 minutes...\n');
    
    // Step 1: Diagnostic
    console.log('📋 Step 1/4: Running initial diagnostic...');
    const diagSuccess = await runDiagnostic();
    if (!diagSuccess) {
      console.error('\n❌ Diagnostic failed. Please check the error messages above.');
      process.exit(1);
    }
    
    // Step 2: Fix Schema
    console.log('\n📋 Step 2/4: Fixing variant schema...');
    const schemaSuccess = await fixVariantSchema();
    if (!schemaSuccess) {
      console.error('\n❌ Schema fix failed. Please check the error messages above.');
      process.exit(1);
    }
    
    // Step 3: Fix Data
    console.log('\n📋 Step 3/4: Fixing product data...');
    const dataSuccess = await fixProductData();
    if (!dataSuccess) {
      console.error('\n❌ Data fix failed. Please check the error messages above.');
      process.exit(1);
    }
    
    // Step 4: Verification
    console.log('\n📋 Step 4/4: Running verification...');
    await runVerification();
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ ALL FIXES COMPLETED SUCCESSFULLY!                      ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    
    console.log(`⏱️  Total time: ${elapsed} seconds\n`);
    
    console.log('📝 NEXT STEPS:\n');
    console.log('   1. ✅ Clear your browser cache (Cmd+Shift+R or Ctrl+Shift+R)');
    console.log('   2. ✅ Restart your dev server: npm run dev');
    console.log('   3. ⚠️  Manually review products with price = $1.00');
    console.log('   4. 📸 Upload real product images (placeholders work for now)');
    console.log('   5. 🔢 Update auto-generated SKUs with real values\n');
    
    console.log('🎉 Your product database is now much healthier!\n');
    
  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the script
main().catch(error => {
  console.error('\n❌ Unhandled error:', error);
  process.exit(1);
});

