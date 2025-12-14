#!/usr/bin/env node

import pg from 'pg';
const { Client } = pg;

const DEV_DB_URL = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const PROD_DB_URL = 'postgresql://neondb_owner:npg_vABqUKk73tEW@ep-young-firefly-adlvuhdv-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

// Helper to parse connection string
function parseConnectionString(url) {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parsed.port || 5432,
    database: parsed.pathname.slice(1),
    user: parsed.username,
    password: parsed.password,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 30000,
    query_timeout: 60000
  };
}

// Get all tables
async function getTables(client) {
  const result = await client.query(`
    SELECT 
      schemaname,
      tablename
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename;
  `);
  return result.rows.map(r => r.tablename);
}

// Get table structure (columns, types, constraints)
async function getTableStructure(client, tableName) {
  const result = await client.query(`
    SELECT 
      column_name,
      data_type,
      udt_name,
      character_maximum_length,
      is_nullable,
      column_default,
      is_identity,
      identity_generation
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = $1
    ORDER BY ordinal_position;
  `, [tableName]);
  
  return result.rows;
}

// Get table constraints (primary keys, foreign keys, unique, check)
async function getTableConstraints(client, tableName) {
  const constraints = {
    primaryKey: null,
    foreignKeys: [],
    unique: [],
    check: [],
    notNull: []
  };

  // Primary key
  const pkResult = await client.query(`
    SELECT 
      a.attname as column_name
    FROM pg_index i
    JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
    WHERE i.indrelid = $1::regclass
    AND i.indisprimary;
  `, [`public.${tableName}`]);
  
  if (pkResult.rows.length > 0) {
    constraints.primaryKey = pkResult.rows.map(r => r.column_name);
  }

  // Foreign keys
  const fkResult = await client.query(`
    SELECT
      tc.constraint_name,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name,
      rc.update_rule,
      rc.delete_rule
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    JOIN information_schema.referential_constraints AS rc
      ON rc.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND tc.table_name = $1;
  `, [tableName]);
  
  constraints.foreignKeys = fkResult.rows;

  // Unique constraints
  const uniqueResult = await client.query(`
    SELECT
      tc.constraint_name,
      kcu.column_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'UNIQUE'
      AND tc.table_schema = 'public'
      AND tc.table_name = $1;
  `, [tableName]);
  
  constraints.unique = uniqueResult.rows;

  return constraints;
}

// Get indexes
async function getIndexes(client, tableName) {
  const result = await client.query(`
    SELECT
      indexname,
      indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = $1
      AND indexname NOT LIKE '%_pkey'
      AND indexname NOT LIKE '%_fkey%';
  `, [tableName]);
  
  return result.rows;
}

// Get functions with full signature
async function getFunctions(client) {
  const result = await client.query(`
    SELECT
      p.proname as function_name,
      pg_get_function_identity_arguments(p.oid) as function_args,
      pg_get_functiondef(p.oid) as function_definition,
      p.oid as function_oid
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    ORDER BY p.proname, p.oid;
  `);
  
  return result.rows;
}

// Get triggers with full definition
async function getTriggers(client) {
  const result = await client.query(`
    SELECT
      t.trigger_name,
      t.event_object_table as table_name,
      t.action_statement,
      t.action_timing,
      t.event_manipulation,
      t.action_condition,
      pg_get_triggerdef(pt.oid) as trigger_definition
    FROM information_schema.triggers t
    JOIN pg_trigger pt ON pt.tgname = t.trigger_name
    JOIN pg_class pc ON pc.oid = pt.tgrelid
    JOIN pg_namespace pn ON pn.oid = pc.relnamespace
    WHERE t.trigger_schema = 'public' AND pn.nspname = 'public'
    ORDER BY t.event_object_table, t.trigger_name;
  `);
  
  return result.rows;
}

// Get views
async function getViews(client) {
  const result = await client.query(`
    SELECT
      table_name as view_name,
      view_definition
    FROM information_schema.views
    WHERE table_schema = 'public'
    ORDER BY table_name;
  `);
  
  return result.rows;
}

