#!/usr/bin/env node

import pg from 'pg';
const { Client } = pg;

const DEV_DB_URL = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const PROD_DB_URL = 'postgresql://neondb_owner:npg_vABqUKk73tEW@ep-young-firefly-adlvuhdv-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

function parseConnectionString(url) {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parsed.port || 5432,
    database: parsed.pathname.slice(1),
    user: parsed.username,
    password: parsed.password,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 30000
  };
}

// Tables that should be migrated in order (respecting foreign key dependencies)
const MIGRATION_ORDER = [
  // Core reference data first
  'lats_branches',
  'lats_categories',
  'lats_brands',
  'lats_suppliers',
  'users',
  'lats_customers',
  'lats_products',
  'lats_product_variants',
  
  // Settings
  'settings',
  'lats_pos_general_settings',
  'lats_pos_advanced_settings',
  'lats_pos_receipt_settings',
  'lats_pos_notification_settings',
  'lats_pos_integrations_settings',
  'lats_pos_loyalty_customer_settings',
  'lats_pos_user_permissions_settings',
  'lats_pos_search_filter_settings',
  'lats_pos_barcode_scanner_settings',
  'lats_pos_analytics_reporting_settings',
  'lats_pos_dynamic_pricing_settings',
  'lats_pos_delivery_settings',
  
  // Inventory
  'inventory_items',
  'lats_inventory_items',
  'lats_stock_movements',
  'lats_stock_transfers',
  
  // Purchases
  'lats_purchase_orders',
  'lats_purchase_order_items',
  'lats_purchase_order_payments',
  'purchase_order_payments',
  'purchase_order_audit',
  'lats_purchase_order_audit_log',
  'purchase_order_messages',
  
  // Sales
  'lats_sales',
  'lats_sale_items',
  'lats_receipts',
  'payment_transactions',
  'account_transactions',
  
  // Customers & Installments
  'customer_installment_plans',
  'installment_payments',
  'customer_communications',
  'customer_notes',
  
  // Other
  'daily_opening_sessions',
  'user_daily_goals',
  'notifications',
  'sms_logs',
  'lats_data_audit_log',
  'finance_accounts',
  'branch_transfers',
  'store_locations',
  'user_branch_assignments',
];

