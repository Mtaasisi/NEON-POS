#!/usr/bin/env node

/**
 * Check Product Supplier Data
 * Checks if products have supplier_id and if suppliers exist
 */

import dotenv from 'dotenv';
import { Pool } from '@neondatabase/serverless';

dotenv.config();

const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in .env file');
  process.exit(1);
}

async function checkProductSuppliers() {
  console.log('🔍 Checking Product Supplier Data\n');
  
  const pool = new Pool({ connectionString: DATABASE_URL });
  
  try {
    // Check how many products have supplier_id
    const { rows: statsRows } = await pool.query(`
      SELECT 
        COUNT(*) as total_products,
        COUNT(supplier_id) as products_with_supplier,
        COUNT(*) - COUNT(supplier_id) as products_without_supplier
      FROM lats_products
      WHERE is_active = true
    `);
    
    const stats = statsRows[0];
    console.log('📊 PRODUCT SUPPLIER STATISTICS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Total Active Products: ${stats.total_products}`);
    console.log(`Products WITH Supplier: ${stats.products_with_supplier} ✅`);
    console.log(`Products WITHOUT Supplier: ${stats.products_without_supplier} ❌`);
    console.log(`Coverage: ${stats.total_products > 0 ? ((stats.products_with_supplier / stats.total_products) * 100).toFixed(1) : 0}%\n`);
    
    // Sample products with suppliers
    console.log('📦 Sample Products WITH Suppliers:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const { rows: withSupplier } = await pool.query(`
      SELECT 
        p.id,
        p.name,
        p.sku,
        p.supplier_id,
        s.name as supplier_name
      FROM lats_products p
      LEFT JOIN lats_suppliers s ON p.supplier_id = s.id
      WHERE p.supplier_id IS NOT NULL
      AND p.is_active = true
      ORDER BY p.created_at DESC
      LIMIT 5
    `);
    
    if (withSupplier.length > 0) {
      withSupplier.forEach((p, i) => {
        console.log(`${i + 1}. ${p.name} (${p.sku})`);
        console.log(`   Supplier ID: ${p.supplier_id}`);
        console.log(`   Supplier Name: ${p.supplier_name || 'SUPPLIER NOT FOUND IN DATABASE! ❌'}\n`);
      });
    } else {
      console.log('  (None found)\n');
    }
    
    // Sample products WITHOUT suppliers
    console.log('📦 Sample Products WITHOUT Suppliers:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const { rows: withoutSupplier } = await pool.query(`
      SELECT id, name, sku
      FROM lats_products
      WHERE supplier_id IS NULL
      AND is_active = true
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    if (withoutSupplier.length > 0) {
      withoutSupplier.forEach((p, i) => {
        console.log(`${i + 1}. ${p.name} (${p.sku})`);
      });
      console.log('');
    } else {
      console.log('  (None found - all products have suppliers! ✅)\n');
    }
    
    // Check specific product: najaribu
    console.log('🔍 Checking specific product: najaribu');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const { rows: najaribuRows } = await pool.query(`
      SELECT 
        p.id,
        p.name,
        p.sku,
        p.supplier_id,
        s.name as supplier_name,
        s.contact_person,
        s.phone
      FROM lats_products p
      LEFT JOIN lats_suppliers s ON p.supplier_id = s.id
      WHERE p.name ILIKE '%najaribu%'
      LIMIT 1
    `);
    
    if (najaribuRows.length > 0) {
      const p = najaribuRows[0];
      console.log(`Product: ${p.name}`);
      console.log(`SKU: ${p.sku}`);
      console.log(`Supplier ID: ${p.supplier_id || 'NULL ❌'}`);
      console.log(`Supplier Name: ${p.supplier_name || 'N/A ❌'}`);
      if (p.contact_person) console.log(`Contact: ${p.contact_person}`);
      if (p.phone) console.log(`Phone: ${p.phone}`);
      console.log('');
    }
    
    // Check available suppliers
    console.log('📋 Available Suppliers in Database:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const { rows: suppliers } = await pool.query(`
      SELECT id, name, phone, is_active
      FROM lats_suppliers
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    console.log(`Total Suppliers: ${suppliers.length}\n`);
    suppliers.forEach((s, i) => {
      console.log(`${i + 1}. ${s.name} ${s.is_active ? '✅' : '❌'}`);
      console.log(`   ID: ${s.id}`);
      if (s.phone) console.log(`   Phone: ${s.phone}`);
      console.log('');
    });
    
    // Recommendations
    console.log('💡 RECOMMENDATIONS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (stats.products_without_supplier > 0) {
      console.log(`❌ ${stats.products_without_supplier} products are missing supplier data`);
      console.log('   Solutions:');
      console.log('   1. Assign suppliers when creating purchase orders');
      console.log('   2. Manually edit products to add supplier');
      console.log('   3. Run bulk update to assign default supplier\n');
    } else {
      console.log('✅ All products have suppliers assigned!\n');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

// Run the script
checkProductSuppliers().catch(console.error);

