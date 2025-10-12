#!/usr/bin/env node
/**
 * VERIFY PRODUCT FIX
 * 
 * This script verifies that all product fixes were applied successfully
 * and that products are ready for display in inventory and details pages.
 * 
 * Usage:
 *   node verify-product-fix.mjs
 */

import pkg from 'pg';
const { Client } = pkg;

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

async function runCheck(client, checkName, query, expectZero = true) {
  try {
    const result = await client.query(query);
    const count = result.rows[0]?.count || 0;
    
    const passed = expectZero ? count === 0 : count > 0;
    
    if (passed) {
      log(`   ✅ ${checkName}: PASS (${count})`, 'green');
    } else {
      log(`   ❌ ${checkName}: FAIL (${count})`, 'red');
    }
    
    return { checkName, passed, count };
  } catch (error) {
    log(`   ⚠️  ${checkName}: ERROR - ${error.message}`, 'yellow');
    return { checkName, passed: false, count: -1, error: error.message };
  }
}

async function main() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    log('\n✅ VERIFYING PRODUCT FIX...', 'bright');
    separator();

    await client.connect();
    log('✅ Connected to database', 'green');

    const checks = [];

    // Check 1: All active products have variants
    log('\n📦 Checking Products...', 'cyan');
    checks.push(await runCheck(
      client,
      'Products without variants',
      `SELECT COUNT(*) as count 
       FROM lats_products p 
       LEFT JOIN lats_product_variants v ON p.id = v.product_id 
       WHERE v.id IS NULL AND p.is_active = true`,
      true
    ));

    // Check 2: All products have categories
    checks.push(await runCheck(
      client,
      'Products without categories',
      `SELECT COUNT(*) as count 
       FROM lats_products 
       WHERE category_id IS NULL AND is_active = true`,
      true
    ));

    // Check 3: All products have SKUs
    checks.push(await runCheck(
      client,
      'Products without SKUs',
      `SELECT COUNT(*) as count 
       FROM lats_products 
       WHERE (sku IS NULL OR sku = '') AND is_active = true`,
      true
    ));

    // Check 4: All products have descriptions
    checks.push(await runCheck(
      client,
      'Products without descriptions',
      `SELECT COUNT(*) as count 
       FROM lats_products 
       WHERE (description IS NULL OR description = '') AND is_active = true`,
      true
    ));

    // Check 5: No NULL prices
    checks.push(await runCheck(
      client,
      'Products with NULL prices',
      `SELECT COUNT(*) as count 
       FROM lats_products 
       WHERE (unit_price IS NULL OR cost_price IS NULL) AND is_active = true`,
      true
    ));

    // Check 6: Products have image reference
    checks.push(await runCheck(
      client,
      'Products without image reference',
      `SELECT COUNT(*) as count 
       FROM lats_products p 
       LEFT JOIN product_images pi ON p.id = pi.product_id 
       WHERE pi.id IS NULL 
         AND (p.image_url IS NULL OR p.image_url = '') 
         AND p.is_active = true`,
      true
    ));

    // Check 7: Variant checks
    log('\n🎯 Checking Variants...', 'cyan');
    checks.push(await runCheck(
      client,
      'Variants with NULL/empty names',
      `SELECT COUNT(*) as count 
       FROM lats_product_variants 
       WHERE (name IS NULL OR name = '' OR name = 'null') AND is_active = true`,
      true
    ));

    checks.push(await runCheck(
      client,
      'Variants with NULL prices',
      `SELECT COUNT(*) as count 
       FROM lats_product_variants 
       WHERE (unit_price IS NULL OR cost_price IS NULL) AND is_active = true`,
      true
    ));

    checks.push(await runCheck(
      client,
      'Variants with NULL quantity',
      `SELECT COUNT(*) as count 
       FROM lats_product_variants 
       WHERE quantity IS NULL AND is_active = true`,
      true
    ));

    // Check 8: Stock synchronization
    log('\n📊 Checking Stock Synchronization...', 'cyan');
    checks.push(await runCheck(
      client,
      'Products with stock mismatches',
      `SELECT COUNT(*) as count 
       FROM lats_products p 
       WHERE p.stock_quantity != (
         SELECT COALESCE(SUM(v.quantity), 0) 
         FROM lats_product_variants v 
         WHERE v.product_id = p.id
       ) AND p.is_active = true`,
      true
    ));

    // Positive checks (should have data)
    log('\n📈 Checking Data Completeness...', 'cyan');
    checks.push(await runCheck(
      client,
      'Active products exist',
      `SELECT COUNT(*) as count FROM lats_products WHERE is_active = true`,
      false
    ));

    checks.push(await runCheck(
      client,
      'Active variants exist',
      `SELECT COUNT(*) as count FROM lats_product_variants WHERE is_active = true`,
      false
    ));

    // Summary
    separator();
    log('\n📋 VERIFICATION SUMMARY', 'bright');
    separator();

    const passedChecks = checks.filter(c => c.passed).length;
    const failedChecks = checks.filter(c => !c.passed).length;
    const totalChecks = checks.length;

    log(`\nTotal Checks: ${totalChecks}`, 'cyan');
    log(`Passed: ${passedChecks}`, 'green');
    log(`Failed: ${failedChecks}`, failedChecks > 0 ? 'red' : 'green');
    log('');

    const percentage = Math.round((passedChecks / totalChecks) * 100);
    
    if (percentage === 100) {
      log('🎉 PERFECT! All checks passed!', 'green');
      log('✅ Your products are ready for inventory and details pages!', 'green');
    } else if (percentage >= 80) {
      log('✅ Good! Most checks passed.', 'green');
      log('⚠️  Review failed checks above and re-run the fix if needed.', 'yellow');
    } else {
      log('❌ Issues found. Please run the fix script:', 'red');
      log('   psql $DATABASE_URL -f COMPREHENSIVE-PRODUCT-FIX.sql', 'yellow');
    }

    // Additional info
    log('');
    separator();
    log('\n📊 PRODUCT STATISTICS', 'bright');
    separator();

    // Get product stats
    const statsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM lats_products WHERE is_active = true) as total_products,
        (SELECT COUNT(*) FROM lats_product_variants WHERE is_active = true) as total_variants,
        (SELECT COUNT(*) FROM lats_categories WHERE is_active = true) as total_categories,
        (SELECT COUNT(*) FROM product_images) as total_images,
        (SELECT COUNT(*) FROM lats_products WHERE unit_price > 0 AND is_active = true) as products_with_prices,
        (SELECT COUNT(DISTINCT category_id) FROM lats_products WHERE is_active = true) as categories_used
    `;
    
    const stats = await client.query(statsQuery);
    const row = stats.rows[0];
    
    log(`\nTotal Active Products:     ${row.total_products}`, 'cyan');
    log(`Total Active Variants:     ${row.total_variants}`, 'cyan');
    log(`Total Categories:          ${row.total_categories}`, 'cyan');
    log(`Categories Used:           ${row.categories_used}`, 'cyan');
    log(`Total Images:              ${row.total_images}`, 'cyan');
    log(`Products with Prices:      ${row.products_with_prices}`, 'cyan');
    
    const avgVariantsPerProduct = row.total_products > 0 
      ? (row.total_variants / row.total_products).toFixed(2) 
      : 0;
    log(`Avg Variants per Product:  ${avgVariantsPerProduct}`, 'cyan');

    // Products needing price updates
    if (row.total_products > row.products_with_prices) {
      const needsPrices = row.total_products - row.products_with_prices;
      log(`\n⚠️  ${needsPrices} products have zero prices and need updating`, 'yellow');
    }

    log('');
    separator();

    // Show sample products
    log('\n📦 SAMPLE PRODUCTS (First 5):', 'bright');
    separator();

    const sampleQuery = `
      SELECT 
        p.name,
        p.sku,
        c.name as category,
        p.unit_price,
        p.stock_quantity,
        COUNT(v.id) as variant_count
      FROM lats_products p
      LEFT JOIN lats_categories c ON p.category_id = c.id
      LEFT JOIN lats_product_variants v ON p.id = v.product_id
      WHERE p.is_active = true
      GROUP BY p.id, p.name, p.sku, c.name, p.unit_price, p.stock_quantity
      ORDER BY p.created_at DESC
      LIMIT 5
    `;
    
    const samples = await client.query(sampleQuery);
    
    if (samples.rows.length > 0) {
      samples.rows.forEach((product, index) => {
        log(`\n${index + 1}. ${product.name}`, 'cyan');
        log(`   SKU: ${product.sku}`, 'reset');
        log(`   Category: ${product.category || 'None'}`, 'reset');
        log(`   Price: $${product.unit_price}`, 'reset');
        log(`   Stock: ${product.stock_quantity}`, 'reset');
        log(`   Variants: ${product.variant_count}`, 'reset');
      });
    } else {
      log('\n⚠️  No products found', 'yellow');
    }

    log('');
    separator();

    if (failedChecks > 0) {
      log('\n🔧 RECOMMENDED ACTIONS:', 'yellow');
      log('   1. Review the failed checks above', 'yellow');
      log('   2. Run the fix script again:', 'yellow');
      log('      psql $DATABASE_URL -f COMPREHENSIVE-PRODUCT-FIX.sql', 'bright');
      log('   3. Verify again with:', 'yellow');
      log('      node verify-product-fix.mjs', 'bright');
    } else {
      log('\n🎯 NEXT STEPS:', 'green');
      log('   1. ✅ Update products with actual prices', 'green');
      log('   2. ✅ Add real product images', 'green');
      log('   3. ✅ Update product descriptions', 'green');
      log('   4. ✅ Assign products to proper categories', 'green');
      log('   5. ✅ Test your inventory page', 'green');
      log('   6. ✅ Test product details page', 'green');
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

