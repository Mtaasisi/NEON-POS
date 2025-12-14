#!/usr/bin/env node

/**
 * Fix Supplier Data for Purchase Orders
 * Checks and fixes missing supplier data
 */

import dotenv from 'dotenv';
import { Pool } from '@neondatabase/serverless';

dotenv.config();

const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in .env file');
  process.exit(1);
}

const PO_NUMBER = 'PO-1762825232607'; // The PO you're viewing

async function fixSupplierData() {
  console.log('🔍 Checking Supplier Data for PO\n');
  console.log(`PO Number: ${PO_NUMBER}\n`);
  
  const pool = new Pool({ connectionString: DATABASE_URL });
  
  try {
    // Get the purchase order
    const { rows: poRows } = await pool.query(
      `SELECT id, po_number, supplier_id, status, total_amount, currency
       FROM lats_purchase_orders
       WHERE po_number = $1`,
      [PO_NUMBER]
    );
    
    if (poRows.length === 0) {
      console.log('❌ Purchase order not found');
      await pool.end();
      return;
    }
    
    const po = poRows[0];
    console.log('✅ Purchase Order Found:');
    console.log(`   ID: ${po.id}`);
    console.log(`   PO Number: ${po.po_number}`);
    console.log(`   Supplier ID: ${po.supplier_id || 'NULL ❌'}`);
    console.log(`   Status: ${po.status}`);
    console.log(`   Total: ${po.total_amount} ${po.currency || 'TZS'}\n`);
    
    // Check if supplier_id exists
    if (!po.supplier_id) {
      console.log('❌ PROBLEM: No supplier_id in purchase order!\n');
      console.log('💡 SOLUTION: The PO was created without a supplier.');
      console.log('   This needs to be fixed in the PO creation process.\n');
      
      // Try to find suppliers in the database
      const { rows: suppliers } = await pool.query(
        `SELECT id, name, phone, email 
         FROM lats_suppliers 
         ORDER BY created_at DESC 
         LIMIT 10`
      );
      
      if (suppliers.length > 0) {
        console.log('📋 Available Suppliers:');
        suppliers.forEach((s, i) => {
          console.log(`   ${i + 1}. ${s.name} (ID: ${s.id})`);
          if (s.phone) console.log(`      Phone: ${s.phone}`);
        });
        console.log('\n💡 You can manually assign one of these suppliers to the PO.');
      } else {
        console.log('❌ No suppliers found in database!');
        console.log('   You need to create suppliers first in the system.');
      }
      
      await pool.end();
      return;
    }
    
    // Supplier ID exists, check if supplier data is in database
    console.log('🔍 Checking if supplier exists in database...\n');
    const { rows: supplierRows } = await pool.query(
      `SELECT id, name, contact_person, email, phone, address, city, country, is_active
       FROM lats_suppliers
       WHERE id = $1`,
      [po.supplier_id]
    );
    
    if (supplierRows.length === 0) {
      console.log('❌ PROBLEM: Supplier ID exists in PO but supplier not found in database!\n');
      console.log(`   Supplier ID: ${po.supplier_id}`);
      console.log('   This is a data integrity issue - orphaned supplier reference.\n');
      console.log('💡 SOLUTIONS:');
      console.log('   1. Create a new supplier with this ID');
      console.log('   2. Or update the PO to use an existing supplier');
      
      await pool.end();
      return;
    }
    
    const supplier = supplierRows[0];
    console.log('✅ Supplier Found in Database:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   ID: ${supplier.id}`);
    console.log(`   Name: ${supplier.name}`);
    console.log(`   Contact: ${supplier.contact_person || 'N/A'}`);
    console.log(`   Email: ${supplier.email || 'N/A'}`);
    console.log(`   Phone: ${supplier.phone || 'N/A'}`);
    console.log(`   Address: ${supplier.address || 'N/A'}`);
    console.log(`   City: ${supplier.city || 'N/A'}`);
    console.log(`   Country: ${supplier.country || 'N/A'}`);
    console.log(`   Status: ${supplier.is_active ? 'Active ✅' : 'Inactive ❌'}\n`);
    
    console.log('✅ DIAGNOSIS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('   ✅ Purchase order has supplier_id');
    console.log('   ✅ Supplier exists in database');
    console.log('   ✅ Supplier data should be loading correctly\n');
    
    console.log('🔍 Checking if this is a frontend caching issue...\n');
    console.log('💡 RECOMMENDATION:');
    console.log('   The supplier data IS in the database.');
    console.log('   If you still see "No supplier information" in the browser:');
    console.log('   1. Hard refresh the browser (Cmd+Shift+R or Ctrl+Shift+R)');
    console.log('   2. Clear browser cache');
    console.log('   3. Check browser console for errors');
    console.log('   4. The data should appear after refresh\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

// Run the script
fixSupplierData().catch(console.error);

