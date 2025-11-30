#!/usr/bin/env node

import postgres from 'postgres';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { writeFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, '.env') });

const databaseUrl = process.env.DATABASE_URL || 
                    process.env.NEON_DATABASE_URL || 
                    process.env.VITE_DATABASE_URL ||
                    'postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

const sql = postgres(databaseUrl, {
  ssl: 'require',
  max: 1
});

console.log('\n📊 EXPORTING IMEI STATUS TO CSV...\n');

async function exportToCSV() {
  try {
    // Get all inventory items with IMEI
    const items = await sql`
      SELECT 
        product_id,
        imei,
        status,
        variant_id,
        created_at,
        updated_at
      FROM inventory_items
      WHERE imei IS NOT NULL AND imei != ''
      ORDER BY product_id, status, imei
    `;

    console.log(`✅ Found ${items.length} items with IMEI`);

    // Create CSV header
    let csv = 'Product ID,IMEI,Status,Variant ID,Created At,Updated At\n';

    // Add data rows
    for (const item of items) {
      const row = [
        item.product_id || '',
        item.imei || '',
        item.status || '',
        item.variant_id || '',
        item.created_at ? new Date(item.created_at).toISOString() : '',
        item.updated_at ? new Date(item.updated_at).toISOString() : ''
      ];
      
      // Escape and quote fields that might contain commas
      const escapedRow = row.map(field => {
        const str = String(field);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      });
      
      csv += escapedRow.join(',') + '\n';
    }

    // Write to file
    const filename = `imei_status_report_${new Date().toISOString().split('T')[0]}.csv`;
    writeFileSync(filename, csv, 'utf8');

    console.log(`\n✅ CSV file created: ${filename}`);
    console.log(`   Total records: ${items.length}`);
    
    // Create summary CSV
    const summary = await sql`
      SELECT 
        product_id,
        status,
        COUNT(*) as count
      FROM inventory_items
      WHERE imei IS NOT NULL AND imei != ''
      GROUP BY product_id, status
      ORDER BY product_id, status
    `;

    let summaryCsv = 'Product ID,Status,Count\n';
    for (const row of summary) {
      summaryCsv += `${row.product_id},${row.status},${row.count}\n`;
    }

    const summaryFilename = `imei_summary_${new Date().toISOString().split('T')[0]}.csv`;
    writeFileSync(summaryFilename, summaryCsv, 'utf8');

    console.log(`✅ Summary CSV created: ${summaryFilename}`);
    console.log(`   Total groups: ${summary.length}`);

    console.log('\n✅ Export complete!\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    throw error;
  }
}

// Run the export
exportToCSV()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });

