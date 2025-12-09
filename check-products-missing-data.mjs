#!/usr/bin/env node

/**
 * Comprehensive Check for Missing Product Data
 * 
 * This script checks for missing or invalid data in products:
 * - Foreign keys (branch_id, category_id, supplier_id, storage_room_id, shelf_id)
 * - Essential fields (name, sku, prices)
 * - Stock information
 * - Images
 * - Metadata
 */

import { Pool } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env.production') });

const DATABASE_URL = process.argv[2] || process.env.DATABASE_URL || 
  'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const pool = new Pool({ connectionString: DATABASE_URL });

async function main() {
  try {
    console.log('🔍 Comprehensive Product Data Check');
    console.log('='.repeat(60));

    // Test database connection
    console.log('🔌 Testing database connection...');
    await pool.query('SELECT 1');
    console.log('✅ Database connection successful\n');

    // Get total products count
    const totalResult = await pool.query('SELECT COUNT(*) as count FROM lats_products');
    const totalProducts = parseInt(totalResult.rows[0].count);
    console.log(`📊 Total products: ${totalProducts}\n`);

    const issues = [];

    // 1. Check for missing branch_id
    console.log('1️⃣  Checking branch_id...');
    const noBranchResult = await pool.query(`
      SELECT COUNT(*) as count FROM lats_products WHERE branch_id IS NULL
    `);
    const noBranch = parseInt(noBranchResult.rows[0].count);
    if (noBranch > 0) {
      issues.push({ field: 'branch_id', count: noBranch, percentage: ((noBranch / totalProducts) * 100).toFixed(1) });
      console.log(`   ❌ Missing branch_id: ${noBranch} products (${((noBranch / totalProducts) * 100).toFixed(1)}%)`);
    } else {
      console.log(`   ✅ All products have branch_id`);
    }

    // Check for invalid branch_id
    const invalidBranchResult = await pool.query(`
      SELECT COUNT(*) as count 
      FROM lats_products p
      LEFT JOIN lats_branches b ON p.branch_id = b.id
      WHERE p.branch_id IS NOT NULL AND b.id IS NULL
    `);
    const invalidBranch = parseInt(invalidBranchResult.rows[0].count);
    if (invalidBranch > 0) {
      issues.push({ field: 'branch_id (invalid)', count: invalidBranch, percentage: ((invalidBranch / totalProducts) * 100).toFixed(1) });
      console.log(`   ⚠️  Invalid branch_id: ${invalidBranch} products`);
    }

    // 2. Check for missing category_id
    console.log('\n2️⃣  Checking category_id...');
    const noCategoryResult = await pool.query(`
      SELECT COUNT(*) as count FROM lats_products WHERE category_id IS NULL
    `);
    const noCategory = parseInt(noCategoryResult.rows[0].count);
    if (noCategory > 0) {
      issues.push({ field: 'category_id', count: noCategory, percentage: ((noCategory / totalProducts) * 100).toFixed(1) });
      console.log(`   ❌ Missing category_id: ${noCategory} products (${((noCategory / totalProducts) * 100).toFixed(1)}%)`);
    } else {
      console.log(`   ✅ All products have category_id`);
    }

    // Check for invalid category_id
    const invalidCategoryResult = await pool.query(`
      SELECT COUNT(*) as count 
      FROM lats_products p
      LEFT JOIN lats_categories c ON p.category_id = c.id
      WHERE p.category_id IS NOT NULL AND c.id IS NULL
    `);
    const invalidCategory = parseInt(invalidCategoryResult.rows[0].count);
    if (invalidCategory > 0) {
      issues.push({ field: 'category_id (invalid)', count: invalidCategory, percentage: ((invalidCategory / totalProducts) * 100).toFixed(1) });
      console.log(`   ⚠️  Invalid category_id: ${invalidCategory} products`);
    }

    // 3. Check for missing supplier_id (optional, but good to know)
    console.log('\n3️⃣  Checking supplier_id...');
    const noSupplierResult = await pool.query(`
      SELECT COUNT(*) as count FROM lats_products WHERE supplier_id IS NULL
    `);
    const noSupplier = parseInt(noSupplierResult.rows[0].count);
    console.log(`   ℹ️  Products without supplier_id: ${noSupplier} (${((noSupplier / totalProducts) * 100).toFixed(1)}%) - This is optional`);

    // 4. Check for missing essential fields
    console.log('\n4️⃣  Checking essential fields...');
    
    // Name
    const noNameResult = await pool.query(`
      SELECT COUNT(*) as count FROM lats_products WHERE name IS NULL OR name = ''
    `);
    const noName = parseInt(noNameResult.rows[0].count);
    if (noName > 0) {
      issues.push({ field: 'name', count: noName, percentage: ((noName / totalProducts) * 100).toFixed(1) });
      console.log(`   ❌ Missing name: ${noName} products`);
    } else {
      console.log(`   ✅ All products have name`);
    }

    // SKU
    const noSkuResult = await pool.query(`
      SELECT COUNT(*) as count FROM lats_products WHERE sku IS NULL OR sku = ''
    `);
    const noSku = parseInt(noSkuResult.rows[0].count);
    if (noSku > 0) {
      issues.push({ field: 'sku', count: noSku, percentage: ((noSku / totalProducts) * 100).toFixed(1) });
      console.log(`   ⚠️  Missing SKU: ${noSku} products`);
    } else {
      console.log(`   ✅ All products have SKU`);
    }

    // 5. Check for missing prices
    console.log('\n5️⃣  Checking prices...');
    
    // Selling price
    const noSellingPriceResult = await pool.query(`
      SELECT COUNT(*) as count FROM lats_products 
      WHERE selling_price IS NULL OR selling_price = 0
    `);
    const noSellingPrice = parseInt(noSellingPriceResult.rows[0].count);
    if (noSellingPrice > 0) {
      issues.push({ field: 'selling_price', count: noSellingPrice, percentage: ((noSellingPrice / totalProducts) * 100).toFixed(1) });
      console.log(`   ⚠️  Missing or zero selling_price: ${noSellingPrice} products`);
    } else {
      console.log(`   ✅ All products have selling_price`);
    }

    // Cost price
    const noCostPriceResult = await pool.query(`
      SELECT COUNT(*) as count FROM lats_products 
      WHERE cost_price IS NULL OR cost_price = 0
    `);
    const noCostPrice = parseInt(noCostPriceResult.rows[0].count);
    console.log(`   ℹ️  Products with zero/missing cost_price: ${noCostPrice} (${((noCostPrice / totalProducts) * 100).toFixed(1)}%) - This is optional`);

    // 6. Check for stock information
    console.log('\n6️⃣  Checking stock information...');
    
    const noStockResult = await pool.query(`
      SELECT COUNT(*) as count FROM lats_products 
      WHERE stock_quantity IS NULL OR stock_quantity = 0
    `);
    const noStock = parseInt(noStockResult.rows[0].count);
    console.log(`   ℹ️  Products with zero/missing stock: ${noStock} (${((noStock / totalProducts) * 100).toFixed(1)}%)`);

    // 7. Check for images
    console.log('\n7️⃣  Checking images...');
    
    const noImageResult = await pool.query(`
      SELECT COUNT(*) as count FROM lats_products 
      WHERE image_url IS NULL OR image_url = ''
    `);
    const noImage = parseInt(noImageResult.rows[0].count);
    if (noImage > 0) {
      issues.push({ field: 'images', count: noImage, percentage: ((noImage / totalProducts) * 100).toFixed(1) });
      console.log(`   ⚠️  Missing images: ${noImage} products (${((noImage / totalProducts) * 100).toFixed(1)}%)`);
    } else {
      console.log(`   ✅ All products have images`);
    }

    // 8. Check for metadata
    console.log('\n8️⃣  Checking metadata...');
    
    const noMetadataResult = await pool.query(`
      SELECT COUNT(*) as count FROM lats_products 
      WHERE metadata IS NULL OR metadata = '{}'::jsonb
    `);
    const noMetadata = parseInt(noMetadataResult.rows[0].count);
    console.log(`   ℹ️  Products without metadata: ${noMetadata} (${((noMetadata / totalProducts) * 100).toFixed(1)}%) - This is optional`);

    // 9. Check for sharing configuration
    console.log('\n9️⃣  Checking sharing configuration...');
    
    const noSharingResult = await pool.query(`
      SELECT COUNT(*) as count FROM lats_products 
      WHERE is_shared IS NULL 
      OR sharing_mode IS NULL 
      OR (is_shared = true AND visible_to_branches IS NULL)
    `);
    const noSharing = parseInt(noSharingResult.rows[0].count);
    if (noSharing > 0) {
      issues.push({ field: 'sharing_config', count: noSharing, percentage: ((noSharing / totalProducts) * 100).toFixed(1) });
      console.log(`   ⚠️  Incomplete sharing configuration: ${noSharing} products`);
    } else {
      console.log(`   ✅ All products have sharing configuration`);
    }

    // 10. Check for products with variants metadata but no actual variants
    console.log('\n🔟 Checking variant consistency...');
    
    const variantMismatchResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM lats_products p
      LEFT JOIN lats_product_variants v ON p.id = v.product_id
      WHERE (p.metadata->>'useVariants')::boolean = true
         OR (p.metadata->>'variantCount')::int > 0
      GROUP BY p.id
      HAVING COUNT(v.id) = 0
    `);
    const variantMismatch = variantMismatchResult.rows.length;
    if (variantMismatch > 0) {
      issues.push({ field: 'variants (metadata mismatch)', count: variantMismatch, percentage: ((variantMismatch / totalProducts) * 100).toFixed(1) });
      console.log(`   ⚠️  Products with variant metadata but no variants: ${variantMismatch}`);
    } else {
      console.log(`   ✅ Variant metadata is consistent`);
    }

    // 11. Get sample products with multiple issues
    console.log('\n1️⃣1️⃣  Finding products with multiple issues...');
    
    const multiIssueResult = await pool.query(`
      SELECT 
        p.id,
        p.name,
        p.sku,
        CASE WHEN p.branch_id IS NULL THEN 1 ELSE 0 END +
        CASE WHEN p.category_id IS NULL THEN 1 ELSE 0 END +
        CASE WHEN p.name IS NULL OR p.name = '' THEN 1 ELSE 0 END +
        CASE WHEN p.selling_price IS NULL OR p.selling_price = 0 THEN 1 ELSE 0 END +
        CASE WHEN p.image_url IS NULL OR p.image_url = '' THEN 1 ELSE 0 END
        as issue_count
      FROM lats_products p
      WHERE 
        p.branch_id IS NULL OR
        p.category_id IS NULL OR
        p.name IS NULL OR p.name = '' OR
        p.selling_price IS NULL OR p.selling_price = 0 OR
        (p.image_url IS NULL OR p.image_url = '')
      ORDER BY issue_count DESC
      LIMIT 10
    `);
    
    if (multiIssueResult.rows.length > 0) {
      console.log(`   Found ${multiIssueResult.rows.length} products with multiple issues:`);
      multiIssueResult.rows.forEach((row, idx) => {
        console.log(`   ${idx + 1}. ${row.name || 'Unnamed'} - ${row.issue_count} issues`);
      });
    } else {
      console.log(`   ✅ No products with multiple critical issues`);
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY OF MISSING DATA');
    console.log('='.repeat(60));
    
    if (issues.length === 0) {
      console.log('✅ EXCELLENT: No critical missing data found!');
    } else {
      console.log(`⚠️  Found ${issues.length} types of missing data:\n`);
      issues.forEach((issue, idx) => {
        console.log(`   ${idx + 1}. ${issue.field}: ${issue.count} products (${issue.percentage}%)`);
      });
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📋 RECOMMENDATIONS');
    console.log('='.repeat(60));
    
    if (issues.some(i => i.field.includes('branch_id'))) {
      console.log('1. Assign branch_id to all products');
    }
    if (issues.some(i => i.field.includes('category_id'))) {
      console.log('2. Assign category_id to all products');
    }
    if (issues.some(i => i.field.includes('selling_price'))) {
      console.log('3. Set selling_price for products');
    }
    if (issues.some(i => i.field.includes('images'))) {
      console.log('4. Add images to products');
    }
    if (issues.some(i => i.field.includes('sharing_config'))) {
      console.log('5. Configure product sharing settings');
    }
    
    if (issues.length === 0) {
      console.log('✅ All critical data is present!');
    }
    
    console.log('='.repeat(60));

    process.exit(issues.length === 0 ? 0 : 1);

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
