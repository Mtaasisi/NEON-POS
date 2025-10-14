#!/usr/bin/env node

/**
 * 🧪 CHECK ACTUAL PRODUCTS
 * Checks the actual products in the database
 */

import { neon } from '@neondatabase/serverless';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;
const sql = neon(DATABASE_URL);

async function checkActualProducts() {
  try {
    console.log('🔍 Checking actual products in database...');
    
    console.log('\n📋 First 10 products:');
    const products = await sql`
      SELECT id, name, sku, is_active, total_quantity, unit_price, selling_price, created_at
      FROM lats_products 
      ORDER BY created_at DESC 
      LIMIT 10
    `;
    
    products.forEach((product, index) => {
      console.log(`${index + 1}. ${product.name}`);
      console.log(`   SKU: ${product.sku}`);
      console.log(`   Active: ${product.is_active}`);
      console.log(`   Quantity: ${product.total_quantity}`);
      console.log(`   Unit Price: ${product.unit_price}`);
      console.log(`   Selling Price: ${product.selling_price}`);
      console.log(`   Created: ${product.created_at}`);
      console.log('');
    });
    
    console.log('\n🔍 Checking product variants...');
    const variants = await sql`
      SELECT v.id, p.name as product_name, v.sku, v.quantity, v.unit_price, v.selling_price
      FROM lats_product_variants v
      JOIN lats_products p ON v.product_id = p.id
      ORDER BY p.created_at DESC
      LIMIT 10
    `;
    
    console.log('📋 First 10 variants:');
    variants.forEach((variant, index) => {
      console.log(`${index + 1}. ${variant.product_name} - ${variant.sku}`);
      console.log(`   Quantity: ${variant.quantity}`);
      console.log(`   Unit Price: ${variant.unit_price}`);
      console.log(`   Selling Price: ${variant.selling_price}`);
      console.log('');
    });
    
    console.log('\n🔍 Total counts:');
    const totalProducts = await sql`SELECT COUNT(*) as count FROM lats_products WHERE is_active = true`;
    const totalVariants = await sql`SELECT COUNT(*) as count FROM lats_product_variants`;
    
    console.log(`📊 Active Products: ${totalProducts[0].count}`);
    console.log(`📊 Total Variants: ${totalVariants[0].count}`);
    
  } catch (error) {
    console.error('❌ Error checking products:', error.message);
  }
}

checkActualProducts();
