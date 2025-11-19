import 'dotenv/config';
import pg from 'pg';

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

async function checkProduct() {
  await client.connect();
  
  console.log('🔍 Checking Modal Test Product in Database\n');
  
  // Get product
  const productRes = await client.query(`
    SELECT id, name, sku, selling_price, cost_price, stock_quantity
    FROM lats_products
    WHERE name = 'Modal Test Product'
  `);
  
  if (productRes.rows.length === 0) {
    console.log('❌ Product not found');
    await client.end();
    return;
  }
  
  const product = productRes.rows[0];
  console.log('📦 PRODUCT INFO:');
  console.log('Name:', product.name);
  console.log('SKU:', product.sku);
  console.log('Selling Price: TSh', product.selling_price);
  console.log('Cost Price: TSh', product.cost_price);
  console.log('Product-Level Stock:', product.stock_quantity);
  
  // Get variants
  const variantsRes = await client.query(`
    SELECT id, variant_name, sku, quantity, min_quantity, selling_price, cost_price, is_active
    FROM lats_product_variants
    WHERE product_id = $1
    AND parent_variant_id IS NULL
    ORDER BY variant_name
  `, [product.id]);
  
  console.log(`\n📊 VARIANTS (${variantsRes.rows.length} total):`);
  
  let totalStock = 0;
  let inStockCount = 0;
  let lowStockCount = 0;
  let noStockCount = 0;
  let totalValue = 0;
  
  variantsRes.rows.forEach((v, i) => {
    const qty = v.quantity || 0;
    const min = v.min_quantity || 5;
    const price = parseFloat(v.selling_price || 0);
    const cost = parseFloat(v.cost_price || 0);
    
    console.log(`\n${i + 1}. ${v.variant_name}`);
    console.log(`   SKU: ${v.sku}`);
    console.log(`   Stock: ${qty}`);
    console.log(`   Min Qty: ${min}`);
    console.log(`   Selling Price: TSh ${price}`);
    console.log(`   Cost Price: TSh ${cost}`);
    console.log(`   Active: ${v.is_active}`);
    
    totalStock += qty;
    totalValue += price * qty;
    
    // Stock health
    if (qty >= min) {
      console.log('   Status: ✅ Healthy (In Stock)');
      inStockCount++;
    } else if (qty > 0) {
      console.log('   Status: ⚠️  Low Stock');
      lowStockCount++;
    } else {
      console.log('   Status: ❌ No Stock');
      noStockCount++;
    }
  });
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📈 SUMMARY:');
  console.log('Total Variants:', variantsRes.rows.length);
  console.log('Total Stock:', totalStock);
  console.log('Total Value: TSh', totalValue.toLocaleString());
  
  console.log('\n📊 Stock Health:');
  console.log('✅ In Stock (Healthy):', inStockCount, 'variants (qty >= min_quantity)');
  console.log('⚠️  Low Stock:', lowStockCount, 'variants (0 < qty < min_quantity)');
  console.log('❌ No Stock:', noStockCount, 'variants (qty = 0)');
  console.log('🏥 Health Score:', inStockCount, 'of', variantsRes.rows.length, 'healthy');
  
  // Calculate pricing
  if (variantsRes.rows.length > 0) {
    const avgPrice = variantsRes.rows.reduce((sum, v) => sum + parseFloat(v.selling_price || 0), 0) / variantsRes.rows.length;
    const avgCost = variantsRes.rows.reduce((sum, v) => sum + parseFloat(v.cost_price || 0), 0) / variantsRes.rows.length;
    const profit = avgPrice - avgCost;
    const markup = avgCost > 0 ? ((avgPrice - avgCost) / avgCost * 100) : 0;
    
    console.log('\n💰 FINANCIALS (Average):');
    console.log('Price: TSh', avgPrice.toFixed(2));
    console.log('Cost: TSh', avgCost.toFixed(2));
    console.log('Profit: TSh', profit.toFixed(2));
    console.log('Markup:', markup.toFixed(1) + '%');
  }
  
  await client.end();
}

checkProduct().catch(console.error);

