#!/usr/bin/env node
/**
 * Permanently delete the empty parent variant
 */

import pg from 'pg';
import { config } from 'dotenv';

config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.VITE_DATABASE_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function permanentDeleteParentVariant() {
  const client = await pool.connect();
  
  try {
    console.log('🗑️  Permanently deleting parent variant "128GB"...\n');

    // Find the parent variant
    const findQuery = `
      SELECT id, name, sku, quantity, product_id, is_active
      FROM lats_product_variants
      WHERE sku = 'SKU-1761244859910-59R-V01'
        AND name = '128GB'
    `;
    
    const findResult = await client.query(findQuery);
    
    if (findResult.rows.length === 0) {
      console.log('⚠️  Parent variant not found or already deleted');
      return;
    }

    const parentVariant = findResult.rows[0];
    console.log('✅ Found parent variant:');
    console.log(`   ID: ${parentVariant.id}`);
    console.log(`   Name: ${parentVariant.name}`);
    console.log(`   SKU: ${parentVariant.sku}`);
    console.log(`   Quantity: ${parentVariant.quantity}`);
    console.log(`   Active: ${parentVariant.is_active}`);
    
    // Check if there are IMEI child variants
    const childrenQuery = `
      SELECT id, name, variant_attributes->>'imei' as imei
      FROM lats_product_variants
      WHERE variant_attributes->>'parent_variant_id' = $1
        AND is_active = true
    `;
    
    const childrenResult = await client.query(childrenQuery, [parentVariant.id]);
    const children = childrenResult.rows;
    
    console.log(`\n✅ Found ${children.length} IMEI child variant(s):`);
    children.forEach((child, idx) => {
      console.log(`   ${idx + 1}. ${child.name} (IMEI: ${child.imei})`);
    });

    // BEGIN TRANSACTION
    await client.query('BEGIN');

    try {
      // 1. Check for purchase order references
      const poRefsQuery = `
        SELECT id, purchase_order_id
        FROM lats_purchase_order_items
        WHERE variant_id = $1
      `;
      const poRefs = await client.query(poRefsQuery, [parentVariant.id]);
      
      if (poRefs.rows.length > 0) {
        console.log(`\n⚠️  Found ${poRefs.rows.length} purchase order item(s) referencing this variant`);
        
        // Update PO items to remove variant reference (set to NULL)
        const updatePOQuery = `
          UPDATE lats_purchase_order_items
          SET variant_id = NULL
          WHERE variant_id = $1
          RETURNING id
        `;
        const updateResult = await client.query(updatePOQuery, [parentVariant.id]);
        console.log(`✅ Updated ${updateResult.rows.length} PO item(s) - removed variant reference`);
      }

      // 2. Delete stock movements for this variant
      const deleteMovementsQuery = `
        DELETE FROM lats_stock_movements
        WHERE variant_id = $1
        RETURNING id
      `;
      const movementsResult = await client.query(deleteMovementsQuery, [parentVariant.id]);
      console.log(`✅ Deleted ${movementsResult.rows.length} stock movement(s)`);

      // 3. Delete the parent variant permanently
      const deleteQuery = `
        DELETE FROM lats_product_variants
        WHERE id = $1
        RETURNING id, name
      `;
      
      const deleteResult = await client.query(deleteQuery, [parentVariant.id]);
      
      if (deleteResult.rows.length > 0) {
        console.log(`\n✅ Permanently deleted parent variant "${deleteResult.rows[0].name}"`);
      }

      // COMMIT TRANSACTION
      await client.query('COMMIT');
      
      console.log('\n🎉 Success! Parent variant permanently deleted from database.');
      console.log(`   IMEI child variants remain active and functional.`);
      console.log(`   Purchase order references updated.`);
      
    } catch (error) {
      // ROLLBACK on error
      await client.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    client.release();
    pool.end();
  }
}

permanentDeleteParentVariant();
