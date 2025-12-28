import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// PostgreSQL to MySQL type mapping
const typeMapping = {
  // PostgreSQL -> MySQL
  'uuid': 'CHAR(36)',
  'text': 'TEXT',
  'varchar': 'VARCHAR',
  'character varying': 'VARCHAR',
  'integer': 'INT',
  'bigint': 'BIGINT',
  'smallint': 'SMALLINT',
  'numeric': 'DECIMAL(15,2)',
  'decimal': 'DECIMAL(15,2)',
  'real': 'FLOAT',
  'double precision': 'DOUBLE',
  'boolean': 'TINYINT(1)',
  'timestamp without time zone': 'DATETIME',
  'timestamp with time zone': 'DATETIME',
  'date': 'DATE',
  'time without time zone': 'TIME',
  'time with time zone': 'TIME',
  'jsonb': 'JSON',
  'json': 'JSON',
  'bytea': 'BLOB'
};

function convertPostgresType(postgresType) {
  // Handle array types
  if (postgresType.includes('[]')) {
    return 'JSON'; // Convert arrays to JSON
  }

  // Handle types with parameters like varchar(255)
  const baseType = postgresType.toLowerCase().split('(')[0].trim();

  if (typeMapping[baseType]) {
    return typeMapping[baseType];
  }

  // If no mapping found, try to use as-is but log warning
  console.warn(`⚠️  Unknown PostgreSQL type: ${postgresType}, using as-is`);
  return postgresType.toUpperCase();
}

function convertDefaultValue(defaultValue) {
  if (!defaultValue) return '';

  // Remove PostgreSQL specific functions
  if (defaultValue.includes('gen_random_uuid()')) {
    return 'UUID()'; // MySQL UUID function
  }

  if (defaultValue.includes('now()')) {
    return 'CURRENT_TIMESTAMP';
  }

  if (defaultValue.includes('CURRENT_TIMESTAMP')) {
    return 'CURRENT_TIMESTAMP';
  }

  // Handle boolean defaults
  if (defaultValue === 'true') return '1';
  if (defaultValue === 'false') return '0';

  return defaultValue;
}

function convertTableDefinition(tableName, schemaSQL) {
  const lines = schemaSQL.split('\n');
  const mysqlLines = [];
  let inCreateTable = false;
  let columnCount = 0;

  mysqlLines.push(`-- ============================================`);
  mysqlLines.push(`-- MySQL Table: ${tableName}`);
  mysqlLines.push(`-- ============================================`);
  mysqlLines.push(`DROP TABLE IF EXISTS \`${tableName}\`;`);
  mysqlLines.push(`CREATE TABLE \`${tableName}\` (`);

  // Find the CREATE TABLE block
  const createTableStart = lines.findIndex(line => line.trim().startsWith(`CREATE TABLE ${tableName} (`));
  if (createTableStart === -1) {
    console.warn(`⚠️  Could not find CREATE TABLE for ${tableName}`);
    return '';
  }

  // Extract column definitions
  const columnLines = [];
  for (let i = createTableStart + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === ');') break;

    if (line && !line.startsWith('--') && line !== '(') {
      // Remove trailing comma if present
      const cleanLine = line.replace(/,$/, '');

      // Parse column definition: column_name data_type constraints
      const parts = cleanLine.trim().split(/\s+/);
      if (parts.length >= 2) {
        const columnName = parts[0];
        const postgresType = parts.slice(1).join(' ');

        // Convert PostgreSQL type to MySQL type
        const mysqlType = convertPostgresType(postgresType);

        // Build MySQL column definition
        let mysqlColumn = `  \`${columnName}\` ${mysqlType}`;

        columnLines.push(mysqlColumn);
        columnCount++;
      }
    }
  }

  // Add columns to CREATE TABLE
  mysqlLines.push(columnLines.join(',\n'));
  mysqlLines.push(');');
  mysqlLines.push('');

  // Add primary key if it exists in original schema
  const pkMatch = schemaSQL.match(/ALTER TABLE \w+ ADD CONSTRAINT \w+ PRIMARY KEY \(([^)]+)\);/);
  if (pkMatch) {
    const pkColumns = pkMatch[1].split(',').map(col => `\`${col.trim()}\``).join(', ');
    mysqlLines.push(`ALTER TABLE \`${tableName}\` ADD PRIMARY KEY (${pkColumns});`);
  }

  mysqlLines.push('');
  return mysqlLines.join('\n');
}

