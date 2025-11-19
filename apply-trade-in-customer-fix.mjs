#!/usr/bin/env node

/**
 * Apply Trade-In Customer Fix
 * 
 * This script adds the is_trade_in_customer flag to the lats_suppliers table
 * and updates existing trade-in suppliers to have this flag set to true.
 */

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

const sql = neon(process.env.VITE_DATABASE_URL || process.env.DATABASE_URL);

async function main() {
  console.log('🔧 Applying Trade-In Customer Fix...\n');

  try {
    // Step 1: Add the column
    console.log('Step 1: Adding is_trade_in_customer column...');
    await sql`
      ALTER TABLE lats_suppliers 
      ADD COLUMN IF NOT EXISTS is_trade_in_customer BOOLEAN DEFAULT false
    `;
    console.log('✅ Column added successfully\n');

    // Step 2: Update existing trade-in suppliers
    console.log('Step 2: Updating existing trade-in suppliers...');
    const updateResult = await sql`
      UPDATE lats_suppliers 
      SET is_trade_in_customer = true 
      WHERE name LIKE 'Trade-In:%'
      RETURNING id, name
    `;
    console.log(`✅ Updated ${updateResult.length} existing trade-in suppliers\n`);

    if (updateResult.length > 0) {
      console.log('Updated suppliers:');
      updateResult.forEach(supplier => {
        console.log(`  - ${supplier.name}`);
      });
      console.log('');
    }

    // Step 3: Create index
    console.log('Step 3: Creating index...');
    await sql`
      CREATE INDEX IF NOT EXISTS idx_suppliers_is_trade_in_customer 
      ON lats_suppliers(is_trade_in_customer)
    `;
    console.log('✅ Index created successfully\n');

    // Step 4: Verify the changes
    console.log('Step 4: Verifying changes...');
    const stats = await sql`
      SELECT 
        COUNT(*) as total_suppliers,
        COUNT(*) FILTER (WHERE is_trade_in_customer = true) as trade_in_customers,
        COUNT(*) FILTER (WHERE is_trade_in_customer = false) as real_suppliers
      FROM lats_suppliers
    `;

    console.log('📊 Current Statistics:');
    console.log(`  Total Suppliers: ${stats[0].total_suppliers}`);
    console.log(`  Trade-In Customers: ${stats[0].trade_in_customers}`);
    console.log(`  Real Suppliers: ${stats[0].real_suppliers}`);
    console.log('');

    console.log('✅ Fix applied successfully!');
    console.log('\n📝 Next Steps:');
    console.log('  1. Restart your application');
    console.log('  2. Go to Settings → Suppliers');
    console.log('  3. Verify that trade-in customers no longer appear');
    console.log('');

  } catch (error) {
    console.error('❌ Error applying fix:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

main();

