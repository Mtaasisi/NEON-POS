#!/usr/bin/env node

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;
const sql = neon(DATABASE_URL);

async function testOptimizedQuery() {
  try {
    console.log('🔍 Testing optimized query (without JSONB columns)...');
    
    const start = Date.now();
    const result = await sql`
      SELECT 
        id, name, description, sku, barcode, category_id, supplier_id,
        unit_price, cost_price, stock_quantity, min_stock_level, max_stock_level,
        is_active, image_url, brand, model, warranty_period,
        created_at, updated_at, specification, condition, selling_price,
        total_quantity, total_value, storage_room_id, store_shelf_id
      FROM lats_products 
      ORDER BY created_at DESC
    `;
    const duration = Date.now() - start;
    
    console.log(`✅ Optimized query: ${result.length} products in ${duration}ms`);
    console.log(`\n📋 First 5 products:`);
    result.slice(0, 5).forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.name} (${p.sku})`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testOptimizedQuery();
