#!/usr/bin/env node

/**
 * Compare source and Supabase schemas to see what needs migration
 */

import pg from 'pg';
const { Client } = pg;

const SOURCE_DB = process.env.SOURCE_DATABASE_URL || 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const SUPABASE_HOST = 'aws-0-eu-north-1.pooler.supabase.com';
const SUPABASE_PORT = '5432';
const SUPABASE_USER = 'postgres.jxhzveborezjhsmzsgbc';
const SUPABASE_PASSWORD = '@SMASIKA1010';
const SUPABASE_DB = 'postgres';

console.log('\n🔍 Comparing Database Schemas...\n');
console.log('Source:', SOURCE_DB.replace(/:[^:@]+@/, ':****@'));
console.log('Supabase:', `${SUPABASE_USER}@${SUPABASE_HOST}:${SUPABASE_PORT}/${SUPABASE_DB}\n`);

async function getTables(client) {
  const result = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);
  return result.rows.map(r => r.table_name);
}

async function getTableColumns(client, tableName) {
  const result = await client.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = $1
    ORDER BY ordinal_position
  `, [tableName]);
  return result.rows;
}

async function compare() {
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

    // Get tables
    const [sourceTables, supabaseTables] = await Promise.all([
      getTables(sourceClient),
      getTables(supabaseClient)
    ]);

    console.log(`Source database: ${sourceTables.length} tables`);
    console.log(`Supabase database: ${supabaseTables.length} tables\n`);

    // Find differences
    const missingInSupabase = sourceTables.filter(t => !supabaseTables.includes(t));
    const extraInSupabase = supabaseTables.filter(t => !sourceTables.includes(t));
    const commonTables = sourceTables.filter(t => supabaseTables.includes(t));

    console.log('📊 Comparison Results:');
    console.log('─'.repeat(60));
    console.log(`  Tables in both: ${commonTables.length}`);
    console.log(`  Missing in Supabase: ${missingInSupabase.length}`);
    console.log(`  Extra in Supabase: ${extraInSupabase.length}`);
    console.log('');

    if (missingInSupabase.length > 0) {
      console.log('📋 Tables missing in Supabase (need to be created):');
      missingInSupabase.forEach(t => console.log(`  - ${t}`));
      console.log('');
    }

    if (extraInSupabase.length > 0) {
      console.log('📋 Tables in Supabase but not in source:');
      extraInSupabase.slice(0, 10).forEach(t => console.log(`  - ${t}`));
      if (extraInSupabase.length > 10) {
        console.log(`  ... and ${extraInSupabase.length - 10} more`);
      }
      console.log('');
    }

    // Check for column differences in common tables
    console.log('🔍 Checking column differences in common tables...\n');
    let columnDifferences = 0;
    const differences = [];

    for (const table of commonTables.slice(0, 20)) { // Check first 20 tables
      const [sourceCols, supabaseCols] = await Promise.all([
        getTableColumns(sourceClient, table),
        getTableColumns(supabaseClient, table)
      ]);

      const sourceColNames = new Set(sourceCols.map(c => c.column_name));
      const supabaseColNames = new Set(supabaseCols.map(c => c.column_name));

      const missingCols = sourceCols.filter(c => !supabaseColNames.has(c.column_name));
      if (missingCols.length > 0) {
        columnDifferences++;
        differences.push({ table, missingCols });
      }
    }

    if (columnDifferences > 0) {
      console.log(`⚠️  Found ${columnDifferences} tables with missing columns:\n`);
      differences.forEach(({ table, missingCols }) => {
        console.log(`  ${table}:`);
        missingCols.forEach(col => {
          console.log(`    - ${col.column_name} (${col.data_type})`);
        });
      });
      console.log('');
    } else {
      console.log('✅ Common tables have matching columns\n');
    }

    // Summary
    console.log('📝 Migration Summary:');
    console.log('─'.repeat(60));
    if (missingInSupabase.length === 0 && columnDifferences === 0) {
      console.log('✅ Schemas are in sync! No migration needed.');
    } else {
      console.log(`  • ${missingInSupabase.length} tables need to be created`);
      console.log(`  • ${columnDifferences} tables need column updates`);
      console.log('\n💡 Recommendation:');
      if (missingInSupabase.length > 0) {
        console.log('   Run migration to add missing tables');
      }
      if (columnDifferences > 0) {
        console.log('   Review and add missing columns manually or via migration');
      }
    }
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await sourceClient.end();
    await supabaseClient.end();
  }
}

compare();

