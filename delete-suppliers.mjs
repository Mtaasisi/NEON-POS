#!/usr/bin/env node

/**
 * Script to delete suppliers from the database
 * Provides options to:
 * 1. Delete all suppliers
 * 2. Delete only inactive suppliers
 * 3. Delete specific suppliers by name/ID
 * 4. Soft delete (mark as inactive)
 */

import { Pool } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import readline from 'readline';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

// Get database URL from environment
const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL or VITE_DATABASE_URL not found in .env file');
  process.exit(1);
}

// Create database pool
const pool = new Pool({ connectionString: DATABASE_URL });

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function showMenu() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🗑️  SUPPLIER DELETION OPTIONS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('1. Delete ALL suppliers (⚠️  DANGEROUS - Hard Delete)');
  console.log('2. Delete only INACTIVE suppliers (Hard Delete)');
  console.log('3. Soft delete ALL suppliers (Mark as inactive)');
  console.log('4. Soft delete only INACTIVE suppliers (No change)');
  console.log('5. Delete specific supplier by name');
  console.log('6. Show current suppliers');
  console.log('0. Exit\n');
}

async function showCurrentSuppliers() {
  console.log('\n📦 Current Suppliers:\n');
  
  const result = await pool.query(`
    SELECT 
      id,
      name,
      contact_person,
      email,
      phone,
      is_active,
      is_trade_in_customer
    FROM lats_suppliers
    ORDER BY name;
  `);
  
  if (result.rows.length === 0) {
    console.log('⚠️  No suppliers found.\n');
    return [];
  }
  
  result.rows.forEach((supplier, index) => {
    const status = supplier.is_active ? '✅ Active' : '❌ Inactive';
    const tradeIn = supplier.is_trade_in_customer ? ' (Trade-in)' : '';
    console.log(`${index + 1}. ${supplier.name} - ${status}${tradeIn}`);
    console.log(`   ID: ${supplier.id}`);
    console.log(`   Contact: ${supplier.contact_person || 'N/A'}`);
    console.log(`   Email: ${supplier.email || 'N/A'}`);
    console.log('');
  });
  
  return result.rows;
}

async function checkSupplierReferences(supplierId) {
  // Check products
  const products = await pool.query(
    'SELECT COUNT(*) as count FROM lats_products WHERE supplier_id = $1',
    [supplierId]
  );
  
  // Check purchase orders
  const purchaseOrders = await pool.query(
    'SELECT COUNT(*) as count FROM lats_purchase_orders WHERE supplier_id = $1',
    [supplierId]
  );
  
  return {
    products: parseInt(products.rows[0].count),
    purchaseOrders: parseInt(purchaseOrders.rows[0].count)
  };
}

