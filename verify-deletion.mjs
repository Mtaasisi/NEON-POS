#!/usr/bin/env node
import pg from 'pg';
import { config } from 'dotenv';
config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.VITE_DATABASE_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function verify() {
  const client = await pool.connect();
  try {
    // Check if parent variant exists
    const result = await client.query(`
      SELECT id, name, sku 
      FROM lats_product_variants 
      WHERE sku = 'SKU-1761244859910-59R-V01' AND name = '128GB'
    `);
    
    if (result.rows.length === 0) {
      console.log('✅ Parent variant "128GB" has been permanently deleted');
    } else {
      console.log('❌ Parent variant still exists:', result.rows[0]);
    }

    // Check IMEI variants
    const imeiResult = await client.query(`
      SELECT name, sku, quantity, is_active 
      FROM lats_product_variants 
      WHERE name LIKE '128GB - IMEI:%'
      ORDER BY created_at DESC
    `);
    
    console.log(`\n✅ IMEI child variants still active: ${imeiResult.rows.length}`);
    imeiResult.rows.forEach(row => {
      console.log(`   - ${row.name} (Stock: ${row.quantity}, Active: ${row.is_active})`);
    });

  } finally {
    client.release();
    pool.end();
  }
}

verify();