async function getTablePrimaryKey(client, tableName) {
  try {
    const result = await client.query(`
      SELECT a.attname
      FROM pg_index i
      JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
      WHERE i.indrelid = $1::regclass
      AND i.indisprimary
      ORDER BY a.attnum
      LIMIT 1;
    `, [`public.${tableName}`]);
    
    return result.rows[0]?.attname || null;
  } catch (error) {
    // Try alternative method for tables without explicit primary key
    try {
      const result = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = $1 
        AND table_schema = 'public'
        AND column_name IN ('id', 'uuid', 'key')
        LIMIT 1;
      `, [tableName]);
      return result.rows[0]?.column_name || null;
    } catch {
      return null;
    }
  }
}

async function getExistingIds(client, tableName, primaryKey) {
  if (!primaryKey) return new Set();
  
  try {
    const result = await client.query(`SELECT ${primaryKey} FROM ${tableName}`);
    return new Set(result.rows.map(r => r[primaryKey]?.toString()));
  } catch (error) {
    return new Set();
  }
}

async function migrateTable(devClient, prodClient, tableName, dryRun = false) {
  try {
    // Get primary key
    const primaryKey = await getTablePrimaryKey(devClient, tableName);
    
    // Get existing IDs in production
    const existingIds = await getExistingIds(prodClient, tableName, primaryKey);
    
    // Get all data from dev
    const devData = await devClient.query(`SELECT * FROM ${tableName}`);
    
    if (devData.rows.length === 0) {
      return { table: tableName, skipped: true, reason: 'No data in dev' };
    }
    
    // Filter out rows that already exist
    const newRows = primaryKey 
      ? devData.rows.filter(row => !existingIds.has(row[primaryKey]?.toString()))
      : devData.rows;
    
    if (newRows.length === 0) {
      return { 
        table: tableName, 
        skipped: true, 
        reason: `All ${devData.rows.length} rows already exist in prod` 
      };
    }
    
    if (dryRun) {
      return {
        table: tableName,
        wouldMigrate: newRows.length,
        totalInDev: devData.rows.length,
        existingInProd: existingIds.size
      };
    }
    
    // Get column names
    const columns = Object.keys(newRows[0]);
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
    const columnList = columns.join(', ');
    
    // Insert new rows
    let inserted = 0;
    let errors = 0;
    
    for (const row of newRows) {
      try {
        const values = columns.map(col => row[col]);
        await prodClient.query(
          `INSERT INTO ${tableName} (${columnList}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
          values
        );
        inserted++;
      } catch (error) {
        errors++;
        if (errors <= 3) {
          console.warn(`    ⚠️  Error inserting row: ${error.message.split('\n')[0]}`);
        }
      }
    }
    
    return {
      table: tableName,
      inserted,
      errors,
      totalInDev: devData.rows.length,
      existingInProd: existingIds.size
    };
    
  } catch (error) {
    return {
      table: tableName,
      error: error.message
    };
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run') || args.includes('-d');
  const tableFilter = args.find(arg => arg.startsWith('--table='))?.split('=')[1];
  
  const devClient = new Client(parseConnectionString(DEV_DB_URL));
  const prodClient = new Client(parseConnectionString(PROD_DB_URL));
  
  try {
    console.log('Connecting to databases...');
    await devClient.connect();
    await prodClient.connect();
    console.log('✓ Connected\n');
    
    if (dryRun) {
      console.log('🔍 DRY RUN MODE - No changes will be made\n');
    } else {
      console.log('⚠️  LIVE MODE - Changes will be applied to PRODUCTION\n');
      console.log('Press Ctrl+C within 5 seconds to cancel...\n');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    // Get tables to migrate
    let tablesToMigrate = MIGRATION_ORDER;
    
    if (tableFilter) {
      tablesToMigrate = [tableFilter];
      console.log(`Migrating single table: ${tableFilter}\n`);
    } else {
      // Verify tables exist
      const allTables = await devClient.query(`
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public' 
        ORDER BY tablename;
      `);
      const tableSet = new Set(allTables.rows.map(r => r.tablename));
      tablesToMigrate = MIGRATION_ORDER.filter(t => tableSet.has(t));
      
      console.log(`Migrating ${tablesToMigrate.length} tables in dependency order...\n`);
    }
    
    const results = [];
    
    for (let i = 0; i < tablesToMigrate.length; i++) {
      const tableName = tablesToMigrate[i];
      console.log(`[${i + 1}/${tablesToMigrate.length}] ${tableName}...`);
      
      const result = await migrateTable(devClient, prodClient, tableName, dryRun);
      results.push(result);
      
      if (result.skipped) {
        console.log(`  ⏭️  Skipped: ${result.reason}\n`);
      } else if (result.error) {
        console.log(`  ✗ Error: ${result.error}\n`);
      } else if (dryRun) {
        console.log(`  📊 Would migrate: ${result.wouldMigrate} rows (${result.totalInDev} total in dev, ${result.existingInProd} in prod)\n`);
      } else {
        console.log(`  ✓ Inserted: ${result.inserted} rows`);
        if (result.errors > 0) {
          console.log(`  ⚠️  Errors: ${result.errors}`);
        }
        console.log(`     Total: ${result.totalInDev} in dev, ${result.existingInProd} existing in prod\n`);
      }
    }
    
    // Summary
    console.log('\n=== MIGRATION SUMMARY ===\n');
    
    if (dryRun) {
      const wouldMigrate = results.filter(r => !r.skipped && !r.error).reduce((sum, r) => sum + (r.wouldMigrate || 0), 0);
      const tablesToMigrate = results.filter(r => !r.skipped && !r.error && (r.wouldMigrate || 0) > 0).length;
      console.log(`Would migrate: ${wouldMigrate} rows across ${tablesToMigrate} tables`);
      console.log(`⏭️  Skipped: ${results.filter(r => r.skipped).length} tables`);
      if (results.filter(r => r.error).length > 0) {
        console.log(`✗ Errors: ${results.filter(r => r.error).length} tables`);
        results.filter(r => r.error).forEach(r => {
          console.log(`   - ${r.table}: ${r.error}`);
        });
      }
      console.log(`\nTo apply, run: node migrate-data-to-production.mjs`);
    } else {
      const inserted = results.filter(r => !r.skipped && !r.error).reduce((sum, r) => sum + (r.inserted || 0), 0);
      const errors = results.filter(r => r.error).length;
      const skipped = results.filter(r => r.skipped).length;
      
      console.log(`✓ Inserted: ${inserted} rows`);
      console.log(`⏭️  Skipped: ${skipped} tables`);
      if (errors > 0) {
        console.log(`✗ Errors: ${errors} tables`);
        results.filter(r => r.error).forEach(r => {
          console.log(`   - ${r.table}: ${r.error}`);
        });
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await devClient.end();
    await prodClient.end();
  }
}

main();

