// Script to make all customers shared across all branches
import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const sql = neon(DATABASE_URL);

async function makeAllCustomersShared() {
  console.log('🔄 Making all customers shared across all branches...\n');

  try {
    // First, check current customer count and sharing status
    const beforeStats = await sql`
      SELECT
        COUNT(*) as total_customers,
        COUNT(*) FILTER (WHERE is_shared = true) as shared_customers,
        COUNT(*) FILTER (WHERE is_shared = false OR is_shared IS NULL) as non_shared_customers,
        COUNT(*) FILTER (WHERE sharing_mode = 'shared') as shared_mode_customers,
        COUNT(*) FILTER (WHERE sharing_mode != 'shared' OR sharing_mode IS NULL) as non_shared_mode_customers
      FROM customers
    `;

    console.log('📊 BEFORE UPDATE:');
    console.log(`   Total customers: ${beforeStats[0].total_customers}`);
    console.log(`   Already shared (is_shared=true): ${beforeStats[0].shared_customers}`);
    console.log(`   Not shared (is_shared=false/null): ${beforeStats[0].non_shared_customers}`);
    console.log(`   Shared mode: ${beforeStats[0].shared_mode_customers}`);
    console.log(`   Non-shared mode: ${beforeStats[0].non_shared_mode_customers}`);
    console.log('');

    if (beforeStats[0].total_customers === 0) {
      console.log('❌ No customers found in database!');
      return;
    }

    // Update all customers to be shared
    console.log('🔄 Updating all customers to be shared...');

    const updateResult = await sql`
      UPDATE customers
      SET
        is_shared = true,
        sharing_mode = 'shared',
        visible_to_branches = NULL,
        updated_at = NOW()
      WHERE is_shared = false OR is_shared IS NULL OR sharing_mode != 'shared'
    `;

    console.log(`✅ Updated ${updateResult.rowCount} customers to be shared`);
    console.log('');

    // Verify the update
    const afterStats = await sql`
      SELECT
        COUNT(*) as total_customers,
        COUNT(*) FILTER (WHERE is_shared = true) as shared_customers,
        COUNT(*) FILTER (WHERE is_shared = false OR is_shared IS NULL) as non_shared_customers,
        COUNT(*) FILTER (WHERE sharing_mode = 'shared') as shared_mode_customers,
        COUNT(*) FILTER (WHERE sharing_mode != 'shared' OR sharing_mode IS NULL) as non_shared_mode_customers
      FROM customers
    `;

    console.log('📊 AFTER UPDATE:');
    console.log(`   Total customers: ${afterStats[0].total_customers}`);
    console.log(`   Now shared (is_shared=true): ${afterStats[0].shared_customers}`);
    console.log(`   Still not shared: ${afterStats[0].non_shared_customers}`);
    console.log(`   Shared mode: ${afterStats[0].shared_mode_customers}`);
    console.log(`   Non-shared mode: ${afterStats[0].non_shared_mode_customers}`);
    console.log('');

    // Show a sample of updated customers
    const sampleCustomers = await sql`
      SELECT id, name, phone, is_shared, sharing_mode, branch_id, created_by_branch_name
      FROM customers
      ORDER BY updated_at DESC
      LIMIT 5
    `;

    console.log('📋 SAMPLE UPDATED CUSTOMERS:');
    sampleCustomers.forEach((customer, index) => {
      console.log(`   ${index + 1}. ${customer.name} (${customer.phone})`);
      console.log(`      Shared: ${customer.is_shared}, Mode: ${customer.sharing_mode}, Branch: ${customer.created_by_branch_name || 'N/A'}`);
    });
    console.log('');

    if (afterStats[0].non_shared_customers === 0) {
      console.log('🎉 SUCCESS: All customers are now shared across all branches!');
    } else {
      console.log(`⚠️  WARNING: ${afterStats[0].non_shared_customers} customers are still not shared`);
    }

  } catch (error) {
    console.error('❌ Error updating customers:', error);
    process.exit(1);
  }
}

// Run the update
makeAllCustomersShared().catch(console.error);
