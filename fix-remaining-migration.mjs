#!/usr/bin/env node

/**
 * Fix remaining migration issues:
 * - Add 11 missing tables
 * - Add missing columns to 7 tables
 */

import pg from 'pg';
const { Client } = pg;

const SOURCE_DB = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const SUPABASE_HOST = 'aws-0-eu-north-1.pooler.supabase.com';
const SUPABASE_PORT = '5432';
const SUPABASE_USER = 'postgres.jxhzveborezjhsmzsgbc';
const SUPABASE_PASSWORD = '@SMASIKA1010';
const SUPABASE_DB = 'postgres';

console.log('\n🔧 Fixing Remaining Migration Issues\n');
console.log('='.repeat(70));

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
    SELECT 
      column_name, 
      data_type, 
      is_nullable, 
      column_default,
      character_maximum_length,
      numeric_precision,
      numeric_scale
    FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = $1
    ORDER BY ordinal_position
  `, [tableName]);
  return result.rows;
}

async function getTableDDL(client, tableName) {
  try {
    // Get full CREATE TABLE statement using pg_dump approach
    const result = await client.query(`
      SELECT 
        'CREATE TABLE IF NOT EXISTS ' || quote_ident(table_name) || ' (' ||
        string_agg(
          quote_ident(column_name) || ' ' || 
          CASE 
            WHEN data_type = 'USER-DEFINED' THEN udt_name
            WHEN data_type = 'ARRAY' THEN udt_name || '[]'
            WHEN data_type = 'character varying' THEN 'VARCHAR' || 
              CASE WHEN character_maximum_length IS NOT NULL 
                THEN '(' || character_maximum_length || ')'
                ELSE ''
              END
            WHEN data_type = 'numeric' THEN 'NUMERIC' ||
              CASE WHEN numeric_precision IS NOT NULL AND numeric_scale IS NOT NULL
                THEN '(' || numeric_precision || ',' || numeric_scale || ')'
                WHEN numeric_precision IS NOT NULL
                THEN '(' || numeric_precision || ')'
                ELSE ''
              END
            ELSE UPPER(data_type)
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

async function fixRemaining() {
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
    const [sourceTables, supabaseTables] = await Promise.all([
      getTables(sourceClient),
      getTables(supabaseClient)
    ]);

    const missingTables = sourceTables.filter(t => !supabaseTables.includes(t));
    const commonTables = sourceTables.filter(t => supabaseTables.includes(t));

    console.log(`📊 Found ${missingTables.length} missing tables\n`);

    // Step 1: Create missing tables
    if (missingTables.length > 0) {
      console.log('📋 Step 1: Creating missing tables...\n');
      
      for (const tableName of missingTables) {
        try {
          console.log(`  Creating table: ${tableName}...`);
          
          // Use pg_dump to get proper DDL
          const { execSync } = await import('child_process');
          const ddlFile = `/tmp/${tableName}_ddl.sql`;
          
          try {
            execSync(
              `pg_dump "${SOURCE_DB}" --schema-only --no-owner --no-acl -t "${tableName}" > ${ddlFile} 2>&1 || true`,
              { stdio: 'pipe' }
            );
            
            // Read and modify DDL
            const fs = await import('fs');
            if (fs.existsSync(ddlFile)) {
              let ddl = fs.readFileSync(ddlFile, 'utf-8');
              
              // Add IF NOT EXISTS
              ddl = ddl.replace(/CREATE TABLE /g, 'CREATE TABLE IF NOT EXISTS ');
              ddl = ddl.replace(/CREATE INDEX /g, 'CREATE INDEX IF NOT EXISTS ');
              
              // Execute on Supabase
              await supabaseClient.query(ddl);
              console.log(`    ✅ Created ${tableName}`);
              
              // Cleanup
              fs.unlinkSync(ddlFile);
            }
          } catch (error) {
            console.log(`    ⚠️  Could not create ${tableName} via pg_dump, trying direct method...`);
            
            // Fallback: Try to get basic structure
            const columns = await getTableColumns(sourceClient, tableName);
            if (columns.length > 0) {
              const columnDefs = columns.map(col => {
                let def = `"${col.column_name}" ${col.data_type}`;
                if (col.character_maximum_length) {
                  def += `(${col.character_maximum_length})`;
                }
                if (col.is_nullable === 'NO') {
                  def += ' NOT NULL';
                }
                if (col.column_default) {
                  def += ` DEFAULT ${col.column_default}`;
                }
                return def;
              }).join(', ');
              
              const createSQL = `CREATE TABLE IF NOT EXISTS "${tableName}" (${columnDefs});`;
              await supabaseClient.query(createSQL);
              console.log(`    ✅ Created ${tableName} (basic structure)`);
            }
          }
        } catch (error) {
          console.log(`    ❌ Failed to create ${tableName}: ${error.message}`);
        }
      }
      console.log('');
    }

    // Step 2: Add missing columns
    console.log('📋 Step 2: Adding missing columns...\n');
    
    let columnUpdates = 0;
    
    for (const tableName of commonTables.slice(0, 50)) { // Check first 50 common tables
      const [sourceCols, supabaseCols] = await Promise.all([
        getTableColumns(sourceClient, tableName),
        getTableColumns(supabaseClient, tableName)
      ]);

      const sourceColNames = new Set(sourceCols.map(c => c.column_name));
      const supabaseColNames = new Set(supabaseCols.map(c => c.column_name));

      const missingCols = sourceCols.filter(c => !supabaseColNames.has(c.column_name));
      
      if (missingCols.length > 0) {
        console.log(`  Table: ${tableName} (${missingCols.length} missing columns)`);
        
        for (const col of missingCols) {
          try {
            let colDef = `"${col.column_name}" ${col.data_type}`;
            
            if (col.character_maximum_length) {
              colDef += `(${col.character_maximum_length})`;
            } else if (col.numeric_precision && col.numeric_scale) {
              colDef += `(${col.numeric_precision},${col.numeric_scale})`;
            } else if (col.numeric_precision) {
              colDef += `(${col.numeric_precision})`;
            }
            
            if (col.is_nullable === 'NO') {
              colDef += ' NOT NULL';
            }
            
            if (col.column_default) {
              colDef += ` DEFAULT ${col.column_default}`;
            }
            
            const alterSQL = `ALTER TABLE "${tableName}" ADD COLUMN IF NOT EXISTS ${colDef};`;
            await supabaseClient.query(alterSQL);
            console.log(`    ✅ Added column: ${col.column_name}`);
            columnUpdates++;
          } catch (error) {
            console.log(`    ⚠️  Could not add ${col.column_name}: ${error.message}`);
          }
        }
        console.log('');
      }
    }

    // Final verification
    console.log('🔍 Step 3: Verifying migration...\n');
    const finalSupabaseTables = await getTables(supabaseClient);
    const stillMissing = missingTables.filter(t => !finalSupabaseTables.includes(t));
    
    console.log(`✅ Migration Summary:`);
    console.log(`   • Tables created: ${missingTables.length - stillMissing.length}/${missingTables.length}`);
    console.log(`   • Columns added: ${columnUpdates}`);
    
    if (stillMissing.length > 0) {
      console.log(`\n⚠️  ${stillMissing.length} tables still need attention:`);
      stillMissing.forEach(t => console.log(`   - ${t}`));
    }
    
    console.log('\n✅ Remaining migration fixes complete!\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    await sourceClient.end();
    await supabaseClient.end();
  }
}

fixRemaining();

