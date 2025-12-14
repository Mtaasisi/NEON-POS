#!/usr/bin/env node
import { Pool } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
dotenv.config();

import ws from 'ws';
import { neonConfig } from '@neondatabase/serverless';
neonConfig.webSocketConstructor = ws;

const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;
const pool = new Pool({ connectionString: DATABASE_URL });

async function checkSchema() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'lats_products' 
      ORDER BY ordinal_position;
    `);
    
    console.log('📋 lats_products table columns:\n');
    result.rows.forEach(row => {
      console.log(`   ${row.column_name} (${row.data_type})`);
    });
    
    // Also check for variant-related columns
    console.log('\n🔍 Variant-related columns:');
    const variantCols = result.rows.filter(r => 
      r.column_name.toLowerCase().includes('variant') || 
      r.column_name.toLowerCase().includes('parent')
    );
    
    if (variantCols.length > 0) {
      variantCols.forEach(col => {
        console.log(`   ✅ ${col.column_name} (${col.data_type})`);
      });
    } else {
      console.log('   ❌ No variant-related columns found');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkSchema();








