#!/usr/bin/env node

/**
 * Auto-Fix Product Suppliers
 * Automatically assigns suppliers to products based on purchase orders
 */

import dotenv from 'dotenv';
import { Pool } from '@neondatabase/serverless';

dotenv.config();

const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in .env file');
  process.exit(1);
}

async function autoFixProductSuppliers() {
  console.log('🔧 Auto-Fixing Product Suppliers\n');
  console.log('This will assign suppliers to products based on their purchase orders...\n');
  
  const pool = new Pool({ connectionString: DATABASE_URL });
  
  try {
    // Step 1: Find products that came from purchase orders
    console.log('1️⃣ Finding products from purchase orders...\n');
    
    const { rows: productsFromPO } = await pool.query(`
      SELECT DISTINCT
        p.id as product_id,
        p.name as product_name,
        p.sku,
        po.supplier_id,
        s.name as supplier_name
      FROM lats_products p
      JOIN lats_product_variants pv ON pv.product_id = p.id
      JOIN lats_purchase_order_items poi ON poi.variant_id = pv.id
      JOIN lats_purchase_orders po ON poi.purchase_order_id = po.id
      LEFT JOIN lats_suppliers s ON po.supplier_id = s.id
      WHERE p.supplier_id IS NULL
      AND po.supplier_id IS NOT NULL
      ORDER BY p.name
    `);
    
    console.log(`Found ${productsFromPO.length} products that can be linked to suppliers:\n`);
    
    if (productsFromPO.length === 0) {
      console.log('   No products found with purchase order supplier data.\n');
      console.log('💡 Products were likely created manually without POs.');
      console.log('   You\'ll need to assign suppliers manually in the UI.\n');
    } else {
      // Show what will be updated
      console.log('📋 Products that will be updated:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      productsFromPO.forEach((p, i) => {
        console.log(`${i + 1}. ${p.product_name}`);
        console.log(`   SKU: ${p.sku}`);
        console.log(`   Will assign → ${p.supplier_name || 'Supplier ID: ' + p.supplier_id}`);
        console.log('');
      });
      
      // Step 2: Update products with supplier_id
      console.log('2️⃣ Updating products with supplier data...\n');
      
      let successCount = 0;
      let errorCount = 0;
      
      for (const product of productsFromPO) {
        try {
          await pool.query(
            `UPDATE lats_products 
             SET supplier_id = $1,
                 updated_at = NOW()
             WHERE id = $2`,
            [product.supplier_id, product.product_id]
          );
          successCount++;
        } catch (error) {
          console.error(`   ❌ Failed to update ${product.product_name}:`, error.message);
          errorCount++;
        }
      }
      
      console.log('✅ Update Results:');
      console.log(`   Success: ${successCount} products`);
      console.log(`   Failed: ${errorCount} products\n`);
    }
    
    // Step 3: Check final statistics
    console.log('3️⃣ Final Statistics:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const { rows: finalStats } = await pool.query(`
      SELECT 
        COUNT(*) as total_products,
        COUNT(supplier_id) as products_with_supplier,
        COUNT(*) - COUNT(supplier_id) as products_without_supplier
      FROM lats_products
      WHERE is_active = true
    `);
    
    const stats = finalStats[0];
    console.log(`Total Active Products: ${stats.total_products}`);
    console.log(`Products WITH Supplier: ${stats.products_with_supplier} ✅`);
    console.log(`Products WITHOUT Supplier: ${stats.products_without_supplier} ❌`);
    console.log(`Coverage: ${stats.total_products > 0 ? ((stats.products_with_supplier / stats.total_products) * 100).toFixed(1) : 0}%\n`);
    
    if (stats.products_without_supplier > 0) {
      console.log(`⚠️  ${stats.products_without_supplier} products still don't have suppliers.`);
      console.log('   These products were likely created manually without POs.');
      console.log('   You can assign suppliers to them manually in the UI.\n');
    } else {
      console.log('✅ All products now have suppliers assigned!\n');
    }
    
    console.log('✨ Process complete!');
    console.log('🔄 Refresh your browser to see supplier names in the inventory.\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

// Run the script
autoFixProductSuppliers().catch(console.error);

