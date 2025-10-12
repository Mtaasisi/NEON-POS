#!/usr/bin/env node

import postgres from 'postgres';
import 'dotenv/config';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  bright: '\x1b[1m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  title: (msg) => console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}\n`),
};

async function checkIMac() {
  let sql;
  
  try {
    log.title('🔍 iMac Product Analysis');

    const databaseUrl = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;
    sql = postgres(databaseUrl, { max: 1, idle_timeout: 20, connect_timeout: 10 });

    // Get iMac product
    const imacProduct = await sql`
      SELECT *
      FROM lats_products
      WHERE LOWER(name) LIKE '%imac%'
      LIMIT 1
    `;

    if (imacProduct.length === 0) {
      log.error('iMac product not found');
      return;
    }

    const product = imacProduct[0];
    log.success(`Found: ${product.name}`);
    
    // Product details
    log.title('📦 Product Details');
    console.log(`  ID: ${product.id}`);
    console.log(`  Name: ${product.name}`);
    console.log(`  Active: ${product.is_active ? colors.green + 'YES ✓' : colors.red + 'NO ✗'}${colors.reset}`);
    console.log(`  Unit Price: ${product.unit_price} TZS`);
    console.log(`  Selling Price: ${product.selling_price} TZS`);
    console.log(`  Cost Price: ${product.cost_price} TZS`);
    console.log(`  Stock Quantity: ${product.stock_quantity}`);
    console.log(`  SKU: ${product.sku}`);
    console.log('');

    // Get variants
    log.title('🔧 Product Variants');
    const variants = await sql`
      SELECT *
      FROM lats_product_variants
      WHERE product_id = ${product.id}
    `;

    if (variants.length === 0) {
      log.error('❌ NO VARIANTS FOUND - This is likely the problem!');
      log.warn('The POS system requires products to have at least one variant');
    } else {
      log.success(`Found ${variants.length} variant(s)`);
      console.log('');
      
      variants.forEach((variant, idx) => {
        console.log(`  ${colors.bright}Variant ${idx + 1}: ${variant.name}${colors.reset}`);
        console.log(`    ID: ${variant.id}`);
        console.log(`    Active: ${variant.is_active ? colors.green + 'YES ✓' : colors.red + 'NO ✗'}${colors.reset}`);
        console.log(`    Unit Price: ${variant.unit_price || 'NULL'} TZS`);
        console.log(`    Selling Price: ${variant.selling_price || 'NULL'} TZS`);
        console.log(`    Cost Price: ${variant.cost_price || 'NULL'} TZS`);
        console.log(`    Quantity: ${variant.quantity || 0}`);
        console.log(`    SKU: ${variant.sku || 'N/A'}`);
        console.log(`    Barcode: ${variant.barcode || 'N/A'}`);
        console.log('');
      });
    }

    // Check for issues
    log.title('🔍 Issue Analysis');
    const issues = [];
    const fixes = [];

    // Product level checks
    if (!product.is_active) {
      issues.push('❌ Product is INACTIVE');
      fixes.push({
        issue: 'Inactive product',
        sql: `UPDATE lats_products SET is_active = true WHERE id = '${product.id}';`
      });
    }

    if (!product.unit_price || parseFloat(product.unit_price) === 0) {
      issues.push('⚠️  Product unit_price is 0 or NULL');
    }

    if (!product.selling_price || parseFloat(product.selling_price) === 0) {
      issues.push('⚠️  Product selling_price is 0 or NULL');
    }

    if (product.stock_quantity === 0) {
      issues.push('⚠️  Product is OUT OF STOCK');
    }

    // Variant level checks
    if (variants.length === 0) {
      issues.push('❌ CRITICAL: Product has NO VARIANTS');
      fixes.push({
        issue: 'Missing variant',
        sql: `
-- Create a default variant for iMac
INSERT INTO lats_product_variants (
  product_id, 
  name, 
  unit_price, 
  selling_price,
  cost_price,
  quantity, 
  sku, 
  is_active
) VALUES (
  '${product.id}',
  'Standard',
  ${product.unit_price || 0},
  ${product.selling_price || 0},
  ${product.cost_price || 0},
  ${product.stock_quantity || 0},
  '${product.sku}-STD',
  true
);`
      });
    } else {
      variants.forEach(variant => {
        if (!variant.is_active) {
          issues.push(`❌ Variant "${variant.name}" is INACTIVE`);
          fixes.push({
            issue: `Inactive variant: ${variant.name}`,
            sql: `UPDATE lats_product_variants SET is_active = true WHERE id = '${variant.id}';`
          });
        }

        if (!variant.unit_price || parseFloat(variant.unit_price) === 0) {
          issues.push(`⚠️  Variant "${variant.name}" has no unit_price`);
          fixes.push({
            issue: `Missing price for variant: ${variant.name}`,
            sql: `UPDATE lats_product_variants SET unit_price = ${product.unit_price || 453}, selling_price = ${product.selling_price || 453} WHERE id = '${variant.id}';`
          });
        }

        if (variant.quantity === 0 || variant.quantity === null) {
          issues.push(`⚠️  Variant "${variant.name}" is OUT OF STOCK`);
          fixes.push({
            issue: `Out of stock variant: ${variant.name}`,
            sql: `UPDATE lats_product_variants SET quantity = ${product.stock_quantity || 10} WHERE id = '${variant.id}';`
          });
        }
      });
    }

    // Display results
    if (issues.length === 0) {
      log.success('✅ No issues found! Product should work in POS');
    } else {
      log.error(`Found ${issues.length} issue(s):`);
      issues.forEach(issue => console.log(`  ${issue}`));
    }

    // Display fixes
    if (fixes.length > 0) {
      log.title('🔧 SQL Fixes to Apply');
      console.log('Copy and run these SQL statements to fix the issues:\n');
      
      fixes.forEach((fix, idx) => {
        console.log(`${colors.cyan}-- Fix ${idx + 1}: ${fix.issue}${colors.reset}`);
        console.log(fix.sql);
        console.log('');
      });

      // Create fix file
      const fixSQL = fixes.map((fix, idx) => 
        `-- Fix ${idx + 1}: ${fix.issue}\n${fix.sql}\n`
      ).join('\n');

      // Save to file
      const fs = await import('fs');
      fs.writeFileSync('FIX-IMAC-PRODUCT.sql', fixSQL);
      log.success('Fixes saved to: FIX-IMAC-PRODUCT.sql');
      log.info('Run: node apply-imac-fix.mjs');
    }

  } catch (error) {
    log.error(`Error: ${error.message}`);
    console.error(error);
  } finally {
    if (sql) {
      await sql.end();
    }
  }
}

checkIMac();

