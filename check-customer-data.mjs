#!/usr/bin/env node

/**
 * Check customer data in database
 */

import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found');
  process.exit(1);
}

const sql = postgres(DATABASE_URL);

async function checkCustomers() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('👥 CUSTOMER DATA CHECK');
  console.log('═══════════════════════════════════════════════════════\n');

  try {
    // Get total customers
    const totalCustomers = await sql`
      SELECT COUNT(*) as count FROM customers
    `;
    console.log(`📊 Total customers in database: ${totalCustomers[0].count}`);

    // Get customers by branch
    const customersByBranch = await sql`
      SELECT 
        branch_id,
        COUNT(*) as count
      FROM customers
      GROUP BY branch_id
      ORDER BY count DESC
    `;

    console.log('\n📍 Customers by branch:');
    for (const row of customersByBranch) {
      // Get branch name
      const branch = await sql`
        SELECT name FROM store_locations WHERE id = ${row.branch_id}
      `;
      const branchName = branch[0]?.name || 'Unknown';
      console.log(`   ${branchName} (${row.branch_id}): ${row.count} customers`);
    }

    // Get sample customers
    const sampleCustomers = await sql`
      SELECT 
        id, name, phone, branch_id, created_at
      FROM customers
      ORDER BY created_at DESC
      LIMIT 5
    `;

    console.log('\n👤 Sample customers (latest 5):');
    for (const customer of sampleCustomers) {
      const branch = await sql`
        SELECT name FROM store_locations WHERE id = ${customer.branch_id}
      `;
      const branchName = branch[0]?.name || 'Unknown';
      console.log(`   - ${customer.name} (${customer.phone}) - Branch: ${branchName}`);
    }

    // Check Main Store branch ID
    const mainBranch = await sql`
      SELECT id, name FROM store_locations WHERE is_main = true
    `;
    
    if (mainBranch.length > 0) {
      const mainBranchId = mainBranch[0].id;
      const mainBranchName = mainBranch[0].name;
      
      const mainStoreCustomers = await sql`
        SELECT COUNT(*) as count 
        FROM customers 
        WHERE branch_id = ${mainBranchId}
      `;
      
      console.log(`\n🏪 Main Store (${mainBranchName}):`);
      console.log(`   ID: ${mainBranchId}`);
      console.log(`   Customers: ${mainStoreCustomers[0].count}`);
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await sql.end();
  }
}

checkCustomers();

