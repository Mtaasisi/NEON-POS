/**
 * CHECK DATABASE STATUS AND CONTENTS
 * Connect to the provided Neon PostgreSQL database and inspect its contents
 */

import postgres from 'postgres';

const DATABASE_URL = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function checkDatabase() {
  const sql = postgres(DATABASE_URL);

  try {
    console.log('🔍 CONNECTING TO NEON DATABASE...\n');

    // Test connection
    const connectionTest = await sql`SELECT version() as version, current_database() as database, current_user as user`;
    console.log('✅ DATABASE CONNECTION SUCCESSFUL');
    console.log(`📊 PostgreSQL Version: ${connectionTest[0].version.split(' ')[1]}`);
    console.log(`🏢 Database: ${connectionTest[0].database}`);
    console.log(`👤 User: ${connectionTest[0].user}\n`);

    // Get all tables
    const tables = await sql`
      SELECT
        schemaname,
        tablename,
        tableowner,
        tablespace,
        hasindexes,
        hasrules,
        hastriggers,
        rowsecurity
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `;

    console.log(`📋 TABLES (${tables.length} total):`);
    tables.forEach((table, index) => {
      console.log(`${index + 1}. ${table.tablename} (${table.tableowner})`);
    });

    console.log('\n' + '='.repeat(50));

    // Check key application tables
    const keyTables = [
      'lats_products',
      'lats_product_variants',
      'store_locations',
      'lats_suppliers',
      'sales',
      'sale_items'
    ];

    console.log('🔍 DETAILED TABLE INSPECTION:\n');

    for (const tableName of keyTables) {
      try {
        const tableExists = tables.some(t => t.tablename === tableName);
        if (!tableExists) {
          console.log(`❌ ${tableName}: Table does not exist`);
          continue;
        }

        // Get row count
        const countResult = await sql`SELECT COUNT(*) as count FROM ${sql(tableName)}`;
        const rowCount = countResult[0].count;

        // Get column info
        const columns = await sql`
          SELECT
            column_name,
            data_type,
            is_nullable,
            column_default
          FROM information_schema.columns
          WHERE table_name = ${tableName}
          AND table_schema = 'public'
          ORDER BY ordinal_position
        `;

        console.log(`📊 ${tableName.toUpperCase()}:`);
        console.log(`   Rows: ${rowCount}`);
        console.log(`   Columns: ${columns.length}`);
        console.log('   Schema:');

        columns.forEach(col => {
          const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
          const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
          console.log(`     - ${col.column_name} (${col.data_type}) ${nullable}${defaultVal}`);
        });

        // Sample data for small tables
        if (parseInt(rowCount) <= 10 && parseInt(rowCount) > 0) {
          const sampleData = await sql`SELECT * FROM ${sql(tableName)} LIMIT 3`;
          console.log(`   Sample Data (${sampleData.length} rows):`);
          sampleData.forEach((row, idx) => {
            console.log(`     Row ${idx + 1}:`, JSON.stringify(row, null, 2).replace(/\n/g, '\n       '));
          });
        }

        console.log('');

      } catch (error) {
        console.log(`❌ Error inspecting ${tableName}: ${error.message}`);
      }
    }

    // Check recent activity
    console.log('🕐 RECENT DATABASE ACTIVITY:\n');

    try {
      const recentProducts = await sql`
        SELECT name, created_at, updated_at
        FROM lats_products
        ORDER BY updated_at DESC
        LIMIT 5
      `;
      console.log('📦 Recent Products:');
      recentProducts.forEach(p => {
        console.log(`   ${p.name} - Updated: ${p.updated_at}`);
      });
    } catch (error) {
      console.log(`❌ Error getting recent products: ${error.message}`);
    }

    try {
      const recentVariants = await sql`
        SELECT variant_name, created_at, updated_at
        FROM lats_product_variants
        ORDER BY updated_at DESC
        LIMIT 5
      `;
      console.log('\n🔧 Recent Variants:');
      recentVariants.forEach(v => {
        console.log(`   ${v.variant_name} - Updated: ${v.updated_at}`);
      });
    } catch (error) {
      console.log(`❌ Error getting recent variants: ${error.message}`);
    }

    // Check branch information
    try {
      const branches = await sql`
        SELECT id, name, data_isolation_mode, share_products, share_inventory, is_active
        FROM store_locations
        ORDER BY name
      `;
      console.log('\n🏢 BRANCHES:');
      branches.forEach(branch => {
        const status = branch.is_active ? 'ACTIVE' : 'INACTIVE';
        console.log(`   ${branch.name} (${branch.id}) - ${branch.data_isolation_mode} mode - ${status}`);
      });
    } catch (error) {
      console.log(`❌ Error getting branches: ${error.message}`);
    }

    // Database size information
    try {
      const dbSize = await sql`
        SELECT
          pg_size_pretty(pg_database_size(current_database())) as size,
          pg_size_pretty(sum(pg_relation_size(relname::regclass))) as tables_size
        FROM pg_stat_user_tables
      `;
      console.log(`\n💾 DATABASE SIZE: ${dbSize[0].size}`);
      console.log(`📊 Tables Size: ${dbSize[0].tables_size}`);
    } catch (error) {
      console.log(`❌ Error getting database size: ${error.message}`);
    }

  } catch (error) {
    console.error('❌ DATABASE CONNECTION FAILED:');
    console.error(`   Error: ${error.message}`);
    if (error.code) {
      console.error(`   Code: ${error.code}`);
    }
    if (error.severity) {
      console.error(`   Severity: ${error.severity}`);
    }
  } finally {
    await sql.end();
  }
}

checkDatabase()
  .then(() => console.log('\n🏆 Database check completed successfully'))
  .catch(error => {
    console.error('\n💥 Database check failed:', error.message);
    process.exit(1);
  });