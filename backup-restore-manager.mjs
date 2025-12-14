#!/usr/bin/env node
/**
 * Interactive Backup and Restore Manager
 * Allows choosing options by number for backup and restore operations
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const { Client } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Database connection strings storage
const CONNECTION_STRINGS_FILE = path.join(__dirname, '.db-connections.json');

// Load saved connection strings
function loadConnections() {
  try {
    if (fs.existsSync(CONNECTION_STRINGS_FILE)) {
      return JSON.parse(fs.readFileSync(CONNECTION_STRINGS_FILE, 'utf8'));
    }
  } catch (error) {
    // File doesn't exist or is invalid, return empty
  }
  return [];
}

// Save connection strings
function saveConnections(connections) {
  fs.writeFileSync(CONNECTION_STRINGS_FILE, JSON.stringify(connections, null, 2), 'utf8');
}

// Prompt for input
function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

// Display menu and get choice
async function showMenu(title, options) {
  console.log('\n' + '═'.repeat(60));
  console.log(`  ${title}`);
  console.log('═'.repeat(60));
  options.forEach((option, index) => {
    console.log(`  ${index + 1}. ${option.label}`);
  });
  console.log('═'.repeat(60));
  
  while (true) {
    const answer = await question('\nEnter your choice (number): ');
    const choice = parseInt(answer);
    if (choice >= 1 && choice <= options.length) {
      return choice - 1;
    }
    console.log(`❌ Invalid choice. Please enter a number between 1 and ${options.length}.`);
  }
}

// Test database connection
async function testConnection(connectionString) {
  const client = new Client({ 
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    await client.connect();
    const result = await client.query('SELECT version()');
    await client.end();
    return { success: true, version: result.rows[0].version };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Backup function
async function backupDatabase(connectionString, backupName) {
  const client = new Client({ 
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
  });

  const today = new Date().toISOString().split('T')[0];
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' + 
                   new Date().toISOString().split('T')[1].split('.')[0].replace(/:/g, '-');
  const backupDir = path.join(__dirname, 'PROD BACKUP', backupName || `backup-${today}`);
  
  if (!fs.existsSync(path.join(__dirname, 'PROD BACKUP'))) {
    fs.mkdirSync(path.join(__dirname, 'PROD BACKUP'), { recursive: true });
  }
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  console.log(`\n📁 Backup directory: ${backupDir}`);

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Get all tables
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    const tables = tablesResult.rows.map(r => r.table_name);
    console.log(`📋 Found ${tables.length} tables to backup\n`);

    const backupResults = {};
    let totalRecords = 0;

    for (const tableName of tables) {
      try {
        console.log(`📦 Backing up ${tableName}...`);
        const result = await client.query(`SELECT * FROM ${tableName}`);
        const data = result.rows;
        
        if (data.length > 0) {
          // Save JSON
          const jsonFile = path.join(backupDir, `${tableName}_${timestamp}.json`);
          fs.writeFileSync(jsonFile, JSON.stringify(data, null, 2), 'utf8');
          
          // Save SQL
          const columns = Object.keys(data[0]);
          const sqlStatements = [];
          sqlStatements.push(`-- Backup of ${tableName} table`);
          sqlStatements.push(`-- Generated: ${new Date().toISOString()}`);
          sqlStatements.push(`-- Total records: ${data.length}\n`);
          
          const batchSize = 100;
          for (let i = 0; i < data.length; i += batchSize) {
            const batch = data.slice(i, i + batchSize);
            const values = batch.map(row => {
              const rowValues = columns.map(col => {
                const value = row[col];
                if (value === null || value === undefined) return 'NULL';
                if (typeof value === 'boolean') return value ? 'true' : 'false';
                if (typeof value === 'number') return value.toString();
                if (value instanceof Date) return `'${value.toISOString()}'::timestamptz`;
                if (Array.isArray(value)) {
                  return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
                }
                if (typeof value === 'object' && value !== null) {
                  return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
                }
                return `'${String(value).replace(/'/g, "''")}'`;
              });
              return `(${rowValues.join(', ')})`;
            });
            
            sqlStatements.push(`INSERT INTO ${tableName} (${columns.join(', ')}) VALUES`);
            sqlStatements.push(values.join(',\n') + ';');
            sqlStatements.push('');
          }
          
          const sqlFile = path.join(backupDir, `${tableName}_${timestamp}.sql`);
          fs.writeFileSync(sqlFile, sqlStatements.join('\n'), 'utf8');
          
          backupResults[tableName] = data.length;
          totalRecords += data.length;
          console.log(`   ✅ ${data.length} records backed up`);
        } else {
          console.log(`   ⚠️  Table is empty`);
        }
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }

    // Create summary
    const summary = {
      backup_date: new Date().toISOString(),
      timestamp: timestamp,
      connection_string: connectionString.replace(/:[^:@]+@/, ':****@'), // Hide password
      tables_backed_up: Object.keys(backupResults).length,
      total_records: totalRecords,
      record_counts: backupResults
    };

    const summaryFile = path.join(backupDir, `backup-summary-${timestamp}.json`);
    fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2), 'utf8');

    console.log('\n' + '═'.repeat(60));
    console.log('📊 BACKUP SUMMARY');
    console.log('═'.repeat(60));
    console.log(`Total Tables: ${Object.keys(backupResults).length}`);
    console.log(`Total Records: ${totalRecords}`);
    console.log(`Backup Location: ${backupDir}`);
    console.log('═'.repeat(60));

    await client.end();
    return { success: true, backupDir, totalRecords };
  } catch (error) {
    await client.end().catch(() => {});
    return { success: false, error: error.message };
  }
}

// Restore function
async function restoreDatabase(connectionString, backupDir) {
  const client = new Client({ 
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Find all SQL files
    const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.sql') && f.startsWith('lats_'));
    console.log(`📋 Found ${files.length} SQL files to restore\n`);

    await client.query('BEGIN');

    for (const file of files) {
      const filePath = path.join(backupDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      
      // Extract table name from filename
      const tableName = file.split('_')[0] + '_' + file.split('_')[1];
      
      console.log(`📦 Restoring ${tableName}...`);
      
      try {
        // Clear existing data (optional - you might want to skip this)
        // await client.query(`TRUNCATE TABLE ${tableName} CASCADE`);
        
        // Execute SQL
        await client.query(sql);
        console.log(`   ✅ ${tableName} restored`);
      } catch (error) {
        console.log(`   ⚠️  Error restoring ${tableName}: ${error.message}`);
        // Continue with other tables
      }
    }

    await client.query('COMMIT');
    await client.end();
    
    console.log('\n✅ Restore completed successfully!');
    return { success: true };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    await client.end().catch(() => {});
    return { success: false, error: error.message };
  }
}

// Get database schema using existing client
async function getDatabaseSchemaFromClient(client) {
  // Get all tables
  const tablesResult = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);

  const tables = {};
  
  for (const row of tablesResult.rows) {
    const tableName = row.table_name;
    
    // Get columns for each table
    const columnsResult = await client.query(`
      SELECT 
        column_name,
        data_type,
        character_maximum_length,
        is_nullable,
        column_default,
        udt_name
      FROM information_schema.columns
      WHERE table_schema = 'public' 
      AND table_name = $1
      ORDER BY ordinal_position
    `, [tableName]);

    tables[tableName] = {
      columns: columnsResult.rows.map(col => ({
        name: col.column_name,
        type: col.data_type,
        maxLength: col.character_maximum_length,
        nullable: col.is_nullable === 'YES',
        default: col.column_default,
        udtName: col.udt_name
      }))
    };
  }

  return tables;
}

// Merge database schema
async function mergeDatabaseSchema(sourceConn, targetConn, dryRun = true) {
  console.log('\n🔍 Analyzing schemas...\n');
  
  const sourceClient = new Client({ 
    connectionString: sourceConn,
    ssl: { rejectUnauthorized: false }
  });
  
  const targetClient = new Client({ 
    connectionString: targetConn,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await sourceClient.connect();
    await targetClient.connect();
    console.log('✅ Connected to both databases\n');

    // Get schemas
    const sourceSchema = await getDatabaseSchemaFromClient(sourceClient);
    const targetSchema = await getDatabaseSchemaFromClient(targetClient);

    const migrations = [];
    let tablesAdded = 0;
    let columnsAdded = 0;

    // Find missing tables
    for (const tableName in sourceSchema) {
      if (!targetSchema[tableName]) {
        console.log(`📋 Missing table: ${tableName}`);
        
        // Get column definitions for CREATE TABLE
        const columnsResult = await sourceClient.query(`
          SELECT 
            column_name,
            data_type,
            character_maximum_length,
            numeric_precision,
            numeric_scale,
            is_nullable,
            column_default,
            udt_name
          FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = $1
          ORDER BY ordinal_position
        `, [tableName]);

        const columnDefs = [];
        for (const col of columnsResult.rows) {
          let typeDef = col.data_type;
          
          // Handle specific types
          if (col.data_type === 'character varying' || col.data_type === 'varchar') {
            typeDef = col.character_maximum_length 
              ? `VARCHAR(${col.character_maximum_length})` 
              : 'VARCHAR';
          } else if (col.data_type === 'character' || col.data_type === 'char') {
            typeDef = col.character_maximum_length 
              ? `CHAR(${col.character_maximum_length})` 
              : 'CHAR';
          } else if (col.data_type === 'numeric') {
            if (col.numeric_precision && col.numeric_scale) {
              typeDef = `NUMERIC(${col.numeric_precision},${col.numeric_scale})`;
            } else if (col.numeric_precision) {
              typeDef = `NUMERIC(${col.numeric_precision})`;
            } else {
              typeDef = 'NUMERIC';
            }
          } else if (col.udt_name && col.udt_name.startsWith('_')) {
            // Array types
            const baseType = col.udt_name.substring(1);
            typeDef = `${baseType}[]`;
          } else {
            typeDef = col.udt_name || col.data_type;
          }

          let colDef = `${col.column_name} ${typeDef}`;
          
          if (col.is_nullable === 'NO') {
            colDef += ' NOT NULL';
          }
          
          if (col.column_default) {
            colDef += ` DEFAULT ${col.column_default}`;
          }
          
          columnDefs.push(colDef);
        }

        const createStatement = `CREATE TABLE ${tableName} (\n  ${columnDefs.join(',\n  ')}\n);`;

        migrations.push({
          type: 'CREATE_TABLE',
          table: tableName,
          sql: createStatement
        });
        tablesAdded++;
      } else {
        // Check for missing columns
        const sourceColumns = sourceSchema[tableName].columns;
        const targetColumns = targetSchema[tableName].columns;
        const targetColumnNames = new Set(targetColumns.map(c => c.name));

        // Get full column details for missing columns
        const missingCols = sourceColumns.filter(col => !targetColumnNames.has(col.name));
        
        if (missingCols.length > 0) {
          const colDetailsResult = await sourceClient.query(`
            SELECT 
              column_name,
              data_type,
              character_maximum_length,
              numeric_precision,
              numeric_scale,
              is_nullable,
              column_default,
              udt_name
            FROM information_schema.columns
            WHERE table_schema = 'public' 
            AND table_name = $1
            AND column_name = ANY($2)
            ORDER BY ordinal_position
          `, [tableName, missingCols.map(c => c.name)]);

          for (const col of colDetailsResult.rows) {
            console.log(`   📋 Missing column: ${tableName}.${col.column_name}`);
            
            let typeDef = col.data_type;
            
            // Handle specific types
            if (col.data_type === 'character varying' || col.data_type === 'varchar') {
              typeDef = col.character_maximum_length 
                ? `VARCHAR(${col.character_maximum_length})` 
                : 'VARCHAR';
            } else if (col.data_type === 'character' || col.data_type === 'char') {
              typeDef = col.character_maximum_length 
                ? `CHAR(${col.character_maximum_length})` 
                : 'CHAR';
            } else if (col.data_type === 'numeric') {
              if (col.numeric_precision && col.numeric_scale) {
                typeDef = `NUMERIC(${col.numeric_precision},${col.numeric_scale})`;
              } else if (col.numeric_precision) {
                typeDef = `NUMERIC(${col.numeric_precision})`;
              } else {
                typeDef = 'NUMERIC';
              }
            } else if (col.udt_name && col.udt_name.startsWith('_')) {
              // Array types
              const baseType = col.udt_name.substring(1);
              typeDef = `${baseType}[]`;
            } else {
              typeDef = col.udt_name || col.data_type;
            }

            let alterSql = `ALTER TABLE ${tableName} ADD COLUMN ${col.column_name} ${typeDef}`;
            
            if (col.is_nullable === 'NO') {
              alterSql += ' NOT NULL';
            }
            
            if (col.column_default) {
              alterSql += ` DEFAULT ${col.column_default}`;
            } else if (col.is_nullable === 'NO') {
              // If NOT NULL and no default, make it nullable for safety
              alterSql = alterSql.replace(' NOT NULL', '');
            }
            
            alterSql += ';';
            
            migrations.push({
              type: 'ADD_COLUMN',
              table: tableName,
              column: col.column_name,
              sql: alterSql
            });
            columnsAdded++;
          }
        }
      }
    }

    // Generate migration SQL file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' + 
                     new Date().toISOString().split('T')[1].split('.')[0].replace(/:/g, '-');
    const migrationDir = path.join(__dirname, 'PROD BACKUP', 'schema-migrations');
    
    if (!fs.existsSync(migrationDir)) {
      fs.mkdirSync(migrationDir, { recursive: true });
    }

    const migrationFile = path.join(migrationDir, `schema-merge-${timestamp}.sql`);
    
    const sqlStatements = [];
    sqlStatements.push('-- ============================================');
    sqlStatements.push('-- DATABASE SCHEMA MERGE MIGRATION');
    sqlStatements.push(`-- Generated: ${new Date().toISOString()}`);
    sqlStatements.push(`-- Source: ${sourceConn.replace(/:[^:@]+@/, ':****@')}`);
    sqlStatements.push(`-- Target: ${targetConn.replace(/:[^:@]+@/, ':****@')}`);
    sqlStatements.push(`-- Tables to add: ${tablesAdded}`);
    sqlStatements.push(`-- Columns to add: ${columnsAdded}`);
    sqlStatements.push('-- ============================================\n');
    sqlStatements.push('BEGIN;\n');

    for (const migration of migrations) {
      sqlStatements.push(`-- ${migration.type}: ${migration.table}${migration.column ? '.' + migration.column : ''}`);
      sqlStatements.push(migration.sql);
      sqlStatements.push('');
    }

    sqlStatements.push('COMMIT;');
    
    fs.writeFileSync(migrationFile, sqlStatements.join('\n'), 'utf8');

    console.log('\n' + '═'.repeat(60));
    console.log('📊 SCHEMA MERGE SUMMARY');
    console.log('═'.repeat(60));
    console.log(`Tables to add: ${tablesAdded}`);
    console.log(`Columns to add: ${columnsAdded}`);
    console.log(`Migration file: ${path.basename(migrationFile)}`);
    console.log('═'.repeat(60));

    if (!dryRun && migrations.length > 0) {
      console.log('\n⚠️  Applying migrations to target database...');
      await targetClient.query('BEGIN');
      
      for (const migration of migrations) {
        try {
          await targetClient.query(migration.sql);
          console.log(`   ✅ ${migration.type}: ${migration.table}${migration.column ? '.' + migration.column : ''}`);
        } catch (error) {
          console.log(`   ❌ Error: ${migration.table}${migration.column ? '.' + migration.column : ''} - ${error.message}`);
        }
      }
      
      await targetClient.query('COMMIT');
      console.log('\n✅ Schema merge completed!');
    } else if (migrations.length > 0) {
      console.log('\n💡 This was a DRY RUN. No changes were made.');
      console.log(`   Review the migration file: ${migrationFile}`);
      console.log('   Run again and choose "Apply Migration" to execute.');
    } else {
      console.log('\n✅ Schemas are already in sync! No migrations needed.');
    }

    await sourceClient.end();
    await targetClient.end();
    
    return { 
      success: true, 
      tablesAdded, 
      columnsAdded, 
      migrations: migrations.length,
      migrationFile 
    };
  } catch (error) {
    await sourceClient.end().catch(() => {});
    await targetClient.end().catch(() => {});
    return { success: false, error: error.message };
  }
}

// Merge schema menu
async function mergeSchemaMenu() {
  const connections = loadConnections();
  
  if (connections.length < 2) {
    console.log('\n⚠️  You need at least 2 saved connections to merge schemas.');
    console.log('   Please add connections in "Manage Connection Strings" first.');
    await question('Press Enter to continue...');
    return 'back';
  }

  // Select source database
  const sourceOptions = [
    ...connections.map((conn, index) => ({
      label: `${conn.name} (${conn.connectionString.replace(/:[^:@]+@/, ':****@')})`,
      connectionString: conn.connectionString
    })),
    { label: 'Enter New Connection String', connectionString: null }
  ];

  console.log('\n📥 Select SOURCE database (schema to copy FROM):');
  const sourceChoice = await showMenu('Source Database', sourceOptions.map(o => ({ label: o.label })));
  
  let sourceConn;
  if (sourceChoice === connections.length) {
    sourceConn = await question('Enter source database connection string: ');
    const test = await testConnection(sourceConn);
    if (!test.success) {
      console.log(`\n❌ Connection failed: ${test.error}`);
      await question('Press Enter to continue...');
      return 'back';
    }
    console.log('✅ Source connection successful!');
  } else {
    sourceConn = sourceOptions[sourceChoice].connectionString;
  }

  // Select target database
  const targetOptions = [
    ...connections.map((conn, index) => ({
      label: `${conn.name} (${conn.connectionString.replace(/:[^:@]+@/, ':****@')})`,
      connectionString: conn.connectionString
    })),
    { label: 'Enter New Connection String', connectionString: null }
  ];

  console.log('\n📤 Select TARGET database (schema to merge TO):');
  const targetChoice = await showMenu('Target Database', targetOptions.map(o => ({ label: o.label })));
  
  let targetConn;
  if (targetChoice === connections.length) {
    targetConn = await question('Enter target database connection string: ');
    const test = await testConnection(targetConn);
    if (!test.success) {
      console.log(`\n❌ Connection failed: ${test.error}`);
      await question('Press Enter to continue...');
      return 'back';
    }
    console.log('✅ Target connection successful!');
  } else {
    targetConn = targetOptions[targetChoice].connectionString;
  }

  if (sourceConn === targetConn) {
    console.log('\n❌ Source and target cannot be the same database!');
    await question('Press Enter to continue...');
    return 'back';
  }

  // Choose action
  const actionChoice = await showMenu('Merge Options', [
    { label: 'Dry Run (Generate migration file only)' },
    { label: 'Apply Migration (Execute changes)' },
    { label: 'Cancel' }
  ]);

  if (actionChoice === 2) {
    return 'back';
  }

  const dryRun = actionChoice === 0;

  if (!dryRun) {
    console.log('\n⚠️  WARNING: This will modify the target database schema!');
    const confirm = await question('Are you sure you want to continue? (yes/no): ');
    
    if (confirm.toLowerCase() !== 'yes') {
      console.log('Merge cancelled.');
      await question('Press Enter to continue...');
      return 'back';
    }
  }

  const result = await mergeDatabaseSchema(sourceConn, targetConn, dryRun);
  
  if (result.success) {
    if (result.migrations === 0) {
      console.log('\n✅ Schemas are already in sync!');
    } else {
      console.log(`\n✅ Schema merge ${dryRun ? 'analysis' : 'completed'} successfully!`);
    }
  } else {
    console.log(`\n❌ Schema merge failed: ${result.error}`);
  }
  
  await question('Press Enter to continue...');
  return 'back';
}

// Main menu
async function mainMenu() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║     DATABASE BACKUP & RESTORE MANAGER                  ║');
  console.log('╚════════════════════════════════════════════════════════╝');

  const choice = await showMenu('Main Menu', [
    { label: 'Backup Database', action: 'backup' },
    { label: 'Restore Database', action: 'restore' },
    { label: 'Merge Database Schema', action: 'merge' },
    { label: 'Manage Connection Strings', action: 'manage' },
    { label: 'Exit', action: 'exit' }
  ]);

  const options = ['backup', 'restore', 'merge', 'manage', 'exit'];
  return options[choice];
}

// Backup menu
async function backupMenu() {
  const connections = loadConnections();
  
  const options = [
    ...connections.map((conn, index) => ({
      label: `${conn.name} (${conn.connectionString.replace(/:[^:@]+@/, ':****@')})`,
      connectionString: conn.connectionString
    })),
    { label: 'Enter New Connection String', connectionString: null },
    { label: 'Back to Main Menu', connectionString: 'back' }
  ];

  const choice = await showMenu('Select Database to Backup', options.map(o => ({ label: o.label })));
  
  if (choice === options.length - 1) {
    return 'back';
  }
  
  if (choice === options.length - 2) {
    // New connection string
    const name = await question('Enter a name for this connection: ');
    const connectionString = await question('Enter database connection string: ');
    
    const test = await testConnection(connectionString);
    if (!test.success) {
      console.log(`\n❌ Connection failed: ${test.error}`);
      return 'back';
    }
    
    console.log('\n✅ Connection successful!');
    connections.push({ name, connectionString });
    saveConnections(connections);
    
    const backupName = await question('Enter backup name (or press Enter for default): ');
    const result = await backupDatabase(connectionString, backupName || undefined);
    
    if (result.success) {
      console.log('\n✅ Backup completed successfully!');
    } else {
      console.log(`\n❌ Backup failed: ${result.error}`);
    }
  } else {
    // Use saved connection
    const connectionString = options[choice].connectionString;
    const backupName = await question('Enter backup name (or press Enter for default): ');
    const result = await backupDatabase(connectionString, backupName || undefined);
    
    if (result.success) {
      console.log('\n✅ Backup completed successfully!');
    } else {
      console.log(`\n❌ Backup failed: ${result.error}`);
    }
  }
  
  await question('\nPress Enter to continue...');
  return 'back';
}

// Restore menu
async function restoreMenu() {
  const backupBaseDir = path.join(__dirname, 'PROD BACKUP');
  
  if (!fs.existsSync(backupBaseDir)) {
    console.log('\n❌ No backup directory found!');
    await question('Press Enter to continue...');
    return 'back';
  }

  const backups = fs.readdirSync(backupBaseDir)
    .filter(item => {
      const itemPath = path.join(backupBaseDir, item);
      return fs.statSync(itemPath).isDirectory();
    })
    .map(item => ({
      label: item,
      path: path.join(backupBaseDir, item)
    }));

  if (backups.length === 0) {
    console.log('\n❌ No backups found!');
    await question('Press Enter to continue...');
    return 'back';
  }

  const options = [
    ...backups.map(b => ({ label: b.label })),
    { label: 'Back to Main Menu' }
  ];

  const choice = await showMenu('Select Backup to Restore', options);
  
  if (choice === backups.length) {
    return 'back';
  }

  const selectedBackup = backups[choice];
  
  // Get connection string
  const connections = loadConnections();
  const connOptions = [
    ...connections.map(conn => ({
      label: `${conn.name} (${conn.connectionString.replace(/:[^:@]+@/, ':****@')})`,
      connectionString: conn.connectionString
    })),
    { label: 'Enter New Connection String', connectionString: null }
  ];

  const connChoice = await showMenu('Select Target Database', connOptions.map(o => ({ label: o.label })));
  
  let connectionString;
  if (connChoice === connOptions.length - 1) {
    connectionString = await question('Enter database connection string: ');
    const test = await testConnection(connectionString);
    if (!test.success) {
      console.log(`\n❌ Connection failed: ${test.error}`);
      await question('Press Enter to continue...');
      return 'back';
    }
    console.log('\n✅ Connection successful!');
  } else {
    connectionString = connOptions[connChoice].connectionString;
  }

  console.log('\n⚠️  WARNING: This will restore data to the selected database!');
  const confirm = await question('Are you sure you want to continue? (yes/no): ');
  
  if (confirm.toLowerCase() !== 'yes') {
    console.log('Restore cancelled.');
    await question('Press Enter to continue...');
    return 'back';
  }

  const result = await restoreDatabase(connectionString, selectedBackup.path);
  
  if (result.success) {
    console.log('\n✅ Restore completed successfully!');
  } else {
    console.log(`\n❌ Restore failed: ${result.error}`);
  }
  
  await question('Press Enter to continue...');
  return 'back';
}

// Manage connections menu
async function manageConnectionsMenu() {
  const connections = loadConnections();
  
  while (true) {
    const options = [
      ...connections.map((conn, index) => ({
        label: `${index + 1}. ${conn.name} - ${conn.connectionString.replace(/:[^:@]+@/, ':****@')}`
      })),
      { label: 'Add New Connection' },
      { label: 'Test Connection' },
      { label: 'Delete Connection' },
      { label: 'Back to Main Menu' }
    ];

    const choice = await showMenu('Manage Connection Strings', options);
    
    if (choice === connections.length) {
      // Add new
      const name = await question('Enter a name for this connection: ');
      const connectionString = await question('Enter database connection string: ');
      
      const test = await testConnection(connectionString);
      if (!test.success) {
        console.log(`\n❌ Connection failed: ${test.error}`);
      } else {
        console.log('\n✅ Connection successful!');
        connections.push({ name, connectionString });
        saveConnections(connections);
        console.log('✅ Connection saved!');
      }
    } else if (choice === connections.length + 1) {
      // Test
      if (connections.length === 0) {
        console.log('\n❌ No connections to test!');
        await question('Press Enter to continue...');
        continue;
      }
      
      const testOptions = connections.map((conn, index) => ({
        label: `${index + 1}. ${conn.name}`
      }));
      
      const testChoice = await showMenu('Select Connection to Test', testOptions);
      const connectionString = connections[testChoice].connectionString;
      
      console.log('\n🔍 Testing connection...');
      const test = await testConnection(connectionString);
      
      if (test.success) {
        console.log('✅ Connection successful!');
        console.log(`Database: ${test.version}`);
      } else {
        console.log(`❌ Connection failed: ${test.error}`);
      }
    } else if (choice === connections.length + 2) {
      // Delete
      if (connections.length === 0) {
        console.log('\n❌ No connections to delete!');
        await question('Press Enter to continue...');
        continue;
      }
      
      const deleteOptions = connections.map((conn, index) => ({
        label: `${index + 1}. ${conn.name}`
      }));
      
      const deleteChoice = await showMenu('Select Connection to Delete', deleteOptions);
      const deleted = connections.splice(deleteChoice, 1)[0];
      saveConnections(connections);
      console.log(`\n✅ Deleted: ${deleted.name}`);
    } else {
      // Back to main
      return 'back';
    }
    
    await question('\nPress Enter to continue...');
  }
}

// Main loop
async function main() {
  while (true) {
    const action = await mainMenu();
    
    if (action === 'backup') {
      const result = await backupMenu();
      if (result === 'back') continue;
    } else if (action === 'restore') {
      const result = await restoreMenu();
      if (result === 'back') continue;
    } else if (action === 'merge') {
      const result = await mergeSchemaMenu();
      if (result === 'back') continue;
    } else if (action === 'manage') {
      await manageConnectionsMenu();
    } else if (action === 'exit') {
      console.log('\n👋 Goodbye!');
      rl.close();
      process.exit(0);
    }
  }
}

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n\n👋 Goodbye!');
  rl.close();
  process.exit(0);
});

// Start
main().catch(error => {
  console.error('\n❌ Fatal Error:', error);
  rl.close();
  process.exit(1);
});

