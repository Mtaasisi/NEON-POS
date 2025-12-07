import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Client } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get connection string from command line or use default
const connectionString = process.argv[2] || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Error: Please provide a database connection string');
  console.error('Usage: node backup-full-database.mjs "postgresql://user:pass@host:port/db"');
  process.exit(1);
}

const client = new Client({ 
  connectionString,
  ssl: { rejectUnauthorized: false }
});

// Create backup directory with date
const today = new Date().toISOString().split('T')[0];
const backupDir = path.join(__dirname, `supabase backup ${today}`);
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
  console.log(`📁 Created backup directory: ${backupDir}`);
}

async function getTableList() {
  const result = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);
  return result.rows.map(r => r.table_name);
}

async function getSchema(tableName) {
  const result = await client.query(`
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
  return result.rows;
}

async function getTableData(tableName) {
  try {
    const result = await client.query(`SELECT * FROM ${tableName} ORDER BY id, created_at`);
    return result.rows;
  } catch (error) {
    // If table doesn't have id or created_at, try without ORDER BY
    try {
      const result = await client.query(`SELECT * FROM ${tableName}`);
      return result.rows;
    } catch (error2) {
      console.error(`   ⚠️  Could not fetch data from ${tableName}: ${error2.message}`);
      return [];
    }
  }
}

async function generateSchemaSQL() {
  console.log('\n📋 Generating full schema SQL...');
  
  const schemaSQL = [];
  schemaSQL.push('-- ============================================');
  schemaSQL.push('-- FULL DATABASE SCHEMA BACKUP');
  schemaSQL.push('-- Generated: ' + new Date().toISOString());
  schemaSQL.push('-- ============================================\n');
  
  // Get all tables
  const tables = await getTableList();
  console.log(`   Found ${tables.length} tables`);
  
  // For each table, get schema and create CREATE TABLE statement
  for (const tableName of tables) {
    try {
      const columns = await getSchema(tableName);
      
      schemaSQL.push(`-- ============================================`);
      schemaSQL.push(`-- Table: ${tableName}`);
      schemaSQL.push(`-- ============================================`);
      schemaSQL.push(`\nDROP TABLE IF EXISTS ${tableName} CASCADE;`);
      schemaSQL.push(`\nCREATE TABLE ${tableName} (`);
      
      const columnDefs = [];
      const constraints = [];
      
      for (const col of columns) {
        let colDef = `  ${col.column_name} ${col.udt_name}`;
        
        if (col.character_maximum_length) {
          colDef += `(${col.character_maximum_length})`;
        }
        
        if (col.is_nullable === 'NO') {
          colDef += ' NOT NULL';
        }
        
        if (col.column_default) {
          colDef += ` DEFAULT ${col.column_default}`;
        }
        
        columnDefs.push(colDef);
      }
      
      schemaSQL.push(columnDefs.join(',\n'));
      schemaSQL.push(');\n');
      
      // Get primary keys
      const pkResult = await client.query(`
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_schema = 'public'
        AND table_name = $1
        AND constraint_type = 'PRIMARY KEY'
      `, [tableName]);
      
      if (pkResult.rows.length > 0) {
        const pkName = pkResult.rows[0].constraint_name;
        const pkCols = await client.query(`
          SELECT column_name
          FROM information_schema.key_column_usage
          WHERE constraint_name = $1
          ORDER BY ordinal_position
        `, [pkName]);
        
        if (pkCols.rows.length > 0) {
          const pkColumns = pkCols.rows.map(r => r.column_name).join(', ');
          schemaSQL.push(`ALTER TABLE ${tableName} ADD CONSTRAINT ${pkName} PRIMARY KEY (${pkColumns});\n`);
        }
      }
      
      // Get foreign keys
      const fkResult = await client.query(`
        SELECT 
          tc.constraint_name,
          kcu.column_name,
          ccu.table_schema AS foreign_table_schema,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage ccu 
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.table_schema = 'public'
        AND tc.table_name = $1
        AND tc.constraint_type = 'FOREIGN KEY'
      `, [tableName]);
      
      for (const fk of fkResult.rows) {
        schemaSQL.push(`ALTER TABLE ${tableName} ADD CONSTRAINT ${fk.constraint_name} `);
        schemaSQL.push(`FOREIGN KEY (${fk.column_name}) REFERENCES ${fk.foreign_table_name}(${fk.foreign_column_name});\n`);
      }
      
      // Get indexes
      const indexResult = await client.query(`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE schemaname = 'public'
        AND tablename = $1
      `, [tableName]);
      
      for (const idx of indexResult.rows) {
        if (!idx.indexdef.includes('PRIMARY KEY')) {
          schemaSQL.push(`${idx.indexdef};\n`);
        }
      }
      
      schemaSQL.push('\n');
    } catch (error) {
      console.error(`   ⚠️  Error getting schema for ${tableName}: ${error.message}`);
    }
  }
  
  return schemaSQL.join('\n');
}

async function generateDataSQL(tables) {
  console.log('\n📦 Generating data SQL...');
  
  const dataSQL = [];
  dataSQL.push('-- ============================================');
  dataSQL.push('-- FULL DATABASE DATA BACKUP');
  dataSQL.push('-- Generated: ' + new Date().toISOString());
  dataSQL.push('-- ============================================\n');
  
  for (const tableName of tables) {
    console.log(`   Backing up data from ${tableName}...`);
    const data = await getTableData(tableName);
    
    if (data.length === 0) {
      dataSQL.push(`-- Table: ${tableName} (0 rows)\n`);
      continue;
    }
    
    dataSQL.push(`-- ============================================`);
    dataSQL.push(`-- Table: ${tableName} (${data.length} rows)`);
    dataSQL.push(`-- ============================================\n`);
    
    const columns = Object.keys(data[0]);
    
    // Generate INSERT statements in batches
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
      
      dataSQL.push(`INSERT INTO ${tableName} (${columns.join(', ')}) VALUES`);
      dataSQL.push(values.join(',\n') + ';');
      dataSQL.push('');
    }
    
    console.log(`      ✅ ${data.length} rows backed up`);
  }
  
  return dataSQL.join('\n');
}

async function backupFullDatabase() {
  console.log('🔍 Starting Full Database Backup\n');
  console.log('📊 Connecting to database...\n');

  try {
    await client.connect();
    console.log('✅ Connected successfully!\n');

    // Get database info
    const dbInfo = await client.query('SELECT current_database() as db, version() as version');
    console.log(`📊 Database: ${dbInfo.rows[0].db}`);
    console.log(`📊 PostgreSQL: ${dbInfo.rows[0].version.split(' ')[0]} ${dbInfo.rows[0].version.split(' ')[1]}\n`);

    // Get all tables
    const tables = await getTableList();
    console.log(`📋 Found ${tables.length} tables to backup\n`);

    // Generate schema SQL
    const schemaSQL = await generateSchemaSQL();
    const schemaFile = path.join(backupDir, `schema_${today}.sql`);
    fs.writeFileSync(schemaFile, schemaSQL, 'utf8');
    console.log(`\n💾 Schema saved: ${path.basename(schemaFile)}`);
    console.log(`   Size: ${(fs.statSync(schemaFile).size / 1024 / 1024).toFixed(2)} MB`);

    // Generate data SQL
    const dataSQL = await generateDataSQL(tables);
    const dataFile = path.join(backupDir, `data_${today}.sql`);
    fs.writeFileSync(dataFile, dataSQL, 'utf8');
    console.log(`\n💾 Data saved: ${path.basename(dataFile)}`);
    console.log(`   Size: ${(fs.statSync(dataFile).size / 1024 / 1024).toFixed(2)} MB`);

    // Also create combined full backup
    const fullBackup = schemaSQL + '\n\n' + dataSQL;
    const fullFile = path.join(backupDir, `full_backup_${today}.sql`);
    fs.writeFileSync(fullFile, fullBackup, 'utf8');
    console.log(`\n💾 Full backup saved: ${path.basename(fullFile)}`);
    console.log(`   Size: ${(fs.statSync(fullFile).size / 1024 / 1024).toFixed(2)} MB`);

    // Create JSON backups for each table
    console.log('\n📦 Creating JSON backups for each table...');
    const jsonBackupDir = path.join(backupDir, 'json_data');
    if (!fs.existsSync(jsonBackupDir)) {
      fs.mkdirSync(jsonBackupDir, { recursive: true });
    }

    let totalRows = 0;
    for (const tableName of tables) {
      const data = await getTableData(tableName);
      if (data.length > 0) {
        const jsonFile = path.join(jsonBackupDir, `${tableName}.json`);
        fs.writeFileSync(jsonFile, JSON.stringify(data, null, 2), 'utf8');
        totalRows += data.length;
        console.log(`   ✅ ${tableName}: ${data.length} rows`);
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 BACKUP SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Tables backed up: ${tables.length}`);
    console.log(`✅ Total rows backed up: ${totalRows}`);
    console.log(`\n📁 Backup location: ${backupDir}`);
    console.log(`   - Schema: schema_${today}.sql`);
    console.log(`   - Data: data_${today}.sql`);
    console.log(`   - Full: full_backup_${today}.sql`);
    console.log(`   - JSON: json_data/ (${tables.length} files)`);
    console.log('='.repeat(60));

    await client.end();
    console.log('\n✅ Full database backup completed successfully!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nStack:', error.stack);
    await client.end().catch(() => {});
    process.exit(1);
  }
}

backupFullDatabase().catch(error => {
  console.error('❌ Fatal Error:', error);
  process.exit(1);
});