// Get sequences
async function getSequences(client) {
  const result = await client.query(`
    SELECT
      sequence_name,
      data_type,
      start_value,
      minimum_value,
      maximum_value,
      increment
    FROM information_schema.sequences
    WHERE sequence_schema = 'public'
    ORDER BY sequence_name;
  `);
  
  return result.rows;
}

// Get extensions
async function getExtensions(client) {
  const result = await client.query(`
    SELECT extname
    FROM pg_extension
    WHERE extnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
       OR extname IN ('uuid-ossp', 'pgcrypto', 'pg_session_jwt');
  `);
  
  return result.rows.map(r => r.extname);
}

// Helper function to generate column definition
function generateColumnDef(col) {
  let def = `${col.column_name} `;
  
  // Handle data types
  if (col.data_type === 'USER-DEFINED') {
    def += col.udt_name;
  } else if (col.data_type === 'character varying') {
    def += `VARCHAR(${col.character_maximum_length || ''})`;
  } else if (col.data_type === 'character') {
    def += `CHAR(${col.character_maximum_length || ''})`;
  } else if (col.data_type === 'numeric') {
    def += 'NUMERIC';
  } else {
    def += col.data_type.toUpperCase();
  }
  
  // NOT NULL
  if (col.is_nullable === 'NO') {
    def += ' NOT NULL';
  }
  
  // DEFAULT
  if (col.column_default) {
    let defaultValue = col.column_default;
    if (defaultValue.includes('::')) {
      defaultValue = defaultValue.split('::')[0];
    }
    def += ` DEFAULT ${defaultValue}`;
  }
  
  return def;
}

// Generate CREATE TABLE statement
function generateCreateTable(tableName, columns, constraints) {
  let sql = `CREATE TABLE IF NOT EXISTS ${tableName} (\n`;
  
  const columnDefs = columns.map(col => {
    return `  ${generateColumnDef(col)}`;
  });
  
  sql += columnDefs.join(',\n');
  
  // Add primary key
  if (constraints.primaryKey && constraints.primaryKey.length > 0) {
    sql += `,\n  PRIMARY KEY (${constraints.primaryKey.join(', ')})`;
  }
  
  sql += '\n);';
  
  return sql;
}

// Generate foreign key constraints
function generateForeignKeys(tableName, foreignKeys) {
  return foreignKeys.map(fk => {
    return `ALTER TABLE ${tableName} ADD CONSTRAINT ${fk.constraint_name} 
      FOREIGN KEY (${fk.column_name}) 
      REFERENCES ${fk.foreign_table_name}(${fk.foreign_column_name})
      ON UPDATE ${fk.update_rule} 
      ON DELETE ${fk.delete_rule};`;
  });
}

// Generate unique constraints
function generateUniqueConstraints(tableName, uniqueConstraints) {
  const grouped = {};
  uniqueConstraints.forEach(uc => {
    if (!grouped[uc.constraint_name]) {
      grouped[uc.constraint_name] = [];
    }
    grouped[uc.constraint_name].push(uc.column_name);
  });
  
  return Object.entries(grouped).map(([name, columns]) => {
    return `ALTER TABLE ${tableName} ADD CONSTRAINT ${name} UNIQUE (${columns.join(', ')});`;
  });
}

