#!/usr/bin/env node
/**
 * AUTO-DIAGNOSE PRODUCT ISSUES
 * 
 * This script automatically diagnoses and reports all missing product information
 * that would affect the inventory page and details page display.
 * 
 * Usage:
 *   node auto-diagnose-product-issues.mjs
 */

import pkg from 'pg';
const { Client } = pkg;
import fs from 'fs';

// Database configuration
const DATABASE_URL = process.env.DATABASE_URL || 'YOUR_NEON_DATABASE_URL_HERE';

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function separator() {
  log('━'.repeat(80), 'cyan');
}

async function main() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    log('\n🔍 STARTING PRODUCT DIAGNOSTIC SCAN...', 'bright');
    separator();

    await client.connect();
    log('✅ Connected to database', 'green');

    const issues = {
      missingVariants: [],
      missingCategories: [],
      missingPrices: [],
      missingSKUs: [],
      missingDescriptions: [],
      missingImages: [],
      variantIssues: [],
      inactiveProducts: [],
      stockMismatches: []
    };

    // Check 1: Products without variants
    log('\n📦 Checking for products without variants...', 'cyan');
    const noVariantsQuery = `
      SELECT p.id, p.name, p.stock_quantity
      FROM lats_products p
      LEFT JOIN lats_product_variants v ON p.id = v.product_id
      WHERE v.id IS NULL AND p.is_active = true
    `;
    const noVariants = await client.query(noVariantsQuery);
    issues.missingVariants = noVariants.rows;
    
    if (noVariants.rows.length > 0) {
      log(`   ⚠️  Found ${noVariants.rows.length} products without variants`, 'yellow');
      noVariants.rows.slice(0, 5).forEach(p => {
        log(`      - ${p.name} (ID: ${p.id.substring(0, 8)}..., Stock: ${p.stock_quantity})`, 'yellow');
      });
      if (noVariants.rows.length > 5) {
        log(`      ... and ${noVariants.rows.length - 5} more`, 'yellow');
      }
    } else {
      log('   ✅ All products have variants', 'green');
    }

    // Check 2: Products without categories
    log('\n📂 Checking for products without categories...', 'cyan');
    const noCategoryQuery = `
      SELECT id, name FROM lats_products
      WHERE category_id IS NULL AND is_active = true
    `;
    const noCategory = await client.query(noCategoryQuery);
    issues.missingCategories = noCategory.rows;
    
    if (noCategory.rows.length > 0) {
      log(`   ⚠️  Found ${noCategory.rows.length} products without categories`, 'yellow');
      noCategory.rows.slice(0, 5).forEach(p => {
        log(`      - ${p.name}`, 'yellow');
      });
    } else {
      log('   ✅ All products have categories', 'green');
    }

    // Check 3: Products with missing/zero prices
    log('\n💰 Checking for products with missing or zero prices...', 'cyan');
    const noPriceQuery = `
      SELECT id, name, unit_price, cost_price
      FROM lats_products
      WHERE (unit_price IS NULL OR unit_price = 0 OR cost_price IS NULL OR cost_price = 0)
        AND is_active = true
    `;
    const noPrice = await client.query(noPriceQuery);
    issues.missingPrices = noPrice.rows;
    
    if (noPrice.rows.length > 0) {
      log(`   ⚠️  Found ${noPrice.rows.length} products with price issues`, 'yellow');
      noPrice.rows.slice(0, 5).forEach(p => {
        log(`      - ${p.name} (Unit: ${p.unit_price || 'NULL'}, Cost: ${p.cost_price || 'NULL'})`, 'yellow');
      });
    } else {
      log('   ✅ All products have prices', 'green');
    }

    // Check 4: Products without SKU
    log('\n🏷️  Checking for products without SKUs...', 'cyan');
    const noSKUQuery = `
      SELECT id, name FROM lats_products
      WHERE (sku IS NULL OR sku = '') AND is_active = true
    `;
    const noSKU = await client.query(noSKUQuery);
    issues.missingSKUs = noSKU.rows;
    
    if (noSKU.rows.length > 0) {
      log(`   ⚠️  Found ${noSKU.rows.length} products without SKUs`, 'yellow');
    } else {
      log('   ✅ All products have SKUs', 'green');
    }

    // Check 5: Products without descriptions
    log('\n📝 Checking for products without descriptions...', 'cyan');
    const noDescQuery = `
      SELECT id, name FROM lats_products
      WHERE (description IS NULL OR description = '') AND is_active = true
    `;
    const noDesc = await client.query(noDescQuery);
    issues.missingDescriptions = noDesc.rows;
    
    if (noDesc.rows.length > 0) {
      log(`   ⚠️  Found ${noDesc.rows.length} products without descriptions`, 'yellow');
    } else {
      log('   ✅ All products have descriptions', 'green');
    }

    // Check 6: Products without images
    log('\n🖼️  Checking for products without images...', 'cyan');
    const noImageQuery = `
      SELECT p.id, p.name, p.image_url
      FROM lats_products p
      LEFT JOIN product_images pi ON p.id = pi.product_id
      WHERE pi.id IS NULL 
        AND (p.image_url IS NULL OR p.image_url = '')
        AND p.is_active = true
    `;
    const noImage = await client.query(noImageQuery);
    issues.missingImages = noImage.rows;
    
    if (noImage.rows.length > 0) {
      log(`   ⚠️  Found ${noImage.rows.length} products without images`, 'yellow');
    } else {
      log('   ✅ All products have images', 'green');
    }

    // Check 7: Variant issues
    log('\n🎯 Checking variant data quality...', 'cyan');
    const variantIssuesQuery = `
      SELECT 
        p.name as product_name,
        v.id as variant_id,
        v.name as variant_name,
        v.unit_price,
        v.cost_price,
        v.quantity,
        v.sku
      FROM lats_product_variants v
      JOIN lats_products p ON v.product_id = p.id
      WHERE (
        v.name IS NULL OR v.name = '' OR v.name = 'null' OR
        v.unit_price IS NULL OR v.unit_price = 0 OR
        v.cost_price IS NULL OR
        v.sku IS NULL OR v.sku = ''
      ) AND v.is_active = true
    `;
    const variantIssues = await client.query(variantIssuesQuery);
    issues.variantIssues = variantIssues.rows;
    
    if (variantIssues.rows.length > 0) {
      log(`   ⚠️  Found ${variantIssues.rows.length} variants with data issues`, 'yellow');
      variantIssues.rows.slice(0, 3).forEach(v => {
        const problems = [];
        if (!v.variant_name || v.variant_name === 'null') problems.push('missing name');
        if (!v.unit_price || v.unit_price === 0) problems.push('zero price');
        if (!v.sku) problems.push('missing SKU');
        log(`      - ${v.product_name}: ${problems.join(', ')}`, 'yellow');
      });
    } else {
      log('   ✅ All variants have complete data', 'green');
    }

    // Check 8: Stock quantity mismatches
    log('\n📊 Checking stock quantity synchronization...', 'cyan');
    const stockMismatchQuery = `
      SELECT 
        p.id,
        p.name,
        p.stock_quantity as product_stock,
        COALESCE(SUM(v.quantity), 0) as variant_total_stock
      FROM lats_products p
      LEFT JOIN lats_product_variants v ON p.id = v.product_id
      WHERE p.is_active = true
      GROUP BY p.id, p.name, p.stock_quantity
      HAVING p.stock_quantity != COALESCE(SUM(v.quantity), 0)
    `;
    const stockMismatch = await client.query(stockMismatchQuery);
    issues.stockMismatches = stockMismatch.rows;
    
    if (stockMismatch.rows.length > 0) {
      log(`   ⚠️  Found ${stockMismatch.rows.length} products with stock mismatches`, 'yellow');
      stockMismatch.rows.slice(0, 3).forEach(p => {
        log(`      - ${p.name}: Product shows ${p.product_stock}, variants total ${p.variant_total_stock}`, 'yellow');
      });
    } else {
      log('   ✅ Stock quantities are synchronized', 'green');
    }

    // Summary
    separator();
    log('\n📋 DIAGNOSTIC SUMMARY', 'bright');
    separator();

    const totalIssues = 
      issues.missingVariants.length +
      issues.missingCategories.length +
      issues.missingPrices.length +
      issues.missingSKUs.length +
      issues.missingDescriptions.length +
      issues.missingImages.length +
      issues.variantIssues.length +
      issues.stockMismatches.length;

    log(`\nTotal issues found: ${totalIssues}`, totalIssues > 0 ? 'yellow' : 'green');
    log('');
    log(`Products without variants:      ${issues.missingVariants.length}`, 'cyan');
    log(`Products without categories:    ${issues.missingCategories.length}`, 'cyan');
    log(`Products with price issues:     ${issues.missingPrices.length}`, 'cyan');
    log(`Products without SKUs:          ${issues.missingSKUs.length}`, 'cyan');
    log(`Products without descriptions:  ${issues.missingDescriptions.length}`, 'cyan');
    log(`Products without images:        ${issues.missingImages.length}`, 'cyan');
    log(`Variants with data issues:      ${issues.variantIssues.length}`, 'cyan');
    log(`Stock quantity mismatches:      ${issues.stockMismatches.length}`, 'cyan');

    // Save detailed report
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalIssues,
        missingVariants: issues.missingVariants.length,
        missingCategories: issues.missingCategories.length,
        missingPrices: issues.missingPrices.length,
        missingSKUs: issues.missingSKUs.length,
        missingDescriptions: issues.missingDescriptions.length,
        missingImages: issues.missingImages.length,
        variantIssues: issues.variantIssues.length,
        stockMismatches: issues.stockMismatches.length
      },
      details: issues
    };

    const reportPath = 'PRODUCT-DIAGNOSTIC-REPORT.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    log('');
    separator();
    log(`\n📄 Detailed report saved to: ${reportPath}`, 'green');

    if (totalIssues > 0) {
      log('\n🔧 RECOMMENDED ACTION:', 'yellow');
      log('   Run the COMPREHENSIVE-PRODUCT-FIX.sql script to automatically fix all issues:', 'yellow');
      log('   psql $DATABASE_URL -f COMPREHENSIVE-PRODUCT-FIX.sql', 'bright');
    } else {
      log('\n✅ All products are in good shape! No fixes needed.', 'green');
    }

    log('');
    separator();

  } catch (error) {
    log('\n❌ ERROR:', 'red');
    log(error.message, 'red');
    if (error.stack) {
      log('\nStack trace:', 'red');
      log(error.stack, 'red');
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();