function convertDataValues(dataSQL) {
  return dataSQL
    // Convert PostgreSQL UUID generation to MySQL UUID
    .replace(/gen_random_uuid\(\)/g, 'UUID()')
    // Convert PostgreSQL timestamp syntax to MySQL
    .replace(/::timestamptz/g, '')
    .replace(/::timestamp/g, '')
    // Convert PostgreSQL boolean to MySQL
    .replace(/\btrue\b/g, '1')
    .replace(/\bfalse\b/g, '0')
    // Convert PostgreSQL JSON syntax to MySQL
    .replace(/::jsonb/g, '')
    .replace(/::json/g, '');
}

async function convertPostgresToMySQL() {
  console.log('🔄 Converting PostgreSQL backup to MySQL format...\n');

  const backupDir = path.join(process.env.HOME, 'Documents', 'DUKANI PRO DATABASE', '2025-12-22');
  const outputDir = path.join(__dirname, 'DUKANI PRO DATABASE', 'mysql_backup');

  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  try {
    // Read schema file
    const schemaFile = path.join(backupDir, 'schema_2025-12-22.sql');
    const schemaSQL = fs.readFileSync(schemaFile, 'utf8');

    // Read data file
    const dataFile = path.join(backupDir, 'data_2025-12-22.sql');
    const dataSQL = fs.readFileSync(dataFile, 'utf8');

    console.log('📋 Processing schema conversion...');

    // Convert schema
    const tableDefinitions = schemaSQL.split('-- ============================================');
    const mysqlSchema = [];

    mysqlSchema.push('-- ============================================');
    mysqlSchema.push('-- MYSQL DATABASE SCHEMA - CONVERTED FROM POSTGRESQL');
    mysqlSchema.push('-- Generated: ' + new Date().toISOString());
    mysqlSchema.push('-- ============================================\n');

    for (const tableDef of tableDefinitions) {
      if (tableDef.includes('Table:')) {
        const tableNameMatch = tableDef.match(/Table: (\w+)/);
        if (tableNameMatch) {
          const tableName = tableNameMatch[1];
          const mysqlTable = convertTableDefinition(tableName, tableDef);
          mysqlSchema.push(mysqlTable);
        }
      }
    }

    // Save MySQL schema
    const mysqlSchemaFile = path.join(outputDir, 'mysql_schema_2025-12-22.sql');
    fs.writeFileSync(mysqlSchemaFile, mysqlSchema.join('\n'), 'utf8');
    console.log(`✅ MySQL schema saved: ${path.basename(mysqlSchemaFile)}`);

    // Convert and save data
    console.log('📦 Converting data...');
    const mysqlData = convertDataValues(dataSQL);
    const mysqlDataFile = path.join(outputDir, 'mysql_data_2025-12-22.sql');
    fs.writeFileSync(mysqlDataFile, mysqlData, 'utf8');
    console.log(`✅ MySQL data saved: ${path.basename(mysqlDataFile)}`);

    // Create combined file
    const combinedSQL = mysqlSchema.join('\n') + '\n\n' + mysqlData;
    const combinedFile = path.join(outputDir, 'mysql_full_backup_2025-12-22.sql');
    fs.writeFileSync(combinedFile, combinedSQL, 'utf8');
    console.log(`✅ Combined MySQL backup saved: ${path.basename(combinedFile)}`);

    console.log('\n📁 Output location:', outputDir);
    console.log('\n✅ Conversion completed! You can now import these MySQL files into phpMyAdmin.');

  } catch (error) {
    console.error('❌ Conversion failed:', error.message);
    process.exit(1);
  }
}

// Run the conversion
convertPostgresToMySQL();
