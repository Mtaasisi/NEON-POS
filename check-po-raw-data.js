#!/usr/bin/env node

import pkg from 'pg';
const { Pool } = pkg;
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.VITE_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkRawData() {
  const client = await pool.connect();
  
  try {
    console.log('\n🔍 RAW DATA for PO-1760984114920\n');
    console.log('='.repeat(100));

    // Get PO ID first
    const poIdQuery = `SELECT id FROM lats_purchase_orders WHERE po_number = 'PO-1760984114920'`;
    const poIdResult = await client.query(poIdQuery);
    
    if (poIdResult.rows.length === 0) {
      console.log('PO not found');
      return;
    }
    
    const poId = poIdResult.rows[0].id;
    console.log(`\nPO ID: ${poId}\n`);

    // Get ALL columns from purchase_order_items
    const itemsQuery = `SELECT * FROM lats_purchase_order_items WHERE purchase_order_id = $1`;
    const itemsResult = await client.query(itemsQuery, [poId]);
    
    console.log('📦 PURCHASE ORDER ITEMS (ALL COLUMNS):');
    console.log('='.repeat(100));
    
    if (itemsResult.rows.length === 0) {
      console.log('No items found');
    } else {
      itemsResult.rows.forEach((item, i) => {
        console.log(`\n--- Item ${i + 1} ---`);
        console.log(JSON.stringify(item, null, 2));
      });
    }

    // Get the table schema to see what columns exist
    const schemaQuery = `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'lats_purchase_order_items'
      ORDER BY ordinal_position
    `;
    const schemaResult = await client.query(schemaQuery);
    
    console.log('\n\n📋 TABLE SCHEMA (lats_purchase_order_items):');
    console.log('='.repeat(100));
    schemaResult.rows.forEach(col => {
      console.log(`   ${col.column_name.padEnd(30)} - ${col.data_type}`);
    });

    console.log('\n' + '='.repeat(100));
    console.log('✅ Check Complete!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkRawData();

