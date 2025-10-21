#!/usr/bin/env node

/**
 * Fix Missing Suppliers Script
 * Assigns default suppliers to products that are missing supplier information
 */

import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';

// Database URL from database-config.json
const configPath = path.join(process.cwd(), 'database-config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const DATABASE_URL = config.url;

console.log('🔧 Fixing Missing Suppliers...');
console.log('📊 Database URL:', DATABASE_URL.substring(0, 50) + '...');

// Create Neon client
const sql = neon(DATABASE_URL);

async function fixMissingSuppliers() {
  try {
    console.log('📋 Checking existing suppliers...');
    
    // Get existing suppliers
    const suppliers = await sql`
      SELECT id, name, contact_person, phone, email
      FROM lats_suppliers
      ORDER BY created_at ASC
    `;
    
    console.log(`📦 Found ${suppliers.length} existing suppliers:`);
    suppliers.forEach((supplier, index) => {
      console.log(`  ${index + 1}. ${supplier.name} (${supplier.contact_person}) - ${supplier.phone}`);
    });
    
    // If no suppliers exist, create a default one
    let defaultSupplierId;
    if (suppliers.length === 0) {
      console.log('📝 No suppliers found, creating default supplier...');
      
      const newSupplier = await sql`
        INSERT INTO lats_suppliers (name, contact_person, phone, email, address, is_active, created_at, updated_at)
        VALUES ('Default Supplier', 'Default Contact', '+255000000000', 'supplier@default.com', 'Default Address', true, NOW(), NOW())
        RETURNING id, name
      `;
      
      defaultSupplierId = newSupplier[0].id;
      console.log(`✅ Created default supplier: ${newSupplier[0].name} (ID: ${defaultSupplierId})`);
    } else {
      // Use the first supplier as default
      defaultSupplierId = suppliers[0].id;
      console.log(`✅ Using existing supplier: ${suppliers[0].name} (ID: ${defaultSupplierId})`);
    }
    
    console.log('\n📋 Finding products without suppliers...');
    
    // Get products without suppliers
    const productsWithoutSuppliers = await sql`
      SELECT id, name, sku, category_id
      FROM lats_products
      WHERE supplier_id IS NULL
      ORDER BY created_at ASC
    `;
    
    console.log(`📦 Found ${productsWithoutSuppliers.length} products without suppliers:`);
    productsWithoutSuppliers.forEach((product, index) => {
      console.log(`  ${index + 1}. ${product.name} (SKU: ${product.sku || 'N/A'})`);
    });
    
    if (productsWithoutSuppliers.length === 0) {
      console.log('✅ All products already have suppliers assigned!');
      return;
    }
    
    console.log('\n🔧 Assigning suppliers to products...');
    
    // Update products to assign the default supplier
    const updateResult = await sql`
      UPDATE lats_products 
      SET supplier_id = ${defaultSupplierId}, updated_at = NOW()
      WHERE supplier_id IS NULL
      RETURNING id, name, sku
    `;
    
    console.log(`✅ Updated ${updateResult.length} products with supplier assignments:`);
    updateResult.forEach((product, index) => {
      console.log(`  ${index + 1}. ${product.name} (SKU: ${product.sku || 'N/A'})`);
    });
    
    // Verify the fix
    console.log('\n🧪 Verifying the fix...');
    const remainingProductsWithoutSuppliers = await sql`
      SELECT COUNT(*) as count
      FROM lats_products
      WHERE supplier_id IS NULL
    `;
    
    const remainingCount = remainingProductsWithoutSuppliers[0].count;
    console.log(`📊 Products still without suppliers: ${remainingCount}`);
    
    if (remainingCount === 0) {
      console.log('🎉 All products now have suppliers assigned!');
    } else {
      console.log('⚠️ Some products still lack suppliers - manual review needed');
    }
    
    // Generate summary report
    const summary = {
      timestamp: new Date().toISOString(),
      action: 'fix_missing_suppliers',
      results: {
        existingSuppliers: suppliers.length,
        defaultSupplierId: defaultSupplierId,
        productsFixed: updateResult.length,
        remainingWithoutSuppliers: remainingCount
      },
      fixedProducts: updateResult.map(p => ({
        id: p.id,
        name: p.name,
        sku: p.sku
      }))
    };
    
    fs.writeFileSync('supplier-fix-report.json', JSON.stringify(summary, null, 2));
    console.log('\n💾 Fix report saved to: supplier-fix-report.json');
    
  } catch (error) {
    console.error('❌ Fix failed:', error.message);
    console.error('Full error:', error);
  }
}

fixMissingSuppliers().then(() => {
  console.log('\n🎉 Supplier fix completed!');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Supplier fix failed:', error);
  process.exit(1);
});
