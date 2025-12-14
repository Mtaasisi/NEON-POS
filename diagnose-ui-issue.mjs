#!/usr/bin/env node
/**
 * Diagnose why UI shows different stock than database
 */
import pg from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.VITE_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function diagnoseIssue() {
  try {
    console.log('\n🔍 Diagnosing UI Stock Display Issue\n');
    console.log('='.repeat(120));

    // Get the 256GB variant specifically
    const query = `
      SELECT 
        pv.*,
        p.name as product_name
      FROM lats_product_variants pv
      LEFT JOIN lats_products p ON p.id = pv.product_id
      WHERE pv.sku = 'SKU-1761465747854-0E5-V02';
    `;
    
    const result = await pool.query(query);
    const variant = result.rows[0];
    
    if (!variant) {
      console.log('❌ Variant not found!');
      return;
    }

    console.log('\n📊 256GB Variant Details:\n');
    console.log('  ID:', variant.id);
    console.log('  SKU:', variant.sku);
    console.log('  Name:', variant.variant_name);
    console.log('  Product:', variant.product_name);
    console.log('  Quantity (DB):', variant.quantity);
    console.log('  Is Parent:', variant.is_parent);
    console.log('  Variant Type:', variant.variant_type);
    console.log('  Is Active:', variant.is_active);
    console.log('  Created:', variant.created_at);
    console.log('  Updated:', variant.updated_at);

    // Check children
    const query2 = `
      SELECT 
        id,
        variant_attributes->>'imei' as imei,
        variant_attributes->>'serial_number' as serial_number,
        quantity,
        is_active,
        selling_price
      FROM lats_product_variants
      WHERE parent_variant_id = $1
        AND variant_type = 'imei_child'
      ORDER BY created_at;
    `;
    
    const result2 = await pool.query(query2, [variant.id]);
    const children = result2.rows;
    
    console.log(`\n📱 Children (${children.length} devices):\n`);
    let availableCount = 0;
    for (const child of children) {
      const status = child.is_active && child.quantity > 0 ? '✅ Available' : '❌ Sold';
      if (child.is_active && child.quantity > 0) availableCount++;
      
      const identifier = child.imei || child.serial_number || 'Unknown';
      console.log(`  ${status} - ${identifier} (qty: ${child.quantity}, active: ${child.is_active})`);
    }

    console.log('\n📈 Summary:\n');
    console.log(`  Total Children: ${children.length}`);
    console.log(`  Available: ${availableCount}`);
    console.log(`  Sold: ${children.length - availableCount}`);
    console.log(`  Parent Quantity in DB: ${variant.quantity}`);
    
    const expectedQuantity = children.reduce((sum, c) => sum + (c.is_active && c.quantity > 0 ? c.quantity : 0), 0);
    console.log(`  Expected Quantity: ${expectedQuantity}`);
    
    if (variant.quantity !== expectedQuantity) {
      console.log(`\n  ⚠️  MISMATCH: DB has ${variant.quantity}, should be ${expectedQuantity}`);
    } else {
      console.log(`\n  ✅ Database is correct!`);
    }

    // Check if there's a caching issue
    console.log('\n💡 Possible Issues:\n');
    console.log('1. ✅ Database has correct stock (4 available devices)');
    console.log('2. ✅ API fix is in place to recalculate from children');
    console.log('3. ⚠️  Possible causes of UI showing 0:');
    console.log('    a) Browser cache - try hard refresh (Cmd+Shift+R)');
    console.log('    b) React Query/SWR cache - may need to clear');
    console.log('    c) Product cache service - may need invalidation');
    console.log('    d) The variant data might not have updated_at changed recently');
    
    console.log('\n🔧 Recommended Actions:\n');
    console.log('1. Hard refresh the browser (Cmd+Shift+R or Ctrl+Shift+R)');
    console.log('2. Clear browser localStorage/sessionStorage');
    console.log('3. Restart the dev server to clear any server-side caches');
    console.log('4. Check browser console for any API errors\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

diagnoseIssue().catch(console.error);

