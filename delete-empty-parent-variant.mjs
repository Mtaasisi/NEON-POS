#!/usr/bin/env node
/**
 * Delete the empty parent variant after IMEI variants are created
 */

import pg from 'pg';
import { config } from 'dotenv';

config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.VITE_DATABASE_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function deleteEmptyParentVariant() {
  const client = await pool.connect();
  
  try {
    console.log('🗑️  Deleting empty parent variant "128GB"...\n');

    // Find the parent variant
    const findQuery = `
      SELECT id, name, sku, quantity, product_id
      FROM lats_product_variants
      WHERE sku = 'SKU-1761244859910-59R-V01'
        AND name = '128GB'
        AND quantity = 0
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
    
    // Check if there are IMEI child variants
    const childrenQuery = `
      SELECT COUNT(*) as count
      FROM lats_product_variants
      WHERE variant_attributes->>'parent_variant_id' = $1
    `;
    
    const childrenResult = await client.query(childrenQuery, [parentVariant.id]);
    const childCount = parseInt(childrenResult.rows[0].count);
    
    console.log(`\n✅ Found ${childCount} IMEI child variant(s) linked to this parent`);
    
    if (childCount === 0) {
      console.log('⚠️  Warning: No child variants found. Skipping deletion.');
      return;
    }

    // Soft delete the parent variant (set is_active = false)
    const deleteQuery = `
      UPDATE lats_product_variants
      SET 
        is_active = false,
        updated_at = NOW()
      WHERE id = $1
      RETURNING id, name, is_active
    `;
    
    const deleteResult = await client.query(deleteQuery, [parentVariant.id]);
    
    if (deleteResult.rows.length > 0) {
      console.log('\n✅ Successfully deactivated parent variant!');
      console.log(`   The IMEI child variants remain active and functional.`);
      console.log(`   The parent variant will no longer appear in the UI.`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    pool.end();
  }
}

deleteEmptyParentVariant();