async function deleteAllSuppliers(hardDelete = true) {
  try {
    const confirmMsg = hardDelete 
      ? 'Are you ABSOLUTELY SURE you want to PERMANENTLY DELETE ALL suppliers? (yes/no): '
      : 'Are you sure you want to mark all suppliers as inactive? (yes/no): ';
    
    const confirm = await askQuestion(confirmMsg);
    
    if (confirm.toLowerCase() !== 'yes') {
      console.log('\n❌ Operation cancelled.\n');
      return;
    }
    
    if (hardDelete) {
      // Check for references
      const refs = await pool.query(`
        SELECT 
          (SELECT COUNT(*) FROM lats_products WHERE supplier_id IS NOT NULL) as products,
          (SELECT COUNT(*) FROM lats_purchase_orders WHERE supplier_id IS NOT NULL) as purchase_orders
      `);
      
      const { products, purchase_orders } = refs.rows[0];
      
      if (parseInt(products) > 0 || parseInt(purchase_orders) > 0) {
        console.log('\n⚠️  WARNING: Some suppliers are referenced in:');
        if (parseInt(products) > 0) {
          console.log(`   - ${products} product(s)`);
        }
        if (parseInt(purchase_orders) > 0) {
          console.log(`   - ${purchase_orders} purchase order(s)`);
        }
        console.log('\nDeleting suppliers will set these references to NULL.\n');
        
        const confirmRefs = await askQuestion('Continue anyway? (yes/no): ');
        if (confirmRefs.toLowerCase() !== 'yes') {
          console.log('\n❌ Operation cancelled.\n');
          return;
        }
      }
      
      const result = await pool.query('DELETE FROM lats_suppliers RETURNING *');
      console.log(`\n✅ Successfully deleted ${result.rows.length} supplier(s).\n`);
    } else {
      const result = await pool.query('UPDATE lats_suppliers SET is_active = false RETURNING *');
      console.log(`\n✅ Successfully marked ${result.rows.length} supplier(s) as inactive.\n`);
    }
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

async function deleteInactiveSuppliers(hardDelete = true) {
  try {
    // Get inactive suppliers
    const inactive = await pool.query(
      'SELECT * FROM lats_suppliers WHERE is_active = false'
    );
    
    if (inactive.rows.length === 0) {
      console.log('\n⚠️  No inactive suppliers found.\n');
      return;
    }
    
    console.log(`\nFound ${inactive.rows.length} inactive supplier(s):`);
    inactive.rows.forEach(s => console.log(`  - ${s.name}`));
    
    const confirmMsg = hardDelete
      ? '\nAre you sure you want to PERMANENTLY DELETE these inactive suppliers? (yes/no): '
      : '\nThese suppliers are already inactive. No action needed. Continue? (yes/no): ';
    
    const confirm = await askQuestion(confirmMsg);
    
    if (confirm.toLowerCase() !== 'yes') {
      console.log('\n❌ Operation cancelled.\n');
      return;
    }
    
    if (hardDelete) {
      const result = await pool.query(
        'DELETE FROM lats_suppliers WHERE is_active = false RETURNING *'
      );
      console.log(`\n✅ Successfully deleted ${result.rows.length} inactive supplier(s).\n`);
    } else {
      console.log('\n✅ No changes made (suppliers already inactive).\n');
    }
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

async function deleteSupplierByName() {
  try {
    const suppliers = await showCurrentSuppliers();
    
    if (suppliers.length === 0) {
      return;
    }
    
    const name = await askQuestion('\nEnter supplier name to delete (or press Enter to cancel): ');
    
    if (!name.trim()) {
      console.log('\n❌ Operation cancelled.\n');
      return;
    }
    
    const supplier = await pool.query(
      'SELECT * FROM lats_suppliers WHERE LOWER(name) = LOWER($1)',
      [name.trim()]
    );
    
    if (supplier.rows.length === 0) {
      console.log(`\n⚠️  Supplier "${name}" not found.\n`);
      return;
    }
    
    const found = supplier.rows[0];
    console.log(`\nFound supplier: ${found.name}`);
    console.log(`ID: ${found.id}`);
    console.log(`Status: ${found.is_active ? 'Active' : 'Inactive'}`);
    
    // Check references
    const refs = await checkSupplierReferences(found.id);
    
    if (refs.products > 0 || refs.purchaseOrders > 0) {
      console.log('\n⚠️  This supplier is referenced in:');
      if (refs.products > 0) {
        console.log(`   - ${refs.products} product(s)`);
      }
      if (refs.purchaseOrders > 0) {
        console.log(`   - ${refs.purchaseOrders} purchase order(s)`);
      }
      console.log('\nDeleting this supplier will set these references to NULL.');
    }
    
    console.log('\nChoose deletion type:');
    console.log('1. Hard delete (permanent)');
    console.log('2. Soft delete (mark as inactive)');
    console.log('0. Cancel');
    
    const choice = await askQuestion('\nYour choice: ');
    
    if (choice === '1') {
      const confirm = await askQuestion('\nConfirm PERMANENT deletion? (yes/no): ');
      if (confirm.toLowerCase() === 'yes') {
        await pool.query('DELETE FROM lats_suppliers WHERE id = $1', [found.id]);
        console.log(`\n✅ Successfully deleted supplier "${found.name}".\n`);
      } else {
        console.log('\n❌ Operation cancelled.\n');
      }
    } else if (choice === '2') {
      await pool.query('UPDATE lats_suppliers SET is_active = false WHERE id = $1', [found.id]);
      console.log(`\n✅ Successfully marked supplier "${found.name}" as inactive.\n`);
    } else {
      console.log('\n❌ Operation cancelled.\n');
    }
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

async function main() {
  console.log('\n🚀 Supplier Deletion Tool\n');
  
  let exit = false;
  
  while (!exit) {
    await showMenu();
    const choice = await askQuestion('Select an option: ');
    
    switch (choice) {
      case '1':
        await deleteAllSuppliers(true);
        break;
      case '2':
        await deleteInactiveSuppliers(true);
        break;
      case '3':
        await deleteAllSuppliers(false);
        break;
      case '4':
        await deleteInactiveSuppliers(false);
        break;
      case '5':
        await deleteSupplierByName();
        break;
      case '6':
        await showCurrentSuppliers();
        break;
      case '0':
        exit = true;
        console.log('\n👋 Goodbye!\n');
        break;
      default:
        console.log('\n❌ Invalid option. Please try again.\n');
    }
  }
  
  rl.close();
  await pool.end();
}

// Run the script
main().catch(error => {
  console.error('Fatal error:', error);
  rl.close();
  pool.end();
  process.exit(1);
});

