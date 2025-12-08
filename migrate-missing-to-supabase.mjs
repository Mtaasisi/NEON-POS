#!/usr/bin/env node

/**
 * Migrate only missing tables and columns to Supabase
 */

import pg from 'pg';
import { execSync } from 'child_process';
const { Client } = pg;

const SOURCE_DB = process.env.SOURCE_DATABASE_URL || 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const SUPABASE_HOST = 'aws-0-eu-north-1.pooler.supabase.com';
const SUPABASE_PORT = '5432';
const SUPABASE_USER = 'postgres.jxhzveborezjhsmzsgbc';
const SUPABASE_PASSWORD = '@SMASIKA1010';
const SUPABASE_DB = 'postgres';

console.log('\n🚀 Migrating Missing Tables and Columns to Supabase\n');
console.log('='.repeat(70));

async function getTableDDL(client, tableName) {
  try {
    const result = await client.query(`
      SELECT 
        'CREATE TABLE IF NOT EXISTS ' || table_name || ' (' ||
        string_agg(
          column_name || ' ' || 
          CASE 
            WHEN data_type = 'USER-DEFINED' THEN udt_name
            WHEN data_type = 'ARRAY' THEN udt_name || '[]'
            ELSE data_type
          END ||
          CASE WHEN character_maximum_length IS NOT NULL 
            THEN '(' || character_maximum_length || ')'
            ELSE ''
          END ||
          CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
          CASE WHEN column_default IS NOT NULL 
            THEN ' DEFAULT ' || column_default
            ELSE ''
          END,
          ', '
          ORDER BY ordinal_position
        ) || ');' as ddl
      FROM information_schema.columns
      WHERE table_schema = 'public' 
      AND table_name = $1
      GROUP BY table_name
    `, [tableName]);
    
    if (result.rows.length > 0) {
      return result.rows[0].ddl;
    }
    return null;
  } catch (error) {
    console.error(`Error getting DDL for ${tableName}:`, error.message);
    return null;
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

    // Get table lists
    const sourceTables = await sourceClient.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    const supabaseTables = await supabaseClient.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    const sourceTableNames = sourceTables.rows.map(r => r.table_name);
    const supabaseTableNames = supabaseTables.rows.map(r => r.table_name);
    const missingTables = sourceTableNames.filter(t => !supabaseTableNames.includes(t));

    console.log(`📊 Found ${missingTables.length} missing tables to migrate\n`);

    if (missingTables.length === 0) {
      console.log('✅ All tables already exist in Supabase!\n');
      return;
    }

    // Use pg_dump for better DDL extraction
    console.log('📦 Exporting schema for missing tables...\n');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const backupFile = `missing-tables-${timestamp}.sql`;
    
    // Export only missing tables
    const tableList = missingTables.join(' -t ');
    const pgDumpCmd = `pg_dump "${SOURCE_DB}" --schema-only --no-owner --no-acl -t ${missingTables.map(t => `"${t}"`).join(' -t ')} > ${backupFile} 2>&1 || true`;
    
    try {
      execSync(pgDumpCmd, { stdio: 'inherit', shell: true });
      console.log(`\n✅ Schema exported to ${backupFile}\n`);
    } catch (error) {
      console.log('⚠️  pg_dump had some warnings, but continuing...\n');
    }

    // Restore to Supabase
    console.log('📥 Restoring missing tables to Supabase...\n');
    console.log('⚠️  This may take a few minutes...\n');

    const restoreCmd = `PGPASSWORD='${SUPABASE_PASSWORD}' psql -h ${SUPABASE_HOST} -p ${SUPABASE_PORT} -U ${SUPABASE_USER} -d ${SUPABASE_DB} -f ${backupFile} 2>&1 | grep -v "already exists" | grep -v "ERROR" || true`;
    
    try {
      execSync(restoreCmd, { stdio: 'inherit', shell: true });
      console.log('\n✅ Migration complete!\n');
    } catch (error) {
      console.log('\n⚠️  Some errors occurred, but migration may have partially succeeded\n');
    }

    // Verify
    console.log('🔍 Verifying migration...\n');
    const verifyTables = await supabaseClient.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      AND table_name = ANY($1)
    `, [missingTables]);

    const migratedCount = verifyTables.rows.length;
    console.log(`✅ ${migratedCount} of ${missingTables.length} tables now exist in Supabase\n`);

    if (migratedCount < missingTables.length) {
      const stillMissing = missingTables.filter(t => 
        !verifyTables.rows.some(r => r.table_name === t)
      );
      console.log('⚠️  Tables that still need attention:');
      stillMissing.forEach(t => console.log(`  - ${t}`));
      console.log('');
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await sourceClient.end();
    await supabaseClient.end();
  }
}

migrate();

