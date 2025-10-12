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

async function checkIMacProduct() {
  let sql;
  
  try {
    log.title('🔍 Checking iMac Product in Database');

    const databaseUrl = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;
    
    if (!databaseUrl) {
      log.error('DATABASE_URL not found in environment variables');
      process.exit(1);
    }

    log.info('Connecting to database...');
    sql = postgres(databaseUrl, {
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
    });

    log.success('Connected to database');

    // Search for iMac product
    log.info('Searching for iMac product...');
    
    const imacProducts = await sql`
      SELECT 
        id,
        name,
        description,
        price,
        cost_price,
        quantity,
        is_active,
        category_id,
        brand,
        sku,
        barcode,
        images,
        created_at
      FROM lats_products
      WHERE LOWER(name) LIKE '%imac%'
      OR LOWER(description) LIKE '%imac%'
    `;

    if (imacProducts.length === 0) {
      log.error('No iMac products found in database');
      return;
    }

    log.success(`Found ${imacProducts.length} iMac product(s)`);
    console.log('');

    // Display each iMac product
    for (const product of imacProducts) {
      log.title(`Product: ${product.name}`);
      console.log(`  ID: ${product.id}`);
      console.log(`  Active: ${colors.bright}${product.is_active ? colors.green + 'YES' : colors.red + 'NO'}${colors.reset}`);
      console.log(`  Price: ${product.price || 'NULL'} TZS`);
      console.log(`  Cost Price: ${product.cost_price || 'NULL'} TZS`);
      console.log(`  Quantity: ${product.quantity || 0}`);
      console.log(`  SKU: ${product.sku || 'N/A'}`);
      console.log(`  Barcode: ${product.barcode || 'N/A'}`);
      console.log(`  Brand: ${product.brand || 'N/A'}`);
      console.log(`  Category ID: ${product.category_id || 'N/A'}`);
      console.log(`  Images: ${product.images ? (Array.isArray(product.images) ? product.images.length : 'Invalid format') : 0}`);
      console.log('');

      // Check for issues
      const issues = [];
      
      if (!product.is_active) {
        issues.push('❌ Product is INACTIVE - will not show in POS');
      }
      
      if (!product.price || product.price === '0' || product.price === 0) {
        issues.push('❌ Product has NO PRICE or ZERO price - cannot be added to cart');
      }
      
      if (typeof product.price === 'string' && isNaN(parseFloat(product.price))) {
        issues.push('❌ Product price is INVALID (not a number)');
      }
      
      if (product.quantity === 0 || product.quantity < 0) {
        issues.push('⚠️  Product is OUT OF STOCK');
      }

      // Check variants
      log.info('Checking product variants...');
      const variants = await sql`
        SELECT 
          id,
          product_id,
          name,
          price,
          cost_price,
          quantity,
          sku,
          barcode,
          is_active
        FROM lats_product_variants
        WHERE product_id = ${product.id}
      `;

      if (variants.length === 0) {
        issues.push('⚠️  Product has NO VARIANTS - may cause issues in POS');
      } else {
        log.success(`Found ${variants.length} variant(s)`);
        console.log('');
        
        variants.forEach((variant, idx) => {
          console.log(`  Variant ${idx + 1}: ${variant.name}`);
          console.log(`    ID: ${variant.id}`);
          console.log(`    Active: ${variant.is_active ? colors.green + 'YES' : colors.red + 'NO'}${colors.reset}`);
          console.log(`    Price: ${variant.price || 'NULL'} TZS`);
          console.log(`    Cost Price: ${variant.cost_price || 'NULL'} TZS`);
          console.log(`    Quantity: ${variant.quantity || 0}`);
          console.log(`    SKU: ${variant.sku || 'N/A'}`);
          console.log(`    Barcode: ${variant.barcode || 'N/A'}`);
          console.log('');

          // Check variant issues
          if (!variant.is_active) {
            issues.push(`❌ Variant "${variant.name}" is INACTIVE`);
          }
          
          if (!variant.price || variant.price === '0' || variant.price === 0) {
            issues.push(`❌ Variant "${variant.name}" has NO PRICE - cannot be added to cart`);
          }
          
          if (typeof variant.price === 'string' && isNaN(parseFloat(variant.price))) {
            issues.push(`❌ Variant "${variant.name}" price is INVALID`);
          }
          
          if (variant.quantity === 0 || variant.quantity < 0) {
            issues.push(`⚠️  Variant "${variant.name}" is OUT OF STOCK`);
          }
        });
      }

      // Display issues
      if (issues.length > 0) {
        log.title('⚠️  Issues Found:');
        issues.forEach(issue => console.log(`  ${issue}`));
        console.log('');
      } else {
        log.success('No issues found with this product!');
      }

      // Generate fix recommendations
      if (issues.length > 0) {
        log.title('🔧 Fix Recommendations:');
        
        if (!product.is_active) {
          console.log(`  1. Activate product:`);
          console.log(`     ${colors.cyan}UPDATE lats_products SET is_active = true WHERE id = '${product.id}';${colors.reset}`);
          console.log('');
        }
        
        if (!product.price || product.price === '0' || product.price === 0) {
          console.log(`  2. Set product price:`);
          console.log(`     ${colors.cyan}UPDATE lats_products SET price = 2500000 WHERE id = '${product.id}';${colors.reset}`);
          console.log(`     (Replace 2500000 with actual price)`);
          console.log('');
        }
        
        if (variants.length === 0) {
          console.log(`  3. Add at least one variant:`);
          console.log(`     ${colors.cyan}INSERT INTO lats_product_variants (product_id, name, price, quantity, sku, is_active)${colors.reset}`);
          console.log(`     ${colors.cyan}VALUES ('${product.id}', 'Standard', 2500000, 10, 'IMAC-STD', true);${colors.reset}`);
          console.log('');
        }

        variants.forEach(variant => {
          if (!variant.is_active) {
            console.log(`  4. Activate variant "${variant.name}":`);
            console.log(`     ${colors.cyan}UPDATE lats_product_variants SET is_active = true WHERE id = '${variant.id}';${colors.reset}`);
            console.log('');
          }
          
          if (!variant.price || variant.price === '0' || variant.price === 0) {
            console.log(`  5. Set price for variant "${variant.name}":`);
            console.log(`     ${colors.cyan}UPDATE lats_product_variants SET price = 2500000 WHERE id = '${variant.id}';${colors.reset}`);
            console.log('');
          }
        });
      }
    }

    // Check if product shows in typical POS query
    log.title('🔍 Checking if iMac shows in POS query');
    const posQuery = await sql`
      SELECT 
        p.id,
        p.name,
        p.price,
        p.quantity,
        p.is_active,
        COUNT(v.id) as variant_count
      FROM lats_products p
      LEFT JOIN lats_product_variants v ON p.id = v.product_id AND v.is_active = true
      WHERE p.is_active = true
        AND (LOWER(p.name) LIKE '%imac%' OR LOWER(p.description) LIKE '%imac%')
      GROUP BY p.id, p.name, p.price, p.quantity, p.is_active
    `;

    if (posQuery.length > 0) {
      log.success('iMac product WILL show in POS');
      posQuery.forEach(p => {
        console.log(`  ${p.name}: ${p.variant_count} active variants`);
      });
    } else {
      log.error('iMac product WILL NOT show in POS');
      log.warn('Likely reasons:');
      console.log('  • Product is not active (is_active = false)');
      console.log('  • Product has no price');
      console.log('  • All variants are inactive');
    }

  } catch (error) {
    log.error(`Check failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  } finally {
    if (sql) {
      await sql.end();
      log.info('Database connection closed');
    }
  }
}

checkIMacProduct();

