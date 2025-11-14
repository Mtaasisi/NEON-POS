#!/usr/bin/env node
// Sync po_number to order_number for consistency
import { config } from 'dotenv';
import { Pool } from '@neondatabase/serverless';

config();
const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found');
  process.exit(1);
}

async function syncOrderNumbers() {
  const pool = new Pool({ connectionString: DATABASE_URL });
  
  try {
    console.log('🔧 Syncing po_number to order_number column...\n');
    
    // Check current state
    const checkResult = await pool.query(`
      SELECT 
        id,
        po_number,
        order_number,
        status
      FROM lats_purchase_orders
      WHERE order_number IS NULL OR order_number != po_number
    `);
    
    if (checkResult.rows.length === 0) {
      console.log('✅ All order numbers are already in sync!');
      return;
    }
    
    console.log(`📦 Found ${checkResult.rows.length} orders to sync:\n`);
    
    checkResult.rows.forEach((row, index) => {
      console.log(`${index + 1}. Order ID: ${row.id.substring(0, 8)}...`);
      console.log(`   Current po_number: ${row.po_number}`);
      console.log(`   Current order_number: ${row.order_number || 'NULL'}`);
      console.log('');
    });
    
    // Sync po_number to order_number
    const updateResult = await pool.query(`
      UPDATE lats_purchase_orders
      SET order_number = po_number
      WHERE order_number IS NULL OR order_number != po_number
      RETURNING id, po_number, order_number
    `);
    
    console.log(`✅ Successfully synced ${updateResult.rows.length} order numbers!\n`);
    
    updateResult.rows.forEach((row, index) => {
      console.log(`${index + 1}. Synced: ${row.order_number}`);
    });
    
    // Verify
    const verifyResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM lats_purchase_orders
      WHERE order_number IS NULL
    `);
    
    const remainingNull = parseInt(verifyResult.rows[0].count);
    
    if (remainingNull === 0) {
      console.log('\n✅ Verification: All order numbers are now populated!');
    } else {
      console.log(`\n⚠️  Warning: ${remainingNull} orders still have NULL order_number`);
    }
    
    console.log('\n🎉 Done! The order numbers should now be visible in your app.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nFull error:', error);
  } finally {
    await pool.end();
  }
}

syncOrderNumbers();

