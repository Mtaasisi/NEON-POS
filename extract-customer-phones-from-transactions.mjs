#!/usr/bin/env node

/**
 * Extract Customer Phone Numbers from Transactions
 * 
 * This script finds customers with "unknown" names who have made transactions
 * and exports their phone numbers to a CSV file that you can fill in with real names.
 */

import { neon } from '@neondatabase/serverless';
import { writeFileSync } from 'fs';
import { config } from 'dotenv';

config();

const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

const UNKNOWN_NAME_PATTERNS = [
  /^unknown$/i,
  /^customer$/i,
  /^guest$/i,
  /^mteja$/i,
  /^anonymous$/i,
  /^walk[-\s]?in$/i,
  /^no\s+name$/i,
  /^n\/a$/i,
  /^\d+$/,
  /^test/i,
  /^sample/i
];

function isUnknownName(name) {
  if (!name || typeof name !== 'string') return true;
  const trimmed = name.trim();
  if (trimmed.length < 2) return true;
  return UNKNOWN_NAME_PATTERNS.some(pattern => pattern.test(trimmed));
}

async function main() {
  console.log('🔍 Extracting customer phone numbers from transactions...\n');
  console.log('=' .repeat(70));
  
  try {
    // Find customers with unknown names who have transactions
    console.log('\n📊 Checking customers table...');
    const customers = await sql`
      SELECT DISTINCT 
        c.id,
        c.name,
        c.phone,
        c.whatsapp,
        c.total_purchases,
        c.total_spent,
        c.last_purchase_date
      FROM customers c
      WHERE c.phone IS NOT NULL AND c.phone != ''
      ORDER BY c.total_spent DESC NULLS LAST
    `;
    
    console.log(`   Found ${customers.length} customers with phone numbers`);
    
    // Filter for unknown names
    const unknownCustomers = customers.filter(c => isUnknownName(c.name));
    
    console.log(`   ${unknownCustomers.length} have unknown names\n`);
    
    // Also check lats_customers
    console.log('📊 Checking lats_customers table...');
    const latsCustomers = await sql`
      SELECT DISTINCT
        c.id,
        c.name,
        c.phone,
        c.total_spent,
        c.created_at
      FROM lats_customers c
      WHERE c.phone IS NOT NULL AND c.phone != ''
      ORDER BY c.total_spent DESC NULLS LAST
    `;
    
    console.log(`   Found ${latsCustomers.length} customers with phone numbers`);
    
    const unknownLatsCustomers = latsCustomers.filter(c => isUnknownName(c.name));
    
    console.log(`   ${unknownLatsCustomers.length} have unknown names\n`);
    
    // Combine and deduplicate by phone
    const phoneMap = new Map();
    
    for (const customer of [...unknownCustomers, ...unknownLatsCustomers]) {
      const phone = customer.phone.trim();
      if (!phone) continue;
      
      if (!phoneMap.has(phone)) {
        phoneMap.set(phone, {
          phone: phone,
          currentName: customer.name,
          totalSpent: customer.total_spent || 0,
          totalPurchases: customer.total_purchases || 0,
          lastPurchase: customer.last_purchase_date || customer.created_at
        });
      }
    }
    
    console.log('=' .repeat(70));
    console.log(`\n📋 Found ${phoneMap.size} unique phone numbers with unknown names\n`);
    
    if (phoneMap.size === 0) {
      console.log('✅ All customers have proper names!');
      return;
    }
    
    // Generate CSV
    const csvLines = ['phone,name,current_name,total_spent,total_purchases,last_purchase'];
    
    const sortedCustomers = Array.from(phoneMap.values())
      .sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0));
    
    for (const customer of sortedCustomers) {
      csvLines.push(
        `${customer.phone},,${customer.currentName},${customer.totalSpent},${customer.totalPurchases},${customer.lastPurchase || ''}`
      );
    }
    
    const csvContent = csvLines.join('\n');
    const outputFile = 'customer-names-to-update.csv';
    
    writeFileSync(outputFile, csvContent, 'utf-8');
    
    console.log(`✅ Exported to: ${outputFile}\n`);
    console.log('📝 Instructions:');
    console.log('   1. Open customer-names-to-update.csv in Excel or any text editor');
    console.log('   2. Fill in the "name" column with the correct customer names');
    console.log('   3. You can use the phone numbers to look up names in your SMS data');
    console.log('   4. Save the file');
    console.log('   5. Run: node update-customers-from-csv.mjs customer-names-to-update.csv\n');
    
    // Show preview
    console.log('📊 Preview (top 10 customers by spending):\n');
    console.log('Phone              | Current Name  | Total Spent | Purchases');
    console.log('-'.repeat(70));
    
    for (let i = 0; i < Math.min(10, sortedCustomers.length); i++) {
      const c = sortedCustomers[i];
      const phone = c.phone.padEnd(18);
      const name = c.currentName.substring(0, 13).padEnd(13);
      const spent = `${c.totalSpent}`.padEnd(11);
      const purchases = c.totalPurchases;
      
      console.log(`${phone} | ${name} | ${spent} | ${purchases}`);
    }
    
    if (sortedCustomers.length > 10) {
      console.log(`... and ${sortedCustomers.length - 10} more`);
    }
    
    console.log('\n✨ Next step: Fill in the CSV and run the update script!');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

main().catch(console.error);

