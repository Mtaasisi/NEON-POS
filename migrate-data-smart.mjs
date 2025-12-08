#!/usr/bin/env node

/**
 * Smart data migration - handles column mismatches and data format issues
 */

import pg from 'pg';
const { Client } = pg;

const SOURCE_DB = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const SUPABASE_HOST = 'aws-0-eu-north-1.pooler.supabase.com';
const SUPABASE_PORT = '5432';
const SUPABASE_USER = 'postgres.jxhzveborezjhsmzsgbc';
const SUPABASE_PASSWORD = '@SMASIKA1010';
const SUPABASE_DB = 'postgres';

console.log('\n📦 Smart Data Migration: Settings & WhatsApp\n');
console.log('='.repeat(70));

// Tables with data
const TABLES_WITH_DATA = [
  'lats_pos_general_settings',
  'lats_pos_advanced_settings',
  'lats_pos_delivery_settings',
  'lats_pos_loyalty_customer_settings',
  'lats_pos_notification_settings',
  'lats_pos_receipt_settings',
  'lats_pos_search_filter_settings',
  'lats_pos_user_permissions_settings',
  'lats_pos_analytics_reporting_settings',
  'lats_pos_barcode_scanner_settings',
  'lats_pos_dynamic_pricing_settings',
  'user_settings',
  'whatsapp_antiban_settings',
  'whatsapp_logs',
  'whatsapp_incoming_messages',
  'whatsapp_campaigns',
  'whatsapp_media_library',
  'whatsapp_reply_templates'
];

async function getTableColumns(client, tableName) {
  const result = await client.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = $1
    ORDER BY ordinal_position
  `, [tableName]);
  return result.rows.map(r => r.column_name);
}

async function migrateTable(sourceClient, supabaseClient, tableName) {
  try {
    console.log(`\n📋 Migrating ${tableName}...`);
    
    // Get columns from both databases
    const [sourceCols, supabaseCols] = await Promise.all([
      getTableColumns(sourceClient, tableName),
      getTableColumns(supabaseClient, tableName)
    ]);
    
    // Find common columns
    const commonCols = sourceCols.filter(col => supabaseCols.includes(col));
    const missingCols = sourceCols.filter(col => !supabaseCols.includes(col));
    
    if (missingCols.length > 0) {
      console.log(`  ⚠️  Skipping ${missingCols.length} columns not in Supabase: ${missingCols.join(', ')}`);
    }
    
    if (commonCols.length === 0) {
      console.log(`  ⚠️  No common columns, skipping table`);
      return { migrated: 0, skipped: 0 };
    }
    
    // Fetch data from source
    const columnsStr = commonCols.map(c => `"${c}"`).join(', ');
    const sourceData = await sourceClient.query(`SELECT ${columnsStr} FROM "${tableName}"`);
    
    if (sourceData.rows.length === 0) {
      console.log(`  ℹ️  No data to migrate`);
      return { migrated: 0, skipped: 0 };
    }
    
    console.log(`  📊 Found ${sourceData.rows.length} rows`);
    
    // Check existing data in Supabase
    const existingCount = await supabaseClient.query(`SELECT COUNT(*) as count FROM "${tableName}"`);
    const existingRows = existingCount.rows[0].count;
    
    if (existingRows > 0) {
      console.log(`  ⚠️  Supabase already has ${existingRows} rows. Using INSERT ... ON CONFLICT`);
    }
    
    // Migrate data row by row with conflict handling
    let migrated = 0;
    let skipped = 0;
    
    for (const row of sourceData.rows) {
      try {
        // Build INSERT with ON CONFLICT
        const values = commonCols.map((col, idx) => {
          const value = row[col];
          if (value === null) return 'NULL';
          if (typeof value === 'string') {
            // Escape single quotes
            const escaped = value.replace(/'/g, "''");
            return `'${escaped}'`;
          }
          if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
          if (value instanceof Date) return `'${value.toISOString()}'`;
          if (typeof value === 'object') {
            return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
          }
          return String(value);
        });
        
        const valuesStr = values.join(', ');
        const columnsStr2 = commonCols.map(c => `"${c}"`).join(', ');
        
        // Try to find primary key or unique constraint
        let conflictClause = '';
        try {
          const pkResult = await supabaseClient.query(`
            SELECT column_name 
            FROM information_schema.table_constraints tc
            JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
            WHERE tc.table_name = $1 
            AND tc.constraint_type = 'PRIMARY KEY'
            LIMIT 1
          `, [tableName]);
          
          if (pkResult.rows.length > 0) {
            const pkCol = pkResult.rows[0].column_name;
            if (commonCols.includes(pkCol)) {
              conflictClause = ` ON CONFLICT ("${pkCol}") DO NOTHING`;
            }
          }
        } catch (e) {
          // No primary key or can't determine, skip conflict handling
        }
        
        const insertSQL = `INSERT INTO "${tableName}" (${columnsStr2}) VALUES (${valuesStr})${conflictClause}`;
        await supabaseClient.query(insertSQL);
        migrated++;
      } catch (error) {
        if (error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
          skipped++;
        } else {
          console.log(`    ⚠️  Error inserting row: ${error.message.substring(0, 100)}`);
          skipped++;
        }
      }
    }
    
    console.log(`  ✅ Migrated: ${migrated}, Skipped: ${skipped}`);
    return { migrated, skipped };
    
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
    return { migrated: 0, skipped: 0 };
  }
}

async function migrate() {
  const sourceClient = new Client({ connectionString: SOURCE_DB });
  const supabaseClient = new Client({
    host: SUPABASE_HOST,
    port: SUPABASE_PORT,
    user: SUPABASE_USER,
    password: SUPABASE_PASSWORD,
    database: SUPABASE_DB,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await sourceClient.connect();
    await supabaseClient.connect();
    console.log('✅ Connected to both databases\n');

    let totalMigrated = 0;
    let totalSkipped = 0;

    for (const table of TABLES_WITH_DATA) {
      const result = await migrateTable(sourceClient, supabaseClient, table);
      totalMigrated += result.migrated;
      totalSkipped += result.skipped;
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ Migration Complete!');
    console.log(`   Total rows migrated: ${totalMigrated}`);
    console.log(`   Total rows skipped: ${totalSkipped}`);
    console.log('='.repeat(70) + '\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await sourceClient.end();
    await supabaseClient.end();
  }
}

migrate();

