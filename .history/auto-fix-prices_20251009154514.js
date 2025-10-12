#!/usr/bin/env node

/**
 * ================================================================================
 * AUTOMATIC PRICE FIX SCRIPT (Node.js version)
 * ================================================================================
 * This script automatically fixes zero/null prices in your POS database
 * ================================================================================
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
};

async function fixPrices() {
  const databaseUrl = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;
  
  if (!databaseUrl) {
    log.error('DATABASE_URL or VITE_DATABASE_URL not found in .env file');
    process.exit(1);
  }
  
  const client = new Client({
    connectionString: databaseUrl,
    ssl: databaseUrl?.includes('neon.tech') ? { rejectUnauthorized: false } : undefined
  });

  try {
    console.log('🔧 Starting Automatic Price Fix...\n');

    // Connect to database
    log.info('Connecting to database...');
    await client.connect();
    log.success('Connected to database');

    // Step 1: Diagnose
    log.info('Step 1: Diagnosing zero price issues...\n');
    
    const diagnosisQuery = `
      SELECT 
        COUNT(*) as total_products_zero,
        (SELECT COUNT(*) FROM lats_product_variants WHERE unit_price IS NULL OR unit_price = 0) as total_variants_zero
      FROM lats_products 
      WHERE unit_price IS NULL OR unit_price = 0;
    `;
    
    const diagResult = await client.query(diagnosisQuery);
    const { total_products_zero, total_variants_zero } = diagResult.rows[0];
    
    console.log(`Found ${total_products_zero} products with zero/null prices`);
    console.log(`Found ${total_variants_zero} variants with zero/null prices\n`);

    if (total_products_zero == 0 && total_variants_zero == 0) {
      log.success('No price issues found! All products have valid prices.');
      await client.end();
      return;
    }

    // Step 2: Find Sony WH-1000XM5 specifically
    log.info('Checking Sony WH-1000XM5 Headphones...');
    
    const sonyQuery = `
      SELECT p.id, p.name, p.unit_price, pv.id as variant_id, pv.unit_price as variant_price
      FROM lats_products p
      LEFT JOIN lats_product_variants pv ON pv.product_id = p.id
      WHERE p.name ILIKE '%Sony%WH-1000XM5%'
         OR p.name ILIKE '%Sony WH-1000XM5%'
      LIMIT 1;
    `;
    
    const sonyResult = await client.query(sonyQuery);
    if (sonyResult.rows.length > 0) {
      const sony = sonyResult.rows[0];
      console.log(`Found: ${sony.name}`);
      console.log(`Current price: ${sony.unit_price || 0} TZS`);
      console.log(`Variant price: ${sony.variant_price || 0} TZS\n`);
    }

    // Step 3: Apply fixes
    log.info('Step 2: Applying price fixes...\n');

    // Create backups first
    await client.query(`
      CREATE TABLE IF NOT EXISTS lats_products_price_backup AS
      SELECT id, name, unit_price, cost_price, created_at
      FROM lats_products;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS lats_product_variants_price_backup AS
      SELECT id, product_id, variant_name, unit_price, cost_price, created_at
      FROM lats_product_variants;
    `);
    
    log.success('Backups created');

    // Fix products
    const fixProductsResult = await client.query(`
      UPDATE lats_products
      SET unit_price = CASE 
          WHEN cost_price > 0 THEN cost_price * 1.3
          ELSE 1000
      END,
      updated_at = NOW()
      WHERE unit_price IS NULL OR unit_price = 0 OR unit_price < 0
      RETURNING id, name, unit_price;
    `);

    log.success(`Fixed ${fixProductsResult.rowCount} products`);

    // Fix variants
    const fixVariantsResult = await client.query(`
      UPDATE lats_product_variants pv
      SET unit_price = CASE 
          WHEN pv.cost_price > 0 THEN pv.cost_price * 1.3
          WHEN p.unit_price > 0 THEN p.unit_price
          WHEN p.cost_price > 0 THEN p.cost_price * 1.3
          ELSE 1000
      END,
      updated_at = NOW()
      FROM lats_products p
      WHERE pv.product_id = p.id
        AND (pv.unit_price IS NULL OR pv.unit_price = 0 OR pv.unit_price < 0)
      RETURNING pv.id, pv.variant_name, pv.unit_price;
    `);

    log.success(`Fixed ${fixVariantsResult.rowCount} variants`);

    // Fix Sony specifically with proper price
    const fixSonyResult = await client.query(`
      UPDATE lats_products
      SET 
          unit_price = 350000,
          cost_price = CASE WHEN cost_price = 0 OR cost_price IS NULL THEN 270000 ELSE cost_price END,
          updated_at = NOW()
      WHERE name ILIKE '%Sony%WH-1000XM5%'
         OR name ILIKE '%Sony WH-1000XM5%'
      RETURNING id, name, unit_price;
    `);

    if (fixSonyResult.rowCount > 0) {
      log.success(`Fixed Sony WH-1000XM5: ${fixSonyResult.rows[0].unit_price} TZS`);
    }

    // Fix Sony variants
    await client.query(`
      UPDATE lats_product_variants pv
      SET 
          unit_price = 350000,
          cost_price = CASE WHEN pv.cost_price = 0 OR pv.cost_price IS NULL THEN 270000 ELSE pv.cost_price END,
          updated_at = NOW()
      FROM lats_products p
      WHERE pv.product_id = p.id
        AND (p.name ILIKE '%Sony%WH-1000XM5%' OR p.name ILIKE '%Sony WH-1000XM5%');
    `);

    // Step 4: Verify
    log.info('\nStep 3: Verifying fixes...\n');

    const verifyResult = await client.query(`
      SELECT 
          (SELECT COUNT(*) FROM lats_products WHERE unit_price IS NULL OR unit_price = 0) as products_still_zero,
          (SELECT COUNT(*) FROM lats_product_variants WHERE unit_price IS NULL OR unit_price = 0) as variants_still_zero,
          (SELECT COUNT(*) FROM lats_products WHERE unit_price > 0) as products_with_price,
          (SELECT COUNT(*) FROM lats_product_variants WHERE unit_price > 0) as variants_with_price;
    `);

    const verify = verifyResult.rows[0];
    
    console.log('📊 Verification Results:');
    console.log(`   Products with prices: ${verify.products_with_price}`);
    console.log(`   Variants with prices: ${verify.variants_with_price}`);
    console.log(`   Products still zero: ${verify.products_still_zero}`);
    console.log(`   Variants still zero: ${verify.variants_still_zero}\n`);

    if (verify.products_still_zero == 0 && verify.variants_still_zero == 0) {
      log.success('All prices fixed successfully!');
    } else {
      log.warning(`${verify.products_still_zero + verify.variants_still_zero} items still have zero prices`);
    }

    // Close connection
    await client.end();
    log.success('Database connection closed');

    console.log('\n📋 Next Steps:');
    console.log('1. Refresh your POS page in the browser');
    console.log('2. Try adding products to cart again');
    console.log('3. The "Invalid cart items" error should be fixed\n');

  } catch (error) {
    log.error(`Error: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Run the fix
fixPrices();

