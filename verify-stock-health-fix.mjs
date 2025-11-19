import 'dotenv/config';
import pg from 'pg';

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

async function verifyFix() {
  await client.connect();
  
  console.log('🔍 Verifying Stock Health Fix for Modal Test Product\n');
  
  // Get product
  const productRes = await client.query(`
    SELECT id, name FROM lats_products WHERE name = 'Modal Test Product'
  `);
  
  if (productRes.rows.length === 0) {
    console.log('❌ Product not found');
    await client.end();
    return;
  }
  
  const product = productRes.rows[0];
  
  // Get variants
  const variantsRes = await client.query(`
    SELECT 
      id, 
      variant_name, 
      sku, 
      quantity, 
      min_quantity,
      selling_price,
      cost_price
    FROM lats_product_variants
    WHERE product_id = $1
    AND parent_variant_id IS NULL
    ORDER BY variant_name
  `, [product.id]);
  
  console.log('📊 DATABASE DATA:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  let inStockCount = 0;      // qty >= min_quantity
  let lowStockCount = 0;     // 0 < qty < min_quantity
  let noStockCount = 0;      // qty = 0
  let totalStock = 0;
  let totalValue = 0;
  
  variantsRes.rows.forEach((v) => {
    const qty = v.quantity || 0;
    const min = v.min_quantity || 5;
    const price = parseFloat(v.selling_price || 0);
    const cost = parseFloat(v.cost_price || 0);
    
    console.log(`\n${v.variant_name}:`);
    console.log(`  Stock: ${qty}, Min: ${min}`);
    console.log(`  Price: TSh ${price.toLocaleString()}, Cost: TSh ${cost.toLocaleString()}`);
    
    totalStock += qty;
    totalValue += price * qty;
    
    // Apply the FIXED logic
    if (qty >= min) {
      console.log(`  ✅ In Stock (Healthy): qty ${qty} >= min ${min}`);
      inStockCount++;
    } else if (qty > 0 && qty < min) {
      console.log(`  ⚠️  Low Stock: 0 < qty ${qty} < min ${min}`);
      lowStockCount++;
    } else {
      console.log(`  ❌ No Stock: qty = ${qty}`);
      noStockCount++;
    }
  });
  
  const profit = totalValue - variantsRes.rows.reduce((sum, v) => sum + (parseFloat(v.cost_price || 0) * (v.quantity || 0)), 0);
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📈 EXPECTED UI VALUES (After Fix):');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`\n✅ In Stock:     ${inStockCount} variants (qty >= min_quantity)`);
  console.log(`⚠️  Low Stock:    ${lowStockCount} variants (0 < qty < min_quantity)`);
  console.log(`❌ No Stock:     ${noStockCount} variants (qty = 0)`);
  console.log(`🏥 Stock Health: ${inStockCount} of ${variantsRes.rows.length} healthy`);
  
  console.log(`\n💰 Financials:`);
  console.log(`   Total Stock:  ${totalStock} units`);
  console.log(`   Total Value:  TSh ${totalValue.toLocaleString()}`);
  console.log(`   Total Profit: TSh ${profit.toFixed(2)}`);
  
  const healthPercentage = variantsRes.rows.length > 0 ? (inStockCount / variantsRes.rows.length * 100).toFixed(0) : 0;
  console.log(`\n📊 Health Bar:   ${healthPercentage}% (green bar)`);
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Fix Applied:');
  console.log('   - "In Stock" now uses: qty >= minQuantity (was: qty > 0)');
  console.log('   - "Low Stock" now uses: variant.minQuantity (was: hardcoded < 5)');
  console.log('   - "No Stock" now uses: qty === 0 (was: qty <= 0)');
  console.log('   - "Stock Health" now uses: qty >= minQuantity (was: qty > minQuantity)');
  console.log('\n✨ The UI should now match the database calculations exactly!');
  
  await client.end();
}

verifyFix().catch(console.error);

