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
  title: (msg) => console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}\n`),
};

async function checkSchema() {
  let sql;
  
  try {
    const databaseUrl = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;
    
    sql = postgres(databaseUrl, {
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
    });

    log.title('📋 Products Table Schema');
    
    const productColumns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'lats_products'
      ORDER BY ordinal_position
    `;

    productColumns.forEach(col => {
      console.log(`  ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

    log.title('📋 Product Variants Table Schema');
    
    const variantColumns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'lats_product_variants'
      ORDER BY ordinal_position
    `;

    variantColumns.forEach(col => {
      console.log(`  ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

    // Now fetch iMac with correct column names
    log.title('🔍 iMac Products');
    
    const imacs = await sql`
      SELECT *
      FROM lats_products
      WHERE LOWER(name) LIKE '%imac%'
      LIMIT 1
    `;

    if (imacs.length > 0) {
      console.log(JSON.stringify(imacs[0], null, 2));
    } else {
      log.error('No iMac found');
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

checkSchema();

