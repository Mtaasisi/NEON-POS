#!/usr/bin/env node

import postgres from 'postgres';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbConfig = JSON.parse(readFileSync(join(__dirname, 'database-config.json'), 'utf-8'));
const sql = postgres(dbConfig.url, { ssl: 'require' });

async function checkSchema() {
  try {
    console.log('Checking lats_products columns:');
    const productsColumns = await sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'lats_products'
      ORDER BY ordinal_position
    `;
    console.log(productsColumns);

    console.log('\nChecking lats_product_variants columns:');
    const variantsColumns = await sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'lats_product_variants'
      ORDER BY ordinal_position
    `;
    console.log(variantsColumns);

    console.log('\nChecking lats_suppliers columns:');
    const suppliersColumns = await sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'lats_suppliers'
      ORDER BY ordinal_position
    `;
    console.log(suppliersColumns);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await sql.end();
  }
}

checkSchema();