async function main() {
  const devClient = new Client(parseConnectionString(DEV_DB_URL));
  const prodClient = new Client(parseConnectionString(PROD_DB_URL));
  
  try {
    console.log('Connecting to databases...');
    await devClient.connect();
    await prodClient.connect();
    console.log('✓ Connected to both databases\n');
    
    // Get schemas from both databases
    console.log('Extracting schema from developer database...');
    const devTables = await getTables(devClient);
    const devFunctions = await getFunctions(devClient);
    const devTriggers = await getTriggers(devClient);
    const devViews = await getViews(devClient);
    const devSequences = await getSequences(devClient);
    const devExtensions = await getExtensions(devClient);
    
    console.log(`Developer DB: ${devTables.length} tables, ${devFunctions.length} functions, ${devTriggers.length} triggers, ${devViews.length} views`);
    
    console.log('\nExtracting schema from production database...');
    const prodTables = await getTables(prodClient);
    const prodFunctions = await getFunctions(prodClient);
    const prodTriggers = await getTriggers(prodClient);
    const prodViews = await getViews(prodClient);
    const prodSequences = await getSequences(prodClient);
    const prodExtensions = await getExtensions(prodClient);
    
    console.log(`Production DB: ${prodTables.length} tables, ${prodFunctions.length} functions, ${prodTriggers.length} triggers, ${prodViews.length} views`);
    
    // Find missing items
    const missingTables = devTables.filter(t => !prodTables.includes(t));
    const existingTables = devTables.filter(t => prodTables.includes(t));
    const missingFunctions = devFunctions.filter(f => 
      !prodFunctions.some(pf => 
        pf.function_name === f.function_name && 
        pf.function_args === f.function_args
      )
    );
    const missingTriggers = devTriggers.filter(t => 
      !prodTriggers.some(pt => 
        pt.trigger_name === t.trigger_name && 
        pt.table_name === t.table_name
      )
    );
    const missingViews = devViews.filter(v => 
      !prodViews.some(pv => pv.view_name === v.view_name)
    );
    const missingSequences = devSequences.filter(s => 
      !prodSequences.some(ps => ps.sequence_name === s.sequence_name)
    );
    const missingExtensions = devExtensions.filter(e => !prodExtensions.includes(e));
    
    // Check for missing columns in existing tables (with progress tracking)
    const missingColumns = [];
    console.log(`\nChecking ${existingTables.length} existing tables for missing columns...`);
    for (let i = 0; i < existingTables.length; i++) {
      const tableName = existingTables[i];
      if (i % 20 === 0) {
        console.log(`  Progress: ${i}/${existingTables.length} tables checked...`);
      }
      try {
        const devCols = await getTableStructure(devClient, tableName);
        const prodCols = await getTableStructure(prodClient, tableName);
        const prodColNames = new Set(prodCols.map(c => c.column_name));
        
        const missing = devCols.filter(dc => !prodColNames.has(dc.column_name));
        if (missing.length > 0) {
          missingColumns.push({ table: tableName, columns: missing });
        }
      } catch (error) {
        console.warn(`  Warning: Could not check table ${tableName}: ${error.message}`);
      }
    }
    
    console.log('\n=== MISSING ITEMS ===');
    console.log(`Missing Tables: ${missingTables.length}`);
    console.log(`Missing Columns: ${missingColumns.reduce((sum, mc) => sum + mc.columns.length, 0)} in ${missingColumns.length} tables`);
    console.log(`Missing Functions: ${missingFunctions.length}`);
    console.log(`Missing Triggers: ${missingTriggers.length}`);
    console.log(`Missing Views: ${missingViews.length}`);
    console.log(`Missing Sequences: ${missingSequences.length}`);
    console.log(`Missing Extensions: ${missingExtensions.length}`);
    
    if (missingTables.length === 0 && missingColumns.length === 0 && missingFunctions.length === 0 && 
        missingTriggers.length === 0 && missingViews.length === 0 && 
        missingSequences.length === 0 && missingExtensions.length === 0) {
      console.log('\n✓ No missing schema items found. Databases are in sync!');
      return;
    }
    
    // Generate SQL to create missing items
    const sqlStatements = [];
    
    // Extensions first
    if (missingExtensions.length > 0) {
      console.log('\n--- Missing Extensions ---');
      missingExtensions.forEach(ext => {
        console.log(`  - ${ext}`);
        sqlStatements.push(`CREATE EXTENSION IF NOT EXISTS "${ext}";`);
      });
    }
    
    // Sequences
    if (missingSequences.length > 0) {
      console.log('\n--- Missing Sequences ---');
      missingSequences.forEach(seq => {
        console.log(`  - ${seq.sequence_name}`);
        sqlStatements.push(`CREATE SEQUENCE IF NOT EXISTS ${seq.sequence_name}
  AS ${seq.data_type}
  START WITH ${seq.start_value}
  INCREMENT BY ${seq.increment}
  MINVALUE ${seq.minimum_value}
  MAXVALUE ${seq.maximum_value};`);
      });
    }
    
    // Missing columns in existing tables
    if (missingColumns.length > 0) {
      console.log('\n--- Missing Columns in Existing Tables ---');
      for (const { table, columns } of missingColumns) {
        console.log(`  - ${table}: ${columns.map(c => c.column_name).join(', ')}`);
        for (const col of columns) {
          sqlStatements.push(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${generateColumnDef(col)};`);
        }
      }
    }
    
    // Tables
    if (missingTables.length > 0) {
      console.log('\n--- Missing Tables ---');
      for (const tableName of missingTables) {
        console.log(`  - ${tableName}`);
        const columns = await getTableStructure(devClient, tableName);
        const constraints = await getTableConstraints(devClient, tableName);
        const indexes = await getIndexes(devClient, tableName);
        
        sqlStatements.push(generateCreateTable(tableName, columns, constraints));
        
        // Add foreign keys
        if (constraints.foreignKeys.length > 0) {
          sqlStatements.push(...generateForeignKeys(tableName, constraints.foreignKeys));
        }
        
        // Add unique constraints
        if (constraints.unique.length > 0) {
          sqlStatements.push(...generateUniqueConstraints(tableName, constraints.unique));
        }
        
        // Add indexes
        if (indexes.length > 0) {
          indexes.forEach(idx => {
            sqlStatements.push(idx.indexdef + ';');
          });
        }
      }
    }
    
    // Functions
    if (missingFunctions.length > 0) {
      console.log('\n--- Missing Functions ---');
      missingFunctions.forEach(func => {
        console.log(`  - ${func.function_name}(${func.function_args || ''})`);
        sqlStatements.push(func.function_definition + ';');
      });
    }
    
    // Views
    if (missingViews.length > 0) {
      console.log('\n--- Missing Views ---');
      missingViews.forEach(view => {
        console.log(`  - ${view.view_name}`);
        let viewDef = view.view_definition.trim();
        // Remove trailing semicolon if present
        if (viewDef.endsWith(';')) {
          viewDef = viewDef.slice(0, -1);
        }
        sqlStatements.push(`CREATE OR REPLACE VIEW ${view.view_name} AS ${viewDef};`);
      });
    }
    
    // Triggers
    if (missingTriggers.length > 0) {
      console.log('\n--- Missing Triggers ---');
      missingTriggers.forEach(trigger => {
        console.log(`  - ${trigger.trigger_name} on ${trigger.table_name}`);
        if (trigger.trigger_definition) {
          sqlStatements.push(trigger.trigger_definition + ';');
        } else {
          sqlStatements.push(`-- TODO: Create trigger ${trigger.trigger_name} on ${trigger.table_name}`);
        }
      });
    }
    
    // Save SQL to file
    const sqlFile = `sync-schema-${new Date().toISOString().replace(/[:.]/g, '-')}.sql`;
    const totalMissingCols = missingColumns.reduce((sum, mc) => sum + mc.columns.length, 0);
    const sqlContent = `-- Schema sync from developer to production database
-- Generated: ${new Date().toISOString()}
-- Missing items: ${missingTables.length} tables, ${totalMissingCols} columns in ${missingColumns.length} tables, ${missingFunctions.length} functions, ${missingTriggers.length} triggers, ${missingViews.length} views

BEGIN;

${sqlStatements.join('\n\n')}

COMMIT;
`;
    
    const fs = await import('fs');
    fs.writeFileSync(sqlFile, sqlContent);
    console.log(`\n✓ SQL script saved to: ${sqlFile}`);
    console.log(`\nTo apply to production, run:`);
    console.log(`psql "${PROD_DB_URL}" -f ${sqlFile}`);
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await devClient.end();
    await prodClient.end();
  }
}

main();

