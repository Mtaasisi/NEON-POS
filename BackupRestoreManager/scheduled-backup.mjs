#!/usr/bin/env node
/**
 * Scheduled Backup Runner
 * Run this script via cron or task scheduler for automatic backups
 * 
 * Usage:
 *   node scheduled-backup.mjs [connection-name] [backup-type] [backup-name]
 * 
 * Examples:
 *   node scheduled-backup.mjs "My Database" "full" "daily-backup"
 *   node scheduled-backup.mjs "Production DB" "data" "auto-backup"
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import archiver from 'archiver';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Client } = pg;

// Import backup functions from main file (we'll need to extract them or duplicate logic)
// For now, let's create a simplified version

const CONNECTION_STRINGS_FILE = path.join(__dirname, '.db-connections.json');

function loadConnections() {
  try {
    if (fs.existsSync(CONNECTION_STRINGS_FILE)) {
      return JSON.parse(fs.readFileSync(CONNECTION_STRINGS_FILE, 'utf8'));
    }
  } catch (error) {
    console.error('Error loading connections:', error.message);
  }
  return [];
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function escapeSQLValue(value) {
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
}

async function runScheduledBackup(connectionName, backupType = 'full', backupName = null) {
  const connections = loadConnections();
  
  // Find connection by name
  const connection = connections.find(c => c.name === connectionName);
  
  if (!connection) {
    console.error(`❌ Connection "${connectionName}" not found!`);
    console.error('Available connections:');
    connections.forEach(c => console.error(`  - ${c.name}`));
    process.exit(1);
  }

  const connectionString = connection.connectionString;
  const client = new Client({ 
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
  });

  const today = new Date().toISOString().split('T')[0];
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' + 
                   new Date().toISOString().split('T')[1].split('.')[0].replace(/:/g, '-');
  
  const backupNameFinal = backupName || `${backupType}-${today}`;
  const backupDir = path.join(__dirname, 'PROD BACKUP', backupNameFinal);
  
  if (!fs.existsSync(path.join(__dirname, 'PROD BACKUP'))) {
    fs.mkdirSync(path.join(__dirname, 'PROD BACKUP'), { recursive: true });
  }
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  console.log(`\n🕐 Scheduled Backup Started: ${new Date().toLocaleString()}`);
  console.log(`📦 Type: ${backupType}`);
  console.log(`📁 Location: ${backupDir}\n`);

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
    console.log(`📋 Found ${tables.length} tables\n`);

    let totalRecords = 0;
    let totalSize = 0;

    if (backupType === 'data') {
      // Data-only backup
      const allData = {};
      const allSQLStatements = [];
      
      allSQLStatements.push('-- Scheduled Data-Only Backup');
      allSQLStatements.push(`-- Generated: ${new Date().toISOString()}\n`);
      allSQLStatements.push('BEGIN;\n');

      for (const tableName of tables) {
        try {
          const result = await client.query(`SELECT * FROM ${tableName}`);
          const data = result.rows;
          
          if (data.length > 0) {
            allData[tableName] = data;
            const columns = Object.keys(data[0]);
            
            const batchSize = 100;
            for (let i = 0; i < data.length; i += batchSize) {
              const batch = data.slice(i, i + batchSize);
              const values = batch.map(row => {
                const rowValues = columns.map(col => escapeSQLValue(row[col]));
                return `(${rowValues.join(', ')})`;
              });
              
              allSQLStatements.push(`INSERT INTO ${tableName} (${columns.join(', ')}) VALUES`);
              allSQLStatements.push(values.join(',\n') + ';');
              allSQLStatements.push('');
            }
            
            totalRecords += data.length;
          }
        } catch (error) {
          console.error(`   ❌ Error: ${tableName} - ${error.message}`);
        }
      }

      allSQLStatements.push('COMMIT;');

      const jsonFile = path.join(backupDir, `all-data_${timestamp}.json`);
      const sqlFile = path.join(backupDir, `all-data_${timestamp}.sql`);
      
      fs.writeFileSync(jsonFile, JSON.stringify(allData, null, 2), 'utf8');
      fs.writeFileSync(sqlFile, allSQLStatements.join('\n'), 'utf8');
      
      totalSize = fs.statSync(jsonFile).size + fs.statSync(sqlFile).size;
      
      console.log(`✅ Data backup complete: ${totalRecords.toLocaleString()} records`);
      console.log(`📊 Size: ${formatFileSize(totalSize)}`);
      
    } else if (backupType === 'schema') {
      // Schema-only backup
      const allSQLStatements = [];
      
      allSQLStatements.push('-- Scheduled Schema-Only Backup');
      allSQLStatements.push(`-- Generated: ${new Date().toISOString()}\n`);
      allSQLStatements.push('BEGIN;\n');

      for (const tableName of tables) {
        try {
          const columnsResult = await client.query(`
            SELECT column_name, data_type, character_maximum_length,
                   numeric_precision, numeric_scale, is_nullable,
                   column_default, udt_name
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = $1
            ORDER BY ordinal_position
          `, [tableName]);

          if (columnsResult.rows.length > 0) {
            const columnDefs = columnsResult.rows.map(col => {
              let typeDef = col.data_type;
              if (col.data_type === 'character varying' || col.data_type === 'varchar') {
                typeDef = col.character_maximum_length ? `VARCHAR(${col.character_maximum_length})` : 'VARCHAR';
              } else if (col.data_type === 'numeric') {
                if (col.numeric_precision && col.numeric_scale) {
                  typeDef = `NUMERIC(${col.numeric_precision},${col.numeric_scale})`;
                } else {
                  typeDef = 'NUMERIC';
                }
              } else {
                typeDef = col.udt_name || col.data_type;
              }

              let colDef = `${col.column_name} ${typeDef}`;
              if (col.is_nullable === 'NO') colDef += ' NOT NULL';
              if (col.column_default) colDef += ` DEFAULT ${col.column_default}`;
              return colDef;
            });

            allSQLStatements.push(`CREATE TABLE IF NOT EXISTS ${tableName} (`);
            allSQLStatements.push('  ' + columnDefs.join(',\n  '));
            allSQLStatements.push(');\n');
          }
        } catch (error) {
          console.error(`   ❌ Error: ${tableName} - ${error.message}`);
        }
      }

      allSQLStatements.push('COMMIT;');

      const sqlFile = path.join(backupDir, `schema-only_${timestamp}.sql`);
      fs.writeFileSync(sqlFile, allSQLStatements.join('\n'), 'utf8');
      
      totalSize = fs.statSync(sqlFile).size;
      
      console.log(`✅ Schema backup complete: ${tables.length} tables`);
      console.log(`📊 Size: ${formatFileSize(totalSize)}`);
      
    } else {
      // Full backup
      for (const tableName of tables) {
        try {
          const result = await client.query(`SELECT * FROM ${tableName}`);
          const data = result.rows;
          
          if (data.length > 0) {
            const jsonFile = path.join(backupDir, `${tableName}_${timestamp}.json`);
            fs.writeFileSync(jsonFile, JSON.stringify(data, null, 2), 'utf8');
            totalSize += fs.statSync(jsonFile).size;
            totalRecords += data.length;
          }
        } catch (error) {
          console.error(`   ❌ Error: ${tableName} - ${error.message}`);
        }
      }
      
      console.log(`✅ Full backup complete: ${totalRecords.toLocaleString()} records`);
      console.log(`📊 Size: ${formatFileSize(totalSize)}`);
    }

    // Create summary
    const summary = {
      backup_date: new Date().toISOString(),
      timestamp: timestamp,
      backup_type: backupType,
      connection_name: connectionName,
      total_records: totalRecords,
      backup_size: totalSize,
      scheduled: true
    };

    const summaryFile = path.join(backupDir, `backup-summary-${timestamp}.json`);
    fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2), 'utf8');

    console.log(`\n✅ Scheduled backup completed successfully!`);
    console.log(`📁 Location: ${backupDir}`);
    
    await client.end();
    process.exit(0);
  } catch (error) {
    console.error(`\n❌ Backup failed: ${error.message}`);
    await client.end().catch(() => {});
    process.exit(1);
  }
}

// Get command line arguments
const args = process.argv.slice(2);
const connectionName = args[0];
const backupType = args[1] || 'full';
const backupName = args[2] || null;

if (!connectionName) {
  console.error('Usage: node scheduled-backup.mjs <connection-name> [backup-type] [backup-name]');
  console.error('\nExamples:');
  console.error('  node scheduled-backup.mjs "My Database"');
  console.error('  node scheduled-backup.mjs "Production DB" "data" "daily-backup"');
  console.error('  node scheduled-backup.mjs "Test DB" "schema"');
  process.exit(1);
}

runScheduledBackup(connectionName, backupType, backupName).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
