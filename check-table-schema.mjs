#!/usr/bin/env node

import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';

config();

const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;
const sql = neon(DATABASE_URL);

async function checkSchema() {
  try {
    // Check payment_transactions schema
    const ptSchema = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'payment_transactions'
      ORDER BY ordinal_position
    `;
    
    console.log('📊 payment_transactions columns:');
    ptSchema.forEach(col => console.log(`   - ${col.column_name} (${col.data_type})`));
    
    console.log('\n');
    
    // Check purchase_order_payments schema  
    const popSchema = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'purchase_order_payments'
      ORDER BY ordinal_position
    `;
    
    console.log('📦 purchase_order_payments columns:');
    popSchema.forEach(col => console.log(`   - ${col.column_name} (${col.data_type})`));
    
  } catch (err) {
    console.error('Error:', err.message);
  }
}

checkSchema();

