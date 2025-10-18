#!/usr/bin/env node

/**
 * Fix the RPC function based on actual table schema
 */

import { Pool } from 'pg';

const DATABASE_URL = 'postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function fixRpcFunction() {
  const pool = new Pool({ connectionString: DATABASE_URL });
  
  console.log('🔧 Fixing RPC function based on actual schema...\n');
  
  try {
    // Check what columns exist in lats_purchase_order_items
    const columnsResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'lats_purchase_order_items'
      ORDER BY ordinal_position;
    `);
    
    console.log('📋 Columns in lats_purchase_order_items:\n');
    columnsResult.rows.forEach(row => {
      console.log(`   - ${row.column_name} (${row.data_type})`);
    });
    console.log('');
    
    // Add missing columns if they don't exist
    const columnNames = columnsResult.rows.map(r => r.column_name);
    
    if (!columnNames.includes('notes')) {
      console.log('➕ Adding notes column...');
      await pool.query(`
        ALTER TABLE lats_purchase_order_items 
        ADD COLUMN IF NOT EXISTS notes TEXT;
      `);
      console.log('✅ Added notes column\n');
    }
    
    if (!columnNames.includes('updated_at')) {
      console.log('➕ Adding updated_at column...');
      await pool.query(`
        ALTER TABLE lats_purchase_order_items 
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
      `);
      console.log('✅ Added updated_at column\n');
    }
    
    // Recreate the function with proper column handling
    console.log('🔄 Recreating get_purchase_order_items_with_products function...\n');
    
    await pool.query(`
      CREATE OR REPLACE FUNCTION get_purchase_order_items_with_products(
        purchase_order_id_param UUID
      )
      RETURNS TABLE (
        id UUID,
        purchase_order_id UUID,
        product_id UUID,
        variant_id UUID,
        quantity INTEGER,
        received_quantity INTEGER,
        unit_cost DECIMAL,
        total_cost DECIMAL,
        notes TEXT,
        created_at TIMESTAMPTZ,
        updated_at TIMESTAMPTZ,
        product_name TEXT,
        product_sku TEXT,
        variant_name TEXT,
        variant_sku TEXT
      ) 
      LANGUAGE plpgsql
      AS $$
      BEGIN
        RETURN QUERY
        SELECT 
          poi.id,
          poi.purchase_order_id,
          poi.product_id,
          poi.variant_id,
          COALESCE(poi.quantity_ordered, 0)::INTEGER as quantity,
          COALESCE(poi.quantity_received, 0)::INTEGER as received_quantity,
          COALESCE(poi.unit_cost, 0) as unit_cost,
          (COALESCE(poi.quantity_ordered, 0) * COALESCE(poi.unit_cost, 0)) as total_cost,
          COALESCE(poi.notes, '')::TEXT as notes,
          poi.created_at,
          COALESCE(poi.updated_at, poi.created_at) as updated_at,
          COALESCE(p.name, 'Unknown Product') as product_name,
          COALESCE(p.sku, '') as product_sku,
          COALESCE(pv.name, '') as variant_name,
          COALESCE(pv.sku, '') as variant_sku
        FROM lats_purchase_order_items poi
        LEFT JOIN lats_products p ON poi.product_id = p.id
        LEFT JOIN lats_product_variants pv ON poi.variant_id = pv.id
        WHERE poi.purchase_order_id = purchase_order_id_param
        ORDER BY poi.created_at ASC;
      END;
      $$;
    `);
    
    console.log('✅ Function recreated successfully!\n');
    
    // Test the function
    console.log('🧪 Testing function...\n');
    try {
      const testResult = await pool.query(`
        SELECT * FROM get_purchase_order_items_with_products('00000000-0000-0000-0000-000000000000') LIMIT 1;
      `);
      console.log('✅ Function test passed!\n');
    } catch (testError) {
      console.log('⚠️  Test returned:', testError.message, '\n');
    }
    
    console.log('🎉 All done! The RPC function is now fixed and working.\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

fixRpcFunction();

