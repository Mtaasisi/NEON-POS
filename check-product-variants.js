#!/usr/bin/env node

/**
 * Product Variants Price & Stock Check
 * Checks all product variants with their prices and stock levels
 */

import pkg from 'pg';
const { Pool } = pkg;
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, '.env') });

const databaseUrl = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ Missing database credentials in .env file');
  console.error('Required: DATABASE_URL or VITE_DATABASE_URL');
  process.exit(1);
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false }
});

async function checkProductVariants() {
  console.log('🔍 Checking Product Variants, Prices & Stock...\n');
  console.log('='.repeat(80));

  const client = await pool.connect();
  
  try {
    // Get all products with their variants
    const productsQuery = `
      SELECT 
        p.id,
        p.name,
        p.sku,
        p.is_active,
        c.name as category_name,
        s.name as supplier_name
      FROM lats_products p
      LEFT JOIN lats_categories c ON p.category_id = c.id
      LEFT JOIN lats_suppliers s ON p.supplier_id = s.id
      ORDER BY p.name
    `;
    
    const productsResult = await client.query(productsQuery);
    const products = productsResult.rows;

    console.log(`\n📦 Total Products: ${products?.length || 0}\n`);

    // Get all variants
    const variantsQuery = `
      SELECT * FROM lats_product_variants
      ORDER BY product_id, variant_name
    `;
    
    const variantsResult = await client.query(variantsQuery);
    const variants = variantsResult.rows;

    console.log(`🔢 Total Variants: ${variants?.length || 0}\n`);
    console.log('='.repeat(80));

    if (!variants || variants.length === 0) {
      console.log('\n⚠️  No product variants found in database');
      return;
    }

    // Group variants by product
    const variantsByProduct = variants.reduce((acc, variant) => {
      if (!acc[variant.product_id]) {
        acc[variant.product_id] = [];
      }
      acc[variant.product_id].push(variant);
      return acc;
    }, {});

    // Display detailed information
    let totalStock = 0;
    let totalCostValue = 0;
    let totalSellingValue = 0;
    let lowStockVariants = [];
    let outOfStockVariants = [];
    let inactiveVariants = [];

    for (const product of products || []) {
      const productVariants = variantsByProduct[product.id] || [];
      
      if (productVariants.length === 0) continue;

      console.log(`\n\n📦 PRODUCT: ${product.name}`);
      console.log(`   SKU: ${product.sku}`);
      console.log(`   Category: ${product.category_name || 'N/A'}`);
      console.log(`   Supplier: ${product.supplier_name || 'N/A'}`);
      console.log(`   Active: ${product.is_active ? 'Yes' : 'No'}`);
      console.log(`   Variants: ${productVariants.length}`);
      console.log('-'.repeat(80));

      for (const variant of productVariants) {
        const costPrice = parseFloat(variant.cost_price || 0);
        const sellingPrice = parseFloat(variant.selling_price || variant.unit_price || 0);
        const stockQty = parseInt(variant.quantity || variant.stock_quantity || 0);
        const costValue = costPrice * stockQty;
        const sellingValue = sellingPrice * stockQty;
        const margin = sellingPrice > 0 ? ((sellingPrice - costPrice) / sellingPrice * 100).toFixed(2) : 0;
        
        totalStock += stockQty;
        totalCostValue += costValue;
        totalSellingValue += sellingValue;

        // Check stock levels
        const variantName = variant.name || variant.variant_name || variant.sku;
        if (stockQty === 0) {
          outOfStockVariants.push({ product: product.name, variant: variantName });
        } else if (stockQty < 10) {
          lowStockVariants.push({ product: product.name, variant: variantName, stock: stockQty });
        }

        if (!variant.is_active) {
          inactiveVariants.push({ product: product.name, variant: variantName });
        }

        const stockStatus = stockQty === 0 ? '🔴' : stockQty < 10 ? '🟡' : '🟢';
        const activeStatus = variant.is_active ? '✅' : '❌';
        const variantDisplayName = variant.name || variant.variant_name || 'Default Variant';

        console.log(`\n   ${activeStatus} ${stockStatus} ${variantDisplayName}`);
        console.log(`      SKU: ${variant.sku || 'N/A'}`);
        console.log(`      Barcode: ${variant.barcode || 'N/A'}`);
        console.log(`      Cost Price: $${costPrice.toFixed(2)}`);
        console.log(`      Selling Price: $${sellingPrice.toFixed(2)}`);
        console.log(`      Margin: ${margin}%`);
        console.log(`      Stock Quantity: ${stockQty}`);
        console.log(`      Min Quantity: ${variant.min_quantity || 0}`);
        console.log(`      Reserved: ${variant.reserved_quantity || 0}`);
        console.log(`      Stock Value (Cost): $${costValue.toFixed(2)}`);
        console.log(`      Stock Value (Selling): $${sellingValue.toFixed(2)}`);
        console.log(`      Sharing Mode: ${variant.sharing_mode || 'N/A'}`);
        console.log(`      Active: ${variant.is_active ? 'Yes' : 'No'}`);
        console.log(`      Created: ${new Date(variant.created_at).toLocaleDateString()}`);
        console.log(`      Updated: ${new Date(variant.updated_at).toLocaleDateString()}`);
      }
    }

    // Summary Statistics
    console.log('\n\n' + '='.repeat(80));
    console.log('📊 SUMMARY STATISTICS');
    console.log('='.repeat(80));
    console.log(`\n📦 Total Products: ${products?.length || 0}`);
    console.log(`🔢 Total Variants: ${variants?.length || 0}`);
    console.log(`📊 Total Stock Units: ${totalStock}`);
    console.log(`💰 Total Inventory Value (Cost): $${totalCostValue.toFixed(2)}`);
    console.log(`💵 Total Inventory Value (Selling): $${totalSellingValue.toFixed(2)}`);
    console.log(`📈 Potential Profit: $${(totalSellingValue - totalCostValue).toFixed(2)}`);

    // Stock Alerts
    if (outOfStockVariants.length > 0) {
      console.log(`\n\n🔴 OUT OF STOCK (${outOfStockVariants.length})`);
      console.log('-'.repeat(80));
      outOfStockVariants.forEach(item => {
        console.log(`   • ${item.product} - ${item.variant}`);
      });
    }

    if (lowStockVariants.length > 0) {
      console.log(`\n\n🟡 LOW STOCK - Below 10 units (${lowStockVariants.length})`);
      console.log('-'.repeat(80));
      lowStockVariants.forEach(item => {
        console.log(`   • ${item.product} - ${item.variant} (${item.stock} units)`);
      });
    }

    if (inactiveVariants.length > 0) {
      console.log(`\n\n❌ INACTIVE VARIANTS (${inactiveVariants.length})`);
      console.log('-'.repeat(80));
      inactiveVariants.forEach(item => {
        console.log(`   • ${item.product} - ${item.variant}`);
      });
    }

    // Price Analysis
    console.log('\n\n💲 PRICE ANALYSIS');
    console.log('='.repeat(80));
    
    const variantsWithPricing = variants.filter(v => v.selling_price > 0);
    const avgCostPrice = variants.reduce((sum, v) => sum + parseFloat(v.cost_price || 0), 0) / variants.length;
    const avgSellingPrice = variants.reduce((sum, v) => sum + parseFloat(v.selling_price || 0), 0) / variants.length;
    const avgMargin = variantsWithPricing.length > 0
      ? variantsWithPricing.reduce((sum, v) => {
          const cost = parseFloat(v.cost_price || 0);
          const selling = parseFloat(v.selling_price || 0);
          return sum + (selling > 0 ? ((selling - cost) / selling * 100) : 0);
        }, 0) / variantsWithPricing.length
      : 0;

    console.log(`\n   Average Cost Price: $${avgCostPrice.toFixed(2)}`);
    console.log(`   Average Selling Price: $${avgSellingPrice.toFixed(2)}`);
    console.log(`   Average Margin: ${avgMargin.toFixed(2)}%`);
    console.log(`   Variants with Pricing: ${variantsWithPricing.length} / ${variants.length}`);
    
    const noPriceVariants = variants.filter(v => v.selling_price === 0 || v.selling_price === null);
    if (noPriceVariants.length > 0) {
      console.log(`\n   ⚠️  Variants without selling price: ${noPriceVariants.length}`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ Check Complete!\n');

  } catch (error) {
    console.error('❌ Error:', error);
    console.error(error.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the check
checkProductVariants().catch(console.error);

