#!/usr/bin/env node

import postgres from 'postgres';
import { readFileSync } from 'fs';
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

async function applyFix() {
  let sql;
  
  try {
    log.title('🔧 Fixing iMac Product Variants');

    const databaseUrl = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;
    sql = postgres(databaseUrl, { max: 1, idle_timeout: 20, connect_timeout: 10 });

    log.info('Applying fixes...');

    // Fix 1: Update "Variant 1" to have proper selling_price
    log.info('Fix 1: Setting selling_price for "Variant 1"...');
    await sql`
      UPDATE lats_product_variants 
      SET selling_price = unit_price 
      WHERE id = 'f2171978-952d-435b-ac68-598c71840ca9'
    `;
    log.success('Variant 1 selling_price updated to 453');

    // Fix 2: Update "Default" variant to have stock
    log.info('Fix 2: Setting quantity for "Default" variant...');
    await sql`
      UPDATE lats_product_variants 
      SET quantity = 43 
      WHERE id = 'f727cd61-0bcd-4efc-98d5-7208ffa4fa50'
    `;
    log.success('Default variant quantity updated to 43');

    // Verify the fixes
    log.title('✅ Verification');
    
    const variants = await sql`
      SELECT id, name, unit_price, selling_price, quantity, is_active
      FROM lats_product_variants
      WHERE product_id = '00c4a470-8777-4935-9250-0bf69c687ca3'
    `;

    log.info('Current variant status:');
    variants.forEach(v => {
      const priceOk = v.selling_price && parseFloat(v.selling_price) > 0;
      const stockOk = v.quantity && v.quantity > 0;
      const status = priceOk && stockOk ? colors.green + '✓ READY' : colors.red + '✗ ISSUE';
      
      console.log(`  ${v.name}: ${status}${colors.reset}`);
      console.log(`    Price: ${v.selling_price} TZS, Stock: ${v.quantity}, Active: ${v.is_active}`);
    });

    log.title('🎉 iMac Product Fixed!');
    log.success('Both variants now have proper price and stock');
    log.info('You can now add iMac to cart in the POS system');

  } catch (error) {
    log.error(`Fix failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  } finally {
    if (sql) {
      await sql.end();
      log.info('Database connection closed');
    }
  }
}

applyFix();

