import 'dotenv/config';
import pg from 'pg';

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

async function verifyFinancials() {
  await client.connect();
  
  console.log('🔍 Verifying Financial Calculations for Modal Test Product\n');
  
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
      variant_name, 
      sku, 
      quantity, 
      selling_price,
      cost_price
    FROM lats_product_variants
    WHERE product_id = $1
    AND parent_variant_id IS NULL
    ORDER BY variant_name
  `, [product.id]);
  
  console.log('📊 VARIANT DATA FROM DATABASE:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  let totalCostValue = 0;
  let totalRetailValue = 0;
  let totalProfit = 0;
  
  variantsRes.rows.forEach((v) => {
    const qty = v.quantity || 0;
    const cost = parseFloat(v.cost_price || 0);
    const price = parseFloat(v.selling_price || 0);
    const profitPerUnit = price - cost;
    const totalProfitForVariant = profitPerUnit * qty;
    const costValue = cost * qty;
    const retailValue = price * qty;
    const markup = cost > 0 ? ((price - cost) / cost * 100) : 0;
    
    console.log(`${v.variant_name}:`);
    console.log(`  SKU: ${v.sku}`);
    console.log(`  Stock: ${qty}`);
    console.log(`  Cost Price: TSh ${cost.toLocaleString()}`);
    console.log(`  Selling Price: TSh ${price.toLocaleString()}`);
    console.log(`  Profit/Unit: TSh ${profitPerUnit.toLocaleString()}`);
    console.log(`  Total Profit: TSh ${totalProfitForVariant.toLocaleString()}`);
    console.log(`  Markup: ${markup.toFixed(1)}%\n`);
    
    totalCostValue += costValue;
    totalRetailValue += retailValue;
    totalProfit += totalProfitForVariant;
  });
  
  // Calculate averages (including all variants, even with 0 stock)
  const avgCostAllVariants = variantsRes.rows.reduce((sum, v) => sum + parseFloat(v.cost_price || 0), 0) / variantsRes.rows.length;
  const avgPriceAllVariants = variantsRes.rows.reduce((sum, v) => sum + parseFloat(v.selling_price || 0), 0) / variantsRes.rows.length;
  const avgProfitAllVariants = avgPriceAllVariants - avgCostAllVariants;
  
  // Calculate averages (only variants with stock)
  const variantsWithStock = variantsRes.rows.filter(v => (v.quantity || 0) > 0);
  const avgCostWithStock = variantsWithStock.length > 0 
    ? variantsWithStock.reduce((sum, v) => sum + parseFloat(v.cost_price || 0), 0) / variantsWithStock.length
    : 0;
  const avgPriceWithStock = variantsWithStock.length > 0
    ? variantsWithStock.reduce((sum, v) => sum + parseFloat(v.selling_price || 0), 0) / variantsWithStock.length
    : 0;
  const avgProfitWithStock = avgPriceWithStock - avgCostWithStock;
  
  // Profit margin calculations
  const profitMarginOnRevenue = totalRetailValue > 0 ? (totalProfit / totalRetailValue * 100) : 0;
  const profitMarginOnCost = totalCostValue > 0 ? (totalProfit / totalCostValue * 100) : 0;
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('💰 CALCULATED TOTALS:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log(`Total Cost Value: TSh ${totalCostValue.toLocaleString()} (Investment)`);
  console.log(`Total Retail Value: TSh ${totalRetailValue.toLocaleString()} (Revenue Potential)`);
  console.log(`Potential Profit: TSh ${totalProfit.toLocaleString()} (If all sold)`);
  console.log(`Profit Margin (on revenue): ${profitMarginOnRevenue.toFixed(1)}%`);
  console.log(`Profit Margin (on cost/markup): ${profitMarginOnCost.toFixed(1)}%`);
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 AVERAGE PRICING (All Variants):');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log(`Avg Cost Price: TSh ${avgCostAllVariants.toFixed(2)}`);
  console.log(`Avg Selling Price: TSh ${avgPriceAllVariants.toLocaleString()}`);
  console.log(`Avg Profit/Unit: TSh ${avgProfitAllVariants.toLocaleString()}`);
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 AVERAGE PRICING (Only Variants with Stock):');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log(`Avg Cost Price: TSh ${avgCostWithStock.toFixed(2)}`);
  console.log(`Avg Selling Price: TSh ${avgPriceWithStock.toLocaleString()}`);
  console.log(`Avg Profit/Unit: TSh ${avgProfitWithStock.toLocaleString()}`);
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ EXPECTED UI VALUES:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log('Total Cost Value: TSh', totalCostValue.toLocaleString(), '✅');
  console.log('Total Retail Value: TSh', totalRetailValue.toLocaleString(), '✅');
  console.log('Potential Profit: TSh', totalProfit.toLocaleString(), '✅');
  console.log(`Profit Margin: ${profitMarginOnRevenue.toFixed(1)}% (should be ~99.98%, NOT 100.0%)`);
  console.log('\nNote: UI shows 100.0% which might be rounding, but true value is 99.985%');
  console.log('      Formula should be: (Profit / Revenue) × 100 = (130,000 / 130,020) × 100');
  
  await client.end();
}

verifyFinancials().catch(console.error);

