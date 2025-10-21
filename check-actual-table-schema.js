#!/usr/bin/env node

import pkg from 'pg';
const { Pool } = pkg;
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.VITE_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkSchema() {
  const client = await pool.connect();
  
  try {
    // Get the actual columns in lats_product_variants table
    const schemaQuery = `
      SELECT 
        column_name, 
        data_type, 
        column_default,
        is_nullable
      FROM information_schema.columns
      WHERE table_name = 'lats_product_variants'
      ORDER BY ordinal_position;
    `;
    
    const result = await client.query(schemaQuery);
    
    console.log('\n📋 Actual lats_product_variants Table Schema:\n');
    console.log('='.repeat(80));
    result.rows.forEach(col => {
      console.log(`  ${col.column_name.padEnd(30)} | ${col.data_type.padEnd(20)} | ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    console.log('='.repeat(80));
    
    // Now get actual data with the correct column names
    const dataQuery = `SELECT * FROM lats_product_variants ORDER BY created_at`;
    const dataResult = await client.query(dataQuery);
    
    console.log(`\n📊 Found ${dataResult.rows.length} variants\n`);
    
    if (dataResult.rows.length > 0) {
      console.log('Sample record (first variant):');
      console.log(JSON.stringify(dataResult.rows[0], null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkSchema();

