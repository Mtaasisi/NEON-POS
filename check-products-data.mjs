#!/usr/bin/env node
/**
 * Check products data in PostgreSQL database
 * Provides comprehensive analysis of lats_products table
 */

import pg from 'pg';
const { Client } = pg;

// Get connection string from command line or use provided one
const connectionString = process.argv[2] || 'postgresql://neondb_owner:npg_vABqUKk73tEW@ep-young-firefly-adlvuhdv-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const client = new Client({ 
  connectionString: connectionString,
  ssl: { rejectUnauthorized: false }
});

async function checkProductsData() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║  🔍 CHECKING PRODUCTS DATA                            ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  try {
    // Connect to database
    console.log('📊 Connecting to database...');
    await client.connect();
    console.log('✅ Connected successfully!\n');

    // 1. Total products count
    console.log('1️⃣ Total Products Count');
    console.log('─'.repeat(50));
    const totalResult = await client.query('SELECT COUNT(*) as count FROM lats_products');
    const totalCount = parseInt(totalResult.rows[0].count);
    console.log(`   Total Products: ${totalCount}\n`);

    if (totalCount === 0) {
      console.log('⚠️  No products found in database!');
      await client.end();
      return;
    }

    // 2. Active vs Inactive products
    console.log('2️⃣ Product Status');
    console.log('─'.repeat(50));
    try {
      const statusResult = await client.query(`
        SELECT 
          COUNT(*) FILTER (WHERE is_active = true) as active,
          COUNT(*) FILTER (WHERE is_active = false) as inactive,
          COUNT(*) FILTER (WHERE is_active IS NULL) as null_status
        FROM lats_products
      `);
      const status = statusResult.rows[0];
      console.log(`   ✅ Active: ${status.active}`);
      console.log(`   ❌ Inactive: ${status.inactive}`);
      if (status.null_status > 0) {
        console.log(`   ⚠️  NULL status: ${status.null_status}`);
      }
    } catch (error) {
      console.log(`   ⚠️  Could not check status: ${error.message}`);
    }
    console.log('');

    // 3. Products with/without branch_id
    console.log('3️⃣ Branch Assignment');
    console.log('─'.repeat(50));
    try {
      const branchResult = await client.query(`
        SELECT 
          COUNT(*) FILTER (WHERE branch_id IS NOT NULL) as with_branch,
          COUNT(*) FILTER (WHERE branch_id IS NULL) as without_branch
        FROM lats_products
      `);
      const branch = branchResult.rows[0];
      console.log(`   ✅ With branch_id: ${branch.with_branch}`);
      console.log(`   ⚠️  Without branch_id: ${branch.without_branch}`);
      
      // Get branch distribution
      const branchDistResult = await client.query(`
        SELECT branch_id, COUNT(*) as count
        FROM lats_products
        WHERE branch_id IS NOT NULL
        GROUP BY branch_id
        ORDER BY count DESC
        LIMIT 10
      `);
      if (branchDistResult.rows.length > 0) {
        console.log('\n   Branch Distribution (top 10):');
        branchDistResult.rows.forEach((row, i) => {
          console.log(`      ${i + 1}. ${row.branch_id}: ${row.count} products`);
        });
      }
    } catch (error) {
      console.log(`   ⚠️  Could not check branch assignment: ${error.message}`);
    }
    console.log('');

    // 4. Products with/without SKU
    console.log('4️⃣ SKU Information');
    console.log('─'.repeat(50));
    try {
      const skuResult = await client.query(`
        SELECT 
          COUNT(*) FILTER (WHERE sku IS NOT NULL AND sku != '') as with_sku,
          COUNT(*) FILTER (WHERE sku IS NULL OR sku = '') as without_sku
        FROM lats_products
      `);
      const sku = skuResult.rows[0];
      console.log(`   ✅ With SKU: ${sku.with_sku}`);
      console.log(`   ⚠️  Without SKU: ${sku.without_sku}`);
    } catch (error) {
      console.log(`   ⚠️  Could not check SKU: ${error.message}`);
    }
    console.log('');

    // 5. Pricing information
    console.log('5️⃣ Pricing Information');
    console.log('─'.repeat(50));
    try {
      const priceResult = await client.query(`
        SELECT 
          COUNT(*) FILTER (WHERE selling_price > 0) as with_selling_price,
          COUNT(*) FILTER (WHERE selling_price = 0 OR selling_price IS NULL) as without_selling_price,
          COUNT(*) FILTER (WHERE cost_price > 0) as with_cost_price,
          COUNT(*) FILTER (WHERE cost_price = 0 OR cost_price IS NULL) as without_cost_price,
          AVG(selling_price) as avg_selling_price,
          AVG(cost_price) as avg_cost_price,
          MAX(selling_price) as max_selling_price,
          MIN(selling_price) as min_selling_price
        FROM lats_products
      `);
      const price = priceResult.rows[0];
      console.log(`   ✅ With selling_price: ${price.with_selling_price}`);
      console.log(`   ⚠️  Without selling_price: ${price.without_selling_price}`);
      console.log(`   ✅ With cost_price: ${price.with_cost_price}`);
      console.log(`   ⚠️  Without cost_price: ${price.without_cost_price}`);
      console.log(`   📊 Avg selling_price: ${parseFloat(price.avg_selling_price || 0).toFixed(2)}`);
      console.log(`   📊 Avg cost_price: ${parseFloat(price.avg_cost_price || 0).toFixed(2)}`);
      console.log(`   📊 Price range: ${parseFloat(price.min_selling_price || 0).toFixed(2)} - ${parseFloat(price.max_selling_price || 0).toFixed(2)}`);
    } catch (error) {
      console.log(`   ⚠️  Could not check pricing: ${error.message}`);
    }
    console.log('');

    // 6. Stock information
    console.log('6️⃣ Stock Information');
    console.log('─'.repeat(50));
    try {
      const stockResult = await client.query(`
        SELECT 
          COUNT(*) FILTER (WHERE stock_quantity > 0) as in_stock,
          COUNT(*) FILTER (WHERE stock_quantity = 0) as out_of_stock,
          COUNT(*) FILTER (WHERE stock_quantity < 0) as negative_stock,
          SUM(stock_quantity) as total_stock,
          AVG(stock_quantity) as avg_stock,
          MAX(stock_quantity) as max_stock,
          MIN(stock_quantity) as min_stock
        FROM lats_products
      `);
      const stock = stockResult.rows[0];
      console.log(`   ✅ In stock (qty > 0): ${stock.in_stock}`);
      console.log(`   ⚠️  Out of stock (qty = 0): ${stock.out_of_stock}`);
      if (stock.negative_stock > 0) {
        console.log(`   ❌ Negative stock: ${stock.negative_stock}`);
      }
      console.log(`   📊 Total stock: ${parseInt(stock.total_stock || 0)}`);
      console.log(`   📊 Avg stock: ${parseFloat(stock.avg_stock || 0).toFixed(2)}`);
      console.log(`   📊 Stock range: ${parseInt(stock.min_stock || 0)} - ${parseInt(stock.max_stock || 0)}`);
    } catch (error) {
      console.log(`   ⚠️  Could not check stock: ${error.message}`);
    }
    console.log('');

    // 7. Category information
    console.log('7️⃣ Category Information');
    console.log('─'.repeat(50));
    try {
      const categoryResult = await client.query(`
        SELECT 
          COUNT(*) FILTER (WHERE category_id IS NOT NULL) as with_category,
          COUNT(*) FILTER (WHERE category_id IS NULL) as without_category
        FROM lats_products
      `);
      const category = categoryResult.rows[0];
      console.log(`   ✅ With category_id: ${category.with_category}`);
      console.log(`   ⚠️  Without category_id: ${category.without_category}`);
      
      // Get category distribution
      const categoryDistResult = await client.query(`
        SELECT category_id, COUNT(*) as count
        FROM lats_products
        WHERE category_id IS NOT NULL
        GROUP BY category_id
        ORDER BY count DESC
        LIMIT 10
      `);
      if (categoryDistResult.rows.length > 0) {
        console.log('\n   Category Distribution (top 10):');
        categoryDistResult.rows.forEach((row, i) => {
          console.log(`      ${i + 1}. ${row.category_id}: ${row.count} products`);
        });
      }
    } catch (error) {
      console.log(`   ⚠️  Could not check categories: ${error.message}`);
    }
    console.log('');

    // 8. Supplier information
    console.log('8️⃣ Supplier Information');
    console.log('─'.repeat(50));
    try {
      const supplierResult = await client.query(`
        SELECT 
          COUNT(*) FILTER (WHERE supplier_id IS NOT NULL) as with_supplier,
          COUNT(*) FILTER (WHERE supplier_id IS NULL) as without_supplier
        FROM lats_products
      `);
      const supplier = supplierResult.rows[0];
      console.log(`   ✅ With supplier_id: ${supplier.with_supplier}`);
      console.log(`   ⚠️  Without supplier_id: ${supplier.without_supplier}`);
    } catch (error) {
      console.log(`   ⚠️  Could not check suppliers: ${error.message}`);
    }
    console.log('');

    // 9. Sample products
    console.log('9️⃣ Sample Products (First 10)');
    console.log('─'.repeat(50));
    try {
      const sampleResult = await client.query(`
        SELECT 
          id,
          name,
          sku,
          selling_price,
          cost_price,
          stock_quantity,
          is_active,
          branch_id,
          category_id,
          created_at
        FROM lats_products
        ORDER BY created_at DESC
        LIMIT 10
      `);
      
      if (sampleResult.rows.length > 0) {
        sampleResult.rows.forEach((product, i) => {
          console.log(`\n   ${i + 1}. ${product.name || 'Unnamed'}`);
          console.log(`      ID: ${product.id}`);
          console.log(`      SKU: ${product.sku || 'N/A'}`);
          console.log(`      Price: ${parseFloat(product.selling_price || 0).toFixed(2)} (Cost: ${parseFloat(product.cost_price || 0).toFixed(2)})`);
          console.log(`      Stock: ${product.stock_quantity || 0}`);
          console.log(`      Active: ${product.is_active ? 'Yes' : 'No'}`);
          console.log(`      Branch: ${product.branch_id || 'NULL'}`);
          console.log(`      Category: ${product.category_id || 'NULL'}`);
          console.log(`      Created: ${product.created_at ? new Date(product.created_at).toLocaleDateString() : 'N/A'}`);
        });
      }
    } catch (error) {
      console.log(`   ⚠️  Could not fetch samples: ${error.message}`);
    }
    console.log('');

    // 10. Products with images
    console.log('🔟 Image Information');
    console.log('─'.repeat(50));
    try {
      const imageResult = await client.query(`
        SELECT 
          COUNT(*) FILTER (WHERE image_url IS NOT NULL AND image_url != '') as with_image,
          COUNT(*) FILTER (WHERE image_url IS NULL OR image_url = '') as without_image
        FROM lats_products
      `);
      const image = imageResult.rows[0];
      console.log(`   ✅ With image: ${image.with_image}`);
      console.log(`   ⚠️  Without image: ${image.without_image}`);
    } catch (error) {
      console.log(`   ⚠️  Could not check images: ${error.message}`);
    }
    console.log('');

    // 11. Sharing mode information
    console.log('1️⃣1️⃣ Sharing Mode');
    console.log('─'.repeat(50));
    try {
      const sharingResult = await client.query(`
        SELECT 
          sharing_mode,
          COUNT(*) as count
        FROM lats_products
        GROUP BY sharing_mode
        ORDER BY count DESC
      `);
      if (sharingResult.rows.length > 0) {
        sharingResult.rows.forEach((row) => {
          console.log(`   ${row.sharing_mode || 'NULL'}: ${row.count} products`);
        });
      }
    } catch (error) {
      console.log(`   ⚠️  Could not check sharing mode: ${error.message}`);
    }
    console.log('');

    // Summary
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║  📊 SUMMARY                                            ║');
    console.log('╚════════════════════════════════════════════════════════╝');
    console.log(`Total Products: ${totalCount}`);
    console.log('╚════════════════════════════════════════════════════════╝\n');

    await client.end();
    console.log('✅ Analysis complete!');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\nPlease check:');
    console.error('  1. Database connection string is correct');
    console.error('  2. Database is accessible');
    console.error('  3. Network connection is working');
    console.error('  4. Table "lats_products" exists');
    await client.end().catch(() => {});
    process.exit(1);
  }
}

checkProductsData().catch(error => {
  console.error('❌ Fatal Error:', error);
  process.exit(1);
});
