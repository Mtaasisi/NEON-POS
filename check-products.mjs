#!/usr/bin/env node

import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';

// Load environment variables
config();

const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment variables');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function checkProducts() {
  try {
    console.log('🔍 Fetching all products from database...\n');
    console.log('='.repeat(80));

    // Query products with all related data
    const products = await sql`
      SELECT 
        p.id,
        p.name,
        p.description,
        p.sku,
        p.barcode,
        p.brand,
        p.model,
        p.category,
        p.condition,
        p.specification,
        p.cost_price,
        p.unit_price,
        p.selling_price,
        p.stock_quantity,
        p.min_stock_level,
        p.max_stock_level,
        p.total_quantity,
        p.total_value,
        p.warranty_period,
        p.is_active,
        p.is_shared,
        p.sharing_mode,
        p.visible_to_branches,
        p.image_url,
        p.tags,
        p.attributes,
        p.metadata,
        p.created_at,
        p.updated_at,
        c.name as category_name,
        s.name as supplier_name,
        s.contact_person as supplier_contact,
        s.phone as supplier_phone,
        s.email as supplier_email,
        br.name as branch_name
      FROM lats_products p
      LEFT JOIN lats_categories c ON p.category_id = c.id
      LEFT JOIN lats_suppliers s ON p.supplier_id = s.id
      LEFT JOIN lats_branches br ON p.branch_id = br.id
      ORDER BY p.created_at DESC
    `;

    if (products.length === 0) {
      console.log('📭 No products found in database');
      return;
    }

    console.log(`✅ Found ${products.length} products\n`);

    // Display each product in detail
    products.forEach((product, index) => {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`📦 PRODUCT #${index + 1}`);
      console.log('='.repeat(80));
      
      console.log('\n📋 BASIC INFORMATION:');
      console.log(`  • ID:            ${product.id}`);
      console.log(`  • Name:          ${product.name}`);
      console.log(`  • Description:   ${product.description || 'N/A'}`);
      console.log(`  • SKU:           ${product.sku || 'N/A'}`);
      console.log(`  • Barcode:       ${product.barcode || 'N/A'}`);
      console.log(`  • Brand:         ${product.brand || 'N/A'}`);
      console.log(`  • Model:         ${product.model || 'N/A'}`);
      console.log(`  • Condition:     ${product.condition || 'N/A'}`);
      console.log(`  • Specification: ${product.specification || 'N/A'}`);
      console.log(`  • Status:        ${product.is_active ? '✅ Active' : '❌ Inactive'}`);
      console.log(`  • Warranty:      ${product.warranty_period ? `${product.warranty_period} months` : 'N/A'}`);
      
      console.log('\n💰 PRICING:');
      console.log(`  • Cost Price:     $${parseFloat(product.cost_price || 0).toFixed(2)}`);
      console.log(`  • Unit Price:     $${parseFloat(product.unit_price || 0).toFixed(2)}`);
      console.log(`  • Selling Price:  $${parseFloat(product.selling_price || 0).toFixed(2)}`);
      console.log(`  • Profit Margin:  $${(parseFloat(product.selling_price || 0) - parseFloat(product.cost_price || 0)).toFixed(2)}`);
      console.log(`  • Profit %:       ${product.cost_price > 0 ? ((parseFloat(product.selling_price || 0) - parseFloat(product.cost_price || 0)) / parseFloat(product.cost_price || 0) * 100).toFixed(2) : '0.00'}%`);
      
      console.log('\n📊 INVENTORY:');
      console.log(`  • Stock Quantity:   ${product.stock_quantity || 0} units`);
      console.log(`  • Total Quantity:   ${product.total_quantity || 0} units`);
      console.log(`  • Min Stock Level:  ${product.min_stock_level || 0} units`);
      console.log(`  • Max Stock Level:  ${product.max_stock_level || 0} units`);
      console.log(`  • Total Value:      $${parseFloat(product.total_value || 0).toFixed(2)}`);
      console.log(`  • Stock Status:     ${product.stock_quantity <= product.min_stock_level ? '⚠️ Low Stock' : '✅ Good'}`);
      
      console.log('\n🏷️ CATEGORIZATION:');
      console.log(`  • Category:      ${product.category || product.category_name || 'N/A'}`);
      console.log(`  • Branch:        ${product.branch_name || 'N/A'}`);
      console.log(`  • Sharing Mode:  ${product.sharing_mode || 'N/A'}`);
      console.log(`  • Is Shared:     ${product.is_shared ? '✅ Yes' : 'No'}`);
      if (product.visible_to_branches && Array.isArray(product.visible_to_branches) && product.visible_to_branches.length > 0) {
        console.log(`  • Visible To:    ${product.visible_to_branches.join(', ')}`);
      }
      if (product.tags && Array.isArray(product.tags) && product.tags.length > 0) {
        console.log(`  • Tags:          ${product.tags.join(', ')}`);
      }
      
      console.log('\n🚚 SUPPLIER:');
      if (product.supplier_name) {
        console.log(`  • Name:    ${product.supplier_name}`);
        console.log(`  • Contact: ${product.supplier_contact || 'N/A'}`);
        console.log(`  • Phone:   ${product.supplier_phone || 'N/A'}`);
        console.log(`  • Email:   ${product.supplier_email || 'N/A'}`);
      } else {
        console.log(`  • No supplier assigned`);
      }
      
      console.log('\n🖼️ MEDIA:');
      console.log(`  • Image URL: ${product.image_url || 'N/A'}`);
      
      console.log('\n⚙️ ADVANCED:');
      if (product.attributes && Object.keys(product.attributes).length > 0) {
        console.log(`  • Attributes: ${JSON.stringify(product.attributes, null, 2)}`);
      } else {
        console.log(`  • Attributes: None`);
      }
      if (product.metadata && Object.keys(product.metadata).length > 0) {
        console.log(`  • Metadata: ${JSON.stringify(product.metadata, null, 2)}`);
      } else {
        console.log(`  • Metadata: None`);
      }
      
      console.log('\n📅 TIMESTAMPS:');
      console.log(`  • Created: ${new Date(product.created_at).toLocaleString()}`);
      console.log(`  • Updated: ${new Date(product.updated_at).toLocaleString()}`);
    });

    console.log('\n' + '='.repeat(80));
    
    // Summary statistics
    console.log('\n📊 SUMMARY STATISTICS:');
    console.log('='.repeat(80));
    
    const totalProducts = products.length;
    const activeProducts = products.filter(p => p.is_active).length;
    const inactiveProducts = totalProducts - activeProducts;
    const lowStockProducts = products.filter(p => p.stock_quantity <= p.min_stock_level).length;
    const outOfStockProducts = products.filter(p => p.stock_quantity === 0).length;
    const totalStockValue = products.reduce((sum, p) => 
      sum + (parseFloat(p.cost_price || 0) * parseInt(p.stock_quantity || 0)), 0
    );
    const totalRetailValue = products.reduce((sum, p) => 
      sum + (parseFloat(p.selling_price || 0) * parseInt(p.stock_quantity || 0)), 0
    );
    const totalStockQuantity = products.reduce((sum, p) => sum + parseInt(p.stock_quantity || 0), 0);

    console.log(`\n📦 Products:`);
    console.log(`  • Total Products:    ${totalProducts}`);
    console.log(`  • Active:            ${activeProducts}`);
    console.log(`  • Inactive:          ${inactiveProducts}`);
    
    console.log(`\n📊 Stock Status:`);
    console.log(`  • Low Stock:         ${lowStockProducts}`);
    console.log(`  • Out of Stock:      ${outOfStockProducts}`);
    console.log(`  • Total Units:       ${totalStockQuantity}`);
    
    console.log(`\n💰 Financial:`);
    console.log(`  • Total Cost Value:  $${totalStockValue.toFixed(2)}`);
    console.log(`  • Total Retail Value: $${totalRetailValue.toFixed(2)}`);
    console.log(`  • Potential Profit:   $${(totalRetailValue - totalStockValue).toFixed(2)}`);

    // Check for product variants
    console.log('\n' + '='.repeat(80));
    console.log('🔍 Checking for product variants...\n');
    
    const variants = await sql`
      SELECT 
        pv.*,
        p.name as product_name
      FROM lats_product_variants pv
      LEFT JOIN lats_products p ON pv.product_id = p.id
      ORDER BY pv.created_at DESC
    `;

    if (variants.length > 0) {
      console.log(`✅ Found ${variants.length} product variants\n`);
      variants.forEach((variant, index) => {
        console.log(`\nVariant #${index + 1}:`);
        console.log(`  • Product:       ${variant.product_name}`);
        console.log(`  • Variant Name:  ${variant.variant_name}`);
        console.log(`  • SKU:           ${variant.sku || 'N/A'}`);
        console.log(`  • Price:         $${parseFloat(variant.selling_price || 0).toFixed(2)}`);
        console.log(`  • Cost:          $${parseFloat(variant.cost_price || 0).toFixed(2)}`);
        console.log(`  • Stock:         ${variant.stock_quantity || 0} units`);
        console.log(`  • Status:        ${variant.is_active ? '✅ Active' : '❌ Inactive'}`);
      });
    } else {
      console.log('📭 No product variants found');
    }

    // Check for product images (skip if table doesn't exist)
    try {
      console.log('\n' + '='.repeat(80));
      console.log('🖼️ Checking for product images...\n');
      
      const images = await sql`
        SELECT 
          pi.*,
          p.name as product_name
        FROM product_images pi
        LEFT JOIN lats_products p ON pi.product_id = p.id
        ORDER BY pi.created_at DESC
      `;

      if (images.length > 0) {
        console.log(`✅ Found ${images.length} product images\n`);
        images.forEach((image, index) => {
          console.log(`\nImage #${index + 1}:`);
          console.log(`  • Product:  ${image.product_name}`);
          console.log(`  • URL:      ${image.image_url}`);
          console.log(`  • Primary:  ${image.is_primary ? '✅ Yes' : 'No'}`);
        });
      } else {
        console.log('📭 No product images found');
      }
    } catch (error) {
      console.log('⚠️ Product images table not found (this is okay)');
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ Product check complete!\n');

  } catch (error) {
    console.error('❌ Error checking products:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

// Run the check
checkProducts();

