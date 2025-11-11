#!/usr/bin/env node

/**
 * Simple script to delete suppliers from database
 * Usage:
 *   node delete-suppliers-simple.mjs all          - Delete ALL suppliers (hard delete)
 *   node delete-suppliers-simple.mjs inactive     - Delete only inactive suppliers
 *   node delete-suppliers-simple.mjs soft         - Soft delete all (mark as inactive)
 */

import { Pool } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL not found');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

const command = process.argv[2]?.toLowerCase();

async function deleteSuppliers() {
  try {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🗑️  SUPPLIER DELETION');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (!command || !['all', 'inactive', 'soft'].includes(command)) {
      console.log('Usage:');
      console.log('  node delete-suppliers-simple.mjs all       - Delete ALL suppliers');
      console.log('  node delete-suppliers-simple.mjs inactive  - Delete inactive suppliers');
      console.log('  node delete-suppliers-simple.mjs soft      - Soft delete (mark inactive)');
      console.log('');
      await pool.end();
      return;
    }

    // Show current suppliers
    const current = await pool.query('SELECT * FROM lats_suppliers ORDER BY name');
    console.log(`Current suppliers (${current.rows.length} total):\n`);
    current.rows.forEach(s => {
      const status = s.is_active ? '✅ Active' : '❌ Inactive';
      console.log(`  • ${s.name} - ${status}`);
    });
    console.log('');

    let result;
    
    switch (command) {
      case 'all':
        console.log('⚠️  DELETING ALL SUPPLIERS (PERMANENT)...\n');
        
        // Check references
        const refs = await pool.query(`
          SELECT 
            (SELECT COUNT(*) FROM lats_products WHERE supplier_id IS NOT NULL) as products,
            (SELECT COUNT(*) FROM lats_purchase_orders WHERE supplier_id IS NOT NULL) as purchase_orders
        `);
        
        const { products, purchase_orders } = refs.rows[0];
        
        if (parseInt(products) > 0 || parseInt(purchase_orders) > 0) {
          console.log('⚠️  WARNING: Suppliers are referenced in:');
          if (parseInt(products) > 0) console.log(`   - ${products} product(s)`);
          if (parseInt(purchase_orders) > 0) console.log(`   - ${purchase_orders} purchase order(s)`);
          console.log('   These references will be set to NULL.\n');
        }
        
        result = await pool.query('DELETE FROM lats_suppliers RETURNING *');
        console.log(`✅ Deleted ${result.rows.length} supplier(s).\n`);
        break;

      case 'inactive':
        const inactive = await pool.query('SELECT * FROM lats_suppliers WHERE is_active = false');
        
        if (inactive.rows.length === 0) {
          console.log('⚠️  No inactive suppliers found.\n');
        } else {
          console.log('Deleting inactive suppliers:\n');
          inactive.rows.forEach(s => console.log(`  • ${s.name}`));
          console.log('');
          
          result = await pool.query('DELETE FROM lats_suppliers WHERE is_active = false RETURNING *');
          console.log(`✅ Deleted ${result.rows.length} inactive supplier(s).\n`);
        }
        break;

      case 'soft':
        console.log('Marking all suppliers as inactive...\n');
        result = await pool.query('UPDATE lats_suppliers SET is_active = false RETURNING *');
        console.log(`✅ Marked ${result.rows.length} supplier(s) as inactive.\n`);
        break;
    }

    // Show remaining suppliers
    const remaining = await pool.query('SELECT * FROM lats_suppliers ORDER BY name');
    console.log(`\nRemaining suppliers: ${remaining.rows.length}`);
    if (remaining.rows.length > 0) {
      remaining.rows.forEach(s => {
        const status = s.is_active ? '✅ Active' : '❌ Inactive';
        console.log(`  • ${s.name} - ${status}`);
      });
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Done');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

deleteSuppliers();

