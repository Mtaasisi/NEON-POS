#!/usr/bin/env node

import postgres from 'postgres';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, '.env') });

const databaseUrl = process.env.DATABASE_URL || 
                    process.env.NEON_DATABASE_URL || 
                    process.env.VITE_DATABASE_URL ||
                    'postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

if (!databaseUrl) {
  console.error('❌ DATABASE_URL hazijapatikana!');
  process.exit(1);
}

const sql = postgres(databaseUrl, {
  ssl: 'require',
  max: 1
});

console.log('\n📊 REPORT YA IMEI STATUS - INVENTORY ITEMS\n');
console.log('='.repeat(80));

async function generateIMEIStatusReport() {
  try {
    // 1. Pata jumla ya inventory items
    console.log('\n📦 JUMLA YA INVENTORY ITEMS:');
    const totalItems = await sql`
      SELECT COUNT(*) as total
      FROM inventory_items
    `;
    console.log(`   Total Items: ${totalItems[0].total}`);

    // 2. Pata IMEI status breakdown
    console.log('\n📊 IMEI STATUS BREAKDOWN:');
    const statusBreakdown = await sql`
      SELECT 
        status,
        COUNT(*) as count
      FROM inventory_items
      WHERE imei IS NOT NULL AND imei != ''
      GROUP BY status
      ORDER BY count DESC
    `;
    
    console.log('\n   Status          | Idadi');
    console.log('   ' + '-'.repeat(40));
    for (const row of statusBreakdown) {
      console.log(`   ${(row.status || 'NULL').padEnd(15)} | ${row.count}`);
    }

    // 3. Pata detailed report kwa product_id
    console.log('\n\n📱 DETAILED REPORT - KWA PRODUCT:');
    console.log('='.repeat(80));
    
    const detailedReport = await sql`
      SELECT 
        product_id,
        imei,
        status,
        variant_id,
        created_at
      FROM inventory_items
      WHERE imei IS NOT NULL AND imei != ''
      ORDER BY product_id, status, imei
    `;

    console.log(`\n   Jumla ya Records: ${detailedReport.length}\n`);

    // Group by product_id
    const groupedByProduct = {};
    for (const item of detailedReport) {
      if (!groupedByProduct[item.product_id]) {
        groupedByProduct[item.product_id] = {
          items: [],
          statusCounts: {}
        };
      }
      groupedByProduct[item.product_id].items.push(item);
      
      const status = item.status || 'NULL';
      groupedByProduct[item.product_id].statusCounts[status] = 
        (groupedByProduct[item.product_id].statusCounts[status] || 0) + 1;
    }

    // Print detailed report
    for (const [productId, data] of Object.entries(groupedByProduct)) {
      console.log(`\n${'▼'.repeat(40)}`);
      console.log(`📦 Product ID: ${productId}`);
      console.log(`   Total IMEIs: ${data.items.length}`);
      
      console.log('\n   Status Summary:');
      for (const [status, count] of Object.entries(data.statusCounts)) {
        const icon = status === 'available' ? '✅' : 
                     status === 'sold' ? '💰' : 
                     status === 'reserved' ? '🔒' : 
                     status === 'damaged' ? '❌' : '❓';
        console.log(`   ${icon} ${status.padEnd(15)} : ${count}`);
      }

      console.log('\n   IMEI Details:');
      console.log('   ' + '-'.repeat(70));
      console.log('   IMEI'.padEnd(20) + 'Status'.padEnd(20) + 'Variant ID');
      console.log('   ' + '-'.repeat(70));
      
      for (const item of data.items) {
        const imeiDisplay = (item.imei || 'NULL').substring(0, 17).padEnd(20);
        const statusDisplay = (item.status || 'NULL').padEnd(20);
        const variantDisplay = item.variant_id || 'NULL';
        console.log(`   ${imeiDisplay}${statusDisplay}${variantDisplay}`);
      }
    }

    // 4. Summary Statistics
    console.log('\n\n' + '='.repeat(80));
    console.log('📈 SUMMARY STATISTICS');
    console.log('='.repeat(80));

    const summaryStats = await sql`
      SELECT 
        COUNT(DISTINCT product_id) as total_products,
        COUNT(DISTINCT imei) as unique_imeis,
        COUNT(*) as total_records,
        COUNT(CASE WHEN status = 'available' THEN 1 END) as available_count,
        COUNT(CASE WHEN status = 'sold' THEN 1 END) as sold_count,
        COUNT(CASE WHEN status = 'reserved' THEN 1 END) as reserved_count,
        COUNT(CASE WHEN status = 'damaged' THEN 1 END) as damaged_count,
        COUNT(CASE WHEN status NOT IN ('available', 'sold', 'reserved', 'damaged') OR status IS NULL THEN 1 END) as other_status_count
      FROM inventory_items
      WHERE imei IS NOT NULL AND imei != ''
    `;

    const stats = summaryStats[0];
    console.log(`\n✅ Valid Status Breakdown:`);
    console.log(`   Available: ${stats.available_count}`);
    console.log(`   Sold: ${stats.sold_count}`);
    console.log(`   Reserved: ${stats.reserved_count}`);
    console.log(`   Damaged: ${stats.damaged_count}`);
    console.log(`\n❌ Invalid/Other Status: ${stats.other_status_count}`);
    console.log(`\n📊 Totals:`);
    console.log(`   Total Products with IMEI: ${stats.total_products}`);
    console.log(`   Unique IMEIs: ${stats.unique_imeis}`);
    console.log(`   Total Records: ${stats.total_records}`);

    // 5. Check for duplicate IMEIs
    console.log('\n\n🔍 DUPLICATE IMEI CHECK:');
    const duplicates = await sql`
      SELECT 
        imei,
        COUNT(*) as count,
        array_agg(DISTINCT product_id) as product_ids,
        array_agg(DISTINCT status) as statuses
      FROM inventory_items
      WHERE imei IS NOT NULL AND imei != ''
      GROUP BY imei
      HAVING COUNT(*) > 1
      ORDER BY count DESC
    `;

    if (duplicates.length > 0) {
      console.log(`\n   ⚠️  Found ${duplicates.length} duplicate IMEIs!\n`);
      console.log('   IMEI'.padEnd(20) + 'Count'.padEnd(10) + 'Product IDs');
      console.log('   ' + '-'.repeat(60));
      for (const dup of duplicates.slice(0, 10)) {
        console.log(`   ${dup.imei.substring(0, 17).padEnd(20)}${String(dup.count).padEnd(10)}${dup.product_ids.join(', ')}`);
      }
      if (duplicates.length > 10) {
        console.log(`\n   ... na ${duplicates.length - 10} zaidi`);
      }
    } else {
      console.log(`\n   ✅ Hakuna duplicate IMEIs!`);
    }

    // 6. Items without IMEI
    console.log('\n\n📋 ITEMS WITHOUT IMEI:');
    const noImei = await sql`
      SELECT 
        status,
        COUNT(*) as count
      FROM inventory_items
      WHERE imei IS NULL OR imei = ''
      GROUP BY status
      ORDER BY count DESC
    `;

    if (noImei.length > 0) {
      console.log('\n   Status          | Idadi');
      console.log('   ' + '-'.repeat(40));
      let totalNoImei = 0;
      for (const row of noImei) {
        console.log(`   ${(row.status || 'NULL').padEnd(15)} | ${row.count}`);
        totalNoImei += parseInt(row.count);
      }
      console.log('   ' + '-'.repeat(40));
      console.log(`   Total           | ${totalNoImei}`);
    } else {
      console.log(`\n   ✅ Kila item ina IMEI!`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ REPORT COMPLETE!');
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    throw error;
  }
}

// Run the report
generateIMEIStatusReport()
  .then(() => {
    console.log('\n✅ Report imetengenezwa kikamilifu!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });

