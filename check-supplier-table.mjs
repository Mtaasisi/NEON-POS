#!/usr/bin/env node

/**
 * Script to check the supplier table in the database
 * This script will display:
 * 1. Table structure (columns and their types)
 * 2. All records in the supplier table
 * 3. Statistics (total count, active vs inactive)
 */

import { Pool } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

// Get database URL from environment
const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL or VITE_DATABASE_URL not found in .env file');
  console.error('Please set the database connection string in your .env file');
  process.exit(1);
}

// Create database pool
const pool = new Pool({ connectionString: DATABASE_URL });

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📊 SUPPLIER TABLE ANALYSIS');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

async function checkSupplierTable() {
  try {
    console.log('🔍 Step 1: Checking if table exists...\n');
    
    // Check if table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'lats_suppliers'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log('❌ Table "lats_suppliers" does not exist in the database!');
      await pool.end();
      return;
    }
    
    console.log('✅ Table "lats_suppliers" exists\n');
    
    // Get table structure
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Step 2: Table Structure (Columns)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const structureQuery = await pool.query(`
      SELECT 
        column_name,
        data_type,
        character_maximum_length,
        column_default,
        is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' 
      AND table_name = 'lats_suppliers'
      ORDER BY ordinal_position;
    `);
    
    console.table(structureQuery.rows.map(row => ({
      'Column': row.column_name,
      'Type': row.character_maximum_length 
        ? `${row.data_type}(${row.character_maximum_length})` 
        : row.data_type,
      'Nullable': row.is_nullable,
      'Default': row.column_default || 'N/A'
    })));
    
    // Get total count
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Step 3: Statistics');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN is_active = true THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN is_active = false THEN 1 ELSE 0 END) as inactive,
        SUM(CASE WHEN is_trade_in_customer = true THEN 1 ELSE 0 END) as trade_in_customers
      FROM lats_suppliers;
    `);
    
    const { total, active, inactive, trade_in_customers } = stats.rows[0];
    
    console.log(`Total Suppliers:           ${total}`);
    console.log(`Active Suppliers:          ${active}`);
    console.log(`Inactive Suppliers:        ${inactive}`);
    console.log(`Trade-in Customers:        ${trade_in_customers}`);
    
    // Get all suppliers
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📦 Step 4: All Supplier Records');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const suppliers = await pool.query(`
      SELECT 
        id,
        name,
        contact_person,
        email,
        phone,
        address,
        city,
        country,
        is_active,
        is_trade_in_customer,
        created_at
      FROM lats_suppliers
      ORDER BY created_at DESC;
    `);
    
    if (suppliers.rows.length === 0) {
      console.log('⚠️ No suppliers found in the database.\n');
    } else {
      console.log(`Found ${suppliers.rows.length} supplier(s):\n`);
      
      suppliers.rows.forEach((supplier, index) => {
        console.log(`${index + 1}. ${supplier.name}`);
        console.log(`   ID: ${supplier.id}`);
        console.log(`   Contact: ${supplier.contact_person || 'N/A'}`);
        console.log(`   Email: ${supplier.email || 'N/A'}`);
        console.log(`   Phone: ${supplier.phone || 'N/A'}`);
        console.log(`   Address: ${supplier.address || 'N/A'}`);
        console.log(`   City: ${supplier.city || 'N/A'}`);
        console.log(`   Country: ${supplier.country || 'N/A'}`);
        console.log(`   Status: ${supplier.is_active ? '✅ Active' : '❌ Inactive'}`);
        console.log(`   Trade-in Customer: ${supplier.is_trade_in_customer ? 'Yes' : 'No'}`);
        console.log(`   Created: ${new Date(supplier.created_at).toLocaleString()}`);
        console.log('');
      });
    }
    
    // Check for suppliers referenced in products
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔗 Step 5: Supplier References in Products');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const productSupplierCheck = await pool.query(`
      SELECT 
        s.id,
        s.name,
        COUNT(p.id) as product_count
      FROM lats_suppliers s
      LEFT JOIN lats_products p ON p.supplier_id = s.id
      GROUP BY s.id, s.name
      HAVING COUNT(p.id) > 0
      ORDER BY product_count DESC;
    `);
    
    if (productSupplierCheck.rows.length === 0) {
      console.log('⚠️ No products are currently linked to any suppliers.\n');
    } else {
      console.log('Suppliers with linked products:\n');
      productSupplierCheck.rows.forEach(row => {
        console.log(`  • ${row.name}: ${row.product_count} product(s)`);
      });
      console.log('');
    }
    
    // Check for suppliers referenced in purchase orders
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔗 Step 6: Supplier References in Purchase Orders');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const poSupplierCheck = await pool.query(`
      SELECT 
        s.id,
        s.name,
        COUNT(po.id) as po_count
      FROM lats_suppliers s
      LEFT JOIN lats_purchase_orders po ON po.supplier_id = s.id
      GROUP BY s.id, s.name
      HAVING COUNT(po.id) > 0
      ORDER BY po_count DESC;
    `);
    
    if (poSupplierCheck.rows.length === 0) {
      console.log('⚠️ No purchase orders are currently linked to any suppliers.\n');
    } else {
      console.log('Suppliers with linked purchase orders:\n');
      poSupplierCheck.rows.forEach(row => {
        console.log(`  • ${row.name}: ${row.po_count} purchase order(s)`);
      });
      console.log('');
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Analysis Complete');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
  } catch (error) {
    console.error('\n❌ Error checking supplier table:', error);
    console.error('\nError details:');
    console.error('  Message:', error.message);
    if (error.code) {
      console.error('  Code:', error.code);
    }
  } finally {
    await pool.end();
  }
}

// Run the check
checkSupplierTable();

