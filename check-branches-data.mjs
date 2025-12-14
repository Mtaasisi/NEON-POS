#!/usr/bin/env node
/**
 * Check branches data in PostgreSQL database
 * Checks both lats_branches and store_locations tables
 */

import pg from 'pg';
const { Client } = pg;

// Get connection string from command line or use provided one
const connectionString = process.argv[2] || 'postgresql://neondb_owner:npg_vABqUKk73tEW@ep-young-firefly-adlvuhdv-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const client = new Client({ 
  connectionString: connectionString,
  ssl: { rejectUnauthorized: false }
});

async function checkBranchesData() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║  🔍 CHECKING BRANCHES DATA                            ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  try {
    // Connect to database
    console.log('📊 Connecting to database...');
    await client.connect();
    console.log('✅ Connected successfully!\n');

    // Check which tables exist
    let hasLatsBranches = false;
    let hasStoreLocations = false;

    try {
      await client.query('SELECT 1 FROM lats_branches LIMIT 1');
      hasLatsBranches = true;
    } catch (error) {
      // Table doesn't exist
    }

    try {
      await client.query('SELECT 1 FROM store_locations LIMIT 1');
      hasStoreLocations = true;
    } catch (error) {
      // Table doesn't exist
    }

    // Check lats_branches table
    if (hasLatsBranches) {
      console.log('╔════════════════════════════════════════════════════════╗');
      console.log('║  📍 LATS_BRANCHES TABLE                              ║');
      console.log('╚════════════════════════════════════════════════════════╝\n');

      // Total count
      const totalResult = await client.query('SELECT COUNT(*) as count FROM lats_branches');
      const totalCount = parseInt(totalResult.rows[0].count);
      console.log(`1️⃣ Total Branches: ${totalCount}\n`);

      if (totalCount > 0) {
        // Active vs Inactive
        console.log('2️⃣ Branch Status');
        console.log('─'.repeat(50));
        try {
          const statusResult = await client.query(`
            SELECT 
              COUNT(*) FILTER (WHERE is_active = true) as active,
              COUNT(*) FILTER (WHERE is_active = false) as inactive,
              COUNT(*) FILTER (WHERE is_active IS NULL) as null_status
            FROM lats_branches
          `);
          const status = statusResult.rows[0];
          console.log(`   ✅ Active: ${status.active}`);
          console.log(`   ❌ Inactive: ${status.inactive}`);
          if (status.null_status > 0) {
            console.log(`   ⚠️  NULL status: ${status.null_status}`);
          }
        } catch (error) {
          console.log(`   ⚠️  Could not check status: ${error.message}`);
        }
        console.log('');

        // All branches with details
        console.log('3️⃣ All Branches');
        console.log('─'.repeat(50));
        try {
          const branchesResult = await client.query(`
            SELECT 
              id,
              name,
              location,
              phone,
              email,
              is_active,
              created_at,
              updated_at
            FROM lats_branches
            ORDER BY created_at DESC
          `);

          if (branchesResult.rows.length > 0) {
            branchesResult.rows.forEach((branch, i) => {
              console.log(`\n   ${i + 1}. ${branch.name || 'Unnamed Branch'}`);
              console.log(`      ID: ${branch.id}`);
              console.log(`      Location: ${branch.location || 'N/A'}`);
              console.log(`      Phone: ${branch.phone || 'N/A'}`);
              console.log(`      Email: ${branch.email || 'N/A'}`);
              console.log(`      Active: ${branch.is_active ? 'Yes' : 'No'}`);
              console.log(`      Created: ${branch.created_at ? new Date(branch.created_at).toLocaleDateString() : 'N/A'}`);
              console.log(`      Updated: ${branch.updated_at ? new Date(branch.updated_at).toLocaleDateString() : 'N/A'}`);
            });
          }
        } catch (error) {
          console.log(`   ⚠️  Could not fetch branches: ${error.message}`);
        }
        console.log('');

        // Products per branch
        console.log('4️⃣ Products per Branch');
        console.log('─'.repeat(50));
        try {
          const productsPerBranchResult = await client.query(`
            SELECT 
              b.id,
              b.name,
              COUNT(p.id) as product_count
            FROM lats_branches b
            LEFT JOIN lats_products p ON p.branch_id = b.id
            GROUP BY b.id, b.name
            ORDER BY product_count DESC
          `);

          if (productsPerBranchResult.rows.length > 0) {
            productsPerBranchResult.rows.forEach((row) => {
              console.log(`   ${row.name}: ${row.product_count} products`);
            });
          }
        } catch (error) {
          console.log(`   ⚠️  Could not check products per branch: ${error.message}`);
        }
        console.log('');
      }
    } else {
      console.log('⚠️  lats_branches table does not exist or is empty\n');
    }

    // Check store_locations table
    if (hasStoreLocations) {
      console.log('╔════════════════════════════════════════════════════════╗');
      console.log('║  🏪 STORE_LOCATIONS TABLE                            ║');
      console.log('╚════════════════════════════════════════════════════════╝\n');

      // Total count
      const totalResult = await client.query('SELECT COUNT(*) as count FROM store_locations');
      const totalCount = parseInt(totalResult.rows[0].count);
      console.log(`1️⃣ Total Store Locations: ${totalCount}\n`);

      if (totalCount > 0) {
        // Active vs Inactive
        console.log('2️⃣ Store Location Status');
        console.log('─'.repeat(50));
        try {
          const statusResult = await client.query(`
            SELECT 
              COUNT(*) FILTER (WHERE is_active = true) as active,
              COUNT(*) FILTER (WHERE is_active = false) as inactive,
              COUNT(*) FILTER (WHERE is_active IS NULL) as null_status,
              COUNT(*) FILTER (WHERE is_main = true) as main_stores
            FROM store_locations
          `);
          const status = statusResult.rows[0];
          console.log(`   ✅ Active: ${status.active}`);
          console.log(`   ❌ Inactive: ${status.inactive}`);
          console.log(`   🏠 Main Stores: ${status.main_stores}`);
          if (status.null_status > 0) {
            console.log(`   ⚠️  NULL status: ${status.null_status}`);
          }
        } catch (error) {
          console.log(`   ⚠️  Could not check status: ${error.message}`);
        }
        console.log('');

        // All store locations with details
        console.log('3️⃣ All Store Locations');
        console.log('─'.repeat(50));
        try {
          const storesResult = await client.query(`
            SELECT 
              id,
              name,
              code,
              address,
              city,
              state,
              country,
              phone,
              email,
              manager_name,
              is_main,
              is_active,
              opening_time,
              closing_time,
              data_isolation_mode,
              pricing_model,
              created_at,
              updated_at
            FROM store_locations
            ORDER BY created_at DESC
          `);

          if (storesResult.rows.length > 0) {
            storesResult.rows.forEach((store, i) => {
              console.log(`\n   ${i + 1}. ${store.name || 'Unnamed Store'}`);
              console.log(`      ID: ${store.id}`);
              console.log(`      Code: ${store.code || 'N/A'}`);
              console.log(`      Address: ${store.address || 'N/A'}`);
              console.log(`      City: ${store.city || 'N/A'}`);
              if (store.state) console.log(`      State: ${store.state}`);
              console.log(`      Country: ${store.country || 'N/A'}`);
              console.log(`      Phone: ${store.phone || 'N/A'}`);
              console.log(`      Email: ${store.email || 'N/A'}`);
              if (store.manager_name) console.log(`      Manager: ${store.manager_name}`);
              console.log(`      Main Store: ${store.is_main ? 'Yes' : 'No'}`);
              console.log(`      Active: ${store.is_active ? 'Yes' : 'No'}`);
              if (store.opening_time && store.closing_time) {
                console.log(`      Hours: ${store.opening_time} - ${store.closing_time}`);
              }
              console.log(`      Isolation Mode: ${store.data_isolation_mode || 'N/A'}`);
              console.log(`      Pricing Model: ${store.pricing_model || 'N/A'}`);
              console.log(`      Created: ${store.created_at ? new Date(store.created_at).toLocaleDateString() : 'N/A'}`);
            });
          }
        } catch (error) {
          console.log(`   ⚠️  Could not fetch store locations: ${error.message}`);
        }
        console.log('');

        // Isolation settings summary
        console.log('4️⃣ Isolation Settings Summary');
        console.log('─'.repeat(50));
        try {
          const isolationResult = await client.query(`
            SELECT 
              data_isolation_mode,
              COUNT(*) as count
            FROM store_locations
            GROUP BY data_isolation_mode
            ORDER BY count DESC
          `);
          if (isolationResult.rows.length > 0) {
            isolationResult.rows.forEach((row) => {
              console.log(`   ${row.data_isolation_mode || 'NULL'}: ${row.count} stores`);
            });
          }
        } catch (error) {
          console.log(`   ⚠️  Could not check isolation settings: ${error.message}`);
        }
        console.log('');

        // Products per store location
        console.log('5️⃣ Products per Store Location');
        console.log('─'.repeat(50));
        try {
          const productsPerStoreResult = await client.query(`
            SELECT 
              s.id,
              s.name,
              COUNT(p.id) as product_count
            FROM store_locations s
            LEFT JOIN lats_products p ON p.branch_id = s.id
            GROUP BY s.id, s.name
            ORDER BY product_count DESC
          `);

          if (productsPerStoreResult.rows.length > 0) {
            productsPerStoreResult.rows.forEach((row) => {
              console.log(`   ${row.name}: ${row.product_count} products`);
            });
          }
        } catch (error) {
          console.log(`   ⚠️  Could not check products per store: ${error.message}`);
        }
        console.log('');

        // Sharing settings detail
        console.log('6️⃣ Sharing Settings (Sample)');
        console.log('─'.repeat(50));
        try {
          const sharingResult = await client.query(`
            SELECT 
              name,
              share_products,
              share_inventory,
              share_customers,
              share_suppliers,
              share_categories,
              share_sales,
              share_purchase_orders
            FROM store_locations
            LIMIT 5
          `);

          if (sharingResult.rows.length > 0) {
            sharingResult.rows.forEach((store) => {
              console.log(`\n   ${store.name}:`);
              console.log(`      Share Products: ${store.share_products ? 'Yes' : 'No'}`);
              console.log(`      Share Inventory: ${store.share_inventory ? 'Yes' : 'No'}`);
              console.log(`      Share Customers: ${store.share_customers ? 'Yes' : 'No'}`);
              console.log(`      Share Suppliers: ${store.share_suppliers ? 'Yes' : 'No'}`);
              console.log(`      Share Categories: ${store.share_categories ? 'Yes' : 'No'}`);
              console.log(`      Share Sales: ${store.share_sales ? 'Yes' : 'No'}`);
              console.log(`      Share Purchase Orders: ${store.share_purchase_orders ? 'Yes' : 'No'}`);
            });
          }
        } catch (error) {
          console.log(`   ⚠️  Could not check sharing settings: ${error.message}`);
        }
        console.log('');
      }
    } else {
      console.log('⚠️  store_locations table does not exist or is empty\n');
    }

    // Summary
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║  📊 SUMMARY                                            ║');
    console.log('╚════════════════════════════════════════════════════════╝');
    if (hasLatsBranches) {
      const latsCount = await client.query('SELECT COUNT(*) as count FROM lats_branches');
      console.log(`lats_branches: ${parseInt(latsCount.rows[0].count)} branches`);
    } else {
      console.log('lats_branches: Table not found');
    }
    if (hasStoreLocations) {
      const storeCount = await client.query('SELECT COUNT(*) as count FROM store_locations');
      console.log(`store_locations: ${parseInt(storeCount.rows[0].count)} stores`);
    } else {
      console.log('store_locations: Table not found');
    }
    console.log('╚════════════════════════════════════════════════════════╝\n');

    await client.end();
    console.log('✅ Analysis complete!');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\nPlease check:');
    console.error('  1. Database connection string is correct');
    console.error('  2. Database is accessible');
    console.error('  3. Network connection is working');
    await client.end().catch(() => {});
    process.exit(1);
  }
}

checkBranchesData().catch(error => {
  console.error('❌ Fatal Error:', error);
  process.exit(1);
});
