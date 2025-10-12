#!/usr/bin/env node

import postgres from 'postgres';
import 'dotenv/config';

const log = {
  success: (msg) => console.log(`\x1b[32m✓\x1b[0m ${msg}`),
  info: (msg) => console.log(`\x1b[34mℹ\x1b[0m ${msg}`),
  title: (msg) => console.log(`\n\x1b[1m\x1b[36m${msg}\x1b[0m\n`),
};

async function fixHPZbook() {
  const sql = postgres(process.env.DATABASE_URL || process.env.VITE_DATABASE_URL, { max: 1 });
  
  try {
    log.title('🔧 Fixing HP Zbookasdasd');

    // Get the product
    const products = await sql`
      SELECT * FROM lats_products 
      WHERE LOWER(name) LIKE '%hp zbook%'
      LIMIT 1
    `;

    if (products.length === 0) {
      log.info('HP Zbook not found or already fixed');
      return;
    }

    const product = products[0];

    // Update product with reasonable values
    await sql`
      UPDATE lats_products
      SET 
        unit_price = 1500000,
        selling_price = 1500000,
        stock_quantity = 5
      WHERE id = ${product.id}
    `;
    log.success('Updated product prices and stock');

    // Update variant
    await sql`
      UPDATE lats_product_variants
      SET 
        unit_price = 1500000,
        selling_price = 1500000,
        quantity = 5
      WHERE product_id = ${product.id}
    `;
    log.success('Updated variant prices and stock');

    log.title('✅ HP Zbook Fixed!');
    log.info('Price: 1,500,000 TZS, Stock: 5 units');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await sql.end();
  }
}

fixHPZbook();

