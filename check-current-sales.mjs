#!/usr/bin/env node
/**
 * Quick check of today's sales data
 */

import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  // Get database URL
  let databaseUrl = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

  if (!databaseUrl) {
    try {
      const supabaseClientPath = join(__dirname, 'src', 'lib', 'supabaseClient.ts');
      const supabaseConfig = readFileSync(supabaseClientPath, 'utf-8');
      const urlMatch = supabaseConfig.match(/postgresql:\/\/[^\s'"]+/);
      if (urlMatch) {
        databaseUrl = urlMatch[0];
      }
    } catch (err) {
      console.error('Could not find database URL');
      process.exit(1);
    }
  }

  console.log('Connecting to database...\n');
  const sql = neon(databaseUrl);

  // Get today's sales
  const sales = await sql`
    SELECT 
      sale_number,
      total_amount,
      customer_name,
      payment_method,
      created_at,
      LENGTH(total_amount::TEXT) as digits
    FROM lats_sales
    WHERE created_at >= CURRENT_DATE
    ORDER BY created_at DESC
  `;

  console.log('📊 Today\'s Sales:\n');
  console.log('Sale Number | Total Amount | Digits | Customer | Payment | Time');
  console.log('-'.repeat(90));
  
  let totalSum = 0;
  sales.forEach(sale => {
    const amount = parseFloat(sale.total_amount) || 0;
    totalSum += amount;
    console.log(
      `${sale.sale_number.padEnd(20)} | ${String(sale.total_amount).padStart(12)} | ${String(sale.digits).padStart(6)} | ${(sale.customer_name || 'N/A').padEnd(15)} | ${new Date(sale.created_at).toLocaleTimeString()}`
    );
  });
  
  console.log('-'.repeat(90));
  console.log(`\n✅ Total: TSh ${totalSum.toLocaleString()}`);
  console.log(`✅ Transactions: ${sales.length}`);
  console.log(`✅ Average: TSh ${Math.round(totalSum / sales.length).toLocaleString()}`);
}

main().catch(console.error);

