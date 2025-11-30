#!/usr/bin/env node
import pg from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.VITE_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkSkuIssue() {
  try {
    console.log('\n🔍 Checking SKU-1761465747854-0E5 variants...\n');
    console.log('='.repeat(120));

    // Query 1: Get all variants (parents and children)
    const query1 = `
      SELECT 
        pv.id,
        pv.sku,
        pv.variant_name,
        pv.quantity as parent_quantity,
        pv.is_parent,
        pv.variant_type,
        pv.parent_variant_id,
        pv.is_active,
        pv.selling_price,
        pv.variant_attributes->>'imei' as imei,
        pv.variant_attributes->>'serial_number' as serial_number
      FROM lats_product_variants pv
      WHERE pv.sku LIKE 'SKU-1761465747854-0E5%'
         OR pv.parent_variant_id IN (
            SELECT id FROM lats_product_variants WHERE sku LIKE 'SKU-1761465747854-0E5%'
         )
      ORDER BY 
        pv.parent_variant_id NULLS FIRST,
        pv.created_at;
    `;

    const result1 = await pool.query(query1);
    const allVariants = result1.rows;

    const parentVariants = allVariants.filter(v => !v.parent_variant_id);

    console.log('\n📋 PARENT VARIANTS:\n');
    console.log('SKU'.padEnd(35), 'Name'.padEnd(20), 'Stock'.padEnd(8), 'Is Parent'.padEnd(12), 'Type'.padEnd(15));
    console.log('-'.repeat(120));

    for (const parent of parentVariants) {
      console.log(
        (parent.sku || 'N/A').padEnd(35),
        (parent.variant_name || 'N/A').padEnd(20),
        String(parent.parent_quantity || 0).padEnd(8),
        String(parent.is_parent || false).padEnd(12),
        (parent.variant_type || 'N/A').padEnd(15)
      );
    }

    console.log('\n📱 CHILD DEVICES (IMEI):\n');
    console.log('Parent SKU'.padEnd(35), 'IMEI/S/N'.padEnd(25), 'Active'.padEnd(10), 'Qty'.padEnd(6), 'Price');
    console.log('-'.repeat(120));

    for (const parent of parentVariants) {
      const children = allVariants.filter(v => v.parent_variant_id === parent.id);
      
      if (children.length > 0) {
        console.log(`\n${parent.sku} (${parent.variant_name}) - ${children.length} devices:`);
        
        for (const child of children) {
          const imei = child.imei || 'N/A';
          const sn = child.serial_number || '';
          const identifier = imei !== 'N/A' ? imei : (sn || 'Unknown');
          
          console.log(
            '  →'.padEnd(35),
            identifier.padEnd(25),
            String(child.is_active).padEnd(10),
            String(child.parent_quantity || 0).padEnd(6),
            `TSh ${(Number(child.selling_price) || 0).toLocaleString()}`
          );
        }
      } else {
        console.log(`\n${parent.sku} (${parent.variant_name}) - No devices`);
      }
    }

    // Query 2: Get aggregated stats
    const query2 = `
      SELECT 
        parent.sku as parent_sku,
        parent.variant_name,
        parent.quantity as parent_quantity,
        parent.is_parent,
        COUNT(child.id) as total_children,
        COUNT(child.id) FILTER (WHERE child.is_active = TRUE AND child.quantity > 0) as available_children,
        COUNT(child.id) FILTER (WHERE child.is_active = FALSE OR child.quantity = 0) as sold_children
      FROM lats_product_variants parent
      LEFT JOIN lats_product_variants child ON child.parent_variant_id = parent.id AND child.variant_type = 'imei_child'
      WHERE parent.sku LIKE 'SKU-1761465747854-0E5%' AND parent.parent_variant_id IS NULL
      GROUP BY parent.id, parent.sku, parent.variant_name, parent.quantity, parent.is_parent
      ORDER BY parent.sku;
    `;

    const result2 = await pool.query(query2);
    const stats = result2.rows;

    console.log('\n📊 STOCK ANALYSIS:\n');
    console.log('Parent SKU'.padEnd(35), 'DB Stock'.padEnd(12), 'Total Devices'.padEnd(18), 'Available'.padEnd(12), 'Sold'.padEnd(10), 'Status');
    console.log('-'.repeat(120));

    for (const stat of stats) {
      const dbStock = Number(stat.parent_quantity) || 0;
      const available = Number(stat.available_children) || 0;
      const sold = Number(stat.sold_children) || 0;
      const total = Number(stat.total_children) || 0;
      
      const status = dbStock === available ? '✅ CORRECT' : '❌ MISMATCH!';
      
      console.log(
        (stat.parent_sku || 'N/A').padEnd(35),
        String(dbStock).padEnd(12),
        `${total} total`.padEnd(18),
        `${available} avail`.padEnd(12),
        `${sold} sold`.padEnd(10),
        status
      );
    }

    console.log('\n' + '='.repeat(120));
    console.log('\n🔧 ISSUE SUMMARY:\n');

    let issuesFound = 0;
    for (const stat of stats) {
      const dbStock = Number(stat.parent_quantity) || 0;
      const available = Number(stat.available_children) || 0;
      const total = Number(stat.total_children) || 0;
      
      if (dbStock !== available) {
        issuesFound++;
        console.log(`❌ ${stat.parent_sku} (${stat.variant_name}):`);
        console.log(`   📊 Current DB stock: ${dbStock}`);
        console.log(`   ✅ Should be: ${available} (based on ${total} total devices, ${available} available)`);
        console.log(`   📝 Discrepancy: ${Math.abs(dbStock - available)} units`);
        
        const parent = parentVariants.find(p => p.sku === stat.parent_sku);
        if (parent) {
          console.log(`\n   🔧 SQL FIX:`);
          console.log(`   UPDATE lats_product_variants SET quantity = ${available}, updated_at = NOW() WHERE id = '${parent.id}';`);
        }
        console.log('');
      }
    }

    if (issuesFound === 0) {
      console.log('✅ No stock discrepancies found! All parent variants have correct stock counts.\n');
    } else {
      console.log(`\n⚠️  Found ${issuesFound} issue(s) that need to be fixed.\n`);
      console.log('💡 WHAT TO DO NEXT:');
      console.log('   1. Review the SQL FIX commands above');
      console.log('   2. Run them in your database to correct the stock counts');
      console.log('   3. Or run: node fix-parent-stock.mjs to automatically fix all issues\n');
    }

    console.log('✨ Analysis complete!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

checkSkuIssue().catch(console.error);

