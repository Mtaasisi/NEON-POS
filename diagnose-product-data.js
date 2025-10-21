#!/usr/bin/env node

/**
 * Product Data Diagnostic Script
 * Analyzes product data to identify missing information
 */

import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';

// Database URL from database-config.json
const configPath = path.join(process.cwd(), 'database-config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const DATABASE_URL = config.url;

console.log('🔍 Product Data Diagnostic Starting...');
console.log('📊 Database URL:', DATABASE_URL.substring(0, 50) + '...');

// Create Neon client
const sql = neon(DATABASE_URL);

async function diagnoseProductData() {
  try {
    console.log('📋 Fetching products with their relationships...');
    
    // Get products with all their related data
    const products = await sql`
      SELECT 
        p.id,
        p.name,
        p.description,
        p.sku,
        p.is_active,
        p.created_at,
        p.updated_at,
        p.branch_id,
        -- Supplier info
        s.name as supplier_name,
        s.id as supplier_id,
        -- Category info
        c.name as category_name,
        c.id as category_id,
        -- Variants info
        COALESCE(
          json_agg(
            json_build_object(
              'id', pv.id,
              'name', pv.name,
              'sku', pv.sku,
              'quantity', pv.quantity,
              'min_quantity', pv.min_quantity,
              'cost_price', pv.cost_price,
              'selling_price', pv.selling_price,
              'is_active', pv.is_active
            )
          ) FILTER (WHERE pv.id IS NOT NULL), 
          '[]'::json
        ) as variants
      FROM lats_products p
      LEFT JOIN lats_suppliers s ON p.supplier_id = s.id
      LEFT JOIN lats_categories c ON p.category_id = c.id
      LEFT JOIN lats_product_variants pv ON p.id = pv.product_id
      GROUP BY p.id, s.name, s.id, c.name, c.id
      ORDER BY p.created_at DESC
    `;
    
    console.log(`📦 Found ${products.length} products`);
    
    if (products.length === 0) {
      console.log('❌ No products found in database');
      return;
    }
    
    // Analyze missing information
    const analysis = {
      totalProducts: products.length,
      missingInfo: {
        supplier: 0,
        category: 0,
        variants: 0,
        price: 0,
        stock: 0
      },
      productsWithIssues: []
    };
    
    products.forEach((product, index) => {
      const issues = [];
      
      // Check supplier
      if (!product.supplier_name || !product.supplier_id) {
        analysis.missingInfo.supplier++;
        issues.push('Missing supplier');
      }
      
      // Check category
      if (!product.category_name || !product.category_id) {
        analysis.missingInfo.category++;
        issues.push('Missing category');
      }
      
      // Check variants
      const variants = product.variants || [];
      if (variants.length === 0) {
        analysis.missingInfo.variants++;
        issues.push('No variants');
      }
      
      // Check prices and stock in variants
      let hasPrice = false;
      let hasStock = false;
      
      variants.forEach(variant => {
        if (variant.selling_price && variant.selling_price > 0) {
          hasPrice = true;
        }
        if (variant.quantity && variant.quantity > 0) {
          hasStock = true;
        }
      });
      
      if (!hasPrice) {
        analysis.missingInfo.price++;
        issues.push('No selling price');
      }
      
      if (!hasStock) {
        analysis.missingInfo.stock++;
        issues.push('No stock');
      }
      
      if (issues.length > 0) {
        analysis.productsWithIssues.push({
          id: product.id,
          name: product.name,
          issues: issues,
          supplier: product.supplier_name || 'None',
          category: product.category_name || 'None',
          variantsCount: variants.length,
          sampleVariant: variants[0] || null
        });
      }
    });
    
    // Calculate percentages
    const percentages = {
      supplier: Math.round((analysis.missingInfo.supplier / analysis.totalProducts) * 100),
      category: Math.round((analysis.missingInfo.category / analysis.totalProducts) * 100),
      variants: Math.round((analysis.missingInfo.variants / analysis.totalProducts) * 100),
      price: Math.round((analysis.missingInfo.price / analysis.totalProducts) * 100),
      stock: Math.round((analysis.missingInfo.stock / analysis.totalProducts) * 100)
    };
    
    console.log('\n📊 DIAGNOSTIC RESULTS:');
    console.log('='.repeat(50));
    console.log(`Total Products: ${analysis.totalProducts}`);
    console.log(`Products with Issues: ${analysis.productsWithIssues.length}`);
    console.log('\nMissing Information:');
    console.log(`  Suppliers: ${analysis.missingInfo.supplier} (${percentages.supplier}%)`);
    console.log(`  Categories: ${analysis.missingInfo.category} (${percentages.category}%)`);
    console.log(`  Variants: ${analysis.missingInfo.variants} (${percentages.variants}%)`);
    console.log(`  Prices: ${analysis.missingInfo.price} (${percentages.price}%)`);
    console.log(`  Stock: ${analysis.missingInfo.stock} (${percentages.stock}%)`);
    
    if (analysis.productsWithIssues.length > 0) {
      console.log('\n🔍 Products with Issues:');
      analysis.productsWithIssues.forEach((product, index) => {
        console.log(`\n${index + 1}. ${product.name} (ID: ${product.id})`);
        console.log(`   Issues: ${product.issues.join(', ')}`);
        console.log(`   Supplier: ${product.supplier}`);
        console.log(`   Category: ${product.category}`);
        console.log(`   Variants: ${product.variantsCount}`);
        if (product.sampleVariant) {
          console.log(`   Sample Variant: ${product.sampleVariant.name} - Qty: ${product.sampleVariant.quantity}, Price: ${product.sampleVariant.selling_price}`);
        }
      });
    }
    
    // Save detailed report
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalProducts: analysis.totalProducts,
        productsWithIssues: analysis.productsWithIssues.length,
        missingInfo: analysis.missingInfo,
        percentages: percentages
      },
      productsWithIssues: analysis.productsWithIssues
    };
    
    fs.writeFileSync('product-diagnostic-report.json', JSON.stringify(report, null, 2));
    console.log('\n💾 Detailed report saved to: product-diagnostic-report.json');
    
  } catch (error) {
    console.error('❌ Diagnostic failed:', error.message);
    console.error('Full error:', error);
  }
}

diagnoseProductData().then(() => {
  console.log('\n🎉 Diagnostic completed!');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Diagnostic failed:', error);
  process.exit(1);
});
