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

async function validateAllProducts() {
  let sql;
  
  try {
    log.title('🔍 Validating All Products');

    const databaseUrl = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;
    sql = postgres(databaseUrl, { max: 1, idle_timeout: 20, connect_timeout: 10 });

    // Get all active products
    const products = await sql`
      SELECT 
        p.*,
        COUNT(v.id) as variant_count
      FROM lats_products p
      LEFT JOIN lats_product_variants v ON p.id = v.product_id AND v.is_active = true
      WHERE p.is_active = true
      GROUP BY p.id
      ORDER BY p.name
    `;

    log.success(`Found ${products.length} active products\n`);

    const issues = [];
    const report = {
      totalProducts: products.length,
      productsWithIssues: 0,
      totalVariants: 0,
      issuesSummary: {
        noPriceVariants: [],
        noStockVariants: [],
        noVariants: [],
        inactiveVariants: [],
      }
    };

    // Check each product
    for (const product of products) {
      const productIssues = [];
      
      // Get variants for this product
      const variants = await sql`
        SELECT *
        FROM lats_product_variants
        WHERE product_id = ${product.id}
      `;

      report.totalVariants += variants.length;

      // Check 1: No variants
      if (variants.length === 0) {
        productIssues.push('❌ No variants');
        report.issuesSummary.noVariants.push(product.name);
      }

      // Check each variant
      variants.forEach((variant, idx) => {
        // Check 2: Zero or null price
        if (!variant.selling_price || parseFloat(variant.selling_price) === 0) {
          productIssues.push(`❌ Variant "${variant.name}" has no selling_price`);
          report.issuesSummary.noPriceVariants.push(`${product.name} - ${variant.name}`);
        }

        // Check 3: Out of stock
        if (!variant.quantity || variant.quantity <= 0) {
          productIssues.push(`⚠️  Variant "${variant.name}" is out of stock`);
          report.issuesSummary.noStockVariants.push(`${product.name} - ${variant.name}`);
        }

        // Check 4: Inactive variant
        if (!variant.is_active) {
          productIssues.push(`⚠️  Variant "${variant.name}" is inactive`);
          report.issuesSummary.inactiveVariants.push(`${product.name} - ${variant.name}`);
        }
      });

      // Display product status
      if (productIssues.length > 0) {
        report.productsWithIssues++;
        console.log(`${colors.red}✗${colors.reset} ${colors.bright}${product.name}${colors.reset} (${variants.length} variants)`);
        productIssues.forEach(issue => console.log(`  ${issue}`));
        console.log('');
        
        issues.push({
          product: product.name,
          productId: product.id,
          issues: productIssues
        });
      } else {
        console.log(`${colors.green}✓${colors.reset} ${product.name} (${variants.length} variants)`);
      }
    }

    // Display summary
    log.title('📊 Validation Summary');
    
    console.log(`${colors.bright}Products:${colors.reset}`);
    console.log(`  Total Active: ${report.totalProducts}`);
    console.log(`  With Issues: ${report.productsWithIssues > 0 ? colors.red : colors.green}${report.productsWithIssues}${colors.reset}`);
    console.log(`  Ready for POS: ${colors.green}${report.totalProducts - report.productsWithIssues}${colors.reset}`);
    console.log('');

    console.log(`${colors.bright}Variants:${colors.reset}`);
    console.log(`  Total: ${report.totalVariants}`);
    console.log('');

    console.log(`${colors.bright}Issues Found:${colors.reset}`);
    console.log(`  Products with no variants: ${colors.red}${report.issuesSummary.noVariants.length}${colors.reset}`);
    console.log(`  Variants with no price: ${colors.red}${report.issuesSummary.noPriceVariants.length}${colors.reset}`);
    console.log(`  Variants out of stock: ${colors.yellow}${report.issuesSummary.noStockVariants.length}${colors.reset}`);
    console.log(`  Inactive variants: ${colors.yellow}${report.issuesSummary.inactiveVariants.length}${colors.reset}`);
    console.log('');

    // Save report
    const fs = await import('fs');
    fs.writeFileSync('product-validation-report.json', JSON.stringify(report, null, 2));
    log.success('Detailed report saved to: product-validation-report.json');

    // Show recommendations
    if (issues.length > 0) {
      log.title('🔧 Recommended Actions');
      console.log(`${colors.cyan}1. Run automatic fix:${colors.reset}`);
      console.log(`   node fix-all-products.mjs`);
      console.log('');
      console.log(`${colors.cyan}2. Apply SQL fix manually:${colors.reset}`);
      console.log(`   psql "$DATABASE_URL" -f FIX-ALL-PRODUCT-VARIANTS.sql`);
      console.log('');
      console.log(`${colors.cyan}3. Enable prevention triggers:${colors.reset}`);
      console.log(`   psql "$DATABASE_URL" -f PREVENT-PRODUCT-ISSUES-TRIGGERS.sql`);
    } else {
      log.title(`${colors.green}✅ ALL PRODUCTS ARE VALID!${colors.reset}`);
      console.log('No issues found. All products are ready for POS.');
    }

  } catch (error) {
    log.error(`Validation failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  } finally {
    if (sql) {
      await sql.end();
    }
  }
}

validateAllProducts();

