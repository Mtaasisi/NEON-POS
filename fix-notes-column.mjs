#!/usr/bin/env node

/**
 * Fix the notes column issue in get_purchase_order_items_with_products function
 */

import { Pool } from 'pg';

const DATABASE_URL = 'postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function fixNotesColumn() {
  const pool = new Pool({ connectionString: DATABASE_URL });
  
  console.log('🔧 Fixing notes column in RPC function...\n');
  
  try {
    // First check if notes column exists
    const checkColumn = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'lats_purchase_order_items' 
        AND column_name = 'notes';
    `);
    
    if (checkColumn.rows.length === 0) {
      console.log('📝 Adding notes column to lats_purchase_order_items...\n');
      await pool.query(`
        ALTER TABLE lats_purchase_order_items 
        ADD COLUMN IF NOT EXISTS notes TEXT;
      `);
      console.log('✅ Notes column added!\n');
    } else {
      console.log('✅ Notes column already exists!\n');
    }
    
    // Recreate the function with proper column handling
    console.log('🔄 Updating get_purchase_order_items_with_products function...\n');
    
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
          poi.quantity_ordered::INTEGER as quantity,
          COALESCE(poi.quantity_received, 0)::INTEGER as received_quantity,
          poi.unit_cost,
          (poi.quantity_ordered * poi.unit_cost) as total_cost,
          COALESCE(poi.notes, '')::TEXT as notes,
          poi.created_at,
          poi.updated_at,
          p.name as product_name,
          p.sku as product_sku,
          pv.name as variant_name,
          pv.sku as variant_sku
        FROM lats_purchase_order_items poi
        LEFT JOIN lats_products p ON poi.product_id = p.id
        LEFT JOIN lats_product_variants pv ON poi.variant_id = pv.id
        WHERE poi.purchase_order_id = purchase_order_id_param
        ORDER BY poi.created_at ASC;
      END;
      $$;
    `);
    
    console.log('✅ Function updated successfully!\n');
    
    // Test the function
    console.log('🧪 Testing function...\n');
    const testResult = await pool.query(`
      SELECT * FROM get_purchase_order_items_with_products('00000000-0000-0000-0000-000000000000') LIMIT 1;
    `);
    
    console.log('✅ Function test passed (0 rows expected for test UUID)\n');
    
    console.log('🎉 All done! The notes column issue is fixed.\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

fixNotesColumn();

