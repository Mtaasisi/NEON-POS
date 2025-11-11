#!/usr/bin/env node
/**
 * Check pricing for SKU-1761465747854-0E5 variants
 */
import pg from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.VITE_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkPricing() {
  try {
    console.log('\n💰 Checking Pricing Issue\n');
    console.log('='.repeat(120));

    // Get parent variants with pricing
    const query1 = `
      SELECT 
        id,
        sku,
        variant_name,
        quantity,
        cost_price,
        selling_price,
        is_parent,
        variant_type
      FROM lats_product_variants
      WHERE sku LIKE 'SKU-1761465747854-0E5%'
        AND parent_variant_id IS NULL
      ORDER BY sku;
    `;
    
    const result1 = await pool.query(query1);
    const parents = result1.rows;
    
    console.log('\n📋 PARENT VARIANTS - Pricing:\n');
    console.log('SKU'.padEnd(35), 'Name'.padEnd(20), 'Cost Price'.padEnd(15), 'Selling Price'.padEnd(15), 'Type');
    console.log('-'.repeat(120));
    
    for (const parent of parents) {
      console.log(
        (parent.sku || 'N/A').padEnd(35),
        (parent.variant_name || 'N/A').padEnd(20),
        `TSh ${(Number(parent.cost_price) || 0).toLocaleString()}`.padEnd(15),
        `TSh ${(Number(parent.selling_price) || 0).toLocaleString()}`.padEnd(15),
        parent.variant_type || 'N/A'
      );
    }

    console.log('\n📱 CHILD DEVICES - Pricing:\n');
    
    for (const parent of parents) {
      const query2 = `
        SELECT 
          id,
          variant_attributes->>'imei' as imei,
          variant_attributes->>'serial_number' as serial_number,
          cost_price,
          selling_price,
          quantity,
          is_active
        FROM lats_product_variants
        WHERE parent_variant_id = $1
          AND variant_type = 'imei_child'
        ORDER BY created_at;
      `;
      
      const result2 = await pool.query(query2, [parent.id]);
      const children = result2.rows;
      
      console.log(`\n${parent.sku} (${parent.variant_name}) - ${children.length} devices:`);
      console.log('  IMEI/S/N'.padEnd(30), 'Cost'.padEnd(15), 'Selling'.padEnd(15), 'Status');
      console.log('  ' + '-'.repeat(100));
      
      if (children.length === 0) {
        console.log('  No child devices');
      }
      
      for (const child of children) {
        const identifier = child.imei || child.serial_number || 'Unknown';
        const status = child.is_active && child.quantity > 0 ? '✅ Available' : '❌ Sold';
        
        console.log(
          `  ${identifier}`.padEnd(30),
          `TSh ${(Number(child.cost_price) || 0).toLocaleString()}`.padEnd(15),
          `TSh ${(Number(child.selling_price) || 0).toLocaleString()}`.padEnd(15),
          status
        );
      }
    }

    console.log('\n' + '='.repeat(120));
    console.log('\n🔍 PRICING ANALYSIS:\n');

    let issues = [];
    
    for (const parent of parents) {
      const parentPrice = Number(parent.selling_price) || 0;
      
      if (parentPrice === 0) {
        issues.push(`❌ ${parent.sku}: Parent has TSh 0 selling price`);
      }
      
      const query3 = `
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE selling_price = 0 OR selling_price IS NULL) as zero_price,
          MIN(selling_price) as min_price,
          MAX(selling_price) as max_price,
          AVG(selling_price) as avg_price
        FROM lats_product_variants
        WHERE parent_variant_id = $1
          AND variant_type = 'imei_child';
      `;
      
      const result3 = await pool.query(query3, [parent.id]);
      const stats = result3.rows[0];
      
      if (Number(stats.zero_price) > 0) {
        issues.push(`⚠️  ${parent.sku}: ${stats.zero_price}/${stats.total} children have TSh 0 price`);
      }
      
      if (Number(stats.total) > 0 && parentPrice === 0) {
        console.log(`\n${parent.sku} (${parent.variant_name}):`);
        console.log(`  Parent Price: TSh 0`);
        console.log(`  Children Prices: Min TSh ${Number(stats.min_price).toLocaleString()}, Max TSh ${Number(stats.max_price).toLocaleString()}, Avg TSh ${Math.round(Number(stats.avg_price)).toLocaleString()}`);
        console.log(`  Children with TSh 0: ${stats.zero_price}/${stats.total}`);
      }
    }

    if (issues.length > 0) {
      console.log('\n⚠️  ISSUES FOUND:\n');
      issues.forEach(issue => console.log(`  ${issue}`));
    } else {
      console.log('\n✅ No pricing issues found!');
    }

    console.log('\n💡 RECOMMENDATIONS:\n');
    console.log('1. Parent variants should have a base selling_price set');
    console.log('2. Each IMEI child should inherit or have its own selling_price');
    console.log('3. For display, consider showing price range if children have different prices');
    console.log('4. Zero prices may indicate incomplete data entry during receiving\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

checkPricing().catch(console.error);

